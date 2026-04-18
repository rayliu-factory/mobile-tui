// src/canvas/root.ts
// Root canvas component: orchestrates three panes + command palette overlay.
// Analog: src/editor/store.ts (subscribe + notify pattern).
// Implementation lands in Phase 5 plans 02–06.

import type { Snapshot, Store } from "../editor/types.ts";
import type { FocusState } from "./focus-fsm.ts";

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
 * Root canvas component.
 *
 * Owns:
 * - Store subscription (one subscribe call; unsubscribes on cleanup).
 * - Focus state machine (Tab / Shift-Tab cycle + palette overlay).
 * - Three-pane horizontal layout: ScreensList | PropertyInspector | WireframePreview.
 * - Command palette overlay (created fresh on each open — Pitfall 5).
 *
 * `onQuit` is set by the entry script after construction:
 *   rootCanvas.onQuit = async () => { await store.flush(); done(undefined); };
 *
 * `getFocus()` exposes the current focus state for tests (test hook).
 */
export class RootCanvas implements Component {
  /** Caller sets this after construction. Called on Ctrl+Q. */
  onQuit?: () => Promise<void>;

  private snapshot: Snapshot;
  private focus: FocusState = "screens";
  private readonly unsubscribe: () => void;

  constructor(
    private readonly store: Store,
    private readonly opts: { tui?: unknown; theme: unknown },
  ) {
    // Initialize snapshot synchronously from store state
    const state = store.getState();
    this.snapshot = {
      spec: state.spec,
      diagnostics: state.diagnostics,
      dirty: state.dirty,
    };

    // Subscribe once; store calls us on every apply/undo/redo/flush
    this.unsubscribe = store.subscribe((snap) => {
      this.snapshot = snap;
      this.invalidate();
    });
  }

  /**
   * Returns the current focus state.
   * Exposed for tests (test hook — CANVAS-01, CANVAS-02).
   */
  getFocus(): FocusState {
    return this.focus;
  }

  /**
   * Handle keyboard input.
   * Global guards (undo/redo/quit/palette/tab) are checked before
   * delegating to the focused pane (D-78).
   * NYI — implementation lands in Phase 5 plan 02.
   */
  handleInput(data: string): void {
    // NYI
  }

  /**
   * Render the full canvas to a string array.
   * Returns ["NYI"] at stub stage so chrome tests can confirm no escape codes.
   */
  render(width: number): string[] {
    return ["NYI"];
  }

  /**
   * Invalidate cached render state.
   * Called by the store subscription callback after every apply/undo/redo/flush.
   */
  invalidate(): void {
    // NYI
  }
}
