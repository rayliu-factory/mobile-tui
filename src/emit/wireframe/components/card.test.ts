// Tests for renderCard (Plan 03-06) — D-36 untitled `+--+` box wrapping a
// single child. Width arithmetic per RESEARCH Pitfall 4: outer `width` →
// child region `width - 4` (drawFrame consumes `| `/` |` inner pads +
// 2 cols for `+` corners collapsed). Nested Cards compound: depth-2 child
// sees width-8. The `nested Card` test is the width-drift canary.
import { describe, expect, it } from "vitest";
import { renderCard } from "./card.ts";

describe("renderCard (D-36)", () => {
  it("wraps child in `+--+` box at width 60", () => {
    const r = renderCard({ kind: "Card", child: { kind: "Text", text: "content" } }, 60);
    expect(r.length).toBeGreaterThanOrEqual(3);
    const top = r[0];
    const bot = r[r.length - 1];
    const body = r[1];
    if (top === undefined || bot === undefined || body === undefined) {
      throw new Error("expected ≥3 lines");
    }
    expect(top).toBe(`+${"-".repeat(58)}+`);
    expect(bot).toBe(`+${"-".repeat(58)}+`);
    expect(r.every((l) => l.length === 60)).toBe(true);
    expect(body.startsWith("| ")).toBe(true);
    expect(body.endsWith(" |")).toBe(true);
    expect(r).toMatchSnapshot();
  });

  it("wraps Column of 2 children correctly", () => {
    const r = renderCard(
      {
        kind: "Card",
        child: {
          kind: "Column",
          gap: "sm",
          children: [
            { kind: "Text", text: "a" },
            { kind: "Text", text: "b" },
          ],
        },
      },
      60,
    );
    // Top + 2 body + bottom (minimum)
    expect(r.length).toBeGreaterThanOrEqual(4);
    expect(r.every((l) => l.length === 60)).toBe(true);
  });

  it("nested Card reduces child width correctly (width drift per RESEARCH Pitfall 4)", () => {
    const r = renderCard(
      {
        kind: "Card",
        child: {
          kind: "Card",
          child: { kind: "Text", text: "deep" },
        },
      },
      60,
    );
    expect(r.every((l) => l.length === 60)).toBe(true);
    // Outer top + inner top + body + inner bottom + outer bottom = 5 lines min
    expect(r.length).toBeGreaterThanOrEqual(5);
  });

  it("depth-3 Card nesting: children see width - 12; rectangular contract holds", () => {
    const r = renderCard(
      {
        kind: "Card",
        child: {
          kind: "Card",
          child: {
            kind: "Card",
            child: { kind: "Text", text: "triple" },
          },
        },
      },
      60,
    );
    expect(r.every((l) => l.length === 60)).toBe(true);
    expect(r.length).toBeGreaterThanOrEqual(7);
  });

  it("rectangular contract holds across widths", () => {
    const widths = [20, 40, 60];
    for (const w of widths) {
      const r = renderCard({ kind: "Card", child: { kind: "Text", text: "x" } }, w);
      expect(r.every((l) => l.length === w)).toBe(true);
    }
  });
});
