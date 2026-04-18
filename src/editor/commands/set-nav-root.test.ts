// Tests for set-nav-root command (Plan 04-05) — D-54.
// Updates navigation.root to a new screen id.
import { describe, expect, it } from "vitest";
import type { ScreenId } from "../../primitives/ids.ts";
import { parseSpecFile } from "../../serialize/index.ts";
import { setNavRoot } from "./set-nav-root.ts";

const FIXTURE_PATH = "fixtures/habit-tracker.spec.md";

async function loadFixture() {
  const result = await parseSpecFile(FIXTURE_PATH);
  if (!result.spec || !result.astHandle) {
    throw new Error(`fixture parse failed: ${result.diagnostics.map((d) => d.message).join(", ")}`);
  }
  return { spec: result.spec, astHandle: result.astHandle };
}

describe("setNavRoot command (D-54)", () => {
  const fixtures = [
    {
      name: "change root to new_habit",
      args: { screenId: "new_habit" as ScreenId },
    },
    {
      name: "change root to home (already root, idempotent no-op effect)",
      args: { screenId: "home" as ScreenId },
    },
    {
      name: "change root to new_habit again",
      args: { screenId: "new_habit" as ScreenId },
    },
  ];

  it.each(fixtures)("apply→invert→apply is idempotent: $name", async ({ args }) => {
    const before = await loadFixture();
    const prevRoot = before.spec.navigation.root;

    const { spec: after1, inverseArgs } = setNavRoot.apply(before.spec, before.astHandle, args);
    expect(after1.navigation.root).toBe(args.screenId);

    const { spec: restored } = setNavRoot.invert(after1, before.astHandle, inverseArgs);
    expect(restored.navigation.root).toBe(prevRoot);

    const { spec: after2 } = setNavRoot.apply(restored, before.astHandle, args);
    expect(after2.navigation.root).toBe(args.screenId);
  });
});
