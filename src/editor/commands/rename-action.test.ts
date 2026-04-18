// Tests for rename-action command (Plan 04-05) — D-54 + D-59 cascade.
// rename-action cascades through component tree bindings + NavEdge.trigger.
import { describe, expect, it } from "vitest";
import type { ActionId } from "../../primitives/ids.ts";
import { parseSpecFile } from "../../serialize/index.ts";
import { renameAction } from "./rename-action.ts";

const FIXTURE_PATH = "fixtures/habit-tracker.spec.md";

async function loadFixture() {
  const result = await parseSpecFile(FIXTURE_PATH);
  if (!result.spec || !result.astHandle) {
    throw new Error(`fixture parse failed: ${result.diagnostics.map((d) => d.message).join(", ")}`);
  }
  return { spec: result.spec, astHandle: result.astHandle };
}

// Helper to access spec.actions by string key (branded Record<ActionId, Action>)
function getAction(spec: { actions: Record<string, unknown> }, id: string): unknown {
  return (spec.actions as Record<string, unknown>)[id];
}

describe("renameAction command (D-54, D-59 cascade)", () => {
  it("apply→invert→apply is idempotent: rename action not referenced in nav", async () => {
    const before = await loadFixture();
    const args = { from: "close_modal" as ActionId, to: "dismiss_modal" as ActionId };

    const { spec: after1, inverseArgs } = renameAction.apply(before.spec, before.astHandle, args);
    expect(getAction(after1, "dismiss_modal")).toBeDefined();
    expect(getAction(after1, "close_modal")).toBeUndefined();

    const { spec: restored } = renameAction.invert(after1, before.astHandle, inverseArgs);
    expect(getAction(restored, "close_modal")).toBeDefined();
    expect(getAction(restored, "dismiss_modal")).toBeUndefined();

    const { spec: after2 } = renameAction.apply(restored, before.astHandle, args);
    expect(getAction(after2, "dismiss_modal")).toBeDefined();
  });

  it("apply→invert→apply is idempotent: rename action cascades NavEdge.trigger", async () => {
    const before = await loadFixture();
    // add_habit triggers home→new_habit edge
    const args = { from: "add_habit" as ActionId, to: "create_habit" as ActionId };

    const { spec: after1, inverseArgs } = renameAction.apply(before.spec, before.astHandle, args);
    expect(getAction(after1, "create_habit")).toBeDefined();
    expect(getAction(after1, "add_habit")).toBeUndefined();

    // NavEdge.trigger should be updated
    const updatedEdge = after1.navigation.edges.find((e) => e.trigger === "create_habit");
    expect(updatedEdge).toBeDefined();

    const { spec: restored } = renameAction.invert(after1, before.astHandle, inverseArgs);
    expect(getAction(restored, "add_habit")).toBeDefined();
    const restoredEdge = restored.navigation.edges.find((e) => e.trigger === "add_habit");
    expect(restoredEdge).toBeDefined();

    const { spec: after2 } = renameAction.apply(restored, before.astHandle, args);
    expect(getAction(after2, "create_habit")).toBeDefined();
    const after2Edge = after2.navigation.edges.find((e) => e.trigger === "create_habit");
    expect(after2Edge).toBeDefined();
  });

  it("apply→invert→apply is idempotent: rename action cascades component tree bindings", async () => {
    const before = await loadFixture();
    // add_habit is bound to a Button (add_habit_btn) in the home screen
    const args = { from: "add_habit" as ActionId, to: "new_habit_action" as ActionId };

    const { spec: after1, inverseArgs } = renameAction.apply(before.spec, before.astHandle, args);
    expect(getAction(after1, "new_habit_action")).toBeDefined();
    expect(getAction(after1, "add_habit")).toBeUndefined();

    const { spec: restored } = renameAction.invert(after1, before.astHandle, inverseArgs);
    expect(getAction(restored, "add_habit")).toBeDefined();

    const { spec: after2 } = renameAction.apply(restored, before.astHandle, args);
    expect(getAction(after2, "new_habit_action")).toBeDefined();
  });
});
