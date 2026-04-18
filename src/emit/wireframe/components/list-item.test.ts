// Tests for renderListItem (Plan 03-06) — D-36 non-boxed container, D-42
// tappable-vs-container distinction invisible in persisted output. List
// (parent) provides the `+--+` box; ListItem emits children vertically.
import { describe, expect, it } from "vitest";
import { renderListItem } from "./list-item.ts";

function firstLine(lines: string[]): string {
  const [head] = lines;
  if (head === undefined) throw new Error("expected at least 1 line");
  return head;
}

describe("renderListItem (D-36, D-42)", () => {
  it("container ListItem: vertical concat of children", () => {
    const r = renderListItem({ kind: "ListItem", children: [{ kind: "Text", text: "row" }] }, 60);
    expect(r).toHaveLength(1);
    const line = firstLine(r);
    expect(line.startsWith("row")).toBe(true);
    expect(line.length).toBe(60);
  });

  it("tappable ListItem (with sigil triple) renders identically to container (D-42)", () => {
    const container = renderListItem(
      { kind: "ListItem", children: [{ kind: "Text", text: "x" }] },
      60,
    );
    const tappable = renderListItem(
      {
        kind: "ListItem",
        label: "View",
        action: "view_x",
        testID: "x_row",
        children: [{ kind: "Text", text: "x" }],
      },
      60,
    );
    expect(tappable).toEqual(container);
  });

  it("multi-child ListItem: all children contribute lines (vertical concat)", () => {
    const r = renderListItem(
      {
        kind: "ListItem",
        children: [{ kind: "Text", text: "a" }, { kind: "Divider" }],
      },
      40,
    );
    expect(r).toHaveLength(2);
    expect(r.every((l) => l.length === 40)).toBe(true);
  });

  it("every output line has length === width (rectangular)", () => {
    const r = renderListItem(
      {
        kind: "ListItem",
        children: [{ kind: "Text", text: "a" }, { kind: "Divider" }],
      },
      40,
    );
    expect(r.every((l) => l.length === 40)).toBe(true);
  });

  it("empty children returns empty array", () => {
    const r = renderListItem({ kind: "ListItem", children: [] }, 60);
    expect(r).toHaveLength(0);
  });

  it("D-42: action/testID NEVER appear in output", () => {
    const r = renderListItem(
      {
        kind: "ListItem",
        label: "View",
        action: "view_secret_zzz",
        testID: "secret_test_yyy",
        children: [{ kind: "Text", text: "visible" }],
      },
      60,
    );
    const line = firstLine(r);
    expect(line).not.toContain("view_secret_zzz");
    expect(line).not.toContain("secret_test_yyy");
  });
});
