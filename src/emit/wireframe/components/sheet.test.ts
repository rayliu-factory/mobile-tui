// Tests for renderSheet (Plan 03-07) — D-36 labeled `+-- Sheet -----+` top
// border + child body + plain `+---+` bottom border. Sheet bottom-anchoring
// within the variant frame is Plan 03-08's variants.ts composer concern.
// Shares renderOverlayBox helper with Modal (DRY).
import { describe, expect, it } from "vitest";
import { renderSheet } from "./sheet.ts";

describe("renderSheet (D-36)", () => {
  it("emits `+-- Sheet -----+` labeled top border + child body + bottom border", () => {
    const r = renderSheet(
      {
        kind: "Sheet",
        child: {
          kind: "Column",
          gap: "sm",
          children: [
            { kind: "Text", text: "option 1" },
            { kind: "Text", text: "option 2" },
          ],
        },
      },
      60,
    );
    expect(r.length).toBeGreaterThanOrEqual(4);
    expect(r[0]).toHaveLength(60);
    expect(r[0]?.startsWith("+-- Sheet ")).toBe(true);
    expect(r[r.length - 1]).toBe(`+${"-".repeat(58)}+`);
    expect(r.every((l) => l.length === 60)).toBe(true);
    expect(r).toMatchSnapshot();
  });

  it("wraps a single Text child", () => {
    const r = renderSheet(
      { kind: "Sheet", child: { kind: "Text", text: "choose" } },
      60,
    );
    expect(r.length).toBeGreaterThanOrEqual(3);
    expect(r[0]?.startsWith("+-- Sheet ")).toBe(true);
    expect(r.every((l) => l.length === 60)).toBe(true);
  });

  it("rectangular contract holds across widths", () => {
    const widths = [20, 40, 60];
    for (const w of widths) {
      const r = renderSheet(
        { kind: "Sheet", child: { kind: "Text", text: "x" } },
        w,
      );
      expect(r.every((l) => l.length === w)).toBe(true);
    }
  });

  it("is deterministic (byte-equal on repeated calls)", () => {
    const a = renderSheet(
      { kind: "Sheet", child: { kind: "Text", text: "x" } },
      40,
    );
    const b = renderSheet(
      { kind: "Sheet", child: { kind: "Text", text: "x" } },
      40,
    );
    expect(a).toEqual(b);
  });
});
