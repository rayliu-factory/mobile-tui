// Tests for set-action-effect command (Plan 04-05) — D-54.
// Replaces the effect of an existing action in the registry.
import { describe, expect, it } from "vitest";
import type { ActionId, ScreenId } from "../../primitives/ids.ts";
import { parseSpecFile } from "../../serialize/index.ts";
import { setActionEffect } from "./set-action-effect.ts";

const FIXTURE_PATH = "fixtures/habit-tracker.spec.md";

async function loadFixture() {
  const result = await parseSpecFile(FIXTURE_PATH);
  if (!result.spec || !result.astHandle) {
    throw new Error(`fixture parse failed: ${result.diagnostics.map((d) => d.message).join(", ")}`);
  }
  return { spec: result.spec, astHandle: result.astHandle };
}

// Helper to access spec.actions by string key (branded Record<ActionId, Action>)
function getAction(
  spec: { actions: Record<string, unknown> },
  id: string,
): { kind: string } | undefined {
  return (spec.actions as Record<string, { kind: string } | undefined>)[id];
}

describe("setActionEffect command (D-54)", () => {
  const fixtures = [
    {
      name: "change navigate to dismiss",
      args: {
        id: "add_habit" as ActionId,
        effect: { kind: "dismiss" as const },
      },
    },
    {
      name: "change mutate to custom",
      args: {
        id: "toggle_done" as ActionId,
        effect: { kind: "custom" as const, name: "toggle_done" },
      },
    },
    {
      name: "change submit to navigate",
      args: {
        id: "save_habit" as ActionId,
        effect: { kind: "navigate" as const, screen: "home" as ScreenId },
      },
    },
  ];

  it.each(fixtures)("apply->invert->apply is idempotent: $name", async ({ args }) => {
    const before = await loadFixture();
    const originalEffect = getAction(before.spec, args.id);
    expect(originalEffect).toBeDefined();

    const { spec: after1, inverseArgs } = setActionEffect.apply(
      before.spec,
      before.astHandle,
      args,
    );
    expect(getAction(after1, args.id)?.kind).toBe(args.effect.kind);

    const { spec: restored } = setActionEffect.invert(after1, before.astHandle, inverseArgs);
    expect(getAction(restored, args.id)?.kind).toBe(originalEffect?.kind);

    const { spec: after2 } = setActionEffect.apply(restored, before.astHandle, args);
    expect(getAction(after2, args.id)?.kind).toBe(args.effect.kind);
  });
});
