// Actions registry schema — D-10..D-13.
// Six closed kinds: navigate, submit, mutate, present, dismiss, custom.
// Cross-reference validation (does screen/entity/overlay actually exist?) is
// Plan 06's Stage B crossReferencePass. Here we only validate SHAPE.
import { z } from "zod";
import { ActionIdSchema, EntityNameSchema, ScreenIdSchema, SNAKE_CASE } from "../primitives/ids.ts";
import { JsonPointerSchema } from "../primitives/path.ts";

export const MUTATE_OPS = ["toggle", "set", "push", "remove"] as const;
export type MutateOp = (typeof MUTATE_OPS)[number];

const NavigateAction = z
  .object({
    kind: z.literal("navigate"),
    screen: ScreenIdSchema,
    params: z.record(z.string(), JsonPointerSchema).optional(),
  })
  .strict();

const SubmitAction = z
  .object({
    kind: z.literal("submit"),
    entity: EntityNameSchema,
    source: JsonPointerSchema.optional(),
  })
  .strict();

const MutateAction = z
  .object({
    kind: z.literal("mutate"),
    // JsonPointer is NOT a filesystem path — RFC 6901 only, see RESEARCH §Security Domain.
    target: JsonPointerSchema,
    op: z.enum(MUTATE_OPS),
    value: z.unknown().optional(),
  })
  .strict();

const PresentAction = z
  .object({
    kind: z.literal("present"),
    overlay: ScreenIdSchema,
  })
  .strict();

const DismissAction = z
  .object({
    kind: z.literal("dismiss"),
  })
  .strict();

const CustomAction = z
  .object({
    kind: z.literal("custom"),
    // `name` is free-form but still constrained to snake_case for consistency with other ids.
    // Downstream (Maestro emitter, handoff commands) consume this name.
    name: z.string().regex(SNAKE_CASE, "custom action name must be snake_case"),
    description: z.string().optional(),
  })
  .strict();

export const ActionSchema = z.discriminatedUnion("kind", [
  NavigateAction,
  SubmitAction,
  MutateAction,
  PresentAction,
  DismissAction,
  CustomAction,
]);

export type Action = z.infer<typeof ActionSchema>;

// Top-level actions registry: Record<ActionId, Action>.
// Keys must satisfy snake_case regex (Zod v4 z.record validates keys via key schema).
export const ActionsRegistrySchema = z.record(ActionIdSchema, ActionSchema);
export type ActionsRegistry = z.infer<typeof ActionsRegistrySchema>;
