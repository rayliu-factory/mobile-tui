// src/model/index.ts — public barrel for the model layer.
//
// Downstream consumers (Phase 2 serializer, Phase 3 wireframe renderer, Phase 9
// pi extension, npm package consumers) import from `mobile-tui` which re-exports
// from here via `src/index.ts`. Each schema file stays internal-import-able
// (`./screen.ts`, `./variant.ts`) for co-located tests, but the public surface
// converges here.
//
// Ordering: schema constants + types first, then validator entry points last
// so the shape of the public API is immediately legible at the top of the file.
export {
  type Action,
  ActionSchema,
  type ActionsRegistry,
  ActionsRegistrySchema,
  MUTATE_OPS,
  type MutateOp,
} from "./action.ts";
export { type BackBehavior, BackBehaviorSchema } from "./back-behavior.ts";
export {
  COMPONENT_KINDS,
  type ComponentKind,
  type ComponentNode,
  ComponentNodeSchema,
} from "./component.ts";
export { crossReferencePass, walkComponentTree } from "./cross-reference.ts";
export {
  type DataModel,
  DataModelSchema,
  type Entity,
  EntitySchema,
  FIELD_TYPES,
  type Field,
  FieldSchema,
  type FieldType,
  FieldTypeSchema,
} from "./data.ts";
export { MAX_INPUT_BYTES, validateSpec } from "./invariants.ts";
export {
  type NavEdge,
  NavEdgeSchema,
  type NavigationGraph,
  NavigationGraphSchema,
  type NavTransition,
  TRANSITIONS,
} from "./navigation.ts";
export {
  SCREEN_KINDS,
  type Screen,
  type ScreenKind,
  ScreenSchema,
  ScreenVariantsWithComponentsSchema,
} from "./screen.ts";
export { type Spec, SpecSchema } from "./spec.ts";
export {
  type ContentVariant,
  ContentVariantSchema,
  createScreenVariantsSchema,
  createVariantSchemas,
  type EmptyVariant,
  EmptyVariantSchema,
  type ErrorVariant,
  ErrorVariantSchema,
  type LoadingVariant,
  LoadingVariantSchema,
  type ScreenVariants,
  ScreenVariantsSchema,
} from "./variant.ts";
export { SCHEMA_VERSION, type SchemaVersion } from "./version.ts";
export { ZOD_CODE_MAP, zodIssuesToDiagnostics } from "./zod-issue-adapter.ts";
