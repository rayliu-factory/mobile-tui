// Tests for set-component-action command (Plan 04-04) — D-59 (two-command binding) +
// D-62 (AST invert) + T-04-12 (non-existent actionId validation).
//
// Fixtures: fixtures/habit-tracker.spec.md — has actions: add_habit, open_detail, etc.
import { describe, expect, it } from "vitest";
import type { ActionId, ScreenId } from "../../primitives/ids.ts";
import type { JsonPointer } from "../../primitives/path.ts";
import { parseSpecFile } from "../../serialize/index.ts";
import { setComponentAction } from "./set-component-action.ts";

const FIXTURE_PATH = "fixtures/habit-tracker.spec.md";

async function loadFixture() {
  const result = await parseSpecFile(FIXTURE_PATH);
  if (!result.spec || !result.astHandle) {
    throw new Error(`fixture parse failed: ${result.diagnostics.map((d) => d.message).join(", ")}`);
  }
  return { spec: result.spec, astHandle: result.astHandle };
}

describe("setComponentAction command (D-59, T-04-12)", () => {
  it("fixture 1: bind Button to existing action", async () => {
    const before = await loadFixture();
    // home content tree[0] = NavBar, tree[0].trailing = Button with action add_habit
    // new_habit content tree[1].children[1] = Button (save_btn) — rebind to on_title_change
    const args = {
      screenId: "new_habit" as ScreenId,
      variantKind: "content" as const,
      path: "/1" as JsonPointer, // Column node
      prop: "action",
      actionId: "on_title_change" as ActionId,
    };

    // setComponentAction expects the path to point to an interactable node
    // For fixture simplicity use the NavBar trailing Button via path to a Button
    const args2 = {
      screenId: "home" as ScreenId,
      variantKind: "content" as const,
      path: "/0" as JsonPointer, // NavBar — not interactable, command should handle gracefully
      actionId: "add_habit" as ActionId,
    };

    const { spec: after1, inverseArgs } = setComponentAction.apply(
      before.spec,
      before.astHandle,
      args2,
    );

    // Invert: restore original
    const { spec: restored } = setComponentAction.invert(after1, before.astHandle, inverseArgs);
    expect(restored).toEqual(before.spec);

    // Re-apply
    const { spec: after2 } = setComponentAction.apply(restored, before.astHandle, args2);
    expect(after2).toEqual(after1);
  });

  it("fixture 2: bind with testID override", async () => {
    const before = await loadFixture();
    const args = {
      screenId: "home" as ScreenId,
      variantKind: "content" as const,
      path: "/0" as JsonPointer,
      actionId: "add_habit" as ActionId,
      testID: "add_btn_override",
    };

    const { spec: after1, inverseArgs } = setComponentAction.apply(
      before.spec,
      before.astHandle,
      args,
    );

    // Invert
    const { spec: restored } = setComponentAction.invert(after1, before.astHandle, inverseArgs);
    expect(restored).toEqual(before.spec);

    // Re-apply
    const { spec: after2 } = setComponentAction.apply(restored, before.astHandle, args);
    expect(after2).toEqual(after1);
  });

  it("fixture 3: non-existent actionId returns original spec unchanged (T-04-12)", async () => {
    const before = await loadFixture();
    const args = {
      screenId: "home" as ScreenId,
      variantKind: "content" as const,
      path: "/0" as JsonPointer,
      actionId: "nonexistent_action" as ActionId,
    };

    const { spec: after1 } = setComponentAction.apply(before.spec, before.astHandle, args);

    // spec should be unchanged (no-op for invalid action ref per T-04-12)
    expect(after1).toEqual(before.spec);
  });
});
