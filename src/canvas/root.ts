// src/canvas/root.ts
// Root canvas component: orchestrates three panes + command palette overlay.
// Analog: src/editor/store.ts (subscribe + notify pattern).
// Implementation lands in Phase 5 plans 02–06.

import type { Snapshot, Store } from "../editor/types.ts";
import type { FocusState } from "./focus-fsm.ts";
import { nextFocus } from "./focus-fsm.ts";
import { renderHelpLine } from "./help-line.ts";
import { calcPaneWidths, HorizontalLayout } from "./horizontal-layout.ts";
import { CommandPalette } from "./palette/index.ts";
import { PropertyInspectorPane } from "./panes/property-inspector.ts";
import { ScreensListPane } from "./panes/screens-list.ts";
import { WireframePreviewPane } from "./panes/wireframe-preview.ts";
import { renderSaveIndicator } from "./save-indicator.ts";
import { truncateToWidth, visibleWidth } from "./tui-utils.ts";

/**
 * Minimal TuiAPI interface for showOverlay — structural type alias to avoid
 * importing @mariozechner/pi-tui directly (not installed in devDependencies).
 * Phase 9 will use the real TuiAPI from pi.
 */
interface TuiAPI {
  showOverlay(
    component: unknown,
    opts: { anchor: string; width: string; maxHeight: string },
  ): { hide(): void };
  requestRender(): void;
}

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
 * Minimal theme interface for root canvas.
 * Compatible with pi-tui Theme object (which has fg() and bold()).
 */
interface CanvasTheme {
  fg: (token: string, str: string) => string;
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
  private activeScreenId: string | null;
  // unsubscribe is stored to allow cleanup; biome sees it as unused because
  // it's only assigned (never read after). Prefixed with _ to suppress.
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: assigned in constructor, used for cleanup reference
  private readonly _unsubscribe: () => void;

  // Panes
  private readonly screensPane: ScreensListPane;
  private readonly inspectorPane: PropertyInspectorPane;
  private readonly previewPane: WireframePreviewPane;
  private readonly layout: HorizontalLayout;

  // tui and theme
  private readonly tui: TuiAPI | undefined;
  private readonly theme: CanvasTheme;

  /** Active palette overlay handle, or null when closed. */
  private paletteHandle: { hide(): void } | null = null;
  /** Focus state before palette opened — restored on palette close. */
  private prePaletteFocus: FocusState = "screens";

  constructor(
    private readonly store: Store,
    opts: { tui?: TuiAPI; theme: CanvasTheme },
  ) {
    this.tui = opts.tui;
    this.theme = opts.theme;

    // Initialize snapshot synchronously from store state
    const state = store.getState();
    this.snapshot = {
      spec: state.spec,
      diagnostics: state.diagnostics,
      dirty: state.dirty,
    };

    // Initialize active screen from first screen
    this.activeScreenId = state.spec.screens[0]?.id ?? null;

    // Create panes
    this.screensPane = new ScreensListPane((id) => this.selectScreen(id), this.theme);
    this.inspectorPane = new PropertyInspectorPane(
      this.store,
      () => this.activeScreenId,
      this.theme,
    );
    this.previewPane = new WireframePreviewPane();

    // Create layout — pane specs updated in render() per calcPaneWidths result
    this.layout = new HorizontalLayout([], this.theme);

    // Push initial snapshot into panes
    this.onSnapshot(this.snapshot);

    // Subscribe once; store calls us on every apply/undo/redo/flush
    this._unsubscribe = store.subscribe((snap) => {
      this.onSnapshot(snap);
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
   * Called on every store snapshot update.
   * Updates all panes and auto-selects first screen if activeScreenId gone (T-05-10).
   */
  private onSnapshot(snap: Snapshot): void {
    this.snapshot = snap;

    // T-05-10: auto-select first screen if activeScreenId no longer in spec
    if (
      this.activeScreenId !== null &&
      !snap.spec.screens.find((s) => s.id === this.activeScreenId)
    ) {
      this.activeScreenId = snap.spec.screens[0]?.id ?? null;
    }

    this.screensPane.update(snap);
    this.inspectorPane.update(snap);
    if (this.activeScreenId !== null) {
      this.previewPane.update(snap, this.activeScreenId);
    }

    this.tui?.requestRender();
  }

  /**
   * Called when a screen is selected in ScreensListPane.
   */
  private selectScreen(id: string): void {
    this.activeScreenId = id;
    this.inspectorPane.update(this.snapshot);
    this.previewPane.update(this.snapshot, id);
    this.tui?.requestRender();
  }

  /**
   * Open the command palette overlay.
   * Always creates a new CommandPalette instance — never reuses (Pitfall 5).
   * Saves the current focus so it can be restored on palette close.
   */
  private openPalette(): void {
    this.prePaletteFocus = this.focus;
    this.focus = "palette";

    if (this.tui) {
      // Real pi runtime: use showOverlay for z-ordered overlay
      const palette = new CommandPalette(
        this.store,
        () => {
          this.paletteHandle?.hide();
          this.paletteHandle = null;
          this.focus = this.prePaletteFocus;
        },
        this.theme,
      );
      this.paletteHandle = this.tui.showOverlay(palette, {
        anchor: "top-center",
        width: "80%",
        maxHeight: "60%",
      });
    }
    // In headless test mode (no tui): focus = "palette" enables focus state tests
  }

  /**
   * Close the palette in headless mode (when tui is not available).
   * Restores prior focus.
   */
  private closePaletteHeadless(): void {
    this.focus = this.prePaletteFocus;
  }

  /**
   * Handle keyboard input.
   * Global guards (undo/redo/quit/palette/tab) are checked before
   * delegating to the focused pane (D-78).
   */
  handleInput(data: string): void {
    // If palette is open (headless test mode — no tui overlay)
    if (this.focus === "palette") {
      // Tab while palette is open closes palette and returns to base cycle
      if (data === "\t") {
        this.closePaletteHeadless();
        return;
      }
      // Esc closes palette
      if (data === "\x1b") {
        this.closePaletteHeadless();
        return;
      }
      // Other keys: no-op in headless mode (palette component handles via overlay in real pi)
      return;
    }

    // Step 1: global guards (D-78) — always win regardless of focused pane
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
      this.tui?.requestRender();
      return;
    }
    // Shift+Tab — reverse focus (\x1b[Z is the common Shift-Tab sequence)
    if (data === "\x1b[Z") {
      this.focus = nextFocus(this.focus, true);
      this.tui?.requestRender();
      return;
    }

    // Step 2: delegate to focused pane
    switch (this.focus) {
      case "screens":
        this.screensPane.handleInput(data);
        break;
      case "inspector":
        this.inspectorPane.handleInput(data);
        break;
      case "preview":
        // Preview is read-only in Phase 5
        break;
      default:
        break;
    }
  }

  /**
   * Render the full canvas to a string array.
   *
   * Layout:
   *   Row 0:    header line — "mobile-tui canvas" + right-aligned save indicator
   *   Rows 1..N-1: HorizontalLayout (all 3 panes with D-79 bordered panes)
   *   Row N:    footer help line
   *
   * CANVAS-06: No process.stdout.write. No alt-buffer sequences.
   * All lines pass through truncateToWidth (Pitfall 1).
   */
  render(width: number): string[] {
    // Compute pane widths for this render tick
    const [w1, w2, w3] = calcPaneWidths(width);

    // Map focus state to pane index (for D-79 border color)
    // screens=0, inspector=1, preview=2, palette=-1 (no pane focused)
    const focusedIndex =
      this.focus === "screens"
        ? 0
        : this.focus === "inspector"
          ? 1
          : this.focus === "preview"
            ? 2
            : -1; // palette overlay — no pane has accent border

    // Build pane specs for layout (skip preview if collapsed)
    const paneSpecs = [
      { component: this.screensPane as Component, width: w1 },
      { component: this.inspectorPane as Component, width: w2 },
      ...(w3 > 0 ? [{ component: this.previewPane as Component, width: w3 }] : []),
    ];

    // Update layout with current pane specs
    (this.layout as unknown as { panes: typeof paneSpecs }).panes = paneSpecs;

    // Row 0: header line
    const header = this.buildHeader(width);

    // Rows 1..N-1: three-pane body
    const bodyLines = this.layout.render(width, focusedIndex);

    // Row N: footer help line
    const footer = renderHelpLine(this.focus, width);

    // Assemble and truncate all lines (Pitfall 1)
    const allLines = [header, ...bodyLines, footer];
    return allLines.map((line) => truncateToWidth(line, width));
  }

  /**
   * Build the header line (D-85):
   * "mobile-tui canvas" + padding + save indicator (right-aligned).
   */
  private buildHeader(width: number): string {
    const title = "mobile-tui canvas";
    const indicator = renderSaveIndicator(this.snapshot.dirty, this.theme);
    // indicator may have ANSI codes; measure visible width
    // Use RegExp constructor to avoid biome noControlCharactersInRegex on \x1b literals
    const ansiSgr = new RegExp("\x1b\\[[0-9;]*m", "g");
    const indicatorVisible = indicator.replace(ansiSgr, "");
    const titleVisible = visibleWidth(title);
    const padding = Math.max(0, width - titleVisible - indicatorVisible.length);
    return title + " ".repeat(padding) + indicator;
  }

  /**
   * Invalidate cached render state.
   * Called by the store subscription callback after every apply/undo/redo/flush.
   */
  invalidate(): void {
    this.screensPane.invalidate();
    this.inspectorPane.invalidate();
    this.previewPane.invalidate();
  }
}
