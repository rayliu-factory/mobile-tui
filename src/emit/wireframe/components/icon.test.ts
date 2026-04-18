// Tests for renderIcon (Plan 03-04) — inline [icon:name] per D-Claude.
import { describe, expect, it } from "vitest";
import { renderIcon } from "./icon.ts";

function firstLine(lines: string[]): string {
  const [head] = lines;
  if (head === undefined) throw new Error("expected at least 1 line");
  return head;
}

describe("renderIcon (D-Claude inline marker)", () => {
  it("renders `[icon:name]` padded to width", () => {
    const result = renderIcon({ kind: "Icon", name: "heart" }, 60);
    expect(result).toHaveLength(1);
    const line = firstLine(result);
    expect(line).toHaveLength(60);
    expect(line.startsWith("[icon:heart]")).toBe(true);
    expect(result).toMatchSnapshot();
  });

  it("truncates overlong icon name with `...` to fit width", () => {
    const result = renderIcon({ kind: "Icon", name: "very-long-icon-name-that-wont-fit" }, 10);
    expect(result).toHaveLength(1);
    const line = firstLine(result);
    expect(line).toHaveLength(10);
    expect(line.endsWith("...")).toBe(true);
  });

  it("is deterministic (byte-equal on repeated calls)", () => {
    const a = renderIcon({ kind: "Icon", name: "star" }, 30);
    const b = renderIcon({ kind: "Icon", name: "star" }, 30);
    expect(a).toEqual(b);
  });

  it("rectangular contract: every line has length === width", () => {
    const widths = [20, 40, 60];
    for (const w of widths) {
      const r = renderIcon({ kind: "Icon", name: "x" }, w);
      expect(r.every((l) => l.length === w)).toBe(true);
    }
  });
});
