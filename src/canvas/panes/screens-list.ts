// src/canvas/panes/screens-list.ts
// Left pane: list of screens in the active spec.
// Analog: src/editor/store.ts (subscription pattern) +
//         tests/autosave-debounce.test.ts (stub-store pattern).
// Implementation lands in Phase 5 plan 03.

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
 * Left pane: renders an interactive list of spec screens.
 *
 * Selection changes are reported immediately via `onSelect` (D-80:
 * immediate selection on j/k via onSelectionChange, NOT onSelect).
 */
export class ScreensListPane implements Component {
  constructor(
    private readonly onSelect: (screenId: string) => void,
    private readonly theme: unknown,
  ) {}

  /**
   * @returns An empty array (NYI — implementation lands in Phase 5 plan 03).
   */
  render(width: number): string[] {
    return [];
  }

  handleInput(data: string): void {
    // NYI
  }

  invalidate(): void {
    // NYI
  }
}
