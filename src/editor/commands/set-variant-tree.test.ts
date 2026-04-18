// Tests for set-variant-tree command (Plan 04-04) — D-54 (exhaustive catalog) +
// D-62 (AST invert) + apply→invert→apply idempotence.
//
// Fixtures: fixtures/habit-tracker.spec.md
import { describe, expect, it } from "vitest";
import type { ScreenId } from "../../primitives/ids.ts";
import { parseSpecFile } from "../../serialize/index.ts";
import { setVariantTree } from "./set-variant-tree.ts";

const FIXTURE_PATH = "fixtures/habit-tracker.spec.md";

async function loadFixture() {
  const result = await parseSpecFile(FIXTURE_PATH);
  if (!result.spec || !result.astHandle) {
    throw new Error(`fixture parse failed: ${result.diagnostics.map((d) => d.message).join(", ")}`);
  }
  return { spec: result.spec, astHandle: result.astHandle };
}

describe("setVariantTree command (D-54, D-62)", () => {
  it("fixture 1: replace content tree with single node", async () => {
    const before = await loadFixture();
    const origTree = before.spec.screens[0]?.variants.content.tree ?? [];
    expect(origTree.length).toBeGreaterThan(0);

    const args = {
      screenId: "home" as ScreenId,
      variantKind: "content" as const,
      tree: [{ kind: "Text" as const, text: "Placeholder" }],
    };

    const { spec: after1, inverseArgs } = setVariantTree.apply(before.spec, before.astHandle, args);

    const tree1 = after1.screens[0]?.variants.content.tree;
    expect(tree1).toHaveLength(1);
    expect(tree1?.[0]?.kind).toBe("Text");

    // Invert: restore original tree
    const { spec: restored } = setVariantTree.invert(after1, before.astHandle, inverseArgs);
    expect(restored).toEqual(before.spec);

    // Re-apply
    const { spec: after2 } = setVariantTree.apply(restored, before.astHandle, args);
    expect(after2).toEqual(after1);
  });

  it("fixture 2: replace empty variant tree with 3 nodes", async () => {
    const before = await loadFixture();

    const args = {
      screenId: "home" as ScreenId,
      variantKind: "empty" as const,
      tree: [
        { kind: "Text" as const, text: "Nothing here" },
        { kind: "Divider" as const },
        { kind: "Icon" as const, name: "empty-box" },
      ],
    };

    const { spec: after1, inverseArgs } = setVariantTree.apply(before.spec, before.astHandle, args);

    const tree1 = after1.screens[0]?.variants.empty?.tree;
    expect(tree1).toHaveLength(3);

    // Invert
    const { spec: restored } = setVariantTree.invert(after1, before.astHandle, inverseArgs);
    expect(restored).toEqual(before.spec);

    // Re-apply
    const { spec: after2 } = setVariantTree.apply(restored, before.astHandle, args);
    expect(after2).toEqual(after1);
  });

  it("fixture 3: replace loading variant tree with empty array (clears tree)", async () => {
    const before = await loadFixture();
    // new_habit.loading has a tree
    expect(before.spec.screens[1]?.variants.loading).not.toBeNull();

    const args = {
      screenId: "new_habit" as ScreenId,
      variantKind: "loading" as const,
      tree: [],
    };

    const { spec: after1, inverseArgs } = setVariantTree.apply(before.spec, before.astHandle, args);

    const tree1 = after1.screens[1]?.variants.loading?.tree;
    expect(tree1).toHaveLength(0);

    // Invert
    const { spec: restored } = setVariantTree.invert(after1, before.astHandle, inverseArgs);
    expect(restored).toEqual(before.spec);

    // Re-apply
    const { spec: after2 } = setVariantTree.apply(restored, before.astHandle, args);
    expect(after2).toEqual(after1);
  });
});
