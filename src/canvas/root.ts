// src/canvas/root.ts
// Root canvas component: orchestrates three panes + command palette overlay.
// Analog: src/editor/store.ts (subscribe + notify pattern).
// Implementation lands in Phase 5 plans 02–06.

import { runEmitMaestro } from "../editor/commands/emit-maestro.ts";
import { extractScreenCommand, runExtractScreen } from "../editor/commands/extract-screen.ts";
import { promptScreenCommand, runPromptScreen } from "../editor/commands/prompt-screen.ts";
import { yankWireframeCommand, runYankWireframe } from "../editor/commands/yank-wireframe.ts";
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

  /** Emit status message for header line. Null when no recent emit. (D-114) */
  private emitStatus: { message: string; ok: boolean } | null = null;
  private emitStatusTimer: ReturnType<typeof setTimeout> | null = null;

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

    // Wire side-effect command result callbacks so palette-invoked commands
    // surface results on the status line via emitStatus (D-211).
    yankWireframeCommand._onResult = (r) => this.notifySideEffectResult(r);
    promptScreenCommand._onResult = (r) => this.notifySideEffectResult(r);
    extractScreenCommand._onResult = (r) => this.notifySideEffectResult(r);
    // _specFilePath is a lazy getter closing over store so apply() always reads
    // the live filePath rather than a value frozen at construction time (WR-02).
    Object.defineProperty(extractScreenCommand, "_specFilePath", {
      get: () => store.getState().filePath,
      configurable: true,
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
   * Called by COMMANDS apply() for side-effect commands (yank-wireframe, prompt-screen,
   * extract-screen) to surface runner results on the status line (D-211).
   * This is the bridge between store.apply() and the emitStatus TUI pattern.
   */
  public notifySideEffectResult(result: { ok: boolean; message: string }): void {
    if (this.emitStatusTimer !== null) clearTimeout(this.emitStatusTimer);
    this.emitStatus = { message: result.message, ok: result.ok };
    this.tui?.requestRender();
    this.emitStatusTimer = setTimeout(() => {
      this.emitStatus = null;
      this.emitStatusTimer = null;
      this.tui?.requestRender();
    }, 3000);
  }

  /**
   * Cancel the emitStatus auto-clear timer (WR-03).
   * Called before onQuit so the timer cannot fire against a torn-down canvas.
   */
  private cleanup(): void {
    if (this.emitStatusTimer !== null) {
      clearTimeout(this.emitStatusTimer);
      this.emitStatusTimer = null;
    }
  }

  /**
   * Trigger Maestro emission as a side-effect action (D-113 / D-114).
   * NOT via store.apply — emit-maestro is not a spec-mutating Command<T>.
   * Writes flow files, shows status in header, auto-clears after 3s.
   */
  private triggerEmitMaestro(): void {
    const state = this.store.getState();
    void runEmitMaestro(state.spec, state.filePath).then((result) => {
      // Clear any pending auto-clear timer
      if (this.emitStatusTimer !== null) clearTimeout(this.emitStatusTimer);
      this.emitStatus = { message: result.message, ok: result.ok };
      this.tui?.requestRender();
      // Auto-clear after 3s (D-114)
      this.emitStatusTimer = setTimeout(() => {
        this.emitStatus = null;
        this.emitStatusTimer = null;
        this.tui?.requestRender();
      }, 3000);
    });
  }

  private triggerYankWireframe(screenId: string): void {
    const state = this.store.getState();
    void runYankWireframe(state.spec, screenId).then((result) => {
      if (this.emitStatusTimer !== null) clearTimeout(this.emitStatusTimer);
      this.emitStatus = { message: result.message, ok: result.ok };
      this.tui?.requestRender();
      this.emitStatusTimer = setTimeout(() => {
        this.emitStatus = null;
        this.emitStatusTimer = null;
        this.tui?.requestRender();
      }, 3000);
    });
  }

  private triggerPromptScreen(screenId: string, target: "swiftui" | "compose" | "tests"): void {
    const state = this.store.getState();
    void runPromptScreen(state.spec, screenId, target).then((result) => {
      if (this.emitStatusTimer !== null) clearTimeout(this.emitStatusTimer);
      this.emitStatus = { message: result.message, ok: result.ok };
      this.tui?.requestRender();
      this.emitStatusTimer = setTimeout(() => {
        this.emitStatus = null;
        this.emitStatusTimer = null;
        this.tui?.requestRender();
      }, 3000);
    });
  }

  private triggerExtractScreen(screenId: string, target: "swiftui" | "compose" | "tests"): void {
    const state = this.store.getState();
    void runExtractScreen(state.spec, state.filePath, screenId, target).then((result) => {
      if (this.emitStatusTimer !== null) clearTimeout(this.emitStatusTimer);
      this.emitStatus = { message: result.message, ok: result.ok };
      this.tui?.requestRender();
      this.emitStatusTimer = setTimeout(() => {
        this.emitStatus = null;
        this.emitStatusTimer = null;
        this.tui?.requestRender();
      }, 3000);
    });
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
      this.cleanup();
      this.onQuit?.();
      return;
    }
    // ':' or Ctrl+P — open palette
    if (data === ":" || data === "\x10") {
      this.openPalette();
      return;
    }
    // Ctrl+E — emit maestro flows (D-113 / D-114)
    if (data === "\x05") {
      this.triggerEmitMaestro();
      return;
    }
    // Ctrl+W (\x17) — yank wireframe for active screen (D-208 direct key binding path)
    if (data === "\x17") {
      const screenId = this.activeScreenId ?? "";
      if (screenId) {
        this.triggerYankWireframe(screenId);
      } else {
        if (this.emitStatusTimer !== null) clearTimeout(this.emitStatusTimer);
        this.emitStatus = { message: "No screen selected", ok: false };
        this.tui?.requestRender();
        this.emitStatusTimer = setTimeout(() => {
          this.emitStatus = null;
          this.emitStatusTimer = null;
          this.tui?.requestRender();
        }, 3000);
      }
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
   * "mobile-tui canvas" [emitStatus] + padding + save indicator (right-aligned).
   * When emitStatus is non-null, the emit message is appended to the title (D-114).
   */
  private buildHeader(width: number): string {
    const titleBase = "mobile-tui canvas";
    // Append emit status to title segment when present (D-114)
    const emitIndicator =
      this.emitStatus !== null
        ? ` ${this.emitStatus.ok ? this.theme.fg("success", this.emitStatus.message) : this.theme.fg("error", this.emitStatus.message)}`
        : "";
    const title = titleBase + emitIndicator;
    const indicator = renderSaveIndicator(this.snapshot.dirty, this.theme);
    // Strip ANSI codes to measure visible widths
    // RegExp constructor required: regex literal would trigger noControlCharactersInRegex on \x1b
    // biome-ignore lint/complexity/useRegexLiterals: must use constructor to avoid noControlCharactersInRegex
    const ansiSgr = new RegExp("\x1b\\[[0-9;]*m", "g");
    const indicatorVisible = indicator.replace(ansiSgr, "");
    const titleVisible =
      visibleWidth(titleBase) + (this.emitStatus !== null ? 1 + this.emitStatus.message.length : 0);
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
