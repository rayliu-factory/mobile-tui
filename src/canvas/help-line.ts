// src/canvas/help-line.ts
// Pure function: FocusState → single-line help string.
// Analog: src/emit/wireframe/index.ts (pure function transform).
// Implementation lands in Phase 5 plan 02.

import type { FocusState } from "./focus-fsm.ts";

/**
 * Render a context-sensitive help line for the current focus state.
 * @param focus - Current canvas focus state
 * @param width - Terminal width in columns
 * @returns A single string (empty stub — NYI)
 */
export function renderHelpLine(focus: FocusState, width: number): string {
  return "";
}
