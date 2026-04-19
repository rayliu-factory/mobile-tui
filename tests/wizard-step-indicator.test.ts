// tests/wizard-step-indicator.test.ts — WIZARD-01 step indicator pure function
import { describe, expect, it } from "vitest";
import { renderStepIndicator } from "../src/wizard/step-indicator.ts";

const mockTheme = { fg: (_token: string, s: string) => s };

describe("renderStepIndicator (WIZARD-01)", () => {
  it("step 0 renders 'Step 1/8: App Idea' on row 0", () => {
    const lines = renderStepIndicator(0, Array(8).fill(false), mockTheme);
    expect(lines[0]).toContain("Step 1/8: App Idea");
  });
  it("returns exactly 2 lines (D-91)", () => {
    const lines = renderStepIndicator(3, Array(8).fill(false), mockTheme);
    expect(lines).toHaveLength(2);
  });
  it("current step marker ◉ appears in dot row at the current position", () => {
    const lines = renderStepIndicator(2, Array(8).fill(false), mockTheme);
    const dotRow = lines[1] ?? "";
    const dots = dotRow.split(" ");
    expect(dots[2]).toBe("◉");
  });
  it("answered steps show ● and unanswered show ○", () => {
    const answered = [true, true, false, false, false, false, false, false];
    const lines = renderStepIndicator(2, answered, mockTheme);
    const dotRow = lines[1] ?? "";
    expect(dotRow).toContain("●");
    expect(dotRow).toContain("○");
  });
  it("step 7 renders 'Step 8/8: Target Platforms'", () => {
    const lines = renderStepIndicator(7, Array(8).fill(true), mockTheme);
    expect(lines[0]).toContain("Step 8/8: Target Platforms");
  });
});
