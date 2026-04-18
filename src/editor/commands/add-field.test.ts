// Tests for add-field command (Plan 04-05) — D-54 + D-62.
// Appends a Field to an existing Entity.
import { describe, expect, it } from "vitest";
import type { EntityName } from "../../primitives/ids.ts";
import { parseSpecFile } from "../../serialize/index.ts";
import { addField } from "./add-field.ts";

const FIXTURE_PATH = "fixtures/habit-tracker.spec.md";

async function loadFixture() {
  const result = await parseSpecFile(FIXTURE_PATH);
  if (!result.spec || !result.astHandle) {
    throw new Error(`fixture parse failed: ${result.diagnostics.map((d) => d.message).join(", ")}`);
  }
  return { spec: result.spec, astHandle: result.astHandle };
}

describe("addField command (D-54, D-62)", () => {
  const fixtures = [
    {
      name: "add string field to Habit",
      args: {
        entity: "Habit" as EntityName,
        field: { name: "description", type: "string" as const },
      },
    },
    {
      name: "add required boolean field to Completion",
      args: {
        entity: "Completion" as EntityName,
        field: { name: "verified", type: "boolean" as const, required: true },
      },
    },
    {
      name: "add date field to Habit",
      args: {
        entity: "Habit" as EntityName,
        field: { name: "created_at", type: "date" as const },
      },
    },
  ];

  it.each(fixtures)("apply→invert→apply is idempotent: $name", async ({ args }) => {
    const before = await loadFixture();
    const entity = before.spec.data.entities.find((e) => e.name === args.entity);
    const initialFieldCount = entity?.fields.length ?? 0;

    const { spec: after1, inverseArgs } = addField.apply(before.spec, before.astHandle, args);
    const afterEntity = after1.data.entities.find((e) => e.name === args.entity);
    expect(afterEntity?.fields).toHaveLength(initialFieldCount + 1);
    const addedField = afterEntity?.fields[afterEntity.fields.length - 1];
    expect(addedField?.name).toBe(args.field.name);

    const { spec: restored } = addField.invert(after1, before.astHandle, inverseArgs);
    const restoredEntity = restored.data.entities.find((e) => e.name === args.entity);
    expect(restoredEntity?.fields).toHaveLength(initialFieldCount);
    expect(restoredEntity?.fields.map((f) => f.name)).not.toContain(args.field.name);

    const { spec: after2 } = addField.apply(restored, before.astHandle, args);
    const after2Entity = after2.data.entities.find((e) => e.name === args.entity);
    expect(after2Entity?.fields).toHaveLength(initialFieldCount + 1);
  });
});
