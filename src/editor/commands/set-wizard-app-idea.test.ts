// Tests for set-wizard-app-idea command (Phase-6, Plan 01).
// Scalar wizard field: spec.app_idea via setScalarPreserving.
//
// RED phase: these tests fail until set-wizard-app-idea.ts is created.
import { describe, expect, it } from "vitest";
import { parseSpecFile } from "../../serialize/index.ts";
import { setWizardAppIdea } from "./set-wizard-app-idea.ts";

const FIXTURE_PATH = "fixtures/habit-tracker.spec.md";

async function loadFixture() {
  const result = await parseSpecFile(FIXTURE_PATH);
  if (!result.spec || !result.astHandle) {
    throw new Error(`fixture parse failed: ${result.diagnostics.map((d) => d.message).join(", ")}`);
  }
  return { spec: result.spec, astHandle: result.astHandle };
}

describe("setWizardAppIdea command", () => {
  it("apply sets spec.app_idea to the given value", async () => {
    const { spec, astHandle } = await loadFixture();
    const { spec: after } = setWizardAppIdea.apply(spec, astHandle, { value: "A habit tracking app" });
    expect(after.app_idea).toBe("A habit tracking app");
  });

  it("invert restores previous app_idea (undefined → removed)", async () => {
    const { spec, astHandle } = await loadFixture();
    const { spec: after, inverseArgs } = setWizardAppIdea.apply(spec, astHandle, { value: "My app idea" });
    const { spec: restored } = setWizardAppIdea.invert(after, astHandle, inverseArgs);
    expect(restored.app_idea).toBeUndefined();
  });

  it("apply→invert is idempotent (round trip)", async () => {
    const { spec, astHandle } = await loadFixture();
    const { spec: after1, inverseArgs } = setWizardAppIdea.apply(spec, astHandle, { value: "Habit tracker" });
    expect(after1.app_idea).toBe("Habit tracker");
    const { spec: restored } = setWizardAppIdea.invert(after1, astHandle, inverseArgs);
    expect(restored).toEqual(spec);
  });

  it("argsSchema rejects empty value (T-06-ArgInjection)", () => {
    expect(setWizardAppIdea.argsSchema.safeParse({ value: "" }).success).toBe(false);
  });

  it("argsSchema accepts non-empty value", () => {
    expect(setWizardAppIdea.argsSchema.safeParse({ value: "any idea" }).success).toBe(true);
  });
});
