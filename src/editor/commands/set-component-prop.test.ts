// Tests for set-component-prop command (Plan 04-04) — D-55 (MVP component tree) +
// D-62 (AST invert via setScalarPreserving) + apply→invert→apply idempotence.
//
// Fixtures: fixtures/habit-tracker.spec.md
import { describe, expect, it } from "vitest";
import type { ScreenId } from "../../primitives/ids.ts";
import type { JsonPointer } from "../../primitives/path.ts";
import { parseSpecFile } from "../../serialize/index.ts";
import { setComponentProp } from "./set-component-prop.ts";

const FIXTURE_PATH = "fixtures/habit-tracker.spec.md";

async function loadFixture() {
  const result = await parseSpecFile(FIXTURE_PATH);
  if (!result.spec || !result.astHandle) {
    throw new Error(`fixture parse failed: ${result.diagnostics.map((d) => d.message).join(", ")}`);
  }
  return { spec: result.spec, astHandle: result.astHandle };
}

describe("setComponentProp command (D-55, D-62)", () => {
  it("fixture 1: change Text node text property", async () => {
    const before = await loadFixture();
    // home screen, empty variant, tree[0] is Text node with text "No habits yet..."
    const args = {
      screenId: "home" as ScreenId,
      variantKind: "empty" as const,
      path: "/0" as JsonPointer,
      prop: "text",
      value: "No items found",
    };

    const { spec: after1, inverseArgs } = setComponentProp.apply(
      before.spec,
      before.astHandle,
      args,
    );

    const node = after1.screens[0]?.variants.empty?.tree[0];
    expect(node?.kind).toBe("Text");
    if (node?.kind === "Text") {
      expect(node.text).toBe("No items found");
    }

    // Invert: restore original
    const { spec: restored } = setComponentProp.invert(after1, before.astHandle, inverseArgs);
    expect(restored).toEqual(before.spec);

    // Re-apply
    const { spec: after2 } = setComponentProp.apply(restored, before.astHandle, args);
    expect(after2).toEqual(after1);
  });

  it("fixture 2: change Text node style property (enum)", async () => {
    const before = await loadFixture();
    const args = {
      screenId: "home" as ScreenId,
      variantKind: "empty" as const,
      path: "/0" as JsonPointer,
      prop: "style",
      value: "heading-1",
    };

    const { spec: after1, inverseArgs } = setComponentProp.apply(
      before.spec,
      before.astHandle,
      args,
    );

    const node = after1.screens[0]?.variants.empty?.tree[0];
    if (node?.kind === "Text") {
      expect(node.style).toBe("heading-1");
    }

    // Invert
    const { spec: restored } = setComponentProp.invert(after1, before.astHandle, inverseArgs);
    expect(restored).toEqual(before.spec);

    // Re-apply
    const { spec: after2 } = setComponentProp.apply(restored, before.astHandle, args);
    expect(after2).toEqual(after1);
  });

  it("fixture 3: change NavBar title (string scalar)", async () => {
    const before = await loadFixture();
    // home content variant tree[0] is NavBar with title "My Habits"
    const args = {
      screenId: "home" as ScreenId,
      variantKind: "content" as const,
      path: "/0" as JsonPointer,
      prop: "title",
      value: "My Tasks",
    };

    const { spec: after1, inverseArgs } = setComponentProp.apply(
      before.spec,
      before.astHandle,
      args,
    );

    const node = after1.screens[0]?.variants.content.tree[0];
    if (node?.kind === "NavBar") {
      expect(node.title).toBe("My Tasks");
    }

    // Invert
    const { spec: restored } = setComponentProp.invert(after1, before.astHandle, inverseArgs);
    expect(restored).toEqual(before.spec);

    // Re-apply
    const { spec: after2 } = setComponentProp.apply(restored, before.astHandle, args);
    expect(after2).toEqual(after1);
  });
});
