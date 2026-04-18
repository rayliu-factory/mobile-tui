// Tests for set-field-type command (Plan 04-05) — D-54 + D-62.
import { describe, expect, it } from "vitest";
import type { EntityName } from "../../primitives/ids.ts";
import { parseSpecFile } from "../../serialize/index.ts";
import { setFieldType } from "./set-field-type.ts";

const FIXTURE_PATH = "fixtures/habit-tracker.spec.md";

async function loadFixture() {
  const result = await parseSpecFile(FIXTURE_PATH);
  if (!result.spec || !result.astHandle) {
    throw new Error(`fixture parse failed: ${result.diagnostics.map((d) => d.message).join(", ")}`);
  }
  return { spec: result.spec, astHandle: result.astHandle };
}

describe("setFieldType command (D-54, D-62)", () => {
  const fixtures = [
    {
      name: "change title from string to number",
      args: { entity: "Habit" as EntityName, fieldName: "done", type: "number" as const },
    },
    {
      name: "change date field type",
      args: { entity: "Completion" as EntityName, fieldName: "date", type: "string" as const },
    },
    {
      name: "set type to reference with of",
      args: {
        entity: "Habit" as EntityName,
        fieldName: "done",
        type: "reference" as const,
        of: "Completion" as EntityName,
      },
    },
  ];

  it.each(fixtures)("apply→invert→apply is idempotent: $name", async ({ args }) => {
    const before = await loadFixture();
    const entity = before.spec.data.entities.find((e) => e.name === args.entity);
    const field = entity?.fields.find((f) => f.name === args.fieldName);
    const prevType = field?.type;
    const prevOf = field?.of;

    const { spec: after1, inverseArgs } = setFieldType.apply(before.spec, before.astHandle, args);
    const afterEntity = after1.data.entities.find((e) => e.name === args.entity);
    const afterField = afterEntity?.fields.find((f) => f.name === args.fieldName);
    expect(afterField?.type).toBe(args.type);
    if (args.of !== undefined) {
      expect(afterField?.of).toBe(args.of);
    }

    const { spec: restored } = setFieldType.invert(after1, before.astHandle, inverseArgs);
    const restoredEntity = restored.data.entities.find((e) => e.name === args.entity);
    const restoredField = restoredEntity?.fields.find((f) => f.name === args.fieldName);
    expect(restoredField?.type).toBe(prevType);
    expect(restoredField?.of).toBe(prevOf);

    const { spec: after2 } = setFieldType.apply(restored, before.astHandle, args);
    const after2Entity = after2.data.entities.find((e) => e.name === args.entity);
    const after2Field = after2Entity?.fields.find((f) => f.name === args.fieldName);
    expect(after2Field?.type).toBe(args.type);
  });
});
