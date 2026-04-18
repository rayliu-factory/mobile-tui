// Tests for rename-entity command (Plan 04-05) — D-54 (exhaustive catalog) +
// cascade through Field.of, Action.submit.entity, Relationship.from/to.
//
// Fixture: fixtures/habit-tracker.spec.md (Habit entity with submit action + relationships)
import { describe, expect, it } from "vitest";
import type { EntityName } from "../../primitives/ids.ts";
import { parseSpecFile } from "../../serialize/index.ts";
import { renameEntity } from "./rename-entity.ts";

const FIXTURE_PATH = "fixtures/habit-tracker.spec.md";

async function loadFixture() {
  const result = await parseSpecFile(FIXTURE_PATH);
  if (!result.spec || !result.astHandle) {
    throw new Error(`fixture parse failed: ${result.diagnostics.map((d) => d.message).join(", ")}`);
  }
  return { spec: result.spec, astHandle: result.astHandle };
}

describe("renameEntity command (D-54, D-62, cascade)", () => {
  it("apply→invert→apply is idempotent: rename non-cascaded entity", async () => {
    const before = await loadFixture();
    const args = { from: "Completion" as EntityName, to: "HabitLog" as EntityName };

    const { spec: after1, inverseArgs } = renameEntity.apply(before.spec, before.astHandle, args);
    expect(after1.data.entities.map((e) => e.name)).toContain("HabitLog");
    expect(after1.data.entities.map((e) => e.name)).not.toContain("Completion");

    const { spec: restored } = renameEntity.invert(after1, before.astHandle, inverseArgs);
    expect(restored.data.entities.map((e) => e.name)).toContain("Completion");
    expect(restored.data.entities.map((e) => e.name)).not.toContain("HabitLog");

    const { spec: after2 } = renameEntity.apply(restored, before.astHandle, args);
    expect(after2.data.entities.map((e) => e.name)).toContain("HabitLog");
  });

  it("apply→invert→apply is idempotent: rename Habit cascades submit.entity", async () => {
    const before = await loadFixture();
    const args = { from: "Habit" as EntityName, to: "Task" as EntityName };

    const { spec: after1, inverseArgs } = renameEntity.apply(before.spec, before.astHandle, args);
    // Entity renamed
    expect(after1.data.entities.map((e) => e.name)).toContain("Task");
    expect(after1.data.entities.map((e) => e.name)).not.toContain("Habit");
    // submit.entity cascaded
    const submitAction = Object.values(after1.actions).find((a) => a?.kind === "submit");
    expect(submitAction?.kind === "submit" && submitAction.entity).toBe("Task");

    const { spec: restored } = renameEntity.invert(after1, before.astHandle, inverseArgs);
    expect(restored.data.entities.map((e) => e.name)).toContain("Habit");
    const restoredSubmit = Object.values(restored.actions).find((a) => a?.kind === "submit");
    expect(restoredSubmit?.kind === "submit" && restoredSubmit.entity).toBe("Habit");

    const { spec: after2 } = renameEntity.apply(restored, before.astHandle, args);
    expect(after2.data.entities.map((e) => e.name)).toContain("Task");
  });

  it("apply→invert→apply is idempotent: rename entity cascades Field.of + Relationship", async () => {
    const before = await loadFixture();
    // Habit has relationship Habit→Completion (has_many) and Completion has reference field of: Habit
    const args = { from: "Habit" as EntityName, to: "Goal" as EntityName };

    const { spec: after1, inverseArgs } = renameEntity.apply(before.spec, before.astHandle, args);

    // Check Field.of cascade: Completion.habit references Habit
    const completionEntity = after1.data.entities.find((e) => e.name === "Completion");
    const habitRefField = completionEntity?.fields.find((f) => f.type === "reference");
    expect(habitRefField?.of).toBe("Goal");

    // Check Relationship.from cascade
    const goalEntity = after1.data.entities.find((e) => e.name === "Goal");
    const rel = goalEntity?.relationships?.[0];
    expect(rel?.from).toBe("Goal");

    const { spec: restored } = renameEntity.invert(after1, before.astHandle, inverseArgs);
    const restoredHabit = restored.data.entities.find((e) => e.name === "Habit");
    const restoredRel = restoredHabit?.relationships?.[0];
    expect(restoredRel?.from).toBe("Habit");

    const { spec: after2 } = renameEntity.apply(restored, before.astHandle, args);
    expect(after2.data.entities.map((e) => e.name)).toContain("Goal");
  });
});
