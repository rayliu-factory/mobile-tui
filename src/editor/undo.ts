// src/editor/undo.ts
// Undo/redo stack helpers per D-61/D-64. Pure functions; no internal state.
// Callers (store.ts) own the two arrays; undo.ts provides push/pop/cap logic.
//
// SCOPE:
//   - UndoEntry — typed stack entry (commandName + args + inverseArgs)
//   - UNDO_STACK_CAP = 200 — hard cap per D-64
//   - pushUndo — append with oldest-drop on overflow
//   - clearRedo — in-place empty
//
// THREAT T-04-02 (DoS — undo stack memory): hard cap at 200 via shift() on
// overflow ensures the stack never grows beyond UNDO_STACK_CAP entries.

export interface UndoEntry {
  commandName: string;
  args: unknown;
  inverseArgs: unknown;
}

// Hard cap per D-64: "Hard cap at 200, drop oldest on overflow."
export const UNDO_STACK_CAP = 200;

/**
 * Push an undo entry onto the stack, dropping the oldest entry if the cap
 * is exceeded. Mutates `stack` in-place.
 *
 * D-64: redo stack is cleared on every new apply (callers responsibility);
 * this function handles undo-stack overflow only.
 */
export function pushUndo(stack: UndoEntry[], entry: UndoEntry): void {
  stack.push(entry);
  if (stack.length > UNDO_STACK_CAP) {
    stack.shift(); // drop the oldest entry
  }
}

/**
 * Clear all entries from the redo stack in-place.
 * Called on every successful apply to prevent forking history (D-64).
 */
export function clearRedo(stack: UndoEntry[]): void {
  stack.length = 0;
}
