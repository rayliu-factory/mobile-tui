// Tests for renderModal (Plan 03-07) — D-36 labeled `+-- Modal -----+` top
// border + child body + plain `+---+` bottom border. Modal centering within
// the variant frame is Plan 03-08's variants.ts composer concern.
import { describe, expect, it } from "vitest";
import { renderModal } from "./modal.ts";

describe("renderModal (D-36)", () => {
  it("emits `+-- Modal -----+` labeled top border + child body + bottom border", () => {
    const r = renderModal(
      { kind: "Modal", child: { kind: "Text", text: "confirm?" } },
      60,
    );
    expect(r.length).toBeGreaterThanOrEqual(3);
    expect(r[0]).toHaveLength(60);
    expect(r[0]?.startsWith("+-- Modal ")).toBe(true);
    expect(r[0]?.endsWith("+")).toBe(true);
    expect(r[r.length - 1]).toBe(`+${"-".repeat(58)}+`);
    expect(r.every((l) => l.length === 60)).toBe(true);
    expect(r).toMatchSnapshot();
  });

  it("wraps Column of 2 children correctly", () => {
    const r = renderModal(
      {
        kind: "Modal",
        child: {
          kind: "Column",
          gap: "sm",
          children: [
            { kind: "Text", text: "line 1" },
            { kind: "Text", text: "line 2" },
          ],
        },
      },
      60,
    );
    expect(r.length).toBeGreaterThanOrEqual(4);
    expect(r[0]?.startsWith("+-- Modal ")).toBe(true);
    expect(r.every((l) => l.length === 60)).toBe(true);
  });

  it("nested Modal-in-Card preserves rectangular contract (width drift)", () => {
    const r = renderModal(
      {
        kind: "Modal",
        child: {
          kind: "Card",
          child: { kind: "Text", text: "deep" },
        },
      },
      60,
    );
    expect(r.every((l) => l.length === 60)).toBe(true);
    expect(r[0]?.startsWith("+-- Modal ")).toBe(true);
  });

  it("rectangular contract holds across widths", () => {
    const widths = [20, 40, 60];
    for (const w of widths) {
      const r = renderModal(
        { kind: "Modal", child: { kind: "Text", text: "x" } },
        w,
      );
      expect(r.every((l) => l.length === w)).toBe(true);
    }
  });

  it("is deterministic (byte-equal on repeated calls)", () => {
    const a = renderModal(
      { kind: "Modal", child: { kind: "Text", text: "x" } },
      40,
    );
    const b = renderModal(
      { kind: "Modal", child: { kind: "Text", text: "x" } },
      40,
    );
    expect(a).toEqual(b);
  });
});
