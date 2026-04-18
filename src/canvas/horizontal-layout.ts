// src/canvas/horizontal-layout.ts
// Horizontal compositor for three-pane layout.
// CRITICAL: pi-tui Container only stacks VERTICALLY — this is the horizontal
// compositor required for side-by-side panes (RESEARCH.md Pattern 3).
// Analog: src/emit/wireframe/index.ts (string[] composition).
// Implementation lands in Phase 5 plan 02.

/**
 * Minimal Component interface (mirrors @mariozechner/pi-tui).
 * Used as a local type alias so stubs compile without importing pi-tui.
 */
interface Component {
  render(width: number): string[];
  handleInput?(data: string): void;
  invalidate(): void;
}

/**
 * A pane specification: a component and its pre-computed column width.
 */
export interface PaneSpec {
  component: Component;
  /** Pre-computed by calcPaneWidths() */
  width: number;
}

/**
 * Compute the [screensWidth, inspectorWidth, previewWidth] column widths
 * for the three-pane layout, given the total terminal width.
 *
 * At width < 75, preview collapses to 0 columns (D-83).
 *
 * @throws {Error} NYI — implementation lands in Phase 5 plan 02.
 */
export function calcPaneWidths(total: number): [number, number, number] {
  throw new Error("NYI: calcPaneWidths");
}

/**
 * Horizontal compositor: renders N panes side-by-side into a string array.
 *
 * Each pane renders independently to string[] then the compositor stitches
 * them into single-width-bounded lines row by row.
 */
export class HorizontalLayout implements Component {
  constructor(private readonly panes: PaneSpec[]) {}

  /**
   * @returns An empty array (NYI — implementation lands in Phase 5 plan 02).
   */
  render(width: number): string[] {
    return [];
  }

  invalidate(): void {
    for (const p of this.panes) {
      p.component.invalidate();
    }
  }
}
