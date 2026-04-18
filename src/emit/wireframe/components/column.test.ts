// Tests for renderColumn (Plan 03-06) — D-36 structural container:
// vertical concat of children with gap-sized blank lines between siblings
// (sm=0, md=1 DEFAULT, lg=2). No container glyph. Width passes unchanged
// through to children via renderNode (dispatch recursion).
import { describe, expect, it } from "vitest";
import { renderColumn } from "./column.ts";

function firstLine(lines: string[]): string {
  const [head] = lines;
  if (head === undefined) throw new Error("expected at least 1 line");
  return head;
}

describe("renderColumn (D-36)", () => {
  it("2-child default (gap=md) produces 1 blank line between children", () => {
    const r = renderColumn(
      {
        kind: "Column",
        children: [{ kind: "Text", text: "hello" }, { kind: "Divider" }],
      },
      60,
    );
    expect(r).toHaveLength(3);
    const [l0, l1, l2] = r;
    if (l0 === undefined || l1 === undefined || l2 === undefined) {
      throw new Error("expected 3 lines");
    }
    expect(l0.length).toBe(60);
    expect(l1.trim()).toBe("");
    expect(l1.length).toBe(60);
    expect(l2.length).toBe(60);
    expect(r).toMatchSnapshot();
  });

  it("gap=sm produces no blank lines between children", () => {
    const r = renderColumn(
      {
        kind: "Column",
        gap: "sm",
        children: [
          { kind: "Text", text: "a" },
          { kind: "Text", text: "b" },
        ],
      },
      60,
    );
    expect(r).toHaveLength(2);
    expect(r.every((l) => l.length === 60)).toBe(true);
  });

  it("gap=lg produces 2 blank lines between children", () => {
    const r = renderColumn(
      {
        kind: "Column",
        gap: "lg",
        children: [
          { kind: "Text", text: "a" },
          { kind: "Text", text: "b" },
        ],
      },
      60,
    );
    expect(r).toHaveLength(4);
    expect(r.every((l) => l.length === 60)).toBe(true);
  });

  it("empty children returns empty array", () => {
    const r = renderColumn({ kind: "Column", children: [] }, 60);
    expect(r).toHaveLength(0);
  });

  it("nested Column recurses correctly at full width", () => {
    const r = renderColumn(
      {
        kind: "Column",
        gap: "sm",
        children: [
          {
            kind: "Column",
            gap: "sm",
            children: [{ kind: "Text", text: "inner" }],
          },
        ],
      },
      60,
    );
    expect(r).toHaveLength(1);
    const line = firstLine(r);
    expect(line.length).toBe(60);
    expect(line.startsWith("inner")).toBe(true);
  });

  it("every output line has length === width (rectangular)", () => {
    const r = renderColumn(
      {
        kind: "Column",
        children: [
          { kind: "Text", text: "x" },
          { kind: "Text", text: "y" },
        ],
      },
      40,
    );
    expect(r.every((l) => l.length === 40)).toBe(true);
  });

  it("single child: no gap lines appended (gap only between siblings)", () => {
    const r = renderColumn(
      {
        kind: "Column",
        gap: "lg",
        children: [{ kind: "Text", text: "solo" }],
      },
      30,
    );
    expect(r).toHaveLength(1);
  });
});
