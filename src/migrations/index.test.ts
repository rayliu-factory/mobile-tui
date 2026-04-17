import { describe, expect, it } from "vitest";
import { validateSpec } from "../model/invariants.ts";
import { SCHEMA_VERSION } from "../model/version.ts";
import { MIGRATIONS, runMigrations } from "./index.ts";

const minimalSpec = {
  schema: SCHEMA_VERSION,
  screens: [
    {
      id: "home",
      title: "Home",
      kind: "regular",
      variants: {
        content: { kind: "content", tree: [] },
        empty: null,
        loading: null,
        error: null,
      },
    },
  ],
  actions: {},
  data: { entities: [{ name: "Habit", fields: [{ name: "title", type: "string" }] }] },
  navigation: { root: "home", edges: [] },
};

describe("runMigrations — chain runner", () => {
  it("returns input unchanged for same-version case (1→1)", () => {
    const result = runMigrations(minimalSpec, "1", "1");
    expect(result).toBe(minimalSpec); // referential equality — no transform applied
  });

  it("returns input unchanged for same-version case (2→2)", () => {
    const result = runMigrations(minimalSpec, "2", "2");
    expect(result).toBe(minimalSpec);
  });

  it("no-op migration 1→2 returns structurally-identical spec (byte-identical JSON)", () => {
    const result = runMigrations(minimalSpec, "1", "2");
    expect(JSON.stringify(result)).toBe(JSON.stringify(minimalSpec));
  });

  it("passes through arbitrary input without inspection (empty-op body)", () => {
    expect(runMigrations("arbitrary", "1", "2")).toBe("arbitrary");
    expect(runMigrations(42, "1", "2")).toBe(42);
    expect(runMigrations(null, "1", "2")).toBe(null);
  });

  it("throws on missing migration path", () => {
    expect(() => runMigrations(minimalSpec, "1", "99" as never)).toThrow(/No migration path/);
  });

  it("MIGRATIONS table has exactly one entry in Phase 1", () => {
    expect(MIGRATIONS.length).toBe(1);
    expect(MIGRATIONS[0]).toMatchObject({ from: "1", to: "2" });
  });
});

describe("Migration doesn't reopen closed-vocab escape hatches (T-01-03)", () => {
  it("migrated spec still validates — zero Stage-A diagnostics", () => {
    const migrated = runMigrations(minimalSpec, "1", "2");
    const result = validateSpec(migrated);
    // Every Stage-A diagnostic is structural — migrated output must not have any.
    // Cross-ref (Stage B) diagnostics may exist but those are content, not schema.
    // Here the minimal spec has NO cross-ref issues either.
    expect(result.spec).not.toBeNull();
    expect(result.diagnostics).toEqual([]);
  });
});
