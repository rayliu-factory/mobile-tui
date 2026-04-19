// src/wizard/steps/data.ts
// DataStep: stateful add-one-by-one list component for step 5 (Data).
// Same pattern as ScreensStep (D-92) but without min-1 validation (D-94 only applies to screens).
// Returns StepAction to FormPane — Pitfall 5 mitigation.

import { truncateToWidth } from "../../canvas/tui-utils.ts";
import type { StepAction } from "./index.ts";

interface MinimalTheme {
  fg: (token: string, str: string) => string;
}

export class DataStep {
  private items: string[] = [];
  private inputValue = "";

  constructor(private readonly theme: MinimalTheme) {}

  /** Pre-populate from spec.data.entities on re-entry */
  loadFrom(entityNames: string[]): void {
    this.items = [...entityNames];
    this.inputValue = "";
  }

  getItems(): string[] {
    return [...this.items];
  }

  handleInput(data: string): StepAction {
    if (data === "\r" || data === "\n") {
      const trimmed = this.inputValue.trim();
      if (trimmed.length > 0) {
        this.items.push(trimmed);
        this.inputValue = "";
      }
      return { kind: "consumed" };
    }
    if (data === "\t") {
      // Auto-commit pending input before advancing — prevents silent data loss
      // if user typed a name but forgot to press Enter before Tab.
      const trimmed = this.inputValue.trim();
      if (trimmed.length > 0) {
        this.items.push(trimmed);
        this.inputValue = "";
      }
      // No min-1 validation for data — data entities are optional
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
    const placeholder = this.inputValue.length === 0 ? "Entity name..." : "";
    const inputDisplay = this.inputValue || this.theme.fg("muted", placeholder);
    lines.push(truncateToWidth(`> ${inputDisplay}`, width));
    for (const item of this.items) {
      lines.push(truncateToWidth(`  ${item}`, width));
    }
    return lines;
  }

  invalidate(): void {}
}
