// Tests for set-screen-title command (Plan 04-03) — D-54, D-62.
// Scalar edit: screen.title field via setScalarPreserving.
//
// Fixture: fixtures/habit-tracker.spec.md
import { describe, expect, it } from "vitest";
import type { ScreenId } from "../../primitives/ids.ts";
import { parseSpecFile } from "../../serialize/index.ts";
import { setScreenTitle } from "./set-screen-title.ts";

const FIXTURE_PATH = "fixtures/habit-tracker.spec.md";

async function loadFixture() {
  const result = await parseSpecFile(FIXTURE_PATH);
  if (!result.spec || !result.astHandle) {
    throw new Error(`fixture parse failed: ${result.diagnostics.map((d) => d.message).join(", ")}`);
  }
  return { spec: result.spec, astHandle: result.astHandle };
}

describe("setScreenTitle command (D-54, D-62)", () => {
  it("apply→invert→apply is idempotent: rename to short title", async () => {
    const before = await loadFixture();
    const args = { id: "home" as ScreenId, title: "Home" };

    const { spec: after1, inverseArgs } = setScreenTitle.apply(before.spec, before.astHandle, args);

    expect(after1.screens.find((s) => s.id === "home")?.title).toBe("Home");

    const { spec: restored } = setScreenTitle.invert(after1, before.astHandle, inverseArgs);
    expect(restored).toEqual(before.spec);

    const { spec: after2 } = setScreenTitle.apply(restored, before.astHandle, args);
    expect(after2).toEqual(after1);
  });

  it("apply→invert→apply is idempotent: long title (truncation-safe)", async () => {
    const before = await loadFixture();
    const args = {
      id: "home" as ScreenId,
      title: "This Is A Very Long Screen Title That Tests Truncation Safety In Render",
    };

    const { spec: after1, inverseArgs } = setScreenTitle.apply(before.spec, before.astHandle, args);

    expect(after1.screens.find((s) => s.id === "home")?.title).toBe(args.title);

    const { spec: restored } = setScreenTitle.invert(after1, before.astHandle, inverseArgs);
    expect(restored).toEqual(before.spec);

    const { spec: after2 } = setScreenTitle.apply(restored, before.astHandle, args);
    expect(after2).toEqual(after1);
  });

  it("apply→invert→apply is idempotent: title with special chars", async () => {
    const before = await loadFixture();
    const args = { id: "new_habit" as ScreenId, title: "New Habit (Step 1/3)" };

    const { spec: after1, inverseArgs } = setScreenTitle.apply(before.spec, before.astHandle, args);

    expect(after1.screens.find((s) => s.id === "new_habit")?.title).toBe(args.title);

    const { spec: restored } = setScreenTitle.invert(after1, before.astHandle, inverseArgs);
    expect(restored).toEqual(before.spec);

    const { spec: after2 } = setScreenTitle.apply(restored, before.astHandle, args);
    expect(after2).toEqual(after1);
  });
});
