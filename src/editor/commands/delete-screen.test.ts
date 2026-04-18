// Tests for delete-screen command (Plan 04-03) — D-54, D-58 cascade, D-62.
// Cascade: removes NavEdges where from===id OR to===id; updates navigation.root.
//
// Fixture: fixtures/habit-tracker.spec.md
import { describe, expect, it } from "vitest";
import { parseSpecFile } from "../../serialize/index.ts";
import { deleteScreen } from "./delete-screen.ts";

const FIXTURE_PATH = "fixtures/habit-tracker.spec.md";

async function loadFixture() {
  const result = await parseSpecFile(FIXTURE_PATH);
  if (!result.spec || !result.astHandle) {
    throw new Error(`fixture parse failed: ${result.diagnostics.map((d) => d.message).join(", ")}`);
  }
  return { spec: result.spec, astHandle: result.astHandle };
}

describe("deleteScreen command (D-54, D-58 cascade, D-62)", () => {
  it("apply→invert→apply is idempotent: delete non-root screen", async () => {
    const before = await loadFixture();
    const args = { id: "new_habit" as const };

    const { spec: after1, inverseArgs } = deleteScreen.apply(before.spec, before.astHandle, args);

    // Screen removed
    expect(after1.screens.find((s) => s.id === "new_habit")).toBeUndefined();
    expect(after1.screens).toHaveLength(before.spec.screens.length - 1);
    // Root unchanged
    expect(after1.navigation.root).toBe(before.spec.navigation.root);
    // No dangling nav edges
    for (const edge of after1.navigation.edges) {
      expect(edge.from).not.toBe("new_habit");
      expect(edge.to).not.toBe("new_habit");
    }

    const { spec: restored } = deleteScreen.invert(after1, before.astHandle, inverseArgs);
    expect(restored).toEqual(before.spec);

    const { spec: after2 } = deleteScreen.apply(restored, before.astHandle, args);
    expect(after2).toEqual(after1);
  });

  it("apply→invert→apply is idempotent: delete screen with nav edges", async () => {
    const before = await loadFixture();
    // 'home' likely has outgoing nav edges
    const args = { id: "home" as const };

    const { spec: after1, inverseArgs } = deleteScreen.apply(before.spec, before.astHandle, args);

    expect(after1.screens.find((s) => s.id === "home")).toBeUndefined();
    // Cascade removed home-related edges
    for (const edge of after1.navigation.edges) {
      expect(edge.from).not.toBe("home");
      expect(edge.to).not.toBe("home");
    }

    const { spec: restored } = deleteScreen.invert(after1, before.astHandle, inverseArgs);
    expect(restored).toEqual(before.spec);

    const { spec: after2 } = deleteScreen.apply(restored, before.astHandle, args);
    expect(after2).toEqual(after1);
  });

  it("apply→invert→apply is idempotent: delete root screen (root reassigned)", async () => {
    const before = await loadFixture();
    // Delete the root screen 'home'; root should be reassigned to first remaining screen
    const args = { id: "home" as const };

    const { spec: after1, inverseArgs } = deleteScreen.apply(before.spec, before.astHandle, args);

    // Root was 'home', now should point to first remaining screen (new_habit)
    expect(after1.navigation.root).not.toBe("home");
    const firstRemaining = after1.screens[0];
    expect(after1.navigation.root).toBe(firstRemaining?.id);

    const { spec: restored } = deleteScreen.invert(after1, before.astHandle, inverseArgs);
    expect(restored).toEqual(before.spec);

    const { spec: after2 } = deleteScreen.apply(restored, before.astHandle, args);
    expect(after2).toEqual(after1);
  });
});
