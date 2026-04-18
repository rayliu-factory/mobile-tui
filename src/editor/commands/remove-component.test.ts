// Tests for remove-component command (Plan 04-04) — D-55 (MVP component tree) +
// D-62 (AST invert discipline) + T-04-14 (live YAML node corruption prevention).
//
// Fixtures: fixtures/habit-tracker.spec.md — has screens with component trees.
import { describe, expect, it } from "vitest";
import type { ScreenId } from "../../primitives/ids.ts";
import type { JsonPointer } from "../../primitives/path.ts";
import { parseSpecFile } from "../../serialize/index.ts";
import { removeComponent } from "./remove-component.ts";

const FIXTURE_PATH = "fixtures/habit-tracker.spec.md";

async function loadFixture() {
  const result = await parseSpecFile(FIXTURE_PATH);
  if (!result.spec || !result.astHandle) {
    throw new Error(`fixture parse failed: ${result.diagnostics.map((d) => d.message).join(", ")}`);
  }
  return { spec: result.spec, astHandle: result.astHandle };
}

describe("removeComponent command (D-55, D-62, T-04-14)", () => {
  it("fixture 1: remove first leaf from content variant", async () => {
    const before = await loadFixture();
    const origTree = before.spec.screens[0]?.variants.content.tree ?? [];
    const origLength = origTree.length;
    const firstNode = origTree[0];

    const args = {
      screenId: "home" as ScreenId,
      variantKind: "content" as const,
      path: "/0" as JsonPointer,
    };

    const { spec: after1, inverseArgs } = removeComponent.apply(
      before.spec,
      before.astHandle,
      args,
    );

    // Should have one fewer item
    const tree1 = after1.screens[0]?.variants.content.tree;
    expect(tree1).toHaveLength(origLength - 1);

    // Invert: restore original
    const { spec: restored } = removeComponent.invert(after1, before.astHandle, inverseArgs);
    expect(restored).toEqual(before.spec);
    // First node matches
    expect(restored.screens[0]?.variants.content.tree[0]).toEqual(firstNode);

    // Re-apply: same result
    const { spec: after2 } = removeComponent.apply(restored, before.astHandle, args);
    expect(after2).toEqual(after1);
  });

  it("fixture 2: remove node from empty variant", async () => {
    const before = await loadFixture();
    const emptyTree = before.spec.screens[0]?.variants.empty?.tree ?? [];

    // Empty variant has a Text node at index 0
    expect(emptyTree.length).toBeGreaterThan(0);

    const args = {
      screenId: "home" as ScreenId,
      variantKind: "empty" as const,
      path: "/0" as JsonPointer,
    };

    const { spec: after1, inverseArgs } = removeComponent.apply(
      before.spec,
      before.astHandle,
      args,
    );

    const tree1 = after1.screens[0]?.variants.empty?.tree;
    expect(tree1).toHaveLength(emptyTree.length - 1);

    // Invert
    const { spec: restored } = removeComponent.invert(after1, before.astHandle, inverseArgs);
    expect(restored).toEqual(before.spec);

    // Re-apply
    const { spec: after2 } = removeComponent.apply(restored, before.astHandle, args);
    expect(after2).toEqual(after1);
  });

  it("fixture 3: remove last node from content variant", async () => {
    const before = await loadFixture();
    const origTree = before.spec.screens[0]?.variants.content.tree ?? [];
    const lastIdx = origTree.length - 1;

    const args = {
      screenId: "home" as ScreenId,
      variantKind: "content" as const,
      path: `/${lastIdx}` as JsonPointer,
    };

    const { spec: after1, inverseArgs } = removeComponent.apply(
      before.spec,
      before.astHandle,
      args,
    );

    const tree1 = after1.screens[0]?.variants.content.tree;
    expect(tree1).toHaveLength(origTree.length - 1);

    // Invert
    const { spec: restored } = removeComponent.invert(after1, before.astHandle, inverseArgs);
    expect(restored).toEqual(before.spec);

    // Re-apply
    const { spec: after2 } = removeComponent.apply(restored, before.astHandle, args);
    expect(after2).toEqual(after1);
  });
});
