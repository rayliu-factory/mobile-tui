// Tests for add-component command (Plan 04-04) — D-55 (MVP component tree) +
// D-62 (AST invert discipline) + apply→invert→apply idempotence.
//
// Fixtures: fixtures/habit-tracker.spec.md — has screens with component trees.
// Each test re-parses the fixture to reset astHandle state.
import { describe, expect, it } from "vitest";
import type { ScreenId } from "../../primitives/ids.ts";
import type { JsonPointer } from "../../primitives/path.ts";
import { parseSpecFile } from "../../serialize/index.ts";
import { addComponent } from "./add-component.ts";

const FIXTURE_PATH = "fixtures/habit-tracker.spec.md";

async function loadFixture() {
  const result = await parseSpecFile(FIXTURE_PATH);
  if (!result.spec || !result.astHandle) {
    throw new Error(`fixture parse failed: ${result.diagnostics.map((d) => d.message).join(", ")}`);
  }
  return { spec: result.spec, astHandle: result.astHandle };
}

describe("addComponent command (D-55, D-62)", () => {
  it("fixture 1: add Text leaf to content variant root (append)", async () => {
    const before = await loadFixture();
    const args = {
      screenId: "home" as ScreenId,
      variantKind: "content" as const,
      parentPath: "" as JsonPointer,
      node: { kind: "Text" as const, text: "Hello World" },
    };

    const { spec: after1, inverseArgs } = addComponent.apply(before.spec, before.astHandle, args);

    // Should have one more item in tree
    const tree1 = after1.screens[0]?.variants.content.tree;
    const origTree = before.spec.screens[0]?.variants.content.tree;
    expect(tree1).toHaveLength((origTree?.length ?? 0) + 1);

    // Invert: should restore original
    const { spec: restored } = addComponent.invert(after1, before.astHandle, inverseArgs);
    expect(restored.screens[0]?.variants.content.tree).toHaveLength(origTree?.length ?? 0);
    expect(restored).toEqual(before.spec);

    // Re-apply: same result
    const { spec: after2 } = addComponent.apply(restored, before.astHandle, args);
    expect(after2.screens[0]?.variants.content.tree).toHaveLength((origTree?.length ?? 0) + 1);
  });

  it("fixture 2: add Column container at specific index", async () => {
    const before = await loadFixture();
    const args = {
      screenId: "home" as ScreenId,
      variantKind: "content" as const,
      parentPath: "" as JsonPointer,
      index: 0,
      node: {
        kind: "Column" as const,
        children: [{ kind: "Text" as const, text: "Nested" }],
      },
    };

    const { spec: after1, inverseArgs } = addComponent.apply(before.spec, before.astHandle, args);

    const tree1 = after1.screens[0]?.variants.content.tree;
    const origTree = before.spec.screens[0]?.variants.content.tree;
    expect(tree1).toHaveLength((origTree?.length ?? 0) + 1);
    // Inserted at index 0
    expect(tree1?.[0]?.kind).toBe("Column");

    // Invert
    const { spec: restored } = addComponent.invert(after1, before.astHandle, inverseArgs);
    expect(restored).toEqual(before.spec);

    // Re-apply
    const { spec: after2 } = addComponent.apply(restored, before.astHandle, args);
    expect(after2).toEqual(after1);
  });

  it("fixture 3: add Icon to empty variant tree", async () => {
    const before = await loadFixture();
    const args = {
      screenId: "home" as ScreenId,
      variantKind: "empty" as const,
      parentPath: "" as JsonPointer,
      node: { kind: "Icon" as const, name: "star" },
    };

    const { spec: after1, inverseArgs } = addComponent.apply(before.spec, before.astHandle, args);

    const tree1 = after1.screens[0]?.variants.empty?.tree;
    const origTree = before.spec.screens[0]?.variants.empty?.tree;
    expect(tree1).toHaveLength((origTree?.length ?? 0) + 1);

    // Invert
    const { spec: restored } = addComponent.invert(after1, before.astHandle, inverseArgs);
    expect(restored).toEqual(before.spec);

    // Re-apply
    const { spec: after2 } = addComponent.apply(restored, before.astHandle, args);
    expect(after2).toEqual(after1);
  });
});
