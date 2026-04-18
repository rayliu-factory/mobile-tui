// src/canvas/save-indicator.ts
// Pure function: dirty boolean → save indicator string (D-85).
// Analog: src/emit/wireframe/index.ts (pure function transform).

/**
 * Minimal theme interface for renderSaveIndicator.
 * Compatible with pi-tui's Theme object (which has fg() and bold()).
 */
export interface MinimalTheme {
  fg: (token: string, str: string) => string;
}

/**
 * Render a save indicator glyph via theme tokens (D-85).
 * - dirty=true  → theme.fg("warning", "●")
 * - dirty=false → theme.fg("success", "✓")
 *
 * Theme is applied in the function body, never cached (T-05-06).
 *
 * @param dirty - True if the store has unsaved changes
 * @param theme - Minimal theme interface (pi-tui Theme compatible)
 * @returns A single styled string
 */
export function renderSaveIndicator(dirty: boolean, theme: MinimalTheme): string {
  return dirty ? theme.fg("warning", "●") : theme.fg("success", "✓");
}
