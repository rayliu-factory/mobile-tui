// src/serialize/diagnostics.test.ts
// Registry + re-export smoke tests for the Phase-2 diagnostics module.
// Mirrors src/primitives/diagnostic.test.ts's shape checks on SCREAMING_SNAKE_CASE.
import { describe, expect, it } from "vitest";
import type { JsonPointer } from "../primitives/path.ts";
import { DiagnosticSchema, error, info, SERDE_CODES, warning } from "./diagnostics.ts";

// Mirror of src/primitives/diagnostic.ts's anchored, non-backtracking regex.
const DIAGNOSTIC_CODE = /^[A-Z][A-Z0-9_]*$/;

describe("SERDE_CODES registry", () => {
  it.each(
    Object.entries(SERDE_CODES),
  )("%s code matches SCREAMING_SNAKE_CASE and value === key", (key, value) => {
    expect(key).toMatch(DIAGNOSTIC_CODE);
    expect(value).toBe(key); // code constant value === name
    expect(value).toMatch(DIAGNOSTIC_CODE);
  });

  it("registers all 6 Phase-2 codes", () => {
    expect(Object.keys(SERDE_CODES).sort()).toEqual([
      "SERDE_BYTE_DRIFT_DETECTED",
      "SERDE_MISSING_DELIMITER",
      "SERDE_YAML11_GOTCHA",
      "SPEC_ORPHAN_TEMP_FILE",
      "SPEC_SIGIL_PARTIAL_DROPPED",
      "SPEC_UNKNOWN_TOP_LEVEL_KEY",
    ]);
  });

  it("re-exported error() factory produces DiagnosticSchema-valid Diagnostic", () => {
    const d = error("SPEC_ORPHAN_TEMP_FILE", "" as JsonPointer, "orphan .tmp next to target");
    expect(DiagnosticSchema.parse(d)).toEqual({
      code: "SPEC_ORPHAN_TEMP_FILE",
      severity: "error",
      path: "",
      message: "orphan .tmp next to target",
    });
  });

  it("re-exported info() + warning() produce correct severity", () => {
    expect(info("SERDE_YAML11_GOTCHA", "" as JsonPointer, "yes").severity).toBe("info");
    expect(warning("SPEC_SIGIL_PARTIAL_DROPPED", "" as JsonPointer, "x").severity).toBe("warning");
  });
});
