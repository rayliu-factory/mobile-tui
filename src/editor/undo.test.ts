// Tests for undo/redo stack helpers (Plan 04-01) — D-61/D-64 disciplines.
// EDITOR-03: undo stack ≥200 steps, hard cap at 200 with oldest-drop on overflow.
//
// Test shape mirrors src/primitives/diagnostic.test.ts (grouped describe per concern).
import { describe, expect, it } from "vitest";
import { UNDO_STACK_CAP, clearRedo, pushUndo } from "./undo.ts";
import type { UndoEntry } from "./undo.ts";

function makeEntry(n: number): UndoEntry {
  return { commandName: `cmd-${n}`, args: { n }, inverseArgs: { prev: n - 1 } };
}

describe("UNDO_STACK_CAP", () => {
  it("is 200", () => {
    expect(UNDO_STACK_CAP).toBe(200);
  });
});

describe("pushUndo", () => {
  it("appends an entry to an empty stack", () => {
    const stack: UndoEntry[] = [];
    pushUndo(stack, makeEntry(1));
    expect(stack).toHaveLength(1);
    expect(stack[0]?.commandName).toBe("cmd-1");
  });

  it("appends multiple entries in order", () => {
    const stack: UndoEntry[] = [];
    pushUndo(stack, makeEntry(1));
    pushUndo(stack, makeEntry(2));
    pushUndo(stack, makeEntry(3));
    expect(stack).toHaveLength(3);
    expect(stack[2]?.commandName).toBe("cmd-3");
  });

  it("does not overflow below cap (199 entries stays at 199)", () => {
    const stack: UndoEntry[] = [];
    for (let i = 0; i < 199; i++) pushUndo(stack, makeEntry(i));
    expect(stack).toHaveLength(199);
    expect(stack[0]?.commandName).toBe("cmd-0");
  });

  it("stays at 200 when pushing exactly the 200th entry", () => {
    const stack: UndoEntry[] = [];
    for (let i = 0; i < 200; i++) pushUndo(stack, makeEntry(i));
    expect(stack).toHaveLength(200);
    expect(stack[0]?.commandName).toBe("cmd-0");
  });

  it("drops the oldest entry on the 201st push — length stays at 200", () => {
    const stack: UndoEntry[] = [];
    for (let i = 0; i < 201; i++) pushUndo(stack, makeEntry(i));
    // Oldest (cmd-0) must be dropped; cmd-1 is now first
    expect(stack).toHaveLength(200);
    expect(stack[0]?.commandName).toBe("cmd-1");
    expect(stack[199]?.commandName).toBe("cmd-200");
  });

  it("continues dropping on repeated overflow (push 300 entries, keep last 200)", () => {
    const stack: UndoEntry[] = [];
    for (let i = 0; i < 300; i++) pushUndo(stack, makeEntry(i));
    expect(stack).toHaveLength(200);
    expect(stack[0]?.commandName).toBe("cmd-100");
    expect(stack[199]?.commandName).toBe("cmd-299");
  });
});

describe("clearRedo", () => {
  it("empties a populated array in-place (same reference, length === 0)", () => {
    const stack: UndoEntry[] = [makeEntry(1), makeEntry(2), makeEntry(3)];
    const ref = stack;
    clearRedo(stack);
    expect(stack).toBe(ref); // same array reference
    expect(stack).toHaveLength(0);
  });

  it("is idempotent on an already-empty array", () => {
    const stack: UndoEntry[] = [];
    clearRedo(stack);
    expect(stack).toHaveLength(0);
  });
});
