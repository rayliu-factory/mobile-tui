// Tests for delete-nav-edge command (Plan 04-05) — D-54.
// Removes a NavEdge by index.
import { describe, expect, it } from "vitest";
import { parseSpecFile } from "../../serialize/index.ts";
import { deleteNavEdge } from "./delete-nav-edge.ts";

const FIXTURE_PATH = "fixtures/habit-tracker.spec.md";

async function loadFixture() {
  const result = await parseSpecFile(FIXTURE_PATH);
  if (!result.spec || !result.astHandle) {
    throw new Error(`fixture parse failed: ${result.diagnostics.map((d) => d.message).join(", ")}`);
  }
  return { spec: result.spec, astHandle: result.astHandle };
}

describe("deleteNavEdge command (D-54)", () => {
  it("apply→invert→apply is idempotent: delete first edge", async () => {
    const before = await loadFixture();
    const initialCount = before.spec.navigation.edges.length;
    const firstEdge = before.spec.navigation.edges[0];
    const args = { index: 0 };

    const { spec: after1, inverseArgs } = deleteNavEdge.apply(before.spec, before.astHandle, args);
    expect(after1.navigation.edges).toHaveLength(initialCount - 1);
    // The edge that was at 0 is gone
    expect(after1.navigation.edges[0]?.trigger).not.toBe(firstEdge?.trigger);

    const { spec: restored } = deleteNavEdge.invert(after1, before.astHandle, inverseArgs);
    expect(restored.navigation.edges).toHaveLength(initialCount);
    expect(restored.navigation.edges[0]?.trigger).toBe(firstEdge?.trigger);

    const { spec: after2 } = deleteNavEdge.apply(restored, before.astHandle, args);
    expect(after2.navigation.edges).toHaveLength(initialCount - 1);
  });

  it("apply→invert→apply is idempotent: delete last edge", async () => {
    const before = await loadFixture();
    const initialCount = before.spec.navigation.edges.length;
    const lastIndex = initialCount - 1;
    const lastEdge = before.spec.navigation.edges[lastIndex];
    const args = { index: lastIndex };

    const { spec: after1, inverseArgs } = deleteNavEdge.apply(before.spec, before.astHandle, args);
    expect(after1.navigation.edges).toHaveLength(initialCount - 1);

    const { spec: restored } = deleteNavEdge.invert(after1, before.astHandle, inverseArgs);
    expect(restored.navigation.edges).toHaveLength(initialCount);
    expect(restored.navigation.edges[lastIndex]?.trigger).toBe(lastEdge?.trigger);

    const { spec: after2 } = deleteNavEdge.apply(restored, before.astHandle, args);
    expect(after2.navigation.edges).toHaveLength(initialCount - 1);
  });

  it("apply→invert→apply is idempotent: delete middle edge", async () => {
    const before = await loadFixture();
    const initialCount = before.spec.navigation.edges.length;
    const midIndex = Math.floor(initialCount / 2);
    const midEdge = before.spec.navigation.edges[midIndex];
    const args = { index: midIndex };

    const { spec: after1, inverseArgs } = deleteNavEdge.apply(before.spec, before.astHandle, args);
    expect(after1.navigation.edges).toHaveLength(initialCount - 1);

    const { spec: restored } = deleteNavEdge.invert(after1, before.astHandle, inverseArgs);
    expect(restored.navigation.edges).toHaveLength(initialCount);
    expect(restored.navigation.edges[midIndex]?.trigger).toBe(midEdge?.trigger);

    const { spec: after2 } = deleteNavEdge.apply(restored, before.astHandle, args);
    expect(after2.navigation.edges).toHaveLength(initialCount - 1);
  });
});
