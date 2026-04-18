// Tests for renderRow (Plan 03-06) — D-36 structural container, Phase-3 v1
// single-line horizontal join. Each child receives budget `floor(width / N)`;
// only its first output line is joined horizontally. Multi-line children
// (e.g., Image's 3-line box) render only their first line in a Row per the
// v1 simplification documented in row.ts. No container glyph.
import { describe, expect, it } from "vitest";
import { renderRow } from "./row.ts";

function firstLine(lines: string[]): string {
  const [head] = lines;
  if (head === undefined) throw new Error("expected at least 1 line");
  return head;
}

describe("renderRow (D-36, Phase-3 v1 single-line join)", () => {
  it("2-child Row at width 60 produces single line with both children", () => {
    const r = renderRow(
      {
        kind: "Row",
        children: [
          { kind: "Text", text: "left" },
          { kind: "Text", text: "right" },
        ],
      },
      60,
    );
    expect(r).toHaveLength(1);
    const line = firstLine(r);
    expect(line.length).toBe(60);
    expect(line).toContain("left");
    expect(line).toContain("right");
    expect(r).toMatchSnapshot();
  });

  it("empty children returns empty array", () => {
    const r = renderRow({ kind: "Row", children: [] }, 60);
    expect(r).toHaveLength(0);
  });

  it("rectangular contract (line length === width) across widths", () => {
    const widths = [10, 20, 40, 60];
    for (const w of widths) {
      const r = renderRow(
        {
          kind: "Row",
          children: [
            { kind: "Text", text: "a" },
            { kind: "Text", text: "b" },
          ],
        },
        w,
      );
      expect(r.every((l) => l.length === w)).toBe(true);
    }
  });

  it("3-child Row: children distributed at floor(width / N) budget each", () => {
    const r = renderRow(
      {
        kind: "Row",
        children: [
          { kind: "Text", text: "x" },
          { kind: "Text", text: "y" },
          { kind: "Text", text: "z" },
        ],
      },
      60,
    );
    expect(r).toHaveLength(1);
    const line = firstLine(r);
    expect(line.length).toBe(60);
    expect(line).toContain("x");
    expect(line).toContain("y");
    expect(line).toContain("z");
  });

  it("is deterministic (byte-equal on repeated calls)", () => {
    const a = renderRow(
      {
        kind: "Row",
        children: [
          { kind: "Text", text: "a" },
          { kind: "Text", text: "b" },
        ],
      },
      40,
    );
    const b = renderRow(
      {
        kind: "Row",
        children: [
          { kind: "Text", text: "a" },
          { kind: "Text", text: "b" },
        ],
      },
      40,
    );
    expect(a).toEqual(b);
  });
});
