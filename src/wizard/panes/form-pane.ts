// src/wizard/panes/form-pane.ts
// FormPane orchestrates all 8 wizard step forms.
// Handles step navigation (Tab→advance, Esc→retreat), pre-populates inputs
// from spec on re-entry (D-97), and shows the step indicator at the top (D-91).
//
// Steps 3 (Screens) and 5 (Data) have stateful add-one-by-one UX (D-92):
//   - ScreensStep returns { kind: "consumed" } on Enter (add screen) vs
//     { kind: "advance", args } on Tab (finish step) — Pitfall 5 mitigation
//   - DataStep: same pattern, Tab always advances (no min-1 validation)
//
// Step 5 (Data) advances without calling store.apply: wizard collects entity names
// for display in spec preview; actual entity creation with field definitions
// happens in canvas mode. This matches CONTEXT.md: "Name-only; no fields in wizard."
//
// Threat T-06-09: tryAdvance() validates non-empty inputValue before calling
//   store.apply, so raw bytes don't reach spec mutations.
// Threat T-06-11: Ctrl+G (\x07) is NOT checked here — WizardRoot intercepts
//   it globally before delegating to FormPane (RESEARCH Pitfall 1).

import { truncateToWidth } from "../../canvas/tui-utils.ts";
import type { Store } from "../../editor/types.ts";
import type { Spec } from "../../model/index.ts";
import type { MinimalTheme } from "../step-indicator.ts";
import { renderStepIndicator } from "../step-indicator.ts";
import { DataStep } from "../steps/data.ts";
import { STEP_DEFINITIONS } from "../steps/index.ts";
import { ScreensStep } from "../steps/screens.ts";

// Local Component interface — mirrors @mariozechner/pi-tui without the peer dep.
interface Component {
  render(width: number): string[];
  handleInput?(data: string): void;
  invalidate(): void;
}

export class FormPane implements Component {
  private stepIndex = 0;
  private inputValue = "";
  private error: string | null = null;
  private answeredMask: boolean[] = Array(8).fill(false);

  private readonly screensStep: ScreensStep;
  private readonly dataStep: DataStep;

  constructor(
    private readonly store: Store,
    private readonly theme: MinimalTheme,
    private readonly onAdvance: (stepIndex: number, args: unknown) => void,
    private readonly onRetreat: (stepIndex: number) => void,
  ) {
    this.screensStep = new ScreensStep(theme);
    this.dataStep = new DataStep(theme);
  }

  /**
   * Called by WizardRoot when the cursor moves to a different step.
   * Pre-populates the input field from the current spec (D-97).
   * For step 3 (screens): loads ScreensStep from spec.screens non-placeholder (D-98).
   * For step 5 (data): loads DataStep from spec.data.entities.
   */
  setStep(stepIndex: number, spec: Spec): void {
    this.stepIndex = stepIndex;
    this.error = null;

    if (stepIndex === 3) {
      // D-98: load existing non-placeholder screens
      const names = spec.screens.filter((s) => s.id !== "placeholder").map((s) => s.title);
      this.screensStep.loadFrom(names);
      this.inputValue = "";
    } else if (stepIndex === 5) {
      const entityNames = spec.data.entities.map((e) => e.name);
      this.dataStep.loadFrom(entityNames);
      this.inputValue = "";
    } else {
      const def = STEP_DEFINITIONS[stepIndex];
      this.inputValue = def ? def.getPrePopulate(spec) : "";
    }

    // Recompute answered mask for step indicator
    this.answeredMask = Array(8)
      .fill(false)
      .map((_, i) => {
        const def = STEP_DEFINITIONS[i];
        return def ? def.isAnswered(spec) : false;
      });
  }

  handleInput(data: string): void {
    // Esc: retreat to previous step (D-95); no-op on step 0
    if (data === "\x1b") {
      if (this.stepIndex > 0) {
        this.onRetreat(this.stepIndex);
      }
      return;
    }

    // Tab: attempt to advance
    if (data === "\t") {
      void this.tryAdvance();
      return;
    }

    // Delegate input for steps with stateful sub-components
    if (this.stepIndex === 3) {
      this.screensStep.handleInput(data);
      return;
    }
    if (this.stepIndex === 5) {
      this.dataStep.handleInput(data);
      return;
    }

    // All other steps: accumulate input in inputValue
    if (data === "\x7f" || data === "\b") {
      this.inputValue = this.inputValue.slice(0, -1);
      return;
    }
    if (data.length === 1 && data.charCodeAt(0) >= 32) {
      this.inputValue += data;
      this.error = null;
    }
  }

  /**
   * Attempt to advance the current step. Validates input, calls store.apply
   * (where applicable), then fires onAdvance.
   * Threat T-06-09: non-empty check before store.apply.
   */
  private async tryAdvance(): Promise<void> {
    this.error = null;

    if (this.stepIndex === 3) {
      // Delegate Tab to ScreensStep — it validates min-1 and returns action
      const action = this.screensStep.handleInput("\t");
      if (action.kind === "advance") {
        const result = await this.store.apply("set-wizard-screens", { names: action.args });
        if (!result.ok) {
          this.error = "Invalid input.";
          return;
        }
        this.onAdvance(this.stepIndex, null);
      }
      // If consumed (error), ScreensStep has already set its own error — render shows it
      return;
    }

    if (this.stepIndex === 5) {
      // DataStep Tab always returns advance (no min-1).
      // Entity names are collected for display; actual entity creation (with fields)
      // happens in canvas mode — add-entity requires fields, wizard is name-only.
      const action = this.dataStep.handleInput("\t");
      if (action.kind === "advance") {
        this.onAdvance(this.stepIndex, null);
      }
      return;
    }

    // Steps 0,1,2,4,6,7 — single input field
    const def = STEP_DEFINITIONS[this.stepIndex];
    if (!def) return;

    // For step 7 (target_platforms), handle "both" keyword and comma-separated
    let applyArgs: unknown;
    if (this.stepIndex === 7) {
      const raw = this.inputValue.trim().toLowerCase();
      let platforms: string[];
      if (raw === "both") {
        platforms = ["ios", "android"];
      } else {
        platforms = raw
          .split(/[,\s]+/)
          .map((p) => p.trim())
          .filter((p) => p.length > 0);
      }
      if (platforms.length === 0) {
        this.error = "Please enter a platform (ios / android / both).";
        return;
      }
      applyArgs = { value: platforms };
    } else {
      if (this.inputValue.trim().length === 0) {
        this.error = "Please enter a value before continuing.";
        return;
      }
      applyArgs = { value: this.inputValue.trim() };
    }

    const result = await this.store.apply(def.commandName, applyArgs);
    if (!result.ok) {
      this.error = "Invalid input.";
      return;
    }
    this.onAdvance(this.stepIndex, null);
  }

  render(width: number): string[] {
    const lines: string[] = [];

    // 2-row step indicator (D-91)
    const indicator = renderStepIndicator(this.stepIndex, this.answeredMask, this.theme);
    for (const row of indicator) {
      lines.push(truncateToWidth(row, width));
    }

    // Blank separator
    lines.push("");

    // Question text for current step
    const def = STEP_DEFINITIONS[this.stepIndex];
    if (def) {
      lines.push(truncateToWidth(def.question, width - 4));
    }

    lines.push("");

    // Step-specific input rendering
    if (this.stepIndex === 3) {
      for (const line of this.screensStep.render(width - 2)) {
        lines.push(truncateToWidth(line, width));
      }
    } else if (this.stepIndex === 5) {
      for (const line of this.dataStep.render(width - 2)) {
        lines.push(truncateToWidth(line, width));
      }
    } else {
      // Single text input field
      if (this.inputValue.length > 0) {
        lines.push(truncateToWidth(`> ${this.inputValue}`, width));
      } else {
        lines.push(truncateToWidth(this.theme.fg("muted", "> (not yet answered)"), width));
      }
    }

    // Error line
    if (this.error) {
      lines.push(truncateToWidth(this.theme.fg("error", this.error), width));
    }

    return lines;
  }

  invalidate(): void {
    // Re-render driven by WizardRoot store subscription — no-op here
  }
}
