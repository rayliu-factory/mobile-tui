import { describe, expect, it } from "vitest";
import { DataModelSchema, EntitySchema, FIELD_TYPES, FieldSchema } from "./data.ts";

describe("FieldSchema", () => {
  it("accepts snake_case name + string type", () => {
    expect(FieldSchema.safeParse({ name: "title", type: "string" }).success).toBe(true);
  });

  it.each(FIELD_TYPES)("accepts field type = %s", (type) => {
    const field =
      type === "reference" ? { name: "author", type, of: "Author" } : { name: "f", type };
    expect(FieldSchema.safeParse(field).success).toBe(true);
  });

  it("accepts optional required + description", () => {
    expect(
      FieldSchema.safeParse({
        name: "title",
        type: "string",
        required: true,
        description: "the habit title",
      }).success,
    ).toBe(true);
  });

  it("rejects PascalCase field name", () => {
    expect(FieldSchema.safeParse({ name: "Title", type: "string" }).success).toBe(false);
  });

  it("rejects unknown type", () => {
    expect(FieldSchema.safeParse({ name: "x", type: "blob" }).success).toBe(false);
  });

  it("requires `of: EntityName` when type is reference", () => {
    expect(FieldSchema.safeParse({ name: "author", type: "reference" }).success).toBe(false);
    expect(
      FieldSchema.safeParse({
        name: "author",
        type: "reference",
        of: "Author",
      }).success,
    ).toBe(true);
  });

  it("rejects lowercase `of`", () => {
    expect(
      FieldSchema.safeParse({
        name: "author",
        type: "reference",
        of: "author",
      }).success,
    ).toBe(false);
  });
});

describe("EntitySchema", () => {
  it("accepts PascalCase name + at least one field", () => {
    expect(
      EntitySchema.safeParse({
        name: "Habit",
        fields: [{ name: "title", type: "string" }],
      }).success,
    ).toBe(true);
  });

  it("rejects lowercase name", () => {
    expect(
      EntitySchema.safeParse({
        name: "habit",
        fields: [{ name: "title", type: "string" }],
      }).success,
    ).toBe(false);
  });

  it("rejects empty fields array", () => {
    expect(EntitySchema.safeParse({ name: "Habit", fields: [] }).success).toBe(false);
  });

  it("accepts optional relationships", () => {
    expect(
      EntitySchema.safeParse({
        name: "Habit",
        fields: [{ name: "title", type: "string" }],
        relationships: [{ from: "Habit", to: "Completion", kind: "has_many" }],
      }).success,
    ).toBe(true);
  });
});

describe("DataModelSchema", () => {
  it("accepts a model with at least one entity", () => {
    expect(
      DataModelSchema.safeParse({
        entities: [{ name: "Habit", fields: [{ name: "title", type: "string" }] }],
      }).success,
    ).toBe(true);
  });

  // Phase-6: .min(1) relaxed to .min(0) — new wizard specs start with empty entities.
  // The old "rejects empty entities array" test is replaced by this acceptance test.
  it("accepts empty entities array (.min(0) — wizard spec has no entities yet)", () => {
    expect(DataModelSchema.safeParse({ entities: [] }).success).toBe(true);
  });
});
