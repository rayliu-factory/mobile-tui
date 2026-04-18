// src/canvas/focus-fsm.ts
// Focus state machine for the canvas 3-pane layout (D-77).
// Pure functions: no side effects, no imports from pi-tui.
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
 * Advance (or reverse) the focus cycle (D-77).
 * If the current state is "palette", return "screens" (palette collapses back
 * to the base cycle starting point).
 */
export function nextFocus(state: FocusState, reverse = false): FocusState {
  if (state === "palette") return "screens";
  const idx = FOCUS_CYCLE.indexOf(state);
  if (idx === -1) return "screens";
  const next = reverse
    ? (idx - 1 + FOCUS_CYCLE.length) % FOCUS_CYCLE.length
    : (idx + 1) % FOCUS_CYCLE.length;
  // next is always a valid index: modulo of FOCUS_CYCLE.length bounds it
  const result = FOCUS_CYCLE[next];
  if (result === undefined) return "screens";
  return result;
}
