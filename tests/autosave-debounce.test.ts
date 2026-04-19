// tests/autosave-debounce.test.ts
// EDITOR-04 + SERDE-06 (debounce half): validates 500ms trailing-edge
// debounce coalescing and beforeExit flush hook.
//
// NOVEL PATTERN: This is the first test file in the repo using
// `vi.useFakeTimers()`. vitest 4.x replaces setTimeout/clearTimeout
// globally within the test scope. Call `vi.useRealTimers()` in afterEach.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Autosave } from "../src/editor/autosave.ts";
import { createAutosave } from "../src/editor/autosave.ts";
import type { ApplyResult, Snapshot, Store, StoreState } from "../src/editor/types.ts";
import type { Spec } from "../src/model/index.ts";
import type { AstHandle } from "../src/serialize/ast-handle.ts";
import type { WriteResult } from "../src/serialize/write.ts";

// ── Minimal stub store (does not need a real file; autosave calls store.getState) ──

function makeStubStore(): Store & { _trigger: () => void } {
  const subscribers = new Set<(s: Snapshot) => void>();
  const stubState: StoreState = {
    spec: {} as Spec,
    astHandle: {} as AstHandle,
    diagnostics: [],
    dirty: false,
    filePath: "/tmp/stub.spec.md",
  };

  const store = {
    getState: () => stubState,
    subscribe: (fn: (s: Snapshot) => void) => {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },
    apply: (_: string, __: unknown): Promise<ApplyResult> => {
      throw new Error("stub: not implemented");
    },
    undo: async () => null,
    redo: async () => null,
    flush: async (): Promise<WriteResult> => ({ written: true, diagnostics: [] }),
    // Test helper: manually trigger a subscriber notification (simulates apply)
    _trigger: () => {
      const snapshot: Snapshot = { spec: {} as Spec, diagnostics: [], dirty: true };
      for (const fn of [...subscribers]) fn(snapshot);
    },
  };

  return store;
}

const FIXED_WRITE_RESULT: WriteResult = { written: true, diagnostics: [] };

describe("createAutosave — trailing-edge debounce (EDITOR-04, SERDE-06)", () => {
  let autosave: Autosave | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    autosave?.dispose();
    autosave = undefined;
  });

  it("trailing-edge only: no write within debounce window, exactly 1 write after", () => {
    const store = makeStubStore();
    const writeSpy = vi.fn(async () => FIXED_WRITE_RESULT);

    autosave = createAutosave(store, "/fake/path.spec.md", 500, { write: writeSpy });

    // Trigger one store change (simulates apply())
    store._trigger();

    // Only 100ms have elapsed — trailing-edge has NOT fired yet
    vi.advanceTimersByTime(100);
    expect(writeSpy).toHaveBeenCalledTimes(0);

    // 500ms more (600ms total since apply) — debounce fires
    vi.advanceTimersByTime(500);
    expect(writeSpy).toHaveBeenCalledTimes(1);
  });

  it("coalescing: 10 applies within 100ms → exactly 1 write after debounce (SERDE-06 + EDITOR-04)", () => {
    const store = makeStubStore();
    const writeSpy = vi.fn(async () => FIXED_WRITE_RESULT);

    autosave = createAutosave(store, "/fake/path.spec.md", 500, { write: writeSpy });

    // Simulate 10 rapid applies, 10ms apart
    for (let i = 0; i < 10; i++) {
      store._trigger();
      vi.advanceTimersByTime(10);
    }
    // 100ms elapsed so far — no writes yet (debounce resets each time)
    expect(writeSpy).toHaveBeenCalledTimes(0);

    // 500ms of quiet after the last trigger → exactly 1 write
    vi.advanceTimersByTime(500);
    expect(writeSpy).toHaveBeenCalledTimes(1);
  });

  it("flush(): cancels pending timer and writes immediately", async () => {
    const store = makeStubStore();
    const writeSpy = vi.fn(async () => FIXED_WRITE_RESULT);

    autosave = createAutosave(store, "/fake/path.spec.md", 500, { write: writeSpy });

    // Trigger one store change — timer is pending
    store._trigger();
    expect(writeSpy).toHaveBeenCalledTimes(0);

    // flush() should cancel the timer and write right now
    const result = await autosave.flush();
    expect(writeSpy).toHaveBeenCalledTimes(1);
    expect(result).toEqual(FIXED_WRITE_RESULT);

    // Advance time past debounce — no additional write (timer was cancelled)
    vi.advanceTimersByTime(1000);
    expect(writeSpy).toHaveBeenCalledTimes(1);
  });

  it("dispose(): clears pending timer — no write fires after dispose", () => {
    const store = makeStubStore();
    const writeSpy = vi.fn(async () => FIXED_WRITE_RESULT);

    autosave = createAutosave(store, "/fake/path.spec.md", 500, { write: writeSpy });

    store._trigger();
    autosave.dispose();
    autosave = undefined; // prevent afterEach double-dispose

    // Timer was cancelled by dispose — no write even after debounce window
    vi.advanceTimersByTime(1000);
    expect(writeSpy).toHaveBeenCalledTimes(0);
  });

  it("dispose(): unsubscribes from store — further triggers do not schedule writes", () => {
    const store = makeStubStore();
    const writeSpy = vi.fn(async () => FIXED_WRITE_RESULT);

    autosave = createAutosave(store, "/fake/path.spec.md", 500, { write: writeSpy });
    autosave.dispose();
    autosave = undefined;

    // Trigger after dispose — should be a no-op
    store._trigger();
    vi.advanceTimersByTime(1000);
    expect(writeSpy).toHaveBeenCalledTimes(0);
  });

  it("beforeExit handler: registered on creation, removed on dispose()", () => {
    const store = makeStubStore();
    const writeSpy = vi.fn(async () => FIXED_WRITE_RESULT);

    const onSpy = vi.spyOn(process, "on");
    const offSpy = vi.spyOn(process, "off");

    autosave = createAutosave(store, "/fake/path.spec.md", 500, { write: writeSpy });

    // process.on("beforeExit", ...) must have been called during createAutosave
    const beforeExitOnCalls = onSpy.mock.calls.filter((c) => c[0] === "beforeExit");
    expect(beforeExitOnCalls.length).toBeGreaterThanOrEqual(1);

    autosave.dispose();
    autosave = undefined;

    // process.off("beforeExit", ...) must have been called during dispose()
    const beforeExitOffCalls = offSpy.mock.calls.filter((c) => c[0] === "beforeExit");
    expect(beforeExitOffCalls.length).toBeGreaterThanOrEqual(1);

    onSpy.mockRestore();
    offSpy.mockRestore();
  });
});
