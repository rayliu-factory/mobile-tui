// Tests for the Zod issue → Diagnostic adapter.
// Stage A of validateSpec: maps structural Zod errors into our Diagnostic shape
// with SPEC_* namespace codes and RFC-6901 JSON Pointer paths.
//
// Security-relevant: per RESEARCH §Security Domain V8, Diagnostic messages
// must NOT embed raw user input values. We rely on Zod's sanitized messages.
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ZOD_CODE_MAP, zodIssuesToDiagnostics } from "./zod-issue-adapter.ts";

describe("zodIssuesToDiagnostics — empty input", () => {
  it("returns empty array on empty input", () => {
    expect(zodIssuesToDiagnostics([])).toEqual([]);
  });
});

describe("ZOD_CODE_MAP — known mappings", () => {
  it("maps invalid_type → SPEC_INVALID_TYPE", () => {
    expect(ZOD_CODE_MAP.invalid_type).toBe("SPEC_INVALID_TYPE");
  });

  it("maps invalid_literal → SPEC_INVALID_VALUE", () => {
    expect(ZOD_CODE_MAP.invalid_literal).toBe("SPEC_INVALID_VALUE");
  });

  it("maps invalid_enum_value → SPEC_UNKNOWN_ENUM_VALUE", () => {
    expect(ZOD_CODE_MAP.invalid_enum_value).toBe("SPEC_UNKNOWN_ENUM_VALUE");
  });

  it("maps unrecognized_keys → SPEC_UNKNOWN_FIELD", () => {
    expect(ZOD_CODE_MAP.unrecognized_keys).toBe("SPEC_UNKNOWN_FIELD");
  });

  it("maps invalid_union → SPEC_UNKNOWN_COMPONENT (covers ComponentNode z.union)", () => {
    expect(ZOD_CODE_MAP.invalid_union).toBe("SPEC_UNKNOWN_COMPONENT");
  });

  it("has at least 8 mapped codes", () => {
    expect(Object.keys(ZOD_CODE_MAP).length).toBeGreaterThanOrEqual(8);
  });
});

describe("zodIssuesToDiagnostics — path conversion (Pattern 4)", () => {
  it("converts issue.path array to RFC-6901 JSON Pointer", () => {
    const schema = z.object({ screens: z.array(z.object({ id: z.string() })) });
    const result = schema.safeParse({ screens: [{ id: 123 }] });
    expect(result.success).toBe(false);
    if (!result.success) {
      const diags = zodIssuesToDiagnostics(result.error.issues);
      expect(diags.length).toBeGreaterThan(0);
      expect(diags[0]?.path).toBe("/screens/0/id");
    }
  });

  it("empty path array becomes empty pointer string", () => {
    // Reach root-level Zod issue: type mismatch on the root object itself.
    const schema = z.object({ x: z.string() });
    const result = schema.safeParse("not an object");
    expect(result.success).toBe(false);
    if (!result.success) {
      const diags = zodIssuesToDiagnostics(result.error.issues);
      expect(diags[0]?.path).toBe("");
    }
  });
});

describe("zodIssuesToDiagnostics — severity + code mapping", () => {
  it("sets severity to 'error' on every diagnostic", () => {
    const schema = z.object({ x: z.string() }).strict();
    const result = schema.safeParse({ x: 1, y: "extra" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const diags = zodIssuesToDiagnostics(result.error.issues);
      expect(diags.length).toBeGreaterThan(0);
      for (const d of diags) {
        expect(d.severity).toBe("error");
      }
    }
  });

  it("emits SPEC_INVALID_TYPE for type mismatches", () => {
    const schema = z.object({ x: z.string() });
    const result = schema.safeParse({ x: 42 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const diags = zodIssuesToDiagnostics(result.error.issues);
      expect(diags.some((d) => d.code === "SPEC_INVALID_TYPE")).toBe(true);
    }
  });

  it("emits SPEC_UNKNOWN_FIELD for unrecognized keys under .strict()", () => {
    const schema = z.object({ x: z.string() }).strict();
    // NOTE: using a literal `{ __proto__: "bad" }` would set the object's
    // prototype, not a data property. Use `Object.assign` to create an actual
    // own key that .strict() will reject.
    const input = Object.assign({}, { x: "ok", unwanted_extra: "bad" });
    const result = schema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      const diags = zodIssuesToDiagnostics(result.error.issues);
      expect(diags.some((d) => d.code === "SPEC_UNKNOWN_FIELD")).toBe(true);
    }
  });
});

describe("zodIssuesToDiagnostics — unmapped codes fall through", () => {
  it("falls through to ZOD_<UPPER> for unmapped codes", () => {
    const fakeIssue = {
      code: "nonstandard_thing",
      path: ["foo"],
      message: "msg",
    } as unknown as z.core.$ZodIssue;
    const diags = zodIssuesToDiagnostics([fakeIssue]);
    expect(diags[0]?.code).toBe("ZOD_NONSTANDARD_THING");
    expect(diags[0]?.severity).toBe("error");
    expect(diags[0]?.path).toBe("/foo");
  });
});

describe("zodIssuesToDiagnostics — V8 input-leak resistance", () => {
  it("does NOT embed raw input values in Diagnostic.message", () => {
    // Zod's default messages describe the EXPECTED type and the RECEIVED type
    // (e.g., "Expected string, received object"). They do NOT stringify and
    // embed the actual input values. Verify that resilience for a secret-like
    // input.
    const schema = z.string();
    const secretInput = { token: "super-secret-token-abc123" };
    const result = schema.safeParse(secretInput);
    expect(result.success).toBe(false);
    if (!result.success) {
      const diags = zodIssuesToDiagnostics(result.error.issues);
      for (const d of diags) {
        expect(d.message).not.toContain("super-secret-token-abc123");
      }
    }
  });
});
