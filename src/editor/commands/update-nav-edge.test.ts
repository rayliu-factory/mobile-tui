// Tests for update-nav-edge command (Plan 04-05) — D-54.
// Applies a partial patch to an existing NavEdge by index.
import { describe, expect, it } from "vitest";
import type { ActionId, ScreenId } from "../../primitives/ids.ts";
import { parseSpecFile } from "../../serialize/index.ts";
import { updateNavEdge } from "./update-nav-edge.ts";

const FIXTURE_PATH = "fixtures/habit-tracker.spec.md";

async function loadFixture() {
  const result = await parseSpecFile(FIXTURE_PATH);
  if (!result.spec || !result.astHandle) {
    throw new Error(`fixture parse failed: ${result.diagnostics.map((d) => d.message).join(", ")}`);
  }
  return { spec: result.spec, astHandle: result.astHandle };
}

describe("updateNavEdge command (D-54)", () => {
  it("apply→invert→apply is idempotent: patch transition on edge 0", async () => {
    const before = await loadFixture();
    const edge0 = before.spec.navigation.edges[0];
    const prevTransition = edge0?.transition;
    const args = { index: 0, patch: { transition: "replace" as const } };

    const { spec: after1, inverseArgs } = updateNavEdge.apply(before.spec, before.astHandle, args);
    expect(after1.navigation.edges[0]?.transition).toBe("replace");

    const { spec: restored } = updateNavEdge.invert(after1, before.astHandle, inverseArgs);
    expect(restored.navigation.edges[0]?.transition).toBe(prevTransition);

    const { spec: after2 } = updateNavEdge.apply(restored, before.astHandle, args);
    expect(after2.navigation.edges[0]?.transition).toBe("replace");
  });

  it("apply→invert→apply is idempotent: patch trigger on edge 1", async () => {
    const before = await loadFixture();
    const edge1 = before.spec.navigation.edges[1];
    const prevTrigger = edge1?.trigger;
    const args = { index: 1, patch: { trigger: "close_modal" as ActionId } };

    const { spec: after1, inverseArgs } = updateNavEdge.apply(before.spec, before.astHandle, args);
    expect(after1.navigation.edges[1]?.trigger).toBe("close_modal");

    const { spec: restored } = updateNavEdge.invert(after1, before.astHandle, inverseArgs);
    expect(restored.navigation.edges[1]?.trigger).toBe(prevTrigger);

    const { spec: after2 } = updateNavEdge.apply(restored, before.astHandle, args);
    expect(after2.navigation.edges[1]?.trigger).toBe("close_modal");
  });

  it("apply→invert→apply is idempotent: patch from+to on edge 2", async () => {
    const before = await loadFixture();
    const edge2 = before.spec.navigation.edges[2];
    const args = {
      index: 2,
      patch: { from: "home" as ScreenId, to: "new_habit" as ScreenId },
    };

    const { spec: after1, inverseArgs } = updateNavEdge.apply(before.spec, before.astHandle, args);
    expect(after1.navigation.edges[2]?.from).toBe("home");
    expect(after1.navigation.edges[2]?.to).toBe("new_habit");

    const { spec: restored } = updateNavEdge.invert(after1, before.astHandle, inverseArgs);
    expect(restored.navigation.edges[2]?.from).toBe(edge2?.from);
    expect(restored.navigation.edges[2]?.to).toBe(edge2?.to);

    const { spec: after2 } = updateNavEdge.apply(restored, before.astHandle, args);
    expect(after2.navigation.edges[2]?.from).toBe("home");
  });
});
