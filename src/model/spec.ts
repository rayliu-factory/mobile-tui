// src/model/spec.ts
// Top-level Spec schema — the root composition.
//
// This is where every leaf schema from Waves 1-2 converges:
//   - SCHEMA_VERSION        (version.ts)          — literal version anchor
//   - ScreenSchema          (screen.ts)           — per-screen shape + variants
//                                                   (which in turn threads through
//                                                   createScreenVariantsSchema ×
//                                                   ComponentNodeSchema — the
//                                                   18-kind recursive catalog)
//   - ActionsRegistrySchema (action.ts)           — named Action refs (6 kinds)
//   - DataModelSchema       (data.ts)             — Entities + Fields + relationships
//   - NavigationGraphSchema (navigation.ts)       — root + edges
//
// Phase 1 is STRICT: unknown top-level keys are rejected structurally. This is
// the load-bearing T-01-03 mitigation (prototype pollution via __proto__ /
// constructor / prototype) AND an authoring-hygiene gate (typo'd keys fail loud).
// Phase 2 (SPEC-08) will add an explicit `_unknown:` serializer-level bucket
// for forward-compat, but the MODEL schema remains closed — the bucket lives
// in the serializer, not here.
//
// schema version: pinned to SCHEMA_VERSION via z.literal(). Specs claiming any
// other version string are routed through the Plan 07 migration runner BEFORE
// SpecSchema.safeParse is called.
//
// Schema shape: `SpecSchema = z.object({...}).strict()` — a plain Zod object
// with the five top-level fields declared below. Biome's formatter wraps the
// chain onto multiple lines; the semantic expression is unchanged.
import { z } from "zod";
import { ActionsRegistrySchema } from "./action.ts";
import { DataModelSchema } from "./data.ts";
import { NavigationGraphSchema } from "./navigation.ts";
import { ScreenSchema } from "./screen.ts";
import { SCHEMA_VERSION } from "./version.ts";

export const SpecSchema = z
  .object({
    // Exact literal match. Migration runner (Plan 07) upgrades older spec
    // files BEFORE they are handed to SpecSchema.safeParse.
    schema: z.literal(SCHEMA_VERSION),

    // Screens — at least one. Uniqueness + nav-root existence are cross-ref
    // concerns (Plan 06), not shape concerns.
    screens: z.array(ScreenSchema).min(1, "spec must declare at least one screen"),

    // Actions registry — keyed by snake_case ActionId, valued by the 6-kind
    // discriminated Action union. Empty registry `{}` is valid shape-wise;
    // a spec with zero actions is unusual but not structurally broken.
    actions: ActionsRegistrySchema,

    // Data model (SPEC-04). DataModelSchema itself enforces `.min(1)` on entities.
    data: DataModelSchema,

    // Navigation graph (SPEC-03). NavigationGraphSchema requires root; cross-ref
    // (Plan 06) ensures root names an actual screen in `screens[]`.
    navigation: NavigationGraphSchema,
  })
  // .strict() — HARD boundary per Plan 05 + RESEARCH §Anti-Patterns. Phase 2
  // relaxes via an _unknown: bucket in the SERIALIZER, not here. See comment
  // block at top of file for the full rationale.
  .strict();

export type Spec = z.infer<typeof SpecSchema>;
