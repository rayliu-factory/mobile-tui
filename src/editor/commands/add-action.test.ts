// Tests for add-action command (Plan 04-05) — D-54 + D-59 (action registry).
// D-59 two-command split: add-action creates the registry entry.
import { describe, expect, it } from "vitest";
import type { ActionId } from "../../primitives/ids.ts";
import { parseSpecFile } from "../../serialize/index.ts";
import { addAction } from "./add-action.ts";

const FIXTURE_PATH = "fixtures/habit-tracker.spec.md";

async function loadFixture() {
  const result = await parseSpecFile(FIXTURE_PATH);
  if (!result.spec || !result.astHandle) {
    throw new Error(`fixture parse failed: ${result.diagnostics.map((d) => d.message).join(", ")}`);
  }
  return { spec: result.spec, astHandle: result.astHandle };
}

describe("addAction command (D-54, D-59)", () => {
  const fixtures = [
    {
      name: "navigate action",
      args: {
        id: "go_profile" as ActionId,
        effect: { kind: "navigate" as const, screen: "home" as ActionId },
      },
    },
    {
      name: "dismiss action",
      args: {
        id: "close_sheet" as ActionId,
        effect: { kind: "dismiss" as const },
      },
    },
    {
      name: "custom action",
      args: {
        id: "share_item" as ActionId,
        effect: { kind: "custom" as const, name: "share_item" },
      },
    },
  ];

  it.each(fixtures)("apply→invert→apply is idempotent: $name", async ({ args }) => {
    const before = await loadFixture();
    const initialActionCount = Object.keys(before.spec.actions).length;

    const { spec: after1, inverseArgs } = addAction.apply(before.spec, before.astHandle, args);
    expect(Object.keys(after1.actions)).toHaveLength(initialActionCount + 1);
    expect(after1.actions[args.id]).toBeDefined();
    expect(after1.actions[args.id]?.kind).toBe(args.effect.kind);

    const { spec: restored } = addAction.invert(after1, before.astHandle, inverseArgs);
    expect(Object.keys(restored.actions)).toHaveLength(initialActionCount);
    expect(restored.actions[args.id]).toBeUndefined();

    const { spec: after2 } = addAction.apply(restored, before.astHandle, args);
    expect(Object.keys(after2.actions)).toHaveLength(initialActionCount + 1);
    expect(after2.actions[args.id]?.kind).toBe(args.effect.kind);
  });
});
