// src/canvas/horizontal-layout.calcWizardPaneWidths.test.ts
// TDD RED tests for calcWizardPaneWidths (plan 06-05).
//
// Behavior expectations (from plan 06-05 <behavior> block):
//   - calcWizardPaneWidths(79) returns [79, 0] — preview collapsed (D-89: below 80)
//   - calcWizardPaneWidths(80) returns [40, 40] — exactly 50/50 (Math.floor(80/2)=40)
//   - calcWizardPaneWidths(81) returns [40, 41] — left gets floor, right absorbs remainder
//   - calcWizardPaneWidths(100) returns [50, 50]
//   - calcWizardPaneWidths(160) returns [80, 80]
//   - left + right always equals total
//   - No existing tests break — calcPaneWidths is unchanged

import { describe, expect, it } from "vitest";
import { calcWizardPaneWidths } from "./horizontal-layout.ts";

describe("calcWizardPaneWidths", () => {
  it("width < 80 collapses preview to 0 (D-89)", () => {
    const [left, right] = calcWizardPaneWidths(79);
    expect(right).toBe(0);
    expect(left).toBe(79);
  });

  it("width 1 collapses preview to 0", () => {
    const [left, right] = calcWizardPaneWidths(1);
    expect(right).toBe(0);
    expect(left).toBe(1);
  });

  it("width 80 gives exact 50/50 split (D-88)", () => {
    const [left, right] = calcWizardPaneWidths(80);
    expect(left).toBe(40);
    expect(right).toBe(40);
  });

  it("width 81 gives [40, 41] — right absorbs rounding remainder", () => {
    const [left, right] = calcWizardPaneWidths(81);
    expect(left).toBe(40);
    expect(right).toBe(41);
  });

  it("width 100 gives [50, 50]", () => {
    const [left, right] = calcWizardPaneWidths(100);
    expect(left).toBe(50);
    expect(right).toBe(50);
  });

  it("width 160 gives [80, 80]", () => {
    const [left, right] = calcWizardPaneWidths(160);
    expect(left).toBe(80);
    expect(right).toBe(80);
  });

  it("left + right always equals total for various widths", () => {
    for (const total of [80, 81, 99, 100, 101, 120, 160, 200, 0, 40, 79]) {
      const [left, right] = calcWizardPaneWidths(total);
      expect(left + right).toBe(total);
    }
  });
});
