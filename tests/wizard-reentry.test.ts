// tests/wizard-reentry.test.ts — WIZARD-04 re-entry + firstUnansweredStep
import { describe, expect, it } from "vitest";
import { firstUnansweredStep, STEP_DEFINITIONS } from "../src/wizard/steps/index.ts";
import { createSeedSpec } from "../src/wizard/seed-spec.ts";
import type { Spec } from "../src/model/index.ts";

describe("firstUnansweredStep (WIZARD-04)", () => {
  it("returns 0 for a fresh seed spec (all wizard fields absent)", () => {
    const seed = createSeedSpec();
    expect(firstUnansweredStep(seed)).toBe(0);
  });
  it("returns 1 when app_idea is set but primary_user is not", () => {
    const spec = { ...createSeedSpec(), app_idea: "My App" } as unknown as Spec;
    expect(firstUnansweredStep(spec)).toBe(1);
  });
  it("returns 7 when all 8 steps are answered (D-96: land on last step)", () => {
    const spec = {
      ...createSeedSpec(),
      app_idea: "My App",
      primary_user: "Developer",
      nav_pattern: "tab_bar",
      screens: [
        {
          id: "home",
          title: "Home",
          kind: "regular",
          back_behavior: "none",
          variants: {
            content: { kind: "content", tree: [] },
            empty: null,
            loading: null,
            error: null,
          },
        },
      ],
      auth: "none",
      data: { entities: [{ name: "User", fields: [{ name: "id", type: "string" }] }] },
      offline_sync: "none",
      target_platforms: ["ios"],
    } as unknown as Spec;
    expect(firstUnansweredStep(spec)).toBe(7);
  });
  it("STEP_DEFINITIONS has exactly 8 entries in wizard order", () => {
    expect(STEP_DEFINITIONS).toHaveLength(8);
    expect(STEP_DEFINITIONS[0]?.name).toBe("App Idea");
    expect(STEP_DEFINITIONS[7]?.name).toBe("Target Platforms");
  });
  it("getPrePopulate returns saved value for completed single-input step (D-97)", () => {
    const spec = { ...createSeedSpec(), app_idea: "My App Idea" } as unknown as Spec;
    expect(STEP_DEFINITIONS[0]?.getPrePopulate(spec)).toBe("My App Idea");
  });
});
