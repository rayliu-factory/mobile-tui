// Tests for reorder-component command (Plan 04-04) — D-54 (exhaustive catalog) +
// D-62 (AST invert discipline) + apply→invert→apply idempotence.
//
// Fixtures: fixtures/habit-tracker.spec.md — has screens with component trees.
import { describe, expect, it } from "vitest";
import type { JsonPointer } from "../../primitives/path.ts";
import { parseSpecFile } from "../../serialize/index.ts";
import { reorderComponent } from "./reorder-component.ts";

const FIXTURE_PATH = "fixtures/habit-tracker.spec.md";

async function loadFixture() {
  const result = await parseSpecFile(FIXTURE_PATH);
  if (!result.spec || !result.astHandle) {
    throw new Error(`fixture parse failed: ${result.diagnostics.map((d) => d.message).join(", ")}`);
  }
  return { spec: result.spec, astHandle: result.astHandle };
}

describe("reorderComponent command (D-54, D-62)", () => {
  it("fixture 1: swap first and second nodes (fromIndex 0, toIndex 1)", async () => {
    const before = await loadFixture();
    const origTree = before.spec.screens[0]?.variants.content.tree ?? [];
    const origLength = origTree.length;
    const firstNode = origTree[0];
    const secondNode = origTree[1];

    if (origLength < 2) return;

    const args = {
      screenId: "home",
      variantKind: "content" as const,
      parentPath: "" as JsonPointer,
      fromIndex: 0,
      toIndex: 1,
    };

    const { spec: after1, inverseArgs } = reorderComponent.apply(
      before.spec,
      before.astHandle,
      args,
    );

    const tree1 = after1.screens[0]?.variants.content.tree;
    expect(tree1).toHaveLength(origLength);
    // Nodes swapped
    expect(tree1?.[0]).toEqual(secondNode);
    expect(tree1?.[1]).toEqual(firstNode);

    // Invert: restore original order
    const { spec: restored } = reorderComponent.invert(after1, before.astHandle, inverseArgs);
    expect(restored).toEqual(before.spec);

    // Re-apply
    const { spec: after2 } = reorderComponent.apply(restored, before.astHandle, args);
    expect(after2).toEqual(after1);
  });

  it("fixture 2: move first node to last position", async () => {
    const before = await loadFixture();
    const origTree = before.spec.screens[0]?.variants.content.tree ?? [];
    const origLength = origTree.length;
    const firstNode = origTree[0];

    if (origLength < 2) return;

    const args = {
      screenId: "home",
      variantKind: "content" as const,
      parentPath: "" as JsonPointer,
      fromIndex: 0,
      toIndex: origLength - 1,
    };

    const { spec: after1, inverseArgs } = reorderComponent.apply(
      before.spec,
      before.astHandle,
      args,
    );

    const tree1 = after1.screens[0]?.variants.content.tree;
    expect(tree1).toHaveLength(origLength);
    expect(tree1?.[origLength - 1]).toEqual(firstNode);

    // Invert
    const { spec: restored } = reorderComponent.invert(after1, before.astHandle, inverseArgs);
    expect(restored).toEqual(before.spec);

    // Re-apply
    const { spec: after2 } = reorderComponent.apply(restored, before.astHandle, args);
    expect(after2).toEqual(after1);
  });

  it("fixture 3: same-index no-op (fromIndex === toIndex)", async () => {
    const before = await loadFixture();
    const origTree = before.spec.screens[0]?.variants.content.tree ?? [];
    const origLength = origTree.length;

    const args = {
      screenId: "home",
      variantKind: "content" as const,
      parentPath: "" as JsonPointer,
      fromIndex: 0,
      toIndex: 0,
    };

    const { spec: after1, inverseArgs } = reorderComponent.apply(
      before.spec,
      before.astHandle,
      args,
    );

    // No-op — tree unchanged
    const tree1 = after1.screens[0]?.variants.content.tree;
    expect(tree1).toHaveLength(origLength);
    expect(after1.screens[0]?.variants.content.tree).toEqual(origTree);

    // Invert
    const { spec: restored } = reorderComponent.invert(after1, before.astHandle, inverseArgs);
    expect(restored).toEqual(before.spec);

    // Re-apply
    const { spec: after2 } = reorderComponent.apply(restored, before.astHandle, args);
    expect(after2).toEqual(after1);
  });
});
