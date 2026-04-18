// src/canvas/palette/index.ts
// Command palette overlay: filter + arg-prompt two-phase component.
// IMPORTANT: Always construct a new CommandPalette() on each open — never
// reuse an instance (RESEARCH.md Pitfall 5).
// Analog: scripts/cli-edit.ts (COMMANDS enumeration and arg dispatch).
// Implementation lands in Phase 5 plan 05.

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
 * Command palette overlay.
 *
 * Phase 1: filter phase — fuzzy-match commands while typing.
 * Phase 2: arg-prompt phase — collect required args for the selected command.
 *
 * Rendered as an overlay via tui.showOverlay() (RESEARCH.md Pattern 9).
 * Calls onClose() when the user commits or cancels.
 */
export class CommandPalette implements Component {
  constructor(
    private readonly store: Store,
    private readonly onClose: () => void,
    private readonly theme: unknown,
  ) {}

  /**
   * @returns An empty array (NYI — implementation lands in Phase 5 plan 05).
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
