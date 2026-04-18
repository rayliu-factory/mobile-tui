// Tests for delete-entity command (Plan 04-05) — D-54 (exhaustive catalog) +
// D-62 (AST invert discipline) + apply→invert→apply idempotence.
import { describe, expect, it } from "vitest";
import type { EntityName } from "../../primitives/ids.ts";
import { parseSpecFile } from "../../serialize/index.ts";
import { deleteEntity } from "./delete-entity.ts";

const FIXTURE_PATH = "fixtures/habit-tracker.spec.md";

async function loadFixture() {
  const result = await parseSpecFile(FIXTURE_PATH);
  if (!result.spec || !result.astHandle) {
    throw new Error(`fixture parse failed: ${result.diagnostics.map((d) => d.message).join(", ")}`);
  }
  return { spec: result.spec, astHandle: result.astHandle };
}

describe("deleteEntity command (D-54, D-62)", () => {
  it("apply→invert→apply is idempotent: delete Completion (leaf entity)", async () => {
    const before = await loadFixture();
    const args = { name: "Completion" as EntityName };
    const initialCount = before.spec.data.entities.length;

    const { spec: after1, inverseArgs } = deleteEntity.apply(before.spec, before.astHandle, args);
    expect(after1.data.entities).toHaveLength(initialCount - 1);
    expect(after1.data.entities.map((e) => e.name)).not.toContain("Completion");

    const { spec: restored } = deleteEntity.invert(after1, before.astHandle, inverseArgs);
    expect(restored.data.entities).toHaveLength(initialCount);
    expect(restored.data.entities.map((e) => e.name)).toContain("Completion");

    const { spec: after2 } = deleteEntity.apply(restored, before.astHandle, args);
    expect(after2.data.entities).toHaveLength(initialCount - 1);
    expect(after2.data.entities.map((e) => e.name)).not.toContain("Completion");
  });

  it("apply→invert→apply is idempotent: delete entity removes its relationships", async () => {
    const before = await loadFixture();
    const args = { name: "Habit" as EntityName };
    const initialCount = before.spec.data.entities.length;

    const { spec: after1, inverseArgs } = deleteEntity.apply(before.spec, before.astHandle, args);
    expect(after1.data.entities).toHaveLength(initialCount - 1);
    // Relationships FROM/TO Habit removed from remaining entities
    for (const entity of after1.data.entities) {
      const rels = entity.relationships ?? [];
      for (const rel of rels) {
        expect(rel.from).not.toBe("Habit");
        expect(rel.to).not.toBe("Habit");
      }
    }

    const { spec: restored } = deleteEntity.invert(after1, before.astHandle, inverseArgs);
    expect(restored.data.entities).toHaveLength(initialCount);
    expect(restored.data.entities.map((e) => e.name)).toContain("Habit");

    const { spec: after2 } = deleteEntity.apply(restored, before.astHandle, args);
    expect(after2.data.entities).toHaveLength(initialCount - 1);
  });

  it("apply→invert→apply is idempotent: delete entity at index 0", async () => {
    const before = await loadFixture();
    // Use the first entity
    const firstEntityName = before.spec.data.entities[0]?.name as EntityName;
    const args = { name: firstEntityName };
    const initialCount = before.spec.data.entities.length;

    const { spec: after1, inverseArgs } = deleteEntity.apply(before.spec, before.astHandle, args);
    expect(after1.data.entities).toHaveLength(initialCount - 1);

    const { spec: restored } = deleteEntity.invert(after1, before.astHandle, inverseArgs);
    expect(restored.data.entities).toHaveLength(initialCount);
    // Entity restored at index 0
    expect(restored.data.entities[0]?.name).toBe(firstEntityName);

    const { spec: after2 } = deleteEntity.apply(restored, before.astHandle, args);
    expect(after2.data.entities).toHaveLength(initialCount - 1);
  });
});
