// Tests for add-relationship command (Plan 04-05) — D-54 + D-62.
import { describe, expect, it } from "vitest";
import type { EntityName } from "../../primitives/ids.ts";
import { parseSpecFile } from "../../serialize/index.ts";
import { addRelationship } from "./add-relationship.ts";

const FIXTURE_PATH = "fixtures/habit-tracker.spec.md";

async function loadFixture() {
  const result = await parseSpecFile(FIXTURE_PATH);
  if (!result.spec || !result.astHandle) {
    throw new Error(`fixture parse failed: ${result.diagnostics.map((d) => d.message).join(", ")}`);
  }
  return { spec: result.spec, astHandle: result.astHandle };
}

describe("addRelationship command (D-54, D-62)", () => {
  const fixtures = [
    {
      name: "add has_one relationship to Completion",
      args: {
        entity: "Completion" as EntityName,
        from: "Completion" as EntityName,
        to: "Habit" as EntityName,
        kind: "belongs_to" as const,
      },
    },
    {
      name: "add has_many relationship to Habit",
      args: {
        entity: "Habit" as EntityName,
        from: "Habit" as EntityName,
        to: "Habit" as EntityName,
        kind: "has_many" as const,
      },
    },
    {
      name: "add belongs_to relationship",
      args: {
        entity: "Completion" as EntityName,
        from: "Completion" as EntityName,
        to: "Completion" as EntityName,
        kind: "has_one" as const,
      },
    },
  ];

  it.each(fixtures)("apply→invert→apply is idempotent: $name", async ({ args }) => {
    const before = await loadFixture();
    const entity = before.spec.data.entities.find((e) => e.name === args.entity);
    const initialRelCount = entity?.relationships?.length ?? 0;

    const { spec: after1, inverseArgs } = addRelationship.apply(
      before.spec,
      before.astHandle,
      args,
    );
    const afterEntity = after1.data.entities.find((e) => e.name === args.entity);
    expect(afterEntity?.relationships ?? []).toHaveLength(initialRelCount + 1);
    const addedRel = afterEntity?.relationships?.[afterEntity.relationships.length - 1];
    expect(addedRel?.from).toBe(args.from);
    expect(addedRel?.to).toBe(args.to);
    expect(addedRel?.kind).toBe(args.kind);

    const { spec: restored } = addRelationship.invert(after1, before.astHandle, inverseArgs);
    const restoredEntity = restored.data.entities.find((e) => e.name === args.entity);
    expect(restoredEntity?.relationships ?? []).toHaveLength(initialRelCount);

    const { spec: after2 } = addRelationship.apply(restored, before.astHandle, args);
    const after2Entity = after2.data.entities.find((e) => e.name === args.entity);
    expect(after2Entity?.relationships ?? []).toHaveLength(initialRelCount + 1);
  });
});
