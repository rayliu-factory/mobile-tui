// Diagnostic shape per CONTEXT.md Claude's Discretion "Diagnostic codes":
//   - code: SCREAMING_SNAKE_CASE, namespaced (e.g. SPEC_UNKNOWN_COMPONENT)
//   - severity: error | warning | info (closed enum; no "hint" / "fatal")
//   - path: JSON Pointer (RFC 6901) string — branded JsonPointer upstream
//   - message: non-empty human-readable string
//
// SPEC-09 contract: validateSpec() returns Diagnostic[] and never throws.
// The save-gating logic (error-severity blocks save) lives in Phase 2;
// this module just defines the shape and construction helpers.
//
// Threat T-01-01: DIAGNOSTIC_CODE regex is anchored + non-backtracking.
import { z } from "zod";
import type { JsonPointer } from "./path.ts";

export const DiagnosticSeveritySchema = z.enum(["error", "warning", "info"]);
export type DiagnosticSeverity = z.infer<typeof DiagnosticSeveritySchema>;

// SCREAMING_SNAKE_CASE, anchored + non-backtracking (threat T-01-01).
const DIAGNOSTIC_CODE = /^[A-Z][A-Z0-9_]*$/;

export const DiagnosticSchema = z.object({
  code: z.string().regex(DIAGNOSTIC_CODE, "diagnostic code must be SCREAMING_SNAKE_CASE"),
  severity: DiagnosticSeveritySchema,
  // `path` is JsonPointer (branded string) at construction sites, but the
  // schema validates a plain string here — JsonPointer's own regex lives in
  // path.ts. Keeping this as z.string() avoids requiring every diagnostic
  // producer to also run pointer-shape validation (Zod-side adapters
  // already emit well-formed pointers via pathToJsonPointer).
  path: z.string(),
  message: z.string().min(1, "diagnostic message must be non-empty"),
});
export type Diagnostic = z.infer<typeof DiagnosticSchema>;

// Factory helpers — consistent construction, fewer typos than object literals.
export function error(code: string, path: JsonPointer, message: string): Diagnostic {
  return { code, severity: "error", path, message };
}

export function warning(code: string, path: JsonPointer, message: string): Diagnostic {
  return { code, severity: "warning", path, message };
}

export function info(code: string, path: JsonPointer, message: string): Diagnostic {
  return { code, severity: "info", path, message };
}
