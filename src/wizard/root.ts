// src/wizard/root.ts
// Root wizard component: orchestrates FormPane + SpecPreviewPane + CommandPalette overlay.
// Mirrors src/canvas/root.ts architecture exactly (06-PATTERNS.md).
//
// Key differences from RootCanvas:
//   - 2-pane layout (form + preview) instead of 3 panes
//   - stepCursor: number (0–7) drives FormPane step navigation
//   - onGraduate callback (D-100): replaces WizardRoot with RootCanvas in ctx.ui.custom()
//   - Ctrl+G (\x07) checked FIRST in handleInput — RESEARCH Pitfall 1 / D-101
//   - graduate() closes palette before calling onGraduate — RESEARCH Pitfall 6

import type { Snapshot, Store } from "../editor/types.ts";
import { calcWizardPaneWidths, HorizontalLayout } from "../canvas/horizontal-layout.ts";
import type { MinimalTheme } from "../canvas/horizontal-layout.ts";
import { CommandPalette } from "../canvas/palette/index.ts";
import { renderSaveIndicator } from "../canvas/save-indicator.ts";
import { truncateToWidth, visibleWidth } from "../canvas/tui-utils.ts";
import { FormPane } from "./panes/form-pane.ts";
import { SpecPreviewPane } from "./panes/spec-preview.ts";
import { renderWizardHelpLine } from "./help-line.ts";
import { firstUnansweredStep, STEP_DEFINITIONS } from "./steps/index.ts";
import type { TUI, Component } from "@mariozechner/pi-tui";

/**
 * Root wizard component.
 *
 * Owns:
 * - Store subscription (one subscribe call; unsubscribes on cleanup).
 * - Focus state ("form" | "palette").
 * - 2-pane horizontal layout: FormPane | SpecPreviewPane.
 * - Command palette overlay (created fresh on each open — Pitfall 5).
 * - stepCursor (0–7): current wizard step position.
 *
 * `onGraduate` is set by the entry script after construction (D-100):
 *   wizardRoot.onGraduate = () => { ctx.ui.custom(new RootCanvas(store, ...)); };
 *
 * `onQuit` is set by the entry script after construction:
 *   wizardRoot.onQuit = async () => { await store.flush(); done(undefined); };
 */
export class WizardRoot implements Component {
  /** Caller sets this after construction. Called on Ctrl+G (graduation). D-100 */
  onGraduate?: () => void;
  /** Caller sets this after construction. Called on Ctrl+Q. */
  onQuit?: () => Promise<void>;

  private snapshot: Snapshot;
  private focus: "form" | "palette" = "form";
  private prePaletteFocus: "form" | "palette" = "form";

  // Wizard state
  private stepCursor: number;

  // Panes
  private readonly formPane: FormPane;
  private readonly specPreview: SpecPreviewPane;
  private readonly layout: HorizontalLayout;

  // tui and theme
  private readonly tui: TUI | undefined;
  private readonly theme: MinimalTheme;

  /** Active palette overlay handle, or null when closed. */
  private paletteHandle: { hide(): void } | null = null;

  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: assigned in constructor, used for cleanup reference
  private readonly _unsubscribe: () => void;

  constructor(
    private readonly store: Store,
    opts: { tui?: TUI; theme: MinimalTheme },
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

    // Initialize step cursor from first unanswered step (D-96 / WIZARD-04)
    this.stepCursor = firstUnansweredStep(state.spec);

    // Create panes
    this.formPane = new FormPane(
      store,
      this.theme,
      // onAdvance: called by FormPane when user Tabs through a step
      (stepIndex: number, _args: unknown) => {
        if (stepIndex >= 7) {
          // D-100: auto-graduate after last step
          this.graduate();
          return;
        }
        this.stepCursor = Math.min(stepIndex + 1, 7);
        this.formPane.setStep(this.stepCursor, this.snapshot.spec);
        this.tui?.requestRender();
      },
      // onRetreat: called by FormPane when user presses Esc
      (stepIndex: number) => {
        this.stepCursor = Math.max(stepIndex - 1, 0);
        this.formPane.setStep(this.stepCursor, this.snapshot.spec);
        this.tui?.requestRender();
      },
    );
    this.specPreview = new SpecPreviewPane();

    // Create layout — pane specs updated in render() per calcWizardPaneWidths result
    this.layout = new HorizontalLayout([], this.theme);

    // Push initial snapshot into panes
    this.onSnapshot(this.snapshot);

    // Subscribe once; store calls us on every apply/undo/redo/flush
    this._unsubscribe = store.subscribe((snap) => {
      this.onSnapshot(snap);
    });
  }

  /**
   * Returns the current step cursor (0-based).
   * Exposed for tests.
   */
  getStepCursor(): number {
    return this.stepCursor;
  }

  /**
   * Returns the current focus state.
   * Exposed for tests.
   */
  getFocus(): "form" | "palette" {
    return this.focus;
  }

  /**
   * Called on every store snapshot update.
   * Updates spec preview and form pane step if spec changed.
   */
  private onSnapshot(snap: Snapshot): void {
    const prevSpec = this.snapshot.spec;
    this.snapshot = snap;
    this.specPreview.update(snap);
    // Only reset form pane input when the spec value for the current step changed (WR-05).
    // Avoids discarding in-progress user input on unrelated store updates (e.g. undo).
    const stepDef = STEP_DEFINITIONS[this.stepCursor];
    const prevVal = stepDef?.getPrePopulate(prevSpec);
    const nextVal = stepDef?.getPrePopulate(snap.spec);
    if (prevVal !== nextVal) {
      this.formPane.setStep(this.stepCursor, snap.spec);
    }
    this.tui?.requestRender();
  }

  /**
   * Graduate: close palette if open, then call onGraduate callback (D-100).
   * Pitfall 6: palette must be hidden before graduation to prevent orphan overlay.
   */
  private graduate(): void {
    if (this.paletteHandle) {
      this.paletteHandle.hide();
      this.paletteHandle = null;
    }
    this.onGraduate?.();
  }

  /**
   * Open the command palette overlay.
   * Always creates a new CommandPalette instance — never reuses (Pitfall 5).
   */
  private openPalette(): void {
    this.prePaletteFocus = this.focus;
    this.focus = "palette";

    if (this.tui) {
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
   *
   * Global key order (CRITICAL — RESEARCH Pitfall 1):
   * 1. Palette guard — if palette is open, handle palette-specific keys
   * 2. Ctrl+G FIRST — graduate before any other global handler
   * 3. Other global guards (undo/redo/quit/palette)
   * 4. Delegate to FormPane
   */
  handleInput(data: string): void {
    // If palette is open (headless test mode — no tui overlay)
    if (this.focus === "palette") {
      if (data === "\t" || data === "\x1b") {
        this.closePaletteHeadless();
        return;
      }
      // Other keys: no-op in headless mode
      return;
    }

    // Ctrl+G FIRST — graduate (RESEARCH Pitfall 1 / D-101)
    if (data === "\x07") {
      this.graduate();
      return;
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

    // ':' or Ctrl+P — open palette (WIZARD-05: same palette as canvas)
    if (data === ":" || data === "\x10") {
      this.openPalette();
      return;
    }

    // Delegate all other keys to FormPane (Tab, Esc, character input)
    this.formPane.handleInput(data);
  }

  /**
   * Render the wizard to a string array.
   *
   * Layout:
   *   Row 0:    header line — "mobile-tui wizard" + right-aligned save indicator
   *   Rows 1..N-1: HorizontalLayout (form | preview)
   *   Row N:    footer help line (D-102)
   *
   * Chrome hygiene: No process.stdout.write. No alt-buffer sequences.
   * All lines pass through truncateToWidth (Pitfall 1).
   */
  render(width: number): string[] {
    // Compute pane widths for this render tick (D-88, D-89)
    const [leftW, rightW] = calcWizardPaneWidths(width);

    // Build pane specs: always include formPane; only include specPreview if right pane visible
    const paneSpecs = [
      { component: this.formPane as Component, width: leftW },
      ...(rightW > 0 ? [{ component: this.specPreview as Component, width: rightW }] : []),
    ];

    // Update layout with current pane specs via public API (WR-02: remove private-field bypass)
    this.layout.setPanes(paneSpecs);

    // Row 0: header line
    const header = this.buildHeader(width);

    // Rows 1..N-1: 2-pane body (formPane always focused at index 0)
    const bodyLines = this.layout.render(width, 0);

    // Row N: footer help line (D-102)
    const footer = renderWizardHelpLine(this.stepCursor, width);

    // Assemble and truncate all lines (Pitfall 1)
    const allLines = [header, ...bodyLines, footer];
    return allLines.map((line) => truncateToWidth(line, width));
  }

  /**
   * Build the header line:
   * "mobile-tui wizard" + padding + save indicator (right-aligned).
   * Mirrors RootCanvas.buildHeader() pattern.
   */
  private buildHeader(width: number): string {
    const title = "mobile-tui wizard";
    const indicator = renderSaveIndicator(this.snapshot.dirty, this.theme);
    // indicator may have ANSI codes; measure visible width
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
    this.formPane.invalidate();
    this.specPreview.invalidate();
  }
}
