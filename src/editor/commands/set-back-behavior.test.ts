// Tests for set-back-behavior command (Plan 04-03) — D-54, D-62.
// Scalar edit + null removal: back_behavior field.
// null arg removes the field; non-null sets it.
//
// Fixture: fixtures/habit-tracker.spec.md
import { describe, expect, it } from "vitest";
import type { ScreenId } from "../../primitives/ids.ts";
import { parseSpecFile } from "../../serialize/index.ts";
import { setBackBehavior } from "./set-back-behavior.ts";

const FIXTURE_PATH = "fixtures/habit-tracker.spec.md";

async function loadFixture() {
  const result = await parseSpecFile(FIXTURE_PATH);
  if (!result.spec || !result.astHandle) {
    throw new Error(`fixture parse failed: ${result.diagnostics.map((d) => d.message).join(", ")}`);
  }
  return { spec: result.spec, astHandle: result.astHandle };
}

describe("setBackBehavior command (D-54, D-62)", () => {
  it("apply→invert→apply is idempotent: set to pop", async () => {
    const before = await loadFixture();
    // new_habit already has back_behavior: pop — change to dismiss
    const args = { id: "new_habit" as ScreenId, behavior: "dismiss" as const };

    const { spec: after1, inverseArgs } = setBackBehavior.apply(
      before.spec,
      before.astHandle,
      args,
    );

    expect(after1.screens.find((s) => s.id === "new_habit")?.back_behavior).toBe("dismiss");

    const { spec: restored } = setBackBehavior.invert(after1, before.astHandle, inverseArgs);
    expect(restored).toEqual(before.spec);

    const { spec: after2 } = setBackBehavior.apply(restored, before.astHandle, args);
    expect(after2).toEqual(after1);
  });

  it("apply→invert→apply is idempotent: set to dismiss (on screen without back_behavior)", async () => {
    const before = await loadFixture();
    // home has no back_behavior
    const args = { id: "home" as ScreenId, behavior: "dismiss" as const };

    const { spec: after1, inverseArgs } = setBackBehavior.apply(
      before.spec,
      before.astHandle,
      args,
    );

    expect(after1.screens.find((s) => s.id === "home")?.back_behavior).toBe("dismiss");

    const { spec: restored } = setBackBehavior.invert(after1, before.astHandle, inverseArgs);
    expect(restored).toEqual(before.spec);

    const { spec: after2 } = setBackBehavior.apply(restored, before.astHandle, args);
    expect(after2).toEqual(after1);
  });

  it("apply→invert→apply is idempotent: set to null (removes field)", async () => {
    const before = await loadFixture();
    // new_habit has back_behavior: pop — remove it
    const args = { id: "new_habit" as ScreenId, behavior: null };

    const { spec: after1, inverseArgs } = setBackBehavior.apply(
      before.spec,
      before.astHandle,
      args,
    );

    expect(after1.screens.find((s) => s.id === "new_habit")?.back_behavior).toBeUndefined();

    const { spec: restored } = setBackBehavior.invert(after1, before.astHandle, inverseArgs);
    expect(restored).toEqual(before.spec);

    const { spec: after2 } = setBackBehavior.apply(restored, before.astHandle, args);
    expect(after2).toEqual(after1);
  });
});
