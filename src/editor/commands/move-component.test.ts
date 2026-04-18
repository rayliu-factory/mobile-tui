// Tests for move-component command (Plan 04-04) — D-54 (exhaustive catalog) +
// D-62 (AST invert discipline) + apply→invert→apply idempotence.
//
// Fixtures: fixtures/habit-tracker.spec.md — has screens with component trees.
import { describe, expect, it } from "vitest";
import type { JsonPointer } from "../../primitives/path.ts";
import { parseSpecFile } from "../../serialize/index.ts";
import { moveComponent } from "./move-component.ts";

const FIXTURE_PATH = "fixtures/habit-tracker.spec.md";

async function loadFixture() {
  const result = await parseSpecFile(FIXTURE_PATH);
  if (!result.spec || !result.astHandle) {
    throw new Error(`fixture parse failed: ${result.diagnostics.map((d) => d.message).join(", ")}`);
  }
  return { spec: result.spec, astHandle: result.astHandle };
}

describe("moveComponent command (D-54, D-62)", () => {
  it("fixture 1: move first node to end of same screen content variant", async () => {
    const before = await loadFixture();
    const origTree = before.spec.screens[0]?.variants.content.tree ?? [];
    const origLength = origTree.length;
    const firstNode = origTree[0];

    const args = {
      screenId: "home",
      variantKind: "content" as const,
      fromPath: "/0" as JsonPointer,
      toParentPath: "" as JsonPointer,
      toIndex: origLength - 1,
    };

    const { spec: after1, inverseArgs } = moveComponent.apply(before.spec, before.astHandle, args);

    // Same length after move
    const tree1 = after1.screens[0]?.variants.content.tree;
    expect(tree1).toHaveLength(origLength);
    // First node moved to last position
    expect(tree1?.[origLength - 1]).toEqual(firstNode);

    // Invert: restore
    const { spec: restored } = moveComponent.invert(after1, before.astHandle, inverseArgs);
    expect(restored).toEqual(before.spec);

    // Re-apply
    const { spec: after2 } = moveComponent.apply(restored, before.astHandle, args);
    expect(after2).toEqual(after1);
  });

  it("fixture 2: move last node to beginning (index 0)", async () => {
    const before = await loadFixture();
    const origTree = before.spec.screens[0]?.variants.content.tree ?? [];
    const origLength = origTree.length;
    const lastNode = origTree[origLength - 1];

    const args = {
      screenId: "home",
      variantKind: "content" as const,
      fromPath: `/${origLength - 1}` as JsonPointer,
      toParentPath: "" as JsonPointer,
      toIndex: 0,
    };

    const { spec: after1, inverseArgs } = moveComponent.apply(before.spec, before.astHandle, args);

    const tree1 = after1.screens[0]?.variants.content.tree;
    expect(tree1).toHaveLength(origLength);
    expect(tree1?.[0]).toEqual(lastNode);

    // Invert
    const { spec: restored } = moveComponent.invert(after1, before.astHandle, inverseArgs);
    expect(restored).toEqual(before.spec);

    // Re-apply
    const { spec: after2 } = moveComponent.apply(restored, before.astHandle, args);
    expect(after2).toEqual(after1);
  });

  it("fixture 3: move second node to third position", async () => {
    const before = await loadFixture();
    const origTree = before.spec.screens[0]?.variants.content.tree ?? [];
    const origLength = origTree.length;

    // Only meaningful if there are at least 3 nodes
    if (origLength < 3) {
      return;
    }

    const secondNode = origTree[1];

    const args = {
      screenId: "home",
      variantKind: "content" as const,
      fromPath: "/1" as JsonPointer,
      toParentPath: "" as JsonPointer,
      toIndex: 2,
    };

    const { spec: after1, inverseArgs } = moveComponent.apply(before.spec, before.astHandle, args);

    const tree1 = after1.screens[0]?.variants.content.tree;
    expect(tree1).toHaveLength(origLength);
    // secondNode ends up at position 2 after removal+insertion
    expect(tree1?.[2]).toEqual(secondNode);

    // Invert
    const { spec: restored } = moveComponent.invert(after1, before.astHandle, inverseArgs);
    expect(restored).toEqual(before.spec);

    // Re-apply
    const { spec: after2 } = moveComponent.apply(restored, before.astHandle, args);
    expect(after2).toEqual(after1);
  });
});
