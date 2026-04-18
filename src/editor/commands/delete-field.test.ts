// Tests for delete-field command (Plan 04-05) — D-54 + D-62.
import { describe, expect, it } from "vitest";
import type { EntityName } from "../../primitives/ids.ts";
import { parseSpecFile } from "../../serialize/index.ts";
import { deleteField } from "./delete-field.ts";

const FIXTURE_PATH = "fixtures/habit-tracker.spec.md";

async function loadFixture() {
  const result = await parseSpecFile(FIXTURE_PATH);
  if (!result.spec || !result.astHandle) {
    throw new Error(`fixture parse failed: ${result.diagnostics.map((d) => d.message).join(", ")}`);
  }
  return { spec: result.spec, astHandle: result.astHandle };
}

describe("deleteField command (D-54, D-62)", () => {
  const fixtures = [
    {
      name: "delete done field from Habit",
      args: { entity: "Habit" as EntityName, name: "done" },
    },
    {
      name: "delete habit field from Completion",
      args: { entity: "Completion" as EntityName, name: "habit" },
    },
    {
      name: "delete date field from Completion",
      args: { entity: "Completion" as EntityName, name: "date" },
    },
  ];

  it.each(fixtures)("apply→invert→apply is idempotent: $name", async ({ args }) => {
    const before = await loadFixture();
    const entity = before.spec.data.entities.find((e) => e.name === args.entity);
    const initialFieldCount = entity?.fields.length ?? 0;
    const fieldIndex = entity?.fields.findIndex((f) => f.name === args.name);
    expect(fieldIndex).toBeGreaterThanOrEqual(0);

    const { spec: after1, inverseArgs } = deleteField.apply(before.spec, before.astHandle, args);
    const afterEntity = after1.data.entities.find((e) => e.name === args.entity);
    expect(afterEntity?.fields).toHaveLength(initialFieldCount - 1);
    expect(afterEntity?.fields.map((f) => f.name)).not.toContain(args.name);

    const { spec: restored } = deleteField.invert(after1, before.astHandle, inverseArgs);
    const restoredEntity = restored.data.entities.find((e) => e.name === args.entity);
    expect(restoredEntity?.fields).toHaveLength(initialFieldCount);
    // Field restored at original index
    expect(restoredEntity?.fields[fieldIndex ?? 0]?.name).toBe(args.name);

    const { spec: after2 } = deleteField.apply(restored, before.astHandle, args);
    const after2Entity = after2.data.entities.find((e) => e.name === args.entity);
    expect(after2Entity?.fields).toHaveLength(initialFieldCount - 1);
  });
});
