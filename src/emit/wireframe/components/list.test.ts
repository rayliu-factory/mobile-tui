// Tests for renderList (Plan 03-06) — D-36 + RESEARCH Pitfall 9.
// V1 decision: render exactly ONE item from itemTemplate (no live data at
// render time; multi-item would fabricate content). Wrap in `+--+` box via
// drawFrame + append `(list bound to <JsonPointer>)` subtle footer so the
// reader can distinguish "List" from "Card".
import { describe, expect, it } from "vitest";
import { renderList } from "./list.ts";

describe("renderList (D-36, RESEARCH Pitfall 9)", () => {
  it("single-item box + `(list bound to ...)` footer", () => {
    const r = renderList(
      {
        kind: "List",
        bindsTo: "/Habit/title",
        itemTemplate: { kind: "Text", text: "Item row" },
      },
      60,
    );
    expect(r.length).toBeGreaterThanOrEqual(4);
    const top = r[0];
    const footer = r[r.length - 1];
    if (top === undefined || footer === undefined) {
      throw new Error("expected ≥4 lines");
    }
    expect(top).toBe(`+${"-".repeat(58)}+`);
    expect(footer).toContain("list bound to /Habit/title");
    expect(r.every((l) => l.length === 60)).toBe(true);
    expect(r).toMatchSnapshot();
  });

  it("item template can be ListItem — single item rendered", () => {
    const r = renderList(
      {
        kind: "List",
        bindsTo: "/Task/title",
        itemTemplate: {
          kind: "ListItem",
          children: [{ kind: "Text", text: "task" }],
        },
      },
      60,
    );
    expect(r.every((l) => l.length === 60)).toBe(true);
    const footer = r[r.length - 1];
    if (footer === undefined) throw new Error("expected footer");
    expect(footer).toContain("list bound to /Task/title");
  });

  it("item template can be Card — box-in-box", () => {
    const r = renderList(
      {
        kind: "List",
        bindsTo: "/Habit/streak",
        itemTemplate: {
          kind: "Card",
          child: { kind: "Text", text: "streak" },
        },
      },
      60,
    );
    expect(r.every((l) => l.length === 60)).toBe(true);
    // Outer list box + inner Card box + footer = at least 6 lines
    expect(r.length).toBeGreaterThanOrEqual(6);
  });

  it("bindsTo JsonPointer appears verbatim in footer", () => {
    const r = renderList(
      {
        kind: "List",
        bindsTo: "/User/settings/notifications",
        itemTemplate: { kind: "Text", text: "x" },
      },
      60,
    );
    const footer = r[r.length - 1];
    if (footer === undefined) throw new Error("expected footer");
    expect(footer).toContain("list bound to /User/settings/notifications");
  });

  it("rectangular contract holds at narrow widths too", () => {
    const r = renderList(
      {
        kind: "List",
        bindsTo: "/T/x",
        itemTemplate: { kind: "Text", text: "a" },
      },
      30,
    );
    expect(r.every((l) => l.length === 30)).toBe(true);
  });
});
