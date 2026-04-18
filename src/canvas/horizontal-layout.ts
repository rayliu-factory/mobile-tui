// src/canvas/horizontal-layout.ts
// Horizontal compositor for three-pane layout.
// CRITICAL: pi-tui Container only stacks VERTICALLY — this is the horizontal
// compositor required for side-by-side panes (RESEARCH.md Pattern 3).
// Analog: src/emit/wireframe/index.ts (string[] composition).

import { truncateToWidth } from "./tui-utils.ts";

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
 * Minimal theme interface for drawBorderedPane.
 * Compatible with pi-tui's Theme object.
 */
export interface MinimalTheme {
  fg: (token: string, str: string) => string;
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
 * Proportions: 20% screens / absorb remainder inspector / 40% preview.
 * Minimums: 15 screens / 30 preview (D-83).
 * At width < 75, preview collapses to 0 columns.
 *
 * The inspector always absorbs rounding remainder so widths sum exactly to total
 * (T-05-05 mitigation — never floor the inspector).
 */
export function calcPaneWidths(total: number): [number, number, number] {
  if (total < 75) {
    const screens = Math.max(15, Math.floor(total * 0.2));
    return [screens, total - screens, 0];
  }
  const screens = Math.max(15, Math.floor(total * 0.2));
  const preview = Math.max(30, Math.floor(total * 0.4));
  const inspector = total - screens - preview; // absorbs rounding — never floor this
  return [screens, inspector, preview];
}

/**
 * Draw a bordered pane with focus-aware coloring (D-79).
 *
 * Focused pane:   accent-colored border  ┌─...─┐ / └─...─┘
 * Unfocused pane: muted-colored border   ┌─...─┐ / └─...─┘
 *
 * Interior `lines` are passed through unchanged (no padding from this function).
 *
 * @param lines   - Content lines from the pane's render()
 * @param focused - True if this pane currently has focus
 * @param theme   - Theme interface for coloring
 * @param width   - Total column width of the pane (including borders)
 * @returns New line array: [top-border, ...lines, bottom-border]
 */
export function drawBorderedPane(
  lines: string[],
  focused: boolean,
  theme: MinimalTheme,
  width: number,
): string[] {
  const color = (s: string) => (focused ? theme.fg("accent", s) : theme.fg("muted", s));
  const inner = Math.max(0, width - 2);
  const top = color(`┌${"─".repeat(inner)}┐`);
  const bottom = color(`└${"─".repeat(inner)}┘`);
  return [top, ...lines, bottom];
}

/**
 * Horizontal compositor: renders N panes side-by-side into a string array.
 *
 * Each pane renders independently to string[] at its pre-computed width,
 * then lines are stitched together row-by-row using truncateToWidth with
 * pad=true to ensure every pane fills exactly its allocated columns.
 *
 * Panes with width=0 (collapsed) are skipped entirely (D-83 preview collapse).
 *
 * Line-width contract: every output line has visibleWidth <= total width.
 * truncateToWidth(line, paneWidth, "", true) enforces this per pane (T-05-04).
 */
export class HorizontalLayout implements Component {
  constructor(
    private readonly panes: PaneSpec[],
    private readonly theme: MinimalTheme,
  ) {}

  /**
   * Render panes side-by-side.
   *
   * @param _width       - Total available width (each pane uses its own pre-computed width)
   * @param focusedIndex - Index into active panes for focus border (D-79);
   *                       -1 means no pane is focused
   */
  render(_width: number, focusedIndex = -1): string[] {
    // Skip collapsed panes (width=0)
    const activePanes = this.panes.filter((p) => p.width > 0);
    if (activePanes.length === 0) return [];

    // Render each active pane at its pre-computed width, then wrap with border
    const lineArrays = activePanes.map((p, colIdx) => {
      const paneLines = p.component.render(p.width);
      return drawBorderedPane(paneLines, colIdx === focusedIndex, this.theme, p.width);
    });

    const maxLines = Math.max(0, ...lineArrays.map((a) => a.length));
    const result: string[] = [];

    for (let row = 0; row < maxLines; row++) {
      let line = "";
      for (let col = 0; col < activePanes.length; col++) {
        const paneLines = lineArrays[col];
        const paneSpec = activePanes[col];
        if (paneLines === undefined || paneSpec === undefined) continue;
        const paneWidth = paneSpec.width;
        const paneLine = paneLines[row] ?? " ".repeat(paneWidth);
        // truncateToWidth pad=true: fills to exact width, prevents line-width throws
        line += truncateToWidth(paneLine, paneWidth, "", true);
      }
      result.push(line);
    }

    return result;
  }

  invalidate(): void {
    for (const p of this.panes) {
      p.component.invalidate();
    }
  }
}
