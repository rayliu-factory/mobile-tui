// Tests for createStore (Plan 04-01) — EDITOR-01 (reactive store) + D-50
// (hand-rolled signal) + D-61..D-64 (undo/redo discipline).
//
// Test shape mirrors src/primitives/diagnostic.test.ts (grouped describe per concern).
// The A1 canary test validates the D-62 AST-invert assumption before 34 commands
// depend on it (research §2, assumption A1).
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { Diagnostic } from "../primitives/diagnostic.ts";
import type { AstHandle } from "../serialize/ast-handle.ts";
import { parseSpecFile } from "../serialize/parse.ts";
import { writeSpecFile } from "../serialize/write.ts";
import type { Spec } from "../model/index.ts";
import { createStore } from "./store.ts";
import { EDITOR_CODES } from "./diagnostics.ts";
import type { Snapshot } from "./types.ts";

const TMP_DIR = resolve(process.cwd(), "tests", "tmp");
const FIXTURE = resolve(process.cwd(), "fixtures", "habit-tracker.spec.md");

// --------------------------------------------------------------------------
// Helper: minimal stub command for subscribe/apply tests
// --------------------------------------------------------------------------
const stubArgs = z.object({ tag: z.string() });
const stubCommand = {
  name: "stub",
  argsSchema: stubArgs,
  apply: (spec: Spec, _astHandle: AstHandle, _args: z.infer<typeof stubArgs>) => {
    // pure stub — no real AST mutation; just proves the pipeline works
    return { spec, inverseArgs: { tag: _args.tag } };
  },
  invert: (spec: Spec, _astHandle: AstHandle, _inverseArgs: unknown) => {
    return { spec };
  },
};

// --------------------------------------------------------------------------
// describe: subscribe / unsubscribe
// --------------------------------------------------------------------------
describe("subscribe / unsubscribe", () => {
  it("returns an unsubscribe function", async () => {
    const parsed = await parseSpecFile(FIXTURE);
    if (!parsed.spec || !parsed.astHandle) throw new Error("fixture failed to parse");
    const store = createStore(
      { spec: parsed.spec, astHandle: parsed.astHandle, filePath: FIXTURE },
      { stub: stubCommand },
    );
    const fn = vi.fn();
    const unsub = store.subscribe(fn);
    expect(typeof unsub).toBe("function");
  });

  it("subscriber is called on apply", async () => {
    const parsed = await parseSpecFile(FIXTURE);
    if (!parsed.spec || !parsed.astHandle) throw new Error("fixture failed to parse");
    const store = createStore(
      { spec: parsed.spec, astHandle: parsed.astHandle, filePath: FIXTURE },
      { stub: stubCommand },
    );
    const fn = vi.fn();
    store.subscribe(fn);
    await store.apply("stub", { tag: "hello" });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("unsubscribe removes the listener so it does not fire again", async () => {
    const parsed = await parseSpecFile(FIXTURE);
    if (!parsed.spec || !parsed.astHandle) throw new Error("fixture failed to parse");
    const store = createStore(
      { spec: parsed.spec, astHandle: parsed.astHandle, filePath: FIXTURE },
      { stub: stubCommand },
    );
    const fn = vi.fn();
    const unsub = store.subscribe(fn);
    unsub();
    await store.apply("stub", { tag: "after-unsub" });
    expect(fn).not.toHaveBeenCalled();
  });

  it("double-unsubscribe is idempotent (does not throw)", async () => {
    const parsed = await parseSpecFile(FIXTURE);
    if (!parsed.spec || !parsed.astHandle) throw new Error("fixture failed to parse");
    const store = createStore(
      { spec: parsed.spec, astHandle: parsed.astHandle, filePath: FIXTURE },
      { stub: stubCommand },
    );
    const fn = vi.fn();
    const unsub = store.subscribe(fn);
    unsub();
    expect(() => unsub()).not.toThrow();
  });
});

// --------------------------------------------------------------------------
// describe: notify snapshot discipline
// --------------------------------------------------------------------------
describe("notify snapshot discipline", () => {
  it("subscriber added during notification is NOT called in the same tick", async () => {
    const parsed = await parseSpecFile(FIXTURE);
    if (!parsed.spec || !parsed.astHandle) throw new Error("fixture failed to parse");
    const store = createStore(
      { spec: parsed.spec, astHandle: parsed.astHandle, filePath: FIXTURE },
      { stub: stubCommand },
    );

    const lateAdded = vi.fn();
    const earlyFn = vi.fn(() => {
      // Add a new subscriber during notification — should NOT be called THIS tick
      store.subscribe(lateAdded);
    });

    store.subscribe(earlyFn);
    await store.apply("stub", { tag: "x" });

    expect(earlyFn).toHaveBeenCalledTimes(1);
    // lateAdded was added DURING the notification — must not fire in same tick
    expect(lateAdded).toHaveBeenCalledTimes(0);
  });

  it("subscriber error does not prevent other subscribers from firing", async () => {
    const parsed = await parseSpecFile(FIXTURE);
    if (!parsed.spec || !parsed.astHandle) throw new Error("fixture failed to parse");
    const store = createStore(
      { spec: parsed.spec, astHandle: parsed.astHandle, filePath: FIXTURE },
      { stub: stubCommand },
    );

    const errorFn = vi.fn(() => { throw new Error("subscriber error"); });
    const goodFn = vi.fn();

    store.subscribe(errorFn);
    store.subscribe(goodFn);

    await store.apply("stub", { tag: "error-test" });

    expect(errorFn).toHaveBeenCalledTimes(1);
    expect(goodFn).toHaveBeenCalledTimes(1);
  });
});

// --------------------------------------------------------------------------
// describe: apply pipeline
// --------------------------------------------------------------------------
describe("apply pipeline", () => {
  it("unknown command → ok:false + EDITOR_COMMAND_NOT_FOUND diagnostic", async () => {
    const parsed = await parseSpecFile(FIXTURE);
    if (!parsed.spec || !parsed.astHandle) throw new Error("fixture failed to parse");
    const store = createStore(
      { spec: parsed.spec, astHandle: parsed.astHandle, filePath: FIXTURE },
      {},
    );
    const result = await store.apply("no-such-command", {});
    expect(result.ok).toBe(false);
    expect(result.diagnostics.some((d) => d.code === EDITOR_CODES.EDITOR_COMMAND_NOT_FOUND)).toBe(true);
  });

  it("invalid args → ok:false + EDITOR_COMMAND_ARG_INVALID diagnostic", async () => {
    const parsed = await parseSpecFile(FIXTURE);
    if (!parsed.spec || !parsed.astHandle) throw new Error("fixture failed to parse");
    const store = createStore(
      { spec: parsed.spec, astHandle: parsed.astHandle, filePath: FIXTURE },
      { stub: stubCommand },
    );
    // tag must be string; pass number to fail Zod parse
    const result = await store.apply("stub", { tag: 42 });
    expect(result.ok).toBe(false);
    expect(result.diagnostics.some((d) => d.code === EDITOR_CODES.EDITOR_COMMAND_ARG_INVALID)).toBe(true);
  });

  it("known command with valid args → ok:true, subscriber notified", async () => {
    const parsed = await parseSpecFile(FIXTURE);
    if (!parsed.spec || !parsed.astHandle) throw new Error("fixture failed to parse");
    const store = createStore(
      { spec: parsed.spec, astHandle: parsed.astHandle, filePath: FIXTURE },
      { stub: stubCommand },
    );
    const snapshots: Snapshot[] = [];
    store.subscribe((s) => snapshots.push(s));

    const result = await store.apply("stub", { tag: "ok" });
    expect(result.ok).toBe(true);
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]?.spec).toBeDefined();
  });

  it("diagnostics are published synchronously inside apply (one-tick)", async () => {
    const parsed = await parseSpecFile(FIXTURE);
    if (!parsed.spec || !parsed.astHandle) throw new Error("fixture failed to parse");
    const store = createStore(
      { spec: parsed.spec, astHandle: parsed.astHandle, filePath: FIXTURE },
      { stub: stubCommand },
    );
    let received: Diagnostic[] | null = null;
    store.subscribe((s) => { received = s.diagnostics; });
    await store.apply("stub", { tag: "timing" });
    // Must be non-null synchronously after await (the await is the microtask boundary)
    expect(received).not.toBeNull();
  });
});

// --------------------------------------------------------------------------
// describe: undo / redo
// --------------------------------------------------------------------------
describe("undo / redo", () => {
  it("undo returns null when stack is empty", async () => {
    const parsed = await parseSpecFile(FIXTURE);
    if (!parsed.spec || !parsed.astHandle) throw new Error("fixture failed to parse");
    const store = createStore(
      { spec: parsed.spec, astHandle: parsed.astHandle, filePath: FIXTURE },
      { stub: stubCommand },
    );
    const result = await store.undo();
    expect(result).toBeNull();
  });

  it("redo returns null when stack is empty", async () => {
    const parsed = await parseSpecFile(FIXTURE);
    if (!parsed.spec || !parsed.astHandle) throw new Error("fixture failed to parse");
    const store = createStore(
      { spec: parsed.spec, astHandle: parsed.astHandle, filePath: FIXTURE },
      { stub: stubCommand },
    );
    const result = await store.redo();
    expect(result).toBeNull();
  });

  it("undo/redo: apply then undo calls invert; redo re-applies", async () => {
    const parsed = await parseSpecFile(FIXTURE);
    if (!parsed.spec || !parsed.astHandle) throw new Error("fixture failed to parse");

    const applySpy = vi.fn((spec: Spec) => ({ spec, inverseArgs: { was: "before" } }));
    const invertSpy = vi.fn((spec: Spec) => ({ spec }));
    const spyCommand = {
      name: "spy",
      argsSchema: z.object({ v: z.string() }),
      apply: applySpy,
      invert: invertSpy,
    };

    const store = createStore(
      { spec: parsed.spec, astHandle: parsed.astHandle, filePath: FIXTURE },
      { spy: spyCommand },
    );

    await store.apply("spy", { v: "one" });
    expect(applySpy).toHaveBeenCalledTimes(1);

    await store.undo();
    expect(invertSpy).toHaveBeenCalledTimes(1);

    await store.redo();
    expect(applySpy).toHaveBeenCalledTimes(2);
  });

  it("new apply clears the redo stack (D-64)", async () => {
    const parsed = await parseSpecFile(FIXTURE);
    if (!parsed.spec || !parsed.astHandle) throw new Error("fixture failed to parse");
    const store = createStore(
      { spec: parsed.spec, astHandle: parsed.astHandle, filePath: FIXTURE },
      { stub: stubCommand },
    );

    await store.apply("stub", { tag: "a" });
    await store.undo();
    // Now redo has one entry. Apply again should clear it.
    await store.apply("stub", { tag: "b" });
    const redoResult = await store.redo();
    expect(redoResult).toBeNull(); // redo stack was cleared
  });

  it("getState reflects current spec", async () => {
    const parsed = await parseSpecFile(FIXTURE);
    if (!parsed.spec || !parsed.astHandle) throw new Error("fixture failed to parse");
    const store = createStore(
      { spec: parsed.spec, astHandle: parsed.astHandle, filePath: FIXTURE },
      { stub: stubCommand },
    );
    const state = store.getState();
    expect(state.spec).toBeDefined();
    expect(state.dirty).toBe(false);
  });
});

// --------------------------------------------------------------------------
// describe: A1 canary (D-62 AST invert)
// --------------------------------------------------------------------------
// The plan requires: add-screen + undo → byte-identical round-trip with writeSpecFile.
// This validates assumption A1 (doc.createNode deterministic re-stringification).
// If this test fails, Strategy B fallback must be adopted (snapshot full YAML source).
describe("A1 canary (D-62 AST invert — byte-identical round-trip)", () => {
  let tmpFile: string;

  beforeEach(async () => {
    await fs.mkdir(TMP_DIR, { recursive: true });
    tmpFile = join(TMP_DIR, `a1-canary-${randomUUID()}.spec.md`);
  });

  afterEach(async () => {
    await fs.rm(tmpFile, { force: true }).catch(() => undefined);
  });

  it("add-screen + undo → written bytes === original bytes", async () => {
    const originalBytes = await fs.readFile(FIXTURE);
    const parsed = await parseSpecFile(FIXTURE);
    if (!parsed.spec || !parsed.astHandle) throw new Error("fixture failed to parse");

    // Stub addScreen command that operates on BOTH spec and AST (D-62)
    const addScreenArgs = z.object({ id: z.string(), title: z.string() });
    const addScreenCommand = {
      name: "add-screen",
      argsSchema: addScreenArgs,
      apply: (spec: Spec, astHandle: AstHandle, args: z.infer<typeof addScreenArgs>) => {
        const insertedIndex = spec.screens.length;
        const newScreen = {
          id: args.id,
          title: args.title,
          kind: "regular" as const,
          variants: {
            content: { kind: "content" as const, tree: [] },
            empty: null,
            loading: null,
            error: null,
          },
        };
        const newSpec: Spec = { ...spec, screens: [...spec.screens, newScreen] };

        // D-62: AST-level edit in addition to spec-level
        astHandle.doc.addIn(["screens"], astHandle.doc.createNode(newScreen));

        return { spec: newSpec, inverseArgs: { insertedIndex } };
      },
      invert: (spec: Spec, astHandle: AstHandle, inverseArgs: unknown) => {
        const { insertedIndex } = inverseArgs as { insertedIndex: number };
        const newScreens = spec.screens.slice(0, insertedIndex);
        const newSpec: Spec = { ...spec, screens: newScreens };

        // D-62: reverse the AST-level edit
        astHandle.doc.deleteIn(["screens", insertedIndex]);

        return { spec: newSpec };
      },
    };

    const store = createStore(
      { spec: parsed.spec, astHandle: parsed.astHandle, filePath: FIXTURE },
      { "add-screen": addScreenCommand },
    );

    // Apply: add a screen
    const applyResult = await store.apply("add-screen", { id: "a1_test_screen", title: "A1 Test" });
    expect(applyResult.ok).toBe(true);

    // Undo: remove the screen
    const undoResult = await store.undo();
    expect(undoResult).not.toBeNull();

    // Write to tmp file and compare bytes
    const state = store.getState();
    const writeResult = await writeSpecFile(tmpFile, state.spec, state.astHandle);
    expect(writeResult.written).toBe(true);

    const writtenBytes = await fs.readFile(tmpFile);
    const byteIdentical = originalBytes.equals(writtenBytes);

    if (!byteIdentical) {
      console.error(
        "[A1 canary] DRIFT DETECTED — Strategy B fallback required!\n" +
          "--- ORIGINAL ---\n" + originalBytes.toString("utf8").slice(0, 500) +
          "\n--- WRITTEN ---\n" + writtenBytes.toString("utf8").slice(0, 500),
      );
    }

    // NOTE: if this assertion fails, see research §2 Strategy B fallback.
    // The plan says: if A1 fails, flag for Strategy B and document.
    expect(byteIdentical).toBe(true);
  });
});
