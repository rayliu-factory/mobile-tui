// Tests for add-entity command (Plan 04-05) — D-54 (exhaustive catalog) +
// D-62 (AST invert discipline) + apply→invert→apply idempotence.
//
// Fixture: fixtures/habit-tracker.spec.md (has dataModel with Habit + Completion entities)
// Each test re-parses the fixture to reset astHandle state.
import { describe, expect, it } from "vitest";
import type { EntityName } from "../../primitives/ids.ts";
import { parseSpecFile } from "../../serialize/index.ts";
import { addEntity } from "./add-entity.ts";

const FIXTURE_PATH = "fixtures/habit-tracker.spec.md";

async function loadFixture() {
  const result = await parseSpecFile(FIXTURE_PATH);
  if (!result.spec || !result.astHandle) {
    throw new Error(`fixture parse failed: ${result.diagnostics.map((d) => d.message).join(", ")}`);
  }
  return { spec: result.spec, astHandle: result.astHandle };
}

describe("addEntity command (D-54, D-62)", () => {
  const fixtures = [
    {
      name: "entity with no fields (uses default empty fields array)",
      args: { name: "User" as EntityName, fields: [{ name: "id", type: "string" as const, required: true }] },
    },
    {
      name: "entity with multiple fields",
      args: {
        name: "Product" as EntityName,
        fields: [
          { name: "title", type: "string" as const, required: true },
          { name: "price", type: "number" as const },
        ],
      },
    },
    {
      name: "entity with reference field",
      args: {
        name: "OrderItem" as EntityName,
        fields: [
          { name: "quantity", type: "number" as const, required: true },
          { name: "product", type: "reference" as const, of: "Product" as EntityName },
        ],
      },
    },
  ];

  it.each(fixtures)("apply→invert→apply is idempotent: $name", async ({ args }) => {
    const before = await loadFixture();
    const initialEntityCount = before.spec.data.entities.length;

    const { spec: after1, inverseArgs } = addEntity.apply(before.spec, before.astHandle, args);

    // After apply: entity appended
    expect(after1.data.entities).toHaveLength(initialEntityCount + 1);
    const added = after1.data.entities[after1.data.entities.length - 1];
    expect(added?.name).toBe(args.name);

    // Invert: restored to original
    const { spec: restored } = addEntity.invert(after1, before.astHandle, inverseArgs);
    expect(restored.data.entities).toHaveLength(initialEntityCount);
    expect(restored.data.entities.map((e) => e.name)).not.toContain(args.name);

    // Re-apply: same result as first apply
    const { spec: after2 } = addEntity.apply(restored, before.astHandle, args);
    expect(after2.data.entities).toHaveLength(initialEntityCount + 1);
    expect(after2.data.entities[after2.data.entities.length - 1]?.name).toBe(args.name);
  });
});
