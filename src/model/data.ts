// Data model: Entities (PascalCase names) with named Fields (snake_case) and
// optional relationships. SPEC-04 coverage.
//
// JSON Pointer bindings referring INTO the data model (e.g., /Habit/title)
// are validated at cross-ref time (Plan 06), not here. Here we only validate
// the DATA MODEL definition itself.
import { z } from "zod";
import { EntityNameSchema, SNAKE_CASE } from "../primitives/ids.ts";

// Closed field type enum for v1.
// `reference` requires `of: EntityName` (see FieldSchema refine below).
export const FIELD_TYPES = ["string", "number", "boolean", "date", "reference"] as const;
export type FieldType = (typeof FIELD_TYPES)[number];
export const FieldTypeSchema = z.enum(FIELD_TYPES);

export const FieldSchema = z
  .object({
    name: z.string().regex(SNAKE_CASE, "field name must be snake_case"),
    type: FieldTypeSchema,
    required: z.boolean().optional(),
    description: z.string().optional(),
    // `of` is the target entity for type: "reference"; ignored otherwise.
    of: EntityNameSchema.optional(),
  })
  .strict()
  .refine((field) => field.type !== "reference" || field.of !== undefined, {
    message: "Field of type 'reference' must declare an `of: EntityName` target",
  });
export type Field = z.infer<typeof FieldSchema>;

// Closed relationship-kind enum.
const RELATIONSHIP_KINDS = ["has_one", "has_many", "belongs_to"] as const;
export type RelationshipKind = (typeof RELATIONSHIP_KINDS)[number];

const RelationshipSchema = z
  .object({
    from: EntityNameSchema,
    to: EntityNameSchema,
    kind: z.enum(RELATIONSHIP_KINDS),
  })
  .strict();
export type Relationship = z.infer<typeof RelationshipSchema>;

export const EntitySchema = z
  .object({
    name: EntityNameSchema,
    fields: z.array(FieldSchema).min(1, "entity must declare at least one field"),
    relationships: z.array(RelationshipSchema).optional(),
  })
  .strict();
export type Entity = z.infer<typeof EntitySchema>;

export const DataModelSchema = z
  .object({
    // Phase-6: relaxed from .min(1) to .min(0) — a new wizard spec has no
    // entities until step 6 of the wizard flow. The old min(1) was a
    // correctness gate for fully-authored specs; wizard introduces valid
    // partially-filled specs. Entity presence is enforced by the graduation
    // gate (Phase-6 Plan 05) not at the schema level.
    entities: z.array(EntitySchema).min(0),
  })
  .strict();
export type DataModel = z.infer<typeof DataModelSchema>;
