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

describe("renameAction command (D-54, D-59 cascade)", () => {
  it("apply→invert→apply is idempotent: rename action not referenced in nav", async () => {
    const before = await loadFixture();
    // save_habit is referenced in NavEdge trigger
    const args = { from: "close_modal" as ActionId, to: "dismiss_modal" as ActionId };

    const { spec: after1, inverseArgs } = renameAction.apply(before.spec, before.astHandle, args);
    expect(after1.actions["dismiss_modal"]).toBeDefined();
    expect(after1.actions["close_modal"]).toBeUndefined();

    const { spec: restored } = renameAction.invert(after1, before.astHandle, inverseArgs);
    expect(restored.actions["close_modal"]).toBeDefined();
    expect(restored.actions["dismiss_modal"]).toBeUndefined();

    const { spec: after2 } = renameAction.apply(restored, before.astHandle, args);
    expect(after2.actions["dismiss_modal"]).toBeDefined();
  });

  it("apply→invert→apply is idempotent: rename action cascades NavEdge.trigger", async () => {
    const before = await loadFixture();
    // add_habit triggers home→new_habit edge
    const args = { from: "add_habit" as ActionId, to: "create_habit" as ActionId };

    const { spec: after1, inverseArgs } = renameAction.apply(before.spec, before.astHandle, args);
    expect(after1.actions["create_habit"]).toBeDefined();
    expect(after1.actions["add_habit"]).toBeUndefined();

    // NavEdge.trigger should be updated
    const updatedEdge = after1.navigation.edges.find((e) => e.trigger === "create_habit");
    expect(updatedEdge).toBeDefined();

    const { spec: restored } = renameAction.invert(after1, before.astHandle, inverseArgs);
    expect(restored.actions["add_habit"]).toBeDefined();
    const restoredEdge = restored.navigation.edges.find((e) => e.trigger === "add_habit");
    expect(restoredEdge).toBeDefined();

    const { spec: after2 } = renameAction.apply(restored, before.astHandle, args);
    expect(after2.actions["create_habit"]).toBeDefined();
    const after2Edge = after2.navigation.edges.find((e) => e.trigger === "create_habit");
    expect(after2Edge).toBeDefined();
  });

  it("apply→invert→apply is idempotent: rename action cascades component tree bindings", async () => {
    const before = await loadFixture();
    // add_habit is bound to a Button (add_habit_btn) in the home screen
    const args = { from: "add_habit" as ActionId, to: "new_habit_action" as ActionId };

    const { spec: after1, inverseArgs } = renameAction.apply(before.spec, before.astHandle, args);
    expect(after1.actions["new_habit_action"]).toBeDefined();
    expect(after1.actions["add_habit"]).toBeUndefined();

    const { spec: restored } = renameAction.invert(after1, before.astHandle, inverseArgs);
    expect(restored.actions["add_habit"]).toBeDefined();

    const { spec: after2 } = renameAction.apply(restored, before.astHandle, args);
    expect(after2.actions["new_habit_action"]).toBeDefined();
  });
});
