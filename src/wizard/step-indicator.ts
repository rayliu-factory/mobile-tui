// src/wizard/step-indicator.ts
// Pure function: renders the 2-row step indicator block (D-91).
// Row 0: "Step N/8: [Step name]" (bold if theme supports it)
// Row 1: dot row — ◉ current, ● answered, ○ unanswered

export interface MinimalTheme {
  fg: (token: string, str: string) => string;
  bold?: (str: string) => string;
}

export const STEP_NAMES = [
  "App Idea",
  "Primary User",
  "Navigation Pattern",
  "Screens",
  "Auth",
  "Data",
  "Offline/Sync",
  "Target Platforms",
] as const;

/**
 * Render the step indicator (D-91).
 * @param stepIndex - 0-based current step index (0–7)
 * @param answered  - boolean[8]: true if step i has been answered
 * @param theme     - minimal theme interface for coloring
 * @returns exactly 2 strings: [label row, dot row]
 */
export function renderStepIndicator(
  stepIndex: number,
  answered: boolean[],
  theme: MinimalTheme,
): string[] {
  const label = `Step ${stepIndex + 1}/8: ${STEP_NAMES[stepIndex] ?? ""}`;
  const row1 = theme.bold ? theme.bold(label) : label;
  const dots = Array.from({ length: 8 }, (_, i) => {
    if (i === stepIndex) return theme.fg("accent", "◉");
    if (answered[i]) return theme.fg("success", "●");
    return theme.fg("muted", "○");
  });
  return [row1, dots.join(" ")];
}
