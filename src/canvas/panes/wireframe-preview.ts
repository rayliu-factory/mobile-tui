// src/canvas/panes/wireframe-preview.ts
// Right pane: live wireframe preview for the active screen.
// Analog: src/emit/wireframe/index.ts (renderSingleVariant call site) +
//         scripts/render-wireframe.ts (call pattern).
// Implementation lands in Phase 5 plan 04.

import type { Snapshot } from "../../editor/types.ts";

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
 * Right pane: renders the wireframe for the currently-selected screen.
 *
 * Read-only in Phase 5. Always shows the "content" variant (D-73).
 * Line cache is invalidated on every `update()` call.
 */
export class WireframePreviewPane implements Component {
  private snapshot: Snapshot | null = null;
  private activeScreenId: string | null = null;

  /**
   * Push a new snapshot + active screen into the pane.
   * Clears the line cache so `render()` recomputes.
   */
  update(snapshot: Snapshot, screenId: string): void {
    this.snapshot = snapshot;
    this.activeScreenId = screenId;
    // NYI: invalidate line cache on implementation
  }

  /**
   * @returns An empty array (NYI — implementation lands in Phase 5 plan 04).
   */
  render(width: number): string[] {
    return [];
  }

  invalidate(): void {
    // NYI
  }
}
