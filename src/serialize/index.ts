// src/serialize/index.ts — public barrel for the L3 Serialize layer.
//
// Consumers: src/index.ts (top-level npm surface), Phase 3 (wireframe
// renderer via Phase 4 store), Phase 4 (editor store), Phase 7
// (Maestro emitter via Phase 4 store). Each leaf stays importable via
// ./parse.ts etc. for co-located tests; this file is the one-way
// outward seam.
//
// Implementation details like partitionTopLevel, normalizeSigils,
// splitFrontmatter, atomicWrite, injectSchemaIfAbsent, extractBodyBytes
// are intentionally NOT re-exported — co-located tests import them
// directly from leaf modules.
//
// Barrel follows the EXPLICIT-NAMED pattern per src/model/index.ts
// (NOT `export *`), so adding a new public name is a deliberate edit
// here rather than an implicit broadening of the surface area.
export type { AstHandle, ClosingDelimiterTerminator, LineEndingStyle } from "./ast-handle.ts";
export { SERDE_CODES, type SerdeCode } from "./diagnostics.ts";
export { type ParseResult, parseSpecFile } from "./parse.ts";
export { type WriteResult, writeSpecFile } from "./write.ts";
