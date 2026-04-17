// Tests for `validateSpec` — the SPEC-09 public contract.
//
// GUARANTEES under test:
//   - NEVER throws for ANY input (null, undefined, primitives, arrays, cyclic,
//     huge strings — RESEARCH Pitfall #6 + Pitfall-free)
//   - Returns { spec: Spec | null, diagnostics: Diagnostic[] }
//   - spec is null iff Stage A (SpecSchema.safeParse) failed
//   - Cross-ref errors (Stage B) are reported but DO NOT null the spec
//   - Input-size cap at 5MB (T-01-01 mitigation)
//   - Cyclic / non-serializable input yields SPEC_INPUT_NOT_SERIALIZABLE
import { describe, expect, it } from "vitest";
import { validateSpec } from "./invariants.ts";
import { SCHEMA_VERSION } from "./version.ts";

const minimalSpec = {
  schema: SCHEMA_VERSION,
  screens: [
    {
      id: "home",
      title: "Home",
      kind: "regular",
      variants: {
        content: { kind: "content", tree: [] },
        empty: null,
        loading: null,
        error: null,
      },
    },
  ],
  actions: {},
  data: {
    entities: [
      {
        name: "Habit",
        fields: [{ name: "title", type: "string" }],
      },
    ],
  },
  navigation: { root: "home", edges: [] },
};

describe("validateSpec — never-throws contract (RESEARCH Pitfall #6)", () => {
  it.each([
    null,
    undefined,
    42,
    "string",
    true,
    [],
    {},
  ])("handles hostile input %p → { spec: null, diagnostics: [≥1 error] }", (input) => {
    const result = validateSpec(input);
    expect(result.spec).toBeNull();
    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result.diagnostics[0]?.severity).toBe("error");
  });

  it("never throws for cyclic input", () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(() => validateSpec(cyclic)).not.toThrow();
    const result = validateSpec(cyclic);
    expect(result.spec).toBeNull();
    expect(result.diagnostics[0]?.code).toBe("SPEC_INPUT_NOT_SERIALIZABLE");
  });

  it("never throws for BigInt values (non-JSON-serializable)", () => {
    const input = { n: 123n };
    expect(() => validateSpec(input)).not.toThrow();
    const result = validateSpec(input);
    expect(result.spec).toBeNull();
    expect(result.diagnostics[0]?.code).toBe("SPEC_INPUT_NOT_SERIALIZABLE");
  });
});

describe("validateSpec — happy path", () => {
  it("returns typed spec + zero diagnostics for minimal valid input", () => {
    const result = validateSpec(minimalSpec);
    expect(result.spec).not.toBeNull();
    expect(result.diagnostics).toEqual([]);
  });

  it("returned spec.screens[0].id is preserved", () => {
    const result = validateSpec(minimalSpec);
    expect(result.spec?.screens[0]?.id).toBe("home");
  });
});

describe("validateSpec — cross-ref errors do not null the spec", () => {
  it("returns spec with diagnostics when cross-ref fails", () => {
    const spec = {
      ...minimalSpec,
      actions: { bad_nav: { kind: "navigate", screen: "ghost" } },
    };
    const result = validateSpec(spec);
    expect(result.spec).not.toBeNull();
    expect(result.diagnostics.some((d) => d.code === "SPEC_UNRESOLVED_ACTION")).toBe(true);
  });
});

describe("validateSpec — Stage A errors produce SPEC_* / ZOD_* diagnostics", () => {
  it("wrong schema version triggers SPEC_* diagnostic from Zod adapter", () => {
    const { diagnostics } = validateSpec({ ...minimalSpec, schema: "wrong-version" });
    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics.every((d) => d.severity === "error")).toBe(true);
  });

  it("missing required field triggers diagnostic", () => {
    const { diagnostics } = validateSpec({ schema: SCHEMA_VERSION });
    expect(diagnostics.length).toBeGreaterThan(0);
  });
});

describe("validateSpec — diagnostic paths are JSON Pointers", () => {
  it("every path starts with / or is empty string", () => {
    const { diagnostics } = validateSpec({ schema: "wrong-version" });
    for (const d of diagnostics) {
      expect(d.path === "" || d.path.startsWith("/")).toBe(true);
    }
  });
});

describe("validateSpec — input size cap (T-01-01)", () => {
  it("returns SPEC_INPUT_TOO_LARGE for >5MB input", () => {
    const hugeString = "x".repeat(6 * 1024 * 1024);
    const huge = {
      ...minimalSpec,
      screens: [
        {
          ...minimalSpec.screens[0],
          title: hugeString,
        },
      ],
    };
    const result = validateSpec(huge);
    expect(result.spec).toBeNull();
    expect(result.diagnostics.length).toBe(1);
    expect(result.diagnostics[0]?.code).toBe("SPEC_INPUT_TOO_LARGE");
  });
});
