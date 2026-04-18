// tests/wizard-reentry.test.ts — WIZARD-04 re-entry + firstUnansweredStep
// All tests skipped until firstUnansweredStep implemented in plan 06-03.
import { describe, expect, it } from "vitest";

describe("firstUnansweredStep (WIZARD-04)", () => {
  it.skip("returns 0 for a fresh seed spec (all fields null/empty)", () => {
    // const { firstUnansweredStep } = await import("../src/wizard/steps/index.ts");
    // const seedSpec = createSeedSpec();
    // expect(firstUnansweredStep(seedSpec)).toBe(0);
  });
  it.skip("returns 1 when app_idea is set but primary_user is not", () => {
    // const spec = { ...createSeedSpec(), app_idea: "My App" };
    // expect(firstUnansweredStep(spec)).toBe(1);
  });
  it.skip("returns 7 when all 8 steps are answered (D-96: land on step 8)", () => {
    // All fields populated → first unanswered = beyond last → returns 7 (last step index)
    // const fullyAnsweredSpec = createFullyAnsweredSpec();
    // expect(firstUnansweredStep(fullyAnsweredSpec)).toBe(7);
  });
  it.skip("re-entry pre-populates input from spec for a completed step (D-97)", () => {
    // When navigating to a completed step, input.value === spec field value
  });
  it.skip("TODO marker appears in spec preview for null fields (D-99)", () => {
    // Unanswered steps show "TODO" in YAML preview pane
  });
});
