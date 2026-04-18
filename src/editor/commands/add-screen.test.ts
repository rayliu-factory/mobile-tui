// Tests for add-screen command (Plan 04-03) — D-54 (exhaustive catalog) +
// D-62 (AST invert discipline) + apply→invert→apply idempotence (success crit #5).
//
// Fixture: fixtures/habit-tracker.spec.md (has 2 screens: home, new_habit)
// Each test re-parses the fixture to reset astHandle state before each test.
import { describe, expect, it } from "vitest";
import type { ScreenId } from "../../primitives/ids.ts";
import { parseSpecFile } from "../../serialize/index.ts";
import { addScreen } from "./add-screen.ts";

const FIXTURE_PATH = "fixtures/habit-tracker.spec.md";

async function loadFixture() {
  const result = await parseSpecFile(FIXTURE_PATH);
  if (!result.spec || !result.astHandle) {
    throw new Error(`fixture parse failed: ${result.diagnostics.map((d) => d.message).join(", ")}`);
  }
  return { spec: result.spec, astHandle: result.astHandle };
}

describe("addScreen command (D-54, D-62)", () => {
  const fixtures = [
    {
      name: "regular screen",
      args: { id: "settings" as ScreenId, title: "Settings", kind: "regular" as const },
    },
    {
      name: "overlay screen",
      args: { id: "filter_modal" as ScreenId, title: "Filter", kind: "overlay" as const },
    },
    {
      name: "with back_behavior pop",
      args: {
        id: "about" as ScreenId,
        title: "About",
        kind: "regular" as const,
        back_behavior: "pop" as const,
      },
    },
  ];

  it.each(fixtures)("apply→invert→apply is idempotent: $name", async ({ args }) => {
    const before = await loadFixture();
    const { spec: after1, inverseArgs } = addScreen.apply(before.spec, before.astHandle, args);

    // After apply: screen should be appended
    expect(after1.screens).toHaveLength(before.spec.screens.length + 1);
    const addedScreen = after1.screens[after1.screens.length - 1];
    expect(addedScreen?.id).toBe(args.id);

    // Invert: should restore to original
    const { spec: restored } = addScreen.invert(after1, before.astHandle, inverseArgs);
    expect(restored).toEqual(before.spec);

    // Re-apply: should produce same result as first apply
    const { spec: after2 } = addScreen.apply(restored, before.astHandle, args);
    expect(after2).toEqual(after1);
  });
});
