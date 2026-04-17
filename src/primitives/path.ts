// JSON Pointer (RFC 6901) branded type + RFC-compliant segment helpers.
//
// Scope:
//   - `JsonPointer` branded string + `JsonPointerSchema` Zod validator
//   - `encodeSegment` / `decodeSegment` for RFC 6901 §3 + §4 escaping
//   - `pathToJsonPointer(path)` — adapter from Zod `issue.path` to our
//     Diagnostic.path field. This is the ONLY allowed conversion.
//
// Runtime get / has / set: callers import directly from `jsonpointer` —
// see RESEARCH §Don't Hand-Roll. This module does not re-implement pointer
// resolution, only the wire-format string layer.
//
// Threat T-01-01 mitigation: the JSON_POINTER regex is anchored on both
// ends and uses a non-backtracking character-class alternation
// (`[^~/]|~[01]`). Safe against ReDoS on adversarial 100kB input.
import { z } from "zod";

export type JsonPointer = string & { readonly __brand: "JsonPointer" };

// RFC 6901 pointer grammar: empty OR a series of "/"-prefixed escaped tokens.
// Anchored + non-backtracking — threat T-01-01 mitigation.
const JSON_POINTER = /^(\/([^~/]|~[01])*)*$/;

export const JsonPointerSchema = z
  .string()
  .regex(JSON_POINTER, "invalid JSON Pointer (RFC 6901)")
  .transform((s) => s as JsonPointer);

// RFC 6901 §3 — encode: `~` MUST be escaped before `/` so that the fresh
// `~1` produced by a literal-slash replace is not re-escaped back to `~0~1`.
export function encodeSegment(s: string): string {
  return s.replace(/~/g, "~0").replace(/\//g, "~1");
}

// RFC 6901 §4 — decode: `~1` MUST be decoded BEFORE `~0`.
// Otherwise "a~01b" (literal `~1` with a preceding `~0` escape) would
// collapse to "a/b" — a data-corruption round-trip failure.
// Correct order yields "a~1b" as intended by the spec.
export function decodeSegment(s: string): string {
  return s.replace(/~1/g, "/").replace(/~0/g, "~");
}

/**
 * Convert a Zod `issue.path` (array of string | number) to an RFC 6901
 * JSON Pointer string.
 *
 *   - `[]`                            → `""`         (empty pointer = whole document)
 *   - `["screens", 0, "id"]`          → `"/screens/0/id"`
 *   - `["a/b"]`                       → `"/a~1b"`    (segments with `/` or `~` are escaped)
 *
 * This is the ONLY adapter from Zod paths to our Diagnostic.path field.
 * See RESEARCH §Pattern 4.
 */
export function pathToJsonPointer(path: ReadonlyArray<string | number>): JsonPointer {
  if (path.length === 0) return "" as JsonPointer;
  return `/${path.map((seg) => encodeSegment(String(seg))).join("/")}` as JsonPointer;
}
