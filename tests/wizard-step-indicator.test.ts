// tests/wizard-step-indicator.test.ts — WIZARD-01 step indicator pure function
// All tests skipped until renderStepIndicator implemented in plan 06-03.
import { describe, expect, it } from "vitest";

describe("renderStepIndicator (WIZARD-01)", () => {
  it.skip("step 0 (first step) renders 'Step 1/8: App Idea' on row 0", () => {
    // const { renderStepIndicator } = await import("../src/wizard/step-indicator.ts");
    // const mockTheme = { fg: (_: string, s: string) => s };
    // const lines = renderStepIndicator(0, Array(8).fill(false), mockTheme);
    // expect(lines[0]).toContain("Step 1/8: App Idea");
  });
  it.skip("dot row shows ◉ for current step index", () => {
    // const lines = renderStepIndicator(2, [true, true, false, false, false, false, false, false], mockTheme);
    // expect(lines[1]).toContain("◉");
    // lines[1] for stepIndex=2 contains ◉ at position 2
  });
  it.skip("answered steps show ● and unanswered steps show ○", () => {
    // answered=[true,true,false,...] → lines[1] contains ● ● ◉ ○ ○ ○ ○ ○
    // const lines = renderStepIndicator(2, [true, true, false, false, false, false, false, false], mockTheme);
    // expect(lines[1]).toContain("●");
    // expect(lines[1]).toContain("○");
  });
  it.skip("returns exactly 2 lines (D-91)", () => {
    // const lines = renderStepIndicator(0, Array(8).fill(false), mockTheme);
    // expect(lines).toHaveLength(2);
  });
  it.skip("step 7 (last step) renders 'Step 8/8: Target Platforms'", () => {
    // const lines = renderStepIndicator(7, Array(8).fill(true), mockTheme);
    // expect(lines[0]).toContain("Step 8/8: Target Platforms");
  });
});
