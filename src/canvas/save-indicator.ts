// src/canvas/save-indicator.ts
// Pure function: dirty boolean → save indicator string.
// Analog: src/emit/wireframe/index.ts (pure function transform).
// Implementation lands in Phase 5 plan 02.

/**
 * Render a save indicator glyph.
 * Returns "●" (dirty) or "✓" (clean), styled by theme.
 * @param dirty - True if the store has unsaved changes
 * @param theme - pi-tui theme object (typed as unknown at stub stage)
 * @returns A single styled string (empty stub — NYI)
 */
export function renderSaveIndicator(dirty: boolean, theme: unknown): string {
  return "";
}
