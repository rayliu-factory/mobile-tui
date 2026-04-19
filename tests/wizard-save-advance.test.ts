// tests/wizard-save-advance.test.ts — WIZARD-02 save-on-advance
import { describe, expect, it, vi } from "vitest";
import type { ApplyResult, Snapshot, Store, StoreState } from "../src/editor/types.ts";
import type { Spec } from "../src/model/index.ts";
import type { AstHandle } from "../src/serialize/ast-handle.ts";
import type { WriteResult } from "../src/serialize/write.ts";
import { WizardRoot } from "../src/wizard/root.ts";
import { createSeedSpec } from "../src/wizard/seed-spec.ts";

// ── Stub store with apply spy ─────────────────────────────────────────────────

function makeWizardStubStore(): {
  store: Store;
  applySpy: ReturnType<typeof vi.fn>;
  flushSpy: ReturnType<typeof vi.fn>;
} {
  const subscribers = new Set<(s: Snapshot) => void>();
  const spec: Spec = createSeedSpec();

  const stubState: StoreState = {
    spec,
    astHandle: {} as AstHandle,
    diagnostics: [],
    dirty: false,
  };

  const applySpy = vi.fn(
    async (_name: string, _args: unknown): Promise<ApplyResult> => ({
      spec,
      diagnostics: [],
      ok: true,
    }),
  );

  const flushSpy = vi.fn(async (): Promise<WriteResult> => ({ written: true, diagnostics: [] }));

  const store: Store = {
    getState: () => stubState,
    subscribe: (fn: (s: Snapshot) => void) => {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },
    apply: applySpy,
    undo: async () => null,
    redo: async () => null,
    flush: flushSpy,
  };

  return { store, applySpy, flushSpy };
}

const mockTheme = { fg: (_token: string, str: string) => str };

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("wizard save-on-advance (WIZARD-02)", () => {
  it("Tab on step 0 calls store.apply('set-wizard-app-idea', { value })", async () => {
    const { store, applySpy } = makeWizardStubStore();
    const root = new WizardRoot(store, { theme: mockTheme });

    // Type input for step 0 (App Idea)
    for (const ch of "My App") root.handleInput(ch);

    // Tab to advance
    root.handleInput("\t");
    await new Promise((r) => setTimeout(r, 10));

    expect(applySpy).toHaveBeenCalledWith("set-wizard-app-idea", { value: "My App" });
  });

  it("Esc on step 1 does NOT call store.apply (D-95: save only on advance)", async () => {
    const { store, applySpy } = makeWizardStubStore();
    const root = new WizardRoot(store, { theme: mockTheme });

    // Advance to step 1 first
    for (const ch of "My App") root.handleInput(ch);
    root.handleInput("\t");
    await new Promise((r) => setTimeout(r, 10));
    const callsAfterAdvance = applySpy.mock.calls.length;

    // Now on step 1, press Esc (retreat — no apply)
    root.handleInput("\x1b");
    await new Promise((r) => setTimeout(r, 10));

    // No additional apply calls
    expect(applySpy.mock.calls.length).toBe(callsAfterAdvance);
  });

  it("store.undo() is called when Ctrl+Z pressed", async () => {
    const { store } = makeWizardStubStore();
    const undoSpy = vi.spyOn(store, "undo");
    const root = new WizardRoot(store, { theme: mockTheme });

    root.handleInput("\x1a"); // Ctrl+Z
    await new Promise((r) => setTimeout(r, 10));

    expect(undoSpy).toHaveBeenCalledTimes(1);
  });

  it("Ctrl+Q calls onQuit callback", async () => {
    const { store } = makeWizardStubStore();
    const root = new WizardRoot(store, { theme: mockTheme });

    const quitSpy = vi.fn();
    root.onQuit = quitSpy;

    root.handleInput("\x11"); // Ctrl+Q
    await new Promise((r) => setTimeout(r, 10));

    expect(quitSpy).toHaveBeenCalledTimes(1);
  });

  it("Tab on step 0 with empty input does NOT call store.apply", async () => {
    const { store, applySpy } = makeWizardStubStore();
    const root = new WizardRoot(store, { theme: mockTheme });

    // Tab without typing anything
    root.handleInput("\t");
    await new Promise((r) => setTimeout(r, 10));

    expect(applySpy).not.toHaveBeenCalled();
    // stepCursor stays at 0
    expect(root.getStepCursor()).toBe(0);
  });
});
