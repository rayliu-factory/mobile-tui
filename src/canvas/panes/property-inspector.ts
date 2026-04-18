// src/canvas/panes/property-inspector.ts
// Middle pane: field-level editor for the active screen's properties.
// CRITICAL: Implements Focusable so pi-tui can propagate keyboard focus to
// the embedded Input widget (RESEARCH.md Pitfall 3).
// Analog: src/editor/store.ts (Snapshot consumption).
// Implementation lands in Phase 5 plan 03.

import type { Store } from "../../editor/types.ts";

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
 * Minimal Focusable interface (mirrors @mariozechner/pi-tui).
 * REQUIRED: Container with embedded Input MUST implement Focusable (Pitfall 3).
 */
interface Focusable {
  focused: boolean;
}

/**
 * Middle pane: shows editable fields for the currently-selected screen.
 *
 * Implements Focusable to propagate focus correctly to the embedded
 * Input widget when a field is being edited (D-71).
 */
export class PropertyInspectorPane implements Component, Focusable {
  focused = false;

  constructor(
    private readonly store: Store,
    private readonly getActiveScreenId: () => string | null,
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
