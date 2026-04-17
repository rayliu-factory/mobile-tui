// src/model/invariants.ts
// `validateSpec()` — the public SPEC-09 contract.
//
// GUARANTEES:
//   - NEVER throws for any input (null, undefined, primitives, arrays, cyclic,
//     BigInt, huge strings). Every error path returns Diagnostic[].
//   - Returns `{ spec: Spec | null, diagnostics: Diagnostic[] }`.
//   - `spec` is null iff Stage A (Zod `safeParse`) failed.
//   - Cross-ref errors (Stage B) are reported in `diagnostics` but DO NOT null
//     the spec — the shape is still structurally valid and usable for read-only
//     operations (e.g., Phase 2 serializer can still emit from it; the save
//     gate blocks write-through on severity === "error").
//
// Two-stage pipeline per RESEARCH §Pattern 3 Option B:
//   A. `SpecSchema.safeParse(input)` → structural errors as Diagnostic[]
//   B. `crossReferencePass(parsed.data)` → reference / collision / resolution
//      errors
//
// THREAT T-01-01 MITIGATION: input-size cap at 5 MB of serialized JSON.
// Realistic specs are <100 KB; anything >5 MB is almost certainly adversarial
// (zip bomb equivalent, depth explosion setup, or a serializer misroute).
// We serialize ONCE at the top of this function to check size AND detect
// non-JSON-serializable inputs (cyclic objects, BigInt, etc.) in one step.
import type { Diagnostic } from "../primitives/diagnostic.ts";
import { crossReferencePass } from "./cross-reference.ts";
import { type Spec, SpecSchema } from "./spec.ts";
import { zodIssuesToDiagnostics } from "./zod-issue-adapter.ts";

// 5 MB serialized cap — T-01-01.
export const MAX_INPUT_BYTES = 5 * 1024 * 1024;

export function validateSpec(input: unknown): { spec: Spec | null; diagnostics: Diagnostic[] } {
  // Pre-check: serialize once to (a) enforce size cap and (b) catch cyclic /
  // BigInt / other non-JSON-serializable inputs. Wrapped in try/catch because
  // `JSON.stringify` throws on cycles and BigInts.
  try {
    const serialized = JSON.stringify(input);
    if (typeof serialized === "string" && serialized.length > MAX_INPUT_BYTES) {
      return {
        spec: null,
        diagnostics: [
          {
            code: "SPEC_INPUT_TOO_LARGE",
            severity: "error",
            path: "",
            message: `spec input exceeds maximum size (${MAX_INPUT_BYTES} bytes)`,
          },
        ],
      };
    }
  } catch {
    // Cyclic object, BigInt, or other JSON-unsafe value. Treat as invalid
    // without crashing — the caller must get a Diagnostic, not an exception.
    return {
      spec: null,
      diagnostics: [
        {
          code: "SPEC_INPUT_NOT_SERIALIZABLE",
          severity: "error",
          path: "",
          message:
            "spec input could not be serialized (possibly cyclic or contains non-JSON values)",
        },
      ],
    };
  }

  // Stage A: Zod shape validation.
  const parsed = SpecSchema.safeParse(input);
  if (!parsed.success) {
    return {
      spec: null,
      diagnostics: zodIssuesToDiagnostics(parsed.error.issues),
    };
  }

  // Stage B: cross-reference pass on TYPED data. Errors here do not null the
  // spec — the parsed value is structurally valid; semantic/ref errors are
  // surfaced but don't strip the caller of the shaped Spec.
  const crossRefDiagnostics = crossReferencePass(parsed.data);

  return {
    spec: parsed.data,
    diagnostics: crossRefDiagnostics,
  };
}
