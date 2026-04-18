// Tests for set-wizard-screens command (Phase-6, Plan 01).
// Bulk-replaces spec.screens[] and navigation.root from wizard step 4.
//
// RED phase: these tests fail until set-wizard-screens.ts is created.
import { describe, expect, it } from "vitest";
import { parseSpecFile } from "../../serialize/index.ts";
import { setWizardScreens } from "./set-wizard-screens.ts";

const FIXTURE_PATH = "fixtures/habit-tracker.spec.md";

async function loadFixture() {
  const result = await parseSpecFile(FIXTURE_PATH);
  if (!result.spec || !result.astHandle) {
    throw new Error(`fixture parse failed: ${result.diagnostics.map((d) => d.message).join(", ")}`);
  }
  return { spec: result.spec, astHandle: result.astHandle };
}

describe("setWizardScreens command", () => {
  it("apply replaces spec.screens with new screens from names", async () => {
    const { spec, astHandle } = await loadFixture();
    const { spec: after } = setWizardScreens.apply(spec, astHandle, {
      names: ["Home", "Profile", "Settings"],
    });
    expect(after.screens).toHaveLength(3);
    expect(after.screens[0]?.id).toBe("home");
    expect(after.screens[0]?.title).toBe("Home");
    expect(after.screens[1]?.id).toBe("profile");
    expect(after.screens[2]?.id).toBe("settings");
  });

  it("apply sets navigation.root to first screen id", async () => {
    const { spec, astHandle } = await loadFixture();
    const { spec: after } = setWizardScreens.apply(spec, astHandle, {
      names: ["Dashboard", "Search"],
    });
    expect(after.navigation.root).toBe("dashboard");
  });

  it("apply sets back_behavior: undefined for first screen, pop for others", async () => {
    const { spec, astHandle } = await loadFixture();
    const { spec: after } = setWizardScreens.apply(spec, astHandle, {
      names: ["Home", "Detail", "Edit"],
    });
    expect(after.screens[0]?.back_behavior).toBeUndefined();
    expect(after.screens[1]?.back_behavior).toBe("pop");
    expect(after.screens[2]?.back_behavior).toBe("pop");
  });

  it("invert restores previous screens and nav root", async () => {
    const { spec, astHandle } = await loadFixture();
    const prevScreensCount = spec.screens.length;
    const prevRoot = spec.navigation.root;
    const { spec: after, inverseArgs } = setWizardScreens.apply(spec, astHandle, {
      names: ["NewScreen"],
    });
    const { spec: restored } = setWizardScreens.invert(after, astHandle, inverseArgs);
    expect(restored.screens).toHaveLength(prevScreensCount);
    expect(restored.navigation.root).toBe(prevRoot);
  });

  it("argsSchema rejects empty names array", () => {
    expect(setWizardScreens.argsSchema.safeParse({ names: [] }).success).toBe(false);
  });

  it("argsSchema rejects names with empty string", () => {
    expect(setWizardScreens.argsSchema.safeParse({ names: [""] }).success).toBe(false);
  });

  it("argsSchema accepts valid names array", () => {
    expect(setWizardScreens.argsSchema.safeParse({ names: ["Home", "Profile"] }).success).toBe(true);
  });

  it("slugifies screen names to snake_case ids", async () => {
    const { spec, astHandle } = await loadFixture();
    const { spec: after } = setWizardScreens.apply(spec, astHandle, {
      names: ["My Cool Screen", "Another Screen!"],
    });
    expect(after.screens[0]?.id).toBe("my-cool-screen");
    expect(after.screens[1]?.id).toBe("another-screen");
  });
});
