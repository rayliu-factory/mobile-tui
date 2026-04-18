// src/canvas/focus-fsm.ts
// Focus state machine for the canvas TUI shell.
// Pure functions only — no side effects, no imports from pi-tui.
// Analog: src/editor/undo.ts (pure state-transition pattern).

/**
 * The four focus states in the canvas.
 * "palette" is a modal overlay — it closes back to the previous pane,
 * not via the FOCUS_CYCLE (D-78).
 */
export type FocusState = "screens" | "inspector" | "preview" | "palette";

/**
 * Tab/Shift-Tab cycle order.
 * "palette" is intentionally excluded — it opens as an overlay on `:` / Ctrl+P
 * and closes back to the prior pane on Esc.
 */
export const FOCUS_CYCLE: FocusState[] = ["screens", "inspector", "preview"];

/**
 * Advance (or reverse) the focus cycle.
 * If the current state is "palette", return "screens" (palette collapses).
 * @throws {Error} NYI — implementation lands in Phase 5 plan 02.
 */
export function nextFocus(state: FocusState, reverse = false): FocusState {
  throw new Error("NYI: nextFocus");
}
