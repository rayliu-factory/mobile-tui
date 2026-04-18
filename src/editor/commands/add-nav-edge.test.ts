// Tests for add-nav-edge command (Plan 04-05) — D-54 + MVP D-55.
// Appends a NavEdge to navigation.edges.
import { describe, expect, it } from "vitest";
import type { ActionId, ScreenId } from "../../primitives/ids.ts";
import { parseSpecFile } from "../../serialize/index.ts";
import { addNavEdge } from "./add-nav-edge.ts";

const FIXTURE_PATH = "fixtures/habit-tracker.spec.md";

async function loadFixture() {
  const result = await parseSpecFile(FIXTURE_PATH);
  if (!result.spec || !result.astHandle) {
    throw new Error(`fixture parse failed: ${result.diagnostics.map((d) => d.message).join(", ")}`);
  }
  return { spec: result.spec, astHandle: result.astHandle };
}

describe("addNavEdge command (D-54, D-55 MVP)", () => {
  const fixtures = [
    {
      name: "add edge with transition",
      args: {
        from: "home" as ScreenId,
        to: "new_habit" as ScreenId,
        trigger: "add_habit" as ActionId,
        transition: "push" as const,
      },
    },
    {
      name: "add edge without transition",
      args: {
        from: "new_habit" as ScreenId,
        to: "home" as ScreenId,
        trigger: "close_modal" as ActionId,
      },
    },
    {
      name: "add modal edge",
      args: {
        from: "home" as ScreenId,
        to: "new_habit" as ScreenId,
        trigger: "toggle_done" as ActionId,
        transition: "modal" as const,
      },
    },
  ];

  it.each(fixtures)("apply→invert→apply is idempotent: $name", async ({ args }) => {
    const before = await loadFixture();
    const initialEdgeCount = before.spec.navigation.edges.length;

    const { spec: after1, inverseArgs } = addNavEdge.apply(before.spec, before.astHandle, args);
    expect(after1.navigation.edges).toHaveLength(initialEdgeCount + 1);
    const addedEdge = after1.navigation.edges[after1.navigation.edges.length - 1];
    expect(addedEdge?.from).toBe(args.from);
    expect(addedEdge?.to).toBe(args.to);
    expect(addedEdge?.trigger).toBe(args.trigger);

    const { spec: restored } = addNavEdge.invert(after1, before.astHandle, inverseArgs);
    expect(restored.navigation.edges).toHaveLength(initialEdgeCount);

    const { spec: after2 } = addNavEdge.apply(restored, before.astHandle, args);
    expect(after2.navigation.edges).toHaveLength(initialEdgeCount + 1);
  });
});
