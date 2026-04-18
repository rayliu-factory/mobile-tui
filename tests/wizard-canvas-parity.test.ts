// tests/wizard-canvas-parity.test.ts — WIZARD-05 keybinding + palette parity
// Tests that wizard and canvas share the same COMMANDS registry.
//
// NOTE: The COMMANDS count + wizard-key checks are skipped here because this file
// is committed in Wave 1 alongside plan 06-01 (which adds wizard commands). These
// tests will be unskipped when plan 06-01 wizard commands land in the merged branch.
// The non-command parity tests remain skipped until Wave 4 WizardRoot is implemented.
import { describe, expect, it } from "vitest";
import { COMMANDS } from "../src/editor/commands/index.ts";

describe("wizard-canvas parity (WIZARD-05)", () => {
  it.skip("COMMANDS registry has at least 35 entries (wizard adds 7 to existing 28+)", () => {
    // Unskip after plan 06-01 wizard commands land
    expect(Object.keys(COMMANDS).length).toBeGreaterThanOrEqual(35);
  });
  it.skip("all 7 wizard commands are in COMMANDS (WIZARD-05 same registry)", () => {
    // Unskip after plan 06-01 wizard commands land
    const wizardKeys = [
      "set-wizard-app-idea",
      "set-wizard-primary-user",
      "set-wizard-nav-pattern",
      "set-wizard-auth",
      "set-wizard-offline-sync",
      "set-wizard-target-platforms",
      "set-wizard-screens",
    ];
    for (const key of wizardKeys) {
      expect(Object.keys(COMMANDS)).toContain(key);
    }
  });
  it.skip("wizard help line contains same keybindings as canvas for shared actions", () => {});
  it.skip("CommandPalette opened from wizard lists same commands as when opened from canvas", () => {});
});
