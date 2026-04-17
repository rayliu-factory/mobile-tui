// Library entry for mobile-tui spec model + validator.
//
// This file is the published package's PUBLIC API surface — downstream
// consumers (Phase 2 serializer, Phase 3 wireframe renderer, Phase 9 pi
// extension, and eventual npm-package users) import `from "mobile-tui"` and
// reach everything through here. Internal files continue to import via
// `./primitives/...` and `./model/...` directly; this file is the one-way
// outward seam.

// Migrations — SERDE-08.
export { MIGRATIONS, runMigrations, type SpecVersion } from "./migrations/index.ts";
// Model layer — Zod schemas, inferred types, `validateSpec()` entry point.
export * from "./model/index.ts";
// Primitives — Diagnostic + JsonPointer + ID branded types. Exported
// selectively (not `export *`) because primitives/index.ts also re-exports
// regex constants and internal schema helpers that are Phase-1 internals.
export type {
  ActionId,
  Diagnostic,
  DiagnosticSeverity,
  EntityName,
  JsonPointer,
  ScreenId,
  TestID,
} from "./primitives/index.ts";
export {
  ActionIdSchema,
  DiagnosticSchema,
  DiagnosticSeveritySchema,
  decodeSegment,
  EntityNameSchema,
  encodeSegment,
  error,
  info,
  JsonPointerSchema,
  pathToJsonPointer,
  ScreenIdSchema,
  TestIDSchema,
  warning,
} from "./primitives/index.ts";
