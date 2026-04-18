// src/canvas/help-line.ts
// Pure function: FocusState → single-line help string (D-84).
// Analog: src/emit/wireframe/index.ts (pure function transform).

import type { FocusState } from "./focus-fsm.ts";
import { truncateToWidth } from "./tui-utils.ts";

/**
 * Exact D-84 help strings per focus state.
 * These strings are baked in at module level (not in a constructor) per T-05-06.
 */
const HELP: Record<FocusState, string> = {
  screens: "[j/k] navigate  [tab] next pane  [ctrl+p] palette  [ctrl+z] undo  [ctrl+q] quit",
  inspector:
    "[j/k] navigate  [enter] edit  [tab] next pane  [ctrl+p] palette  [ctrl+z] undo  [ctrl+q] quit",
  preview: "[tab] next pane  [ctrl+p] palette  [ctrl+z] undo  [ctrl+q] quit",
  palette: "[↑↓] navigate  [enter] select  [esc] cancel",
};

/**
 * Render a context-sensitive help line for the current focus state.
 * Uses truncateToWidth (ANSI-safe) to ensure the result never exceeds `width`.
 * @param focus - Current canvas focus state
 * @param width - Terminal width in columns
 * @returns A single string truncated to at most `width` visible characters
 */
export function renderHelpLine(focus: FocusState, width: number): string {
  return truncateToWidth(HELP[focus], width);
}
