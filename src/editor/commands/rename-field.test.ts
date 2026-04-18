// Tests for rename-field command (Plan 04-05) — D-54 + D-62.
import { describe, expect, it } from "vitest";
import type { EntityName } from "../../primitives/ids.ts";
import { parseSpecFile } from "../../serialize/index.ts";
import { renameField } from "./rename-field.ts";

const FIXTURE_PATH = "fixtures/habit-tracker.spec.md";

async function loadFixture() {
  const result = await parseSpecFile(FIXTURE_PATH);
  if (!result.spec || !result.astHandle) {
    throw new Error(`fixture parse failed: ${result.diagnostics.map((d) => d.message).join(", ")}`);
  }
  return { spec: result.spec, astHandle: result.astHandle };
}

describe("renameField command (D-54, D-62)", () => {
  const fixtures = [
    {
      name: "rename title field in Habit",
      args: { entity: "Habit" as EntityName, from: "title", to: "name" },
    },
    {
      name: "rename done field in Habit",
      args: { entity: "Habit" as EntityName, from: "done", to: "completed" },
    },
    {
      name: "rename date field in Completion",
      args: { entity: "Completion" as EntityName, from: "date", to: "completed_at" },
    },
  ];

  it.each(fixtures)("apply→invert→apply is idempotent: $name", async ({ args }) => {
    const before = await loadFixture();
    const entity = before.spec.data.entities.find((e) => e.name === args.entity);
    const fieldIndex = entity?.fields.findIndex((f) => f.name === args.from);
    expect(fieldIndex).toBeGreaterThanOrEqual(0);

    const { spec: after1, inverseArgs } = renameField.apply(before.spec, before.astHandle, args);
    const afterEntity = after1.data.entities.find((e) => e.name === args.entity);
    expect(afterEntity?.fields.map((f) => f.name)).toContain(args.to);
    expect(afterEntity?.fields.map((f) => f.name)).not.toContain(args.from);

    const { spec: restored } = renameField.invert(after1, before.astHandle, inverseArgs);
    const restoredEntity = restored.data.entities.find((e) => e.name === args.entity);
    expect(restoredEntity?.fields.map((f) => f.name)).toContain(args.from);
    expect(restoredEntity?.fields.map((f) => f.name)).not.toContain(args.to);

    const { spec: after2 } = renameField.apply(restored, before.astHandle, args);
    const after2Entity = after2.data.entities.find((e) => e.name === args.entity);
    expect(after2Entity?.fields.map((f) => f.name)).toContain(args.to);
  });
});
