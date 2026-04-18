// Tests for set-acceptance-prose command (Plan 04-03) — D-54, D-55 (MVP), D-62.
// Structural replace: entire acceptance[] array via doc.setIn.
// T-04-11: prevLines captured as plain JSON clone (not live YAML node ref).
//
// Fixture: fixtures/habit-tracker.spec.md
import { describe, expect, it } from "vitest";
import type { ScreenId } from "../../primitives/ids.ts";
import { parseSpecFile } from "../../serialize/index.ts";
import { setAcceptanceProse } from "./set-acceptance-prose.ts";

const FIXTURE_PATH = "fixtures/habit-tracker.spec.md";

async function loadFixture() {
  const result = await parseSpecFile(FIXTURE_PATH);
  if (!result.spec || !result.astHandle) {
    throw new Error(`fixture parse failed: ${result.diagnostics.map((d) => d.message).join(", ")}`);
  }
  return { spec: result.spec, astHandle: result.astHandle };
}

describe("setAcceptanceProse command (D-54, D-55, D-62)", () => {
  it("apply→invert→apply is idempotent: set 1 line", async () => {
    const before = await loadFixture();
    const args = { id: "home" as ScreenId, lines: ["User sees the home screen"] };

    const { spec: after1, inverseArgs } = setAcceptanceProse.apply(
      before.spec,
      before.astHandle,
      args,
    );

    expect(after1.screens.find((s) => s.id === "home")?.acceptance).toEqual(args.lines);

    const { spec: restored } = setAcceptanceProse.invert(after1, before.astHandle, inverseArgs);
    expect(restored).toEqual(before.spec);

    const { spec: after2 } = setAcceptanceProse.apply(restored, before.astHandle, args);
    expect(after2).toEqual(after1);
  });

  it("apply→invert→apply is idempotent: set 3 lines", async () => {
    const before = await loadFixture();
    const args = {
      id: "home" as ScreenId,
      lines: [
        "User sees a list of habits",
        "Tapping a habit marks it done",
        "Empty state shows when no habits exist",
      ],
    };

    const { spec: after1, inverseArgs } = setAcceptanceProse.apply(
      before.spec,
      before.astHandle,
      args,
    );

    expect(after1.screens.find((s) => s.id === "home")?.acceptance).toEqual(args.lines);

    const { spec: restored } = setAcceptanceProse.invert(after1, before.astHandle, inverseArgs);
    expect(restored).toEqual(before.spec);

    const { spec: after2 } = setAcceptanceProse.apply(restored, before.astHandle, args);
    expect(after2).toEqual(after1);
  });

  it("apply→invert→apply is idempotent: replace existing prose with empty []", async () => {
    const before = await loadFixture();
    // 'home' fixture has 3 acceptance lines — replace with empty
    const args = { id: "home" as ScreenId, lines: [] };

    const { spec: after1, inverseArgs } = setAcceptanceProse.apply(
      before.spec,
      before.astHandle,
      args,
    );

    expect(after1.screens.find((s) => s.id === "home")?.acceptance).toEqual([]);

    const { spec: restored } = setAcceptanceProse.invert(after1, before.astHandle, inverseArgs);
    expect(restored).toEqual(before.spec);

    const { spec: after2 } = setAcceptanceProse.apply(restored, before.astHandle, args);
    expect(after2).toEqual(after1);
  });
});
