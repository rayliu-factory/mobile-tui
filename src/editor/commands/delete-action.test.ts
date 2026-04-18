// Tests for delete-action command (Plan 04-05) — D-54.
// delete-action removes the registry entry and emits EDITOR_REF_CASCADE_INCOMPLETE
// for any component still binding to it (informational, not an error).
import { describe, expect, it } from "vitest";
import type { ActionId } from "../../primitives/ids.ts";
import { parseSpecFile } from "../../serialize/index.ts";
import { deleteAction } from "./delete-action.ts";

const FIXTURE_PATH = "fixtures/habit-tracker.spec.md";

async function loadFixture() {
  const result = await parseSpecFile(FIXTURE_PATH);
  if (!result.spec || !result.astHandle) {
    throw new Error(`fixture parse failed: ${result.diagnostics.map((d) => d.message).join(", ")}`);
  }
  return { spec: result.spec, astHandle: result.astHandle };
}

describe("deleteAction command (D-54)", () => {
  const fixtures = [
    {
      name: "delete dismiss action",
      args: { id: "close_modal" as ActionId },
    },
    {
      name: "delete submit action",
      args: { id: "save_habit" as ActionId },
    },
    {
      name: "delete mutate action",
      args: { id: "toggle_done" as ActionId },
    },
  ];

  it.each(fixtures)("apply→invert→apply is idempotent: $name", async ({ args }) => {
    const before = await loadFixture();
    const initialCount = Object.keys(before.spec.actions).length;
    const originalAction = before.spec.actions[args.id];
    expect(originalAction).toBeDefined();

    const { spec: after1, inverseArgs } = deleteAction.apply(before.spec, before.astHandle, args);
    expect(Object.keys(after1.actions)).toHaveLength(initialCount - 1);
    expect(after1.actions[args.id]).toBeUndefined();

    const { spec: restored } = deleteAction.invert(after1, before.astHandle, inverseArgs);
    expect(Object.keys(restored.actions)).toHaveLength(initialCount);
    expect(restored.actions[args.id]).toBeDefined();
    expect(restored.actions[args.id]?.kind).toBe(originalAction?.kind);

    const { spec: after2 } = deleteAction.apply(restored, before.astHandle, args);
    expect(Object.keys(after2.actions)).toHaveLength(initialCount - 1);
    expect(after2.actions[args.id]).toBeUndefined();
  });
});
