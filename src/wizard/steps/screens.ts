// src/wizard/steps/screens.ts
// ScreensStep: stateful add-one-by-one list component for step 3 (Screens).
// D-92: Enter adds screen, Backspace-on-empty removes last, Tab finishes.
// D-94: Minimum 1 screen required to advance (Tab with empty list shows error).
// Returns StepAction to FormPane — Pitfall 5 mitigation.

import { truncateToWidth } from "../../canvas/tui-utils.ts";
import type { StepAction } from "./index.ts";

interface MinimalTheme {
  fg: (token: string, str: string) => string;
}

export class ScreensStep {
  private items: string[] = [];
  private inputValue = "";
  private error: string | null = null;

  constructor(private readonly theme: MinimalTheme) {}

  /** D-98: Pre-populate from spec.screens on re-entry */
  loadFrom(screenNames: string[]): void {
    this.items = [...screenNames];
    this.inputValue = "";
    this.error = null;
  }

  getItems(): string[] {
    return [...this.items];
  }

  handleInput(data: string): StepAction {
    this.error = null;
    if (data === "\r" || data === "\n") {
      const trimmed = this.inputValue.trim();
      if (trimmed.length > 0) {
        this.items.push(trimmed);
        this.inputValue = "";
      }
      return { kind: "consumed" };
    }
    if (data === "\t") {
      if (this.items.length === 0) {
        this.error = "At least one screen is required."; // D-94 exact copy
        return { kind: "consumed" };
      }
      return { kind: "advance", args: this.items };
    }
    if (data === "\x7f" || data === "\b") {
      if (this.inputValue.length === 0 && this.items.length > 0) {
        this.items.pop();
      } else {
        this.inputValue = this.inputValue.slice(0, -1);
      }
      return { kind: "consumed" };
    }
    if (data.length === 1 && data.charCodeAt(0) >= 32) {
      this.inputValue += data;
      return { kind: "consumed" };
    }
    return { kind: "passthrough" };
  }

  render(width: number): string[] {
    const lines: string[] = [];
    const placeholder = this.inputValue.length === 0 ? "Screen name..." : "";
    const inputDisplay = this.inputValue || this.theme.fg("muted", placeholder);
    lines.push(truncateToWidth(`> ${inputDisplay}`, width));
    for (const item of this.items) {
      lines.push(truncateToWidth(`  ${item}`, width));
    }
    if (this.error) {
      lines.push(truncateToWidth(this.theme.fg("error", this.error), width));
    }
    return lines;
  }

  invalidate(): void {}
}
