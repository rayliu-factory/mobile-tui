// src/serialize/diagnostics.ts
// Phase 2 diagnostic code registry. These AUGMENT — do not replace —
// Phase 1's SPEC_* codes in src/primitives/diagnostic.ts.
//
// SCOPE:
//   - New codes emitted only by the serializer (parse + write + atomic)
//   - Phase-1 `diagnostic()` factory is re-exported so callers can import
//     everything Diagnostic-related from one module
//
// All codes SCREAMING_SNAKE_CASE per the DIAGNOSTIC_CODE regex in
// src/primitives/diagnostic.ts (/^[A-Z][A-Z0-9_]*$/).
//
// RELATED: D-24 (SPEC_SIGIL_PARTIAL_DROPPED), D-26/D-27 (unknown keys),
//          D-30 (orphan .tmp), D-31 (save-gate), D-Discretion (YAML 1.1),
//          RESEARCH §Assumption A7 (missing delimiter).

export const SERDE_CODES = {
  // D-30: orphan .{basename}.tmp detected next to target on parse.
  SPEC_ORPHAN_TEMP_FILE: "SPEC_ORPHAN_TEMP_FILE",
  // D-24: sigil-origin component missing one of label/action/testID at emit.
  SPEC_SIGIL_PARTIAL_DROPPED: "SPEC_SIGIL_PARTIAL_DROPPED",
  // D-26/D-27: an unknown-top-level key (__proto__, constructor, _unknown, …)
  // reached the Spec model layer after the partition step missed it.
  SPEC_UNKNOWN_TOP_LEVEL_KEY: "SPEC_UNKNOWN_TOP_LEVEL_KEY",
  // D-Discretion: YAML 1.1 boolean-like scalar unquoted (yes/no/on/off/y/n/true/false).
  SERDE_YAML11_GOTCHA: "SERDE_YAML11_GOTCHA",
  // CI-assertion helper: round-trip emitter detected byte drift.
  SERDE_BYTE_DRIFT_DETECTED: "SERDE_BYTE_DRIFT_DETECTED",
  // RESEARCH A7: file does not begin with YAML frontmatter delimiter.
  SERDE_MISSING_DELIMITER: "SERDE_MISSING_DELIMITER",
} as const;

export type SerdeCode = (typeof SERDE_CODES)[keyof typeof SERDE_CODES];

// Re-export Phase-1 factory + type for single-module ergonomics.
export {
  type Diagnostic,
  DiagnosticSchema,
  type DiagnosticSeverity,
  DiagnosticSeveritySchema,
  error,
  info,
  warning,
} from "../primitives/diagnostic.ts";
