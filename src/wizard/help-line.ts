// src/wizard/help-line.ts
// Pure function: renders the context-aware wizard help line (D-102).
// Step 1 (index 0): omits "[esc] back" (no previous step).
// Steps 2–8 (index 1–7): include "[esc] back".

import { truncateToWidth } from "../canvas/tui-utils.ts";

export const HELP_STEP_1 =
  "[tab] next  [ctrl+g] canvas  [ctrl+z] undo  [ctrl+q] quit";
export const HELP_STEPS_2_8 =
  "[tab] next  [esc] back  [ctrl+g] canvas  [ctrl+z] undo  [ctrl+q] quit";

/**
 * Render the wizard help line (D-102).
 * @param stepIndex - 0-based step index (0 = first step, no back)
 * @param width     - terminal width in columns
 * @returns single string truncated to at most `width` visible characters
 */
export function renderWizardHelpLine(stepIndex: number, width: number): string {
  const str = stepIndex === 0 ? HELP_STEP_1 : HELP_STEPS_2_8;
  return truncateToWidth(str, width);
}
