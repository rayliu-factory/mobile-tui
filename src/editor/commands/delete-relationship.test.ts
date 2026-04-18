// Tests for delete-relationship command (Plan 04-05) — D-54 + D-62.
import { describe, expect, it } from "vitest";
import type { EntityName } from "../../primitives/ids.ts";
import { parseSpecFile } from "../../serialize/index.ts";
import { deleteRelationship } from "./delete-relationship.ts";

const FIXTURE_PATH = "fixtures/habit-tracker.spec.md";

async function loadFixture() {
  const result = await parseSpecFile(FIXTURE_PATH);
  if (!result.spec || !result.astHandle) {
    throw new Error(`fixture parse failed: ${result.diagnostics.map((d) => d.message).join(", ")}`);
  }
  return { spec: result.spec, astHandle: result.astHandle };
}

describe("deleteRelationship command (D-54, D-62)", () => {
  it("apply→invert→apply is idempotent: delete first relationship from Habit", async () => {
    const before = await loadFixture();
    const entity = before.spec.data.entities.find((e) => e.name === "Habit");
    const initialRelCount = entity?.relationships?.length ?? 0;
    expect(initialRelCount).toBeGreaterThan(0);

    const args = { entity: "Habit" as EntityName, index: 0 };
    const firstRel = entity?.relationships?.[0];

    const { spec: after1, inverseArgs } = deleteRelationship.apply(
      before.spec,
      before.astHandle,
      args,
    );
    const afterEntity = after1.data.entities.find((e) => e.name === "Habit");
    expect(afterEntity?.relationships ?? []).toHaveLength(initialRelCount - 1);

    const { spec: restored } = deleteRelationship.invert(after1, before.astHandle, inverseArgs);
    const restoredEntity = restored.data.entities.find((e) => e.name === "Habit");
    expect(restoredEntity?.relationships ?? []).toHaveLength(initialRelCount);
    // Restored at index 0
    expect(restoredEntity?.relationships?.[0]?.from).toBe(firstRel?.from);

    const { spec: after2 } = deleteRelationship.apply(restored, before.astHandle, args);
    const after2Entity = after2.data.entities.find((e) => e.name === "Habit");
    expect(after2Entity?.relationships ?? []).toHaveLength(initialRelCount - 1);
  });

  it("apply→invert→apply is idempotent: delete only relationship from entity", async () => {
    const before = await loadFixture();
    // Habit has 1 relationship (has_many Completion)
    const args = { entity: "Habit" as EntityName, index: 0 };

    const { spec: after1, inverseArgs } = deleteRelationship.apply(
      before.spec,
      before.astHandle,
      args,
    );
    const afterEntity = after1.data.entities.find((e) => e.name === "Habit");
    expect(afterEntity?.relationships ?? []).toHaveLength(0);

    const { spec: restored } = deleteRelationship.invert(after1, before.astHandle, inverseArgs);
    const restoredEntity = restored.data.entities.find((e) => e.name === "Habit");
    expect(restoredEntity?.relationships).toHaveLength(1);

    const { spec: after2 } = deleteRelationship.apply(restored, before.astHandle, args);
    expect(after2.data.entities.find((e) => e.name === "Habit")?.relationships ?? []).toHaveLength(
      0,
    );
  });

  it("apply→invert→apply is idempotent: second apply returns same state as first", async () => {
    const before = await loadFixture();
    const args = { entity: "Habit" as EntityName, index: 0 };

    const { spec: after1, inverseArgs } = deleteRelationship.apply(
      before.spec,
      before.astHandle,
      args,
    );
    const { spec: restored } = deleteRelationship.invert(after1, before.astHandle, inverseArgs);
    const { spec: after2 } = deleteRelationship.apply(restored, before.astHandle, args);

    // after1 and after2 should be equivalent (same entity names, same relationship counts)
    const habit1 = after1.data.entities.find((e) => e.name === "Habit");
    const habit2 = after2.data.entities.find((e) => e.name === "Habit");
    expect(habit1?.relationships?.length).toBe(habit2?.relationships?.length);
  });
});
