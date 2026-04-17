// State variants per screen — D-06, D-07, D-08, D-09.
//
// Four-variant requirement:
//   - `content`: REQUIRED, non-null. Every screen has SOMETHING to display.
//   - `empty`: required key, may be null (N/A). When non-null, `when: { collection: JsonPointer }`.
//   - `loading`: required key, may be null. When non-null, `when: { async: JsonPointer }`.
//   - `error`: required key, may be null. When non-null, `when: { field_error: JsonPointer }`.
//
// Why a factory (`createScreenVariantsSchema`):
//   Plan 04 defines ComponentNodeSchema recursively (z.lazy + z.union). This file
//   (Plan 03) ships first, so it uses `z.array(z.unknown())` as a placeholder for
//   the tree. Plan 05 (spec.ts composition) calls createScreenVariantsSchema with
//   the real ComponentNodeSchema and uses THAT. Default export here uses the
//   placeholder so the Plan 03 tests can run standalone.
import { z } from "zod";
import { JsonPointerSchema } from "../primitives/path.ts";

// Generic schema factory — accepts any tree schema so Plan 05 can swap in ComponentNode.
export function createVariantSchemas<TreeSchema extends z.ZodTypeAny>(treeSchema: TreeSchema) {
  const TreeArray = z.array(treeSchema);

  const ContentVariant = z
    .object({
      kind: z.literal("content"),
      tree: TreeArray,
    })
    .strict();

  const EmptyVariant = z
    .object({
      kind: z.literal("empty"),
      when: z.object({ collection: JsonPointerSchema }).strict(),
      tree: TreeArray,
    })
    .strict();

  const LoadingVariant = z
    .object({
      kind: z.literal("loading"),
      when: z.object({ async: JsonPointerSchema }).strict(),
      tree: TreeArray,
    })
    .strict();

  const ErrorVariant = z
    .object({
      kind: z.literal("error"),
      when: z.object({ field_error: JsonPointerSchema }).strict(),
      tree: TreeArray,
    })
    .strict();

  return { ContentVariant, EmptyVariant, LoadingVariant, ErrorVariant };
}

export function createScreenVariantsSchema<TreeSchema extends z.ZodTypeAny>(
  treeSchema: TreeSchema,
) {
  const { ContentVariant, EmptyVariant, LoadingVariant, ErrorVariant } =
    createVariantSchemas(treeSchema);

  // ScreenVariants: all four keys REQUIRED (D-06). Content non-null, others nullable.
  return z
    .object({
      content: ContentVariant,
      empty: z.union([EmptyVariant, z.null()]),
      loading: z.union([LoadingVariant, z.null()]),
      error: z.union([ErrorVariant, z.null()]),
    })
    .strict();
}

// Default (placeholder) schemas using z.unknown() tree — Plan 03 tests use these.
// Plan 05 rewires with real ComponentNodeSchema.
const defaults = createVariantSchemas(z.unknown());
export const ContentVariantSchema = defaults.ContentVariant;
export const EmptyVariantSchema = defaults.EmptyVariant;
export const LoadingVariantSchema = defaults.LoadingVariant;
export const ErrorVariantSchema = defaults.ErrorVariant;
export const ScreenVariantsSchema = createScreenVariantsSchema(z.unknown());

// Type exports — note these use unknown[] for the tree at the Plan 03 level.
// Plan 05 narrows to ComponentNode[] via the factory composition.
export type ContentVariant = z.infer<typeof ContentVariantSchema>;
export type EmptyVariant = z.infer<typeof EmptyVariantSchema>;
export type LoadingVariant = z.infer<typeof LoadingVariantSchema>;
export type ErrorVariant = z.infer<typeof ErrorVariantSchema>;
export type ScreenVariants = z.infer<typeof ScreenVariantsSchema>;
