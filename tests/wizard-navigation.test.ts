// tests/wizard-navigation.test.ts — WIZARD-01, WIZARD-03 step navigation
// Skipped until WizardRoot + FormPane implemented in plans 06-04/06-06.
import { describe, it } from "vitest";

describe("wizard navigation (WIZARD-01, WIZARD-03)", () => {
  it.skip("Tab on step 0 advances stepCursor to 1", () => {});
  it.skip("Tab always advances by exactly 1 (no branching — WIZARD-01)", () => {});
  it.skip("Esc on step 1+ goes to previous step (D-95)", () => {});
  it.skip("Esc on step 0 does nothing (D-95: no previous step)", () => {});
  it.skip("Ctrl+G (\\x07) triggers graduation mode flip from any step (D-101)", () => {});
  it.skip("step 4 Enter adds a screen, does NOT advance (Pitfall 5 / D-92)", () => {});
  it.skip("step 4 Tab with empty list shows error and does NOT advance (D-94)", () => {});
  it.skip("step 4 Backspace on empty input removes last screen (D-92)", () => {});
  it.skip("step 8 Tab with valid answer triggers graduation (D-100)", () => {});
});
