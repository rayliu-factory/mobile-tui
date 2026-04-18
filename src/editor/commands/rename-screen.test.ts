// Tests for rename-screen command (Plan 04-03) — D-54, D-58 cascade, D-62.
// Cascade sites: navigation.root, NavEdge.from/to, navigate/present action refs.
//
// Fixture: fixtures/habit-tracker.spec.md
import { describe, expect, it } from "vitest";
import type { ScreenId } from "../../primitives/ids.ts";
import { parseSpecFile } from "../../serialize/index.ts";
import { renameScreen } from "./rename-screen.ts";

const FIXTURE_PATH = "fixtures/habit-tracker.spec.md";

async function loadFixture() {
  const result = await parseSpecFile(FIXTURE_PATH);
  if (!result.spec || !result.astHandle) {
    throw new Error(`fixture parse failed: ${result.diagnostics.map((d) => d.message).join(", ")}`);
  }
  return { spec: result.spec, astHandle: result.astHandle };
}

describe("renameScreen command (D-54, D-58 cascade, D-62)", () => {
  it("apply→invert→apply is idempotent: rename non-root screen", async () => {
    const before = await loadFixture();
    const args = { from: "new_habit" as ScreenId, to: "create_habit" as ScreenId };

    const { spec: after1, inverseArgs } = renameScreen.apply(before.spec, before.astHandle, args);

    // Screen id updated
    const renamedScreen = after1.screens.find((s) => s.id === "create_habit");
    expect(renamedScreen).toBeDefined();
    expect(after1.screens.find((s) => s.id === "new_habit")).toBeUndefined();
    // Root unchanged (was 'home')
    expect(after1.navigation.root).toBe(before.spec.navigation.root);

    const { spec: restored } = renameScreen.invert(after1, before.astHandle, inverseArgs);
    expect(restored).toEqual(before.spec);

    const { spec: after2 } = renameScreen.apply(restored, before.astHandle, args);
    expect(after2).toEqual(after1);
  });

  it("apply→invert→apply is idempotent: rename root screen", async () => {
    const before = await loadFixture();
    // 'home' is the root
    const args = { from: "home" as ScreenId, to: "dashboard" as ScreenId };

    const { spec: after1, inverseArgs } = renameScreen.apply(before.spec, before.astHandle, args);

    // navigation.root should cascade
    expect(after1.navigation.root).toBe("dashboard");
    expect(after1.screens.find((s) => s.id === "dashboard")).toBeDefined();
    expect(after1.screens.find((s) => s.id === "home")).toBeUndefined();

    const { spec: restored } = renameScreen.invert(after1, before.astHandle, inverseArgs);
    expect(restored).toEqual(before.spec);

    const { spec: after2 } = renameScreen.apply(restored, before.astHandle, args);
    expect(after2).toEqual(after1);
  });

  it("apply→invert→apply is idempotent: cascades through nav edges", async () => {
    const before = await loadFixture();
    // Use 'home' which has nav edges (as from/to)
    const args = { from: "home" as ScreenId, to: "home_v2" as ScreenId };

    const { spec: after1, inverseArgs } = renameScreen.apply(before.spec, before.astHandle, args);

    // All nav edges referencing 'home' should be updated
    for (const edge of after1.navigation.edges) {
      expect(edge.from).not.toBe("home");
      expect(edge.to).not.toBe("home");
    }

    const { spec: restored } = renameScreen.invert(after1, before.astHandle, inverseArgs);
    expect(restored).toEqual(before.spec);

    const { spec: after2 } = renameScreen.apply(restored, before.astHandle, args);
    expect(after2).toEqual(after1);
  });
});
