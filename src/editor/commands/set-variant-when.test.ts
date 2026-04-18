// Tests for set-variant-when command (Plan 04-04) — D-54 (exhaustive catalog) +
// D-62 (AST invert) + apply→invert→apply idempotence.
//
// Fixtures: fixtures/habit-tracker.spec.md
// home.empty.when = { collection: "/Habit/title" }
// new_habit.loading.when = { async: "/Habit/title" }
// new_habit.error.when = { field_error: "/Habit/title" }
import { describe, expect, it } from "vitest";
import type { ScreenId } from "../../primitives/ids.ts";
import type { JsonPointer } from "../../primitives/path.ts";
import { parseSpecFile } from "../../serialize/index.ts";
import { setVariantWhen } from "./set-variant-when.ts";

const FIXTURE_PATH = "fixtures/habit-tracker.spec.md";

async function loadFixture() {
  const result = await parseSpecFile(FIXTURE_PATH);
  if (!result.spec || !result.astHandle) {
    throw new Error(`fixture parse failed: ${result.diagnostics.map((d) => d.message).join(", ")}`);
  }
  return { spec: result.spec, astHandle: result.astHandle };
}

describe("setVariantWhen command (D-54, D-62)", () => {
  it("fixture 1: update collection-bound when clause on empty variant", async () => {
    const before = await loadFixture();
    // home.empty.when = { collection: "/Habit/title" }
    const emptyVariant = before.spec.screens[0]?.variants.empty;
    expect(emptyVariant).not.toBeNull();

    const args = {
      screenId: "home" as ScreenId,
      variantKind: "empty" as const,
      when: { collection: "/Habit/done" as JsonPointer },
    };

    const { spec: after1, inverseArgs } = setVariantWhen.apply(
      before.spec,
      before.astHandle,
      args,
    );

    const updatedEmpty = after1.screens[0]?.variants.empty;
    expect(updatedEmpty?.when).toEqual({ collection: "/Habit/done" });

    // Invert: restore original when clause
    const { spec: restored } = setVariantWhen.invert(after1, before.astHandle, inverseArgs);
    expect(restored).toEqual(before.spec);

    // Re-apply
    const { spec: after2 } = setVariantWhen.apply(restored, before.astHandle, args);
    expect(after2).toEqual(after1);
  });

  it("fixture 2: update async-bound when clause on loading variant", async () => {
    const before = await loadFixture();
    // new_habit.loading.when = { async: "/Habit/title" }
    const loadingVariant = before.spec.screens[1]?.variants.loading;
    expect(loadingVariant).not.toBeNull();

    const args = {
      screenId: "new_habit" as ScreenId,
      variantKind: "loading" as const,
      when: { async: "/Habit/done" as JsonPointer },
    };

    const { spec: after1, inverseArgs } = setVariantWhen.apply(
      before.spec,
      before.astHandle,
      args,
    );

    const updatedLoading = after1.screens[1]?.variants.loading;
    expect(updatedLoading?.when).toEqual({ async: "/Habit/done" });

    // Invert
    const { spec: restored } = setVariantWhen.invert(after1, before.astHandle, inverseArgs);
    expect(restored).toEqual(before.spec);

    // Re-apply
    const { spec: after2 } = setVariantWhen.apply(restored, before.astHandle, args);
    expect(after2).toEqual(after1);
  });

  it("fixture 3: update field_error-bound when clause on error variant", async () => {
    const before = await loadFixture();
    // new_habit.error.when = { field_error: "/Habit/title" }
    const errorVariant = before.spec.screens[1]?.variants.error;
    expect(errorVariant).not.toBeNull();

    const args = {
      screenId: "new_habit" as ScreenId,
      variantKind: "error" as const,
      when: { field_error: "/Habit/done" as JsonPointer },
    };

    const { spec: after1, inverseArgs } = setVariantWhen.apply(
      before.spec,
      before.astHandle,
      args,
    );

    const updatedError = after1.screens[1]?.variants.error;
    expect(updatedError?.when).toEqual({ field_error: "/Habit/done" });

    // Invert
    const { spec: restored } = setVariantWhen.invert(after1, before.astHandle, inverseArgs);
    expect(restored).toEqual(before.spec);

    // Re-apply
    const { spec: after2 } = setVariantWhen.apply(restored, before.astHandle, args);
    expect(after2).toEqual(after1);
  });
});
