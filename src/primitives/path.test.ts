// Tests for RFC 6901 JSON Pointer — segment encode/decode, pathToJsonPointer
// adapter, and JsonPointerSchema branded validation.
// Key gotcha covered: decode order is ~1 BEFORE ~0 (RFC 6901 §4).
import { describe, expect, it } from "vitest";
import { decodeSegment, encodeSegment, JsonPointerSchema, pathToJsonPointer } from "./path.ts";

describe("encodeSegment (RFC 6901 §3)", () => {
  it("passes plain strings through", () => {
    expect(encodeSegment("foo")).toBe("foo");
  });
  it("escapes slash as ~1", () => {
    expect(encodeSegment("a/b")).toBe("a~1b");
  });
  it("escapes tilde as ~0", () => {
    expect(encodeSegment("a~b")).toBe("a~0b");
  });
  it("encodes ~ before / (order matters — otherwise ~ in original would re-escape later /)", () => {
    expect(encodeSegment("a~/b")).toBe("a~0~1b");
  });
  it("handles empty string", () => {
    expect(encodeSegment("")).toBe("");
  });
});

describe("decodeSegment (RFC 6901 §4)", () => {
  it("unescapes ~1 to /", () => {
    expect(decodeSegment("a~1b")).toBe("a/b");
  });
  it("unescapes ~0 to ~", () => {
    expect(decodeSegment("a~0b")).toBe("a~b");
  });
  it("decodes ~1 before ~0 (RFC 6901 gotcha)", () => {
    // "a~01b" MUST decode to "a~1b" (not "a/b").
    // Correct order: step 1 (~1 → /) finds no "~1" token (the "0" breaks the pair),
    //                step 2 (~0 → ~) rewrites "~0" → "~", yielding "a~1b".
    // Wrong order (~0 first): "a~01b" → "a~1b" (step 1), then ~1 → / → "a/b" (step 2).
    expect(decodeSegment("a~01b")).toBe("a~1b");
  });
  it("round-trips through encode/decode for edge cases", () => {
    for (const s of ["plain", "a/b", "a~b", "a~/b", "/~", ""]) {
      expect(decodeSegment(encodeSegment(s))).toBe(s);
    }
  });
});

describe("pathToJsonPointer", () => {
  it("empty path → empty pointer (whole document)", () => {
    expect(pathToJsonPointer([])).toBe("");
  });
  it("single segment → /segment", () => {
    expect(pathToJsonPointer(["foo"])).toBe("/foo");
  });
  it("multiple segments → joined with /", () => {
    expect(pathToJsonPointer(["screens", 0, "id"])).toBe("/screens/0/id");
  });
  it("escapes slashes in segments", () => {
    expect(pathToJsonPointer(["a/b"])).toBe("/a~1b");
  });
  it("escapes tildes in segments", () => {
    expect(pathToJsonPointer(["a~b"])).toBe("/a~0b");
  });
  it("stringifies numbers", () => {
    expect(pathToJsonPointer([0, 1, 2])).toBe("/0/1/2");
  });
  it("handles tilde + slash interleaving per encodeSegment order", () => {
    expect(pathToJsonPointer(["a~/b"])).toBe("/a~0~1b");
  });
});

describe("JsonPointerSchema", () => {
  it("accepts empty pointer (whole document)", () => {
    expect(JsonPointerSchema.safeParse("").success).toBe(true);
  });
  it("accepts well-formed pointer", () => {
    expect(JsonPointerSchema.safeParse("/screens/0/id").success).toBe(true);
  });
  it("rejects missing leading slash on non-empty pointer", () => {
    expect(JsonPointerSchema.safeParse("screens/0/id").success).toBe(false);
  });
  it("accepts pointer with ~0 / ~1 escapes", () => {
    expect(JsonPointerSchema.safeParse("/a~0b/c~1d").success).toBe(true);
  });
  it("rejects bare ~ (must be ~0 or ~1)", () => {
    expect(JsonPointerSchema.safeParse("/a~b").success).toBe(false);
  });
  it("rejects trailing ~ with no continuation", () => {
    expect(JsonPointerSchema.safeParse("/a~").success).toBe(false);
  });
});

describe("ReDoS sanity (threat T-01-01)", () => {
  it("JSON Pointer regex completes in <50ms on 100kB pathological input", () => {
    const haystack = `/${"a".repeat(100_000)}`;
    const start = performance.now();
    JsonPointerSchema.safeParse(haystack);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(50);
  });
});
