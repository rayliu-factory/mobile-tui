// src/model/screen.ts
// Screen schema (SPEC-02 shape + SPEC-05 variants + SPEC-10 acceptance).
//
// Structure:
//   id:            ScreenId (snake_case, branded)
//   title:         non-empty string
//   kind:          "regular" | "overlay"  — RESEARCH Open Q#3 resolution.
//                  Lets Plan 06's `present.overlay` cross-ref be a direct
//                  Screen-table lookup instead of a tree-walk.
//   back_behavior: optional HERE (root may omit); Plan 06 cross-ref enforces
//                  presence on every non-root screen.
//   variants:      ScreenVariants wired to the REAL ComponentNodeSchema via
//                  createScreenVariantsSchema factory — this is where the
//                  Plan 03 factory meets the Plan 04 recursive catalog.
//   acceptance:    optional string[] of prose one-liners (SPEC-10). No
//                  given/when/then structure — per CONTEXT.md Claude's Discretion
//                  these are plain prose lines the Maestro emitter and LLM
//                  handoff scaffold both consume as-is.
//
// Phase-1 .strict() on the Screen root: unknown keys (including __proto__ /
// constructor) fail at parse time (T-01-03 defence-in-depth on every schema).
// Phase 2's SPEC-08 _unknown: bucket is a Spec-root concern, not a per-Screen
// concern — a Screen is always structurally closed.
import { z } from "zod";
import { ScreenIdSchema } from "../primitives/ids.ts";
import { BackBehaviorSchema } from "./back-behavior.ts";
import { ComponentNodeSchema } from "./component.ts";
import { createScreenVariantsSchema } from "./variant.ts";

// Wire the variant factory with the real ComponentNodeSchema. This is the
// convergence point between Plan 03 (variant factory) and Plan 04 (18-kind
// recursive catalog): `variants.content.tree` is now `ComponentNode[]` at
// both the runtime schema level and the inferred TypeScript type level.
export const ScreenVariantsWithComponentsSchema = createScreenVariantsSchema(ComponentNodeSchema);

// Closed 2-kind discriminator (D-13 + RESEARCH Open Q#3). "regular" is the
// normal in-stack navigation target; "overlay" is a modal/sheet target
// addressed by `present.overlay` actions. Cross-ref (Plan 06) ensures any
// `present.overlay` value names a screen with kind === "overlay".
export const SCREEN_KINDS = ["regular", "overlay"] as const;
export type ScreenKind = (typeof SCREEN_KINDS)[number];

export const ScreenSchema = z
  .object({
    id: ScreenIdSchema,
    title: z.string().min(1, "screen title must be non-empty"),
    kind: z.enum(SCREEN_KINDS),
    back_behavior: BackBehaviorSchema.optional(),
    variants: ScreenVariantsWithComponentsSchema,
    // SPEC-10: prose one-liners. Per-line .min(1) prevents empty strings
    // polluting the Maestro emitter / LLM handoff output.
    acceptance: z.array(z.string().min(1, "acceptance line must be non-empty")).optional(),
  })
  .strict();

export type Screen = z.infer<typeof ScreenSchema>;
