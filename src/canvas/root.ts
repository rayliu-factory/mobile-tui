// src/canvas/root.ts
// Root canvas component: orchestrates three panes + command palette overlay.
// Analog: src/editor/store.ts (subscribe + notify pattern).
// Implementation lands in Phase 5 plans 02–06.

import type { Snapshot, Store } from "../editor/types.ts";
import type { FocusState } from "./focus-fsm.ts";
import { nextFocus } from "./focus-fsm.ts";
import { CommandPalette } from "./palette/index.ts";

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

  /** Active palette instance, or null when palette is closed. */
  private palette: CommandPalette | null = null;
  /** Focus state before palette opened — restored on palette close. */
  private prePaletteFocus: FocusState = "screens";

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
   * Open the command palette overlay.
   * Always creates a new CommandPalette instance — never reuses (Pitfall 5).
   * Saves the current focus so it can be restored on palette close.
   */
  private openPalette(): void {
    this.prePaletteFocus = this.focus;
    this.palette = new CommandPalette(
      this.store,
      () => this.closePalette(),
      this.opts.theme as { fg: (token: string, str: string) => string },
    );
    this.focus = "palette";
  }

  /**
   * Close the command palette and restore prior focus.
   */
  private closePalette(): void {
    this.palette = null;
    this.focus = this.prePaletteFocus;
  }

  /**
   * Handle keyboard input.
   * Global guards (undo/redo/quit/palette/tab) are checked before
   * delegating to the focused pane (D-78).
   */
  handleInput(data: string): void {
    // If palette is open, route all input to it first
    if (this.focus === "palette" && this.palette) {
      // Tab while palette is open closes palette and returns to screens (nextFocus("palette") = "screens")
      if (data === "\t") {
        this.closePalette();
        return;
      }
      this.palette.handleInput(data);
      return;
    }

    // Step 1: global guards (D-78) — always win regardless of focused pane
    // Ctrl+Shift+Z or Ctrl+Y — redo
    if (data === "\x1a" || data === "\x19") {
      // Note: Ctrl+Z = \x1a, Ctrl+Y = \x19 — handle redo first to avoid ambiguity
    }
    // Ctrl+Y — redo
    if (data === "\x19") {
      void this.store.redo();
      return;
    }
    // Ctrl+Z — undo
    if (data === "\x1a") {
      void this.store.undo();
      return;
    }
    // Ctrl+Q — quit
    if (data === "\x11") {
      this.onQuit?.();
      return;
    }
    // ':' or Ctrl+P — open palette
    if (data === ":" || data === "\x10") {
      this.openPalette();
      return;
    }
    // Tab — advance focus
    if (data === "\t") {
      this.focus = nextFocus(this.focus);
      return;
    }
    // Shift+Tab — reverse focus (\x1b[Z is the common Shift-Tab sequence)
    if (data === "\x1b[Z") {
      this.focus = nextFocus(this.focus, true);
      return;
    }

    // Step 2: delegate to focused pane (panes are NYI at stub stage)
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
