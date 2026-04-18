// Tests for renderText (Plan 03-04) — D-43 style mapping + D-44 truncation.
import { describe, expect, it } from "vitest";
import { renderText } from "./text.ts";

function firstLine(lines: string[]): string {
  const [head] = lines;
  if (head === undefined) throw new Error("expected at least 1 line");
  return head;
}

describe("renderText (D-43, D-44)", () => {
  it("heading-1: UPPERCASE transform + padded to width", () => {
    const result = renderText({ kind: "Text", text: "My Habits", style: "heading-1" }, 60);
    expect(result).toHaveLength(1);
    const line = firstLine(result);
    expect(line).toHaveLength(60);
    expect(line.startsWith("MY HABITS")).toBe(true);
    expect(result).toMatchSnapshot();
  });

  it("heading-2: identity (respect author capitalization) + padded", () => {
    const result = renderText({ kind: "Text", text: "Details Page", style: "heading-2" }, 60);
    expect(result).toHaveLength(1);
    const line = firstLine(result);
    expect(line).toHaveLength(60);
    expect(line.startsWith("Details Page")).toBe(true);
  });

  it("body: identity + padded to width", () => {
    const result = renderText({ kind: "Text", text: "plain body", style: "body" }, 60);
    expect(result).toHaveLength(1);
    const line = firstLine(result);
    expect(line).toHaveLength(60);
    expect(line.startsWith("plain body")).toBe(true);
  });

  it("caption: wrapped in parens + padded to width", () => {
    const result = renderText({ kind: "Text", text: "hint", style: "caption" }, 60);
    expect(result).toHaveLength(1);
    const line = firstLine(result);
    expect(line).toHaveLength(60);
    expect(line.startsWith("(hint)")).toBe(true);
  });

  it("undefined style defaults to body (identity)", () => {
    const result = renderText({ kind: "Text", text: "no style" }, 40);
    expect(result).toHaveLength(1);
    const line = firstLine(result);
    expect(line).toHaveLength(40);
    expect(line.startsWith("no style")).toBe(true);
  });

  it("truncates overlong text to width with `...` (D-44)", () => {
    const result = renderText(
      { kind: "Text", text: "this-is-a-very-long-line-that-exceeds-width" },
      20,
    );
    expect(result).toHaveLength(1);
    const line = firstLine(result);
    expect(line).toHaveLength(20);
    expect(line.endsWith("...")).toBe(true);
  });

  it("is deterministic (byte-equal on repeated calls)", () => {
    const a = renderText({ kind: "Text", text: "hello", style: "heading-1" }, 30);
    const b = renderText({ kind: "Text", text: "hello", style: "heading-1" }, 30);
    expect(a).toEqual(b);
  });

  it("rectangular contract: every line has length === width", () => {
    const widths = [10, 20, 40, 60];
    for (const w of widths) {
      const r = renderText({ kind: "Text", text: "x", style: "body" }, w);
      expect(r.every((l) => l.length === w)).toBe(true);
    }
  });
});
