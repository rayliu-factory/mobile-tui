// Tests for set-screen-kind command (Plan 04-03) — D-54, D-62.
// Scalar edit: screen.kind field. apply→invert→apply idempotence.
//
// Fixture: fixtures/habit-tracker.spec.md
import { describe, expect, it } from "vitest";
import type { ScreenId } from "../../primitives/ids.ts";
import { parseSpecFile } from "../../serialize/index.ts";
import { setScreenKind } from "./set-screen-kind.ts";

const FIXTURE_PATH = "fixtures/habit-tracker.spec.md";

async function loadFixture() {
  const result = await parseSpecFile(FIXTURE_PATH);
  if (!result.spec || !result.astHandle) {
    throw new Error(`fixture parse failed: ${result.diagnostics.map((d) => d.message).join(", ")}`);
  }
  return { spec: result.spec, astHandle: result.astHandle };
}

describe("setScreenKind command (D-54, D-62)", () => {
  it("apply→invert→apply is idempotent: regular→overlay", async () => {
    const before = await loadFixture();
    const args = { id: "home" as ScreenId, kind: "overlay" as const };

    const { spec: after1, inverseArgs } = setScreenKind.apply(before.spec, before.astHandle, args);

    expect(after1.screens.find((s) => s.id === "home")?.kind).toBe("overlay");

    const { spec: restored } = setScreenKind.invert(after1, before.astHandle, inverseArgs);
    expect(restored).toEqual(before.spec);

    const { spec: after2 } = setScreenKind.apply(restored, before.astHandle, args);
    expect(after2).toEqual(after1);
  });

  it("apply→invert→apply is idempotent: overlay→regular", async () => {
    const before = await loadFixture();
    // new_habit is regular — first set to overlay, then test overlay→regular
    const setToOverlay = { id: "new_habit" as ScreenId, kind: "overlay" as const };
    const { spec: spec2 } = setScreenKind.apply(before.spec, before.astHandle, setToOverlay);

    const args = { id: "new_habit" as ScreenId, kind: "regular" as const };
    const { spec: after1, inverseArgs } = setScreenKind.apply(spec2, before.astHandle, args);

    expect(after1.screens.find((s) => s.id === "new_habit")?.kind).toBe("regular");

    const { spec: restored } = setScreenKind.invert(after1, before.astHandle, inverseArgs);
    expect(restored).toEqual(spec2);

    const { spec: after2 } = setScreenKind.apply(restored, before.astHandle, args);
    expect(after2).toEqual(after1);
  });

  it("apply→invert→apply is idempotent: regular→regular (no-op idempotence)", async () => {
    const before = await loadFixture();
    const args = { id: "home" as ScreenId, kind: "regular" as const };

    const { spec: after1, inverseArgs } = setScreenKind.apply(before.spec, before.astHandle, args);

    // Should be the same kind (home is already regular)
    expect(after1.screens.find((s) => s.id === "home")?.kind).toBe("regular");

    const { spec: restored } = setScreenKind.invert(after1, before.astHandle, inverseArgs);
    expect(restored).toEqual(before.spec);

    const { spec: after2 } = setScreenKind.apply(restored, before.astHandle, args);
    expect(after2).toEqual(after1);
  });
});
