// src/model/zod-issue-adapter.ts
// Maps Zod v4 `issue[]` → our `Diagnostic[]` shape.
//
// This is Stage A's output translator for `validateSpec()`. Zod's SafeParseError
// carries `error.issues: $ZodIssue[]`, each with:
//   - `code`: discriminator string (invalid_type, invalid_union, etc.)
//   - `path`: `(string | number)[]` pointing to the offending node
//   - `message`: human-readable string
//   - `input`: the raw input value (we do NOT expose this)
//   - `expected` / `received`: types, already in message
//
// We map `code → SPEC_*` where it makes semantic sense (invalid_union becomes
// SPEC_UNKNOWN_COMPONENT because in our model that's the only recursive union),
// convert `path` to an RFC 6901 JSON Pointer via `pathToJsonPointer`, and surface
// Zod's sanitized message as-is. Zod's default messages describe expected vs.
// received TYPES and do NOT embed raw input values — per RESEARCH §Security
// Domain V8 we rely on that, and the test suite verifies it for a secret-like
// input.
//
// Unmapped codes fall through to `ZOD_<UPPER>` so they stay traceable. Tests
// document the mapping explicitly.
import type { z } from "zod";
import type { Diagnostic } from "../primitives/diagnostic.ts";
import { pathToJsonPointer } from "../primitives/path.ts";

// Zod v4 issue code → our SPEC_* namespace.
// Keep this list long-ish (≥8) so common Zod-surfaced issues get friendly names.
// RESEARCH §Pattern 4 named the first 4; we extend with the Zod v4 surface.
export const ZOD_CODE_MAP: Readonly<Record<string, string>> = {
  invalid_type: "SPEC_INVALID_TYPE",
  invalid_literal: "SPEC_INVALID_VALUE",
  invalid_value: "SPEC_INVALID_VALUE",
  invalid_enum_value: "SPEC_UNKNOWN_ENUM_VALUE",
  unrecognized_keys: "SPEC_UNKNOWN_FIELD",
  // invalid_union is the ComponentNode z.union mismatch (18-kind closed catalog).
  // In the Spec model no other recursive union exists; Action/BackBehavior/Variant
  // use discriminatedUnion which yields `invalid_union_discriminator` instead.
  invalid_union: "SPEC_UNKNOWN_COMPONENT",
  invalid_union_discriminator: "SPEC_INVALID_DISCRIMINATOR",
  too_small: "SPEC_TOO_SMALL",
  too_big: "SPEC_TOO_BIG",
  invalid_format: "SPEC_INVALID_FORMAT",
  invalid_string: "SPEC_INVALID_STRING",
  custom: "SPEC_CUSTOM_VALIDATION",
  invalid_key: "SPEC_INVALID_KEY",
};

/**
 * Convert a list of Zod v4 issues to Diagnostic[].
 *
 * Every returned Diagnostic has:
 *   - `code`: `SPEC_*` from `ZOD_CODE_MAP`, else `ZOD_<CODE_UPPER>` fallback.
 *   - `severity`: always `"error"` — Zod issues are by definition structural
 *     violations; the distinction between warning and error is a CROSS-REF
 *     concern (Stage B), not a parse-time concern.
 *   - `path`: RFC 6901 JSON Pointer string via `pathToJsonPointer`.
 *   - `message`: Zod's sanitized message verbatim.
 */
export function zodIssuesToDiagnostics(issues: ReadonlyArray<z.core.$ZodIssue>): Diagnostic[] {
  return issues.map((issue) => ({
    code: ZOD_CODE_MAP[issue.code] ?? `ZOD_${String(issue.code).toUpperCase()}`,
    severity: "error" as const,
    // Zod v4 types `issue.path` as `PropertyKey[]` (admits symbols). Our
    // JsonPointer adapter accepts string | number. Normalize via String()
    // for safety — symbols in paths are theoretically impossible for
    // JSON-parsed input (YAML/JSON both yield only string keys + number
    // indices) but the type system doesn't know that. Coercing keeps both
    // tsc happy and the output well-shaped.
    path: pathToJsonPointer(issue.path.map((seg) => (typeof seg === "symbol" ? String(seg) : seg))),
    message: issue.message, // Zod-sanitized; no raw input values embedded.
  }));
}
