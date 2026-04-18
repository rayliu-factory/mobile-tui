// Tests for src/emit/wireframe/overflow.ts — truncate per D-44.
import { describe, expect, it } from "vitest";
import { truncate } from "./overflow.ts";

describe("truncate (D-44)", () => {
  it("returns input unchanged when length < width", () => {
    expect(truncate("abc", 10)).toBe("abc");
  });

  it("returns input unchanged when length === width (exact fit)", () => {
    expect(truncate("abcdefghij", 10)).toBe("abcdefghij");
  });

  it("truncates with `...` at width-3 when overlong", () => {
    const out = truncate("this-is-longer-than-width", 10);
    expect(out.length).toBe(10);
    expect(out).toBe("this-is...");
    expect(out.endsWith("...")).toBe(true);
  });

  it("returns empty string for empty input", () => {
    expect(truncate("", 10)).toBe("");
  });

  it("returns empty string when width is 0", () => {
    expect(truncate("x", 0)).toBe("");
  });

  it("width < 3 → `.`.repeat(width) fallback (degenerate)", () => {
    expect(truncate("xxxxx", 2)).toBe("..");
    expect(truncate("yyy", 1)).toBe(".");
  });

  it("is deterministic: two calls with identical args produce byte-equal output", () => {
    const a = truncate("hello world", 8);
    const b = truncate("hello world", 8);
    expect(a).toBe(b);
  });

  it("output.length <= width in all cases (rectangular contract)", () => {
    const cases: Array<[string, number]> = [
      ["", 10],
      ["abc", 10],
      ["exactly-10", 10],
      ["longer-than-width", 10],
      ["x", 0],
      ["xx", 1],
      ["xxx", 2],
      ["xxxx", 3],
    ];
    for (const [input, width] of cases) {
      const out = truncate(input, width);
      expect(out.length).toBeLessThanOrEqual(width);
    }
  });
});
