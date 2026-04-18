// Tests for set-variant-null command (Plan 04-04) — D-55 (MVP acceptance + variant) +
// D-62 (AST invert) + apply→invert→apply idempotence.
// T-04-14: prevVariant captured via toJSON() — no live YAML node reference.
//
// Fixtures: fixtures/habit-tracker.spec.md
// home screen: loading=null, error=null, empty has tree
// new_habit screen: loading has tree, error has tree
import { describe, expect, it } from "vitest";
import type { ScreenId } from "../../primitives/ids.ts";
import { parseSpecFile } from "../../serialize/index.ts";
import { setVariantNull } from "./set-variant-null.ts";

const FIXTURE_PATH = "fixtures/habit-tracker.spec.md";

async function loadFixture() {
  const result = await parseSpecFile(FIXTURE_PATH);
  if (!result.spec || !result.astHandle) {
    throw new Error(`fixture parse failed: ${result.diagnostics.map((d) => d.message).join(", ")}`);
  }
  return { spec: result.spec, astHandle: result.astHandle };
}

describe("setVariantNull command (D-55, D-62, T-04-14)", () => {
  it("fixture 1: null the empty variant on home screen", async () => {
    const before = await loadFixture();
    // home.empty is non-null
    expect(before.spec.screens[0]?.variants.empty).not.toBeNull();

    const args = {
      screenId: "home" as ScreenId,
      variantKind: "empty" as const,
    };

    const { spec: after1, inverseArgs } = setVariantNull.apply(before.spec, before.astHandle, args);

    expect(after1.screens[0]?.variants.empty).toBeNull();

    // Invert: restore original non-null variant
    const { spec: restored } = setVariantNull.invert(after1, before.astHandle, inverseArgs);
    expect(restored).toEqual(before.spec);
    expect(restored.screens[0]?.variants.empty).not.toBeNull();

    // Re-apply
    const { spec: after2 } = setVariantNull.apply(restored, before.astHandle, args);
    expect(after2).toEqual(after1);
  });

  it("fixture 2: null the loading variant on new_habit screen", async () => {
    const before = await loadFixture();
    // new_habit.loading is non-null (has tree)
    expect(before.spec.screens[1]?.variants.loading).not.toBeNull();

    const args = {
      screenId: "new_habit" as ScreenId,
      variantKind: "loading" as const,
    };

    const { spec: after1, inverseArgs } = setVariantNull.apply(before.spec, before.astHandle, args);

    expect(after1.screens[1]?.variants.loading).toBeNull();

    // Invert
    const { spec: restored } = setVariantNull.invert(after1, before.astHandle, inverseArgs);
    expect(restored).toEqual(before.spec);

    // Re-apply
    const { spec: after2 } = setVariantNull.apply(restored, before.astHandle, args);
    expect(after2).toEqual(after1);
  });

  it("fixture 3: null the error variant on new_habit screen", async () => {
    const before = await loadFixture();
    // new_habit.error is non-null
    expect(before.spec.screens[1]?.variants.error).not.toBeNull();

    const args = {
      screenId: "new_habit" as ScreenId,
      variantKind: "error" as const,
    };

    const { spec: after1, inverseArgs } = setVariantNull.apply(before.spec, before.astHandle, args);

    expect(after1.screens[1]?.variants.error).toBeNull();

    // Invert
    const { spec: restored } = setVariantNull.invert(after1, before.astHandle, inverseArgs);
    expect(restored).toEqual(before.spec);

    // Re-apply
    const { spec: after2 } = setVariantNull.apply(restored, before.astHandle, args);
    expect(after2).toEqual(after1);
  });
});
