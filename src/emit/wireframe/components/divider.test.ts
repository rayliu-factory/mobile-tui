// Tests for renderDivider (Plan 03-04) — single `-----` run per D-36.
import { describe, expect, it } from "vitest";
import { renderDivider } from "./divider.ts";

describe("renderDivider (D-36)", () => {
  it("returns a single line of dashes matching width", () => {
    const result = renderDivider({ kind: "Divider" }, 60);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe("-".repeat(60));
    expect(result).toMatchSnapshot();
  });

  it("honors smaller widths", () => {
    const result = renderDivider({ kind: "Divider" }, 20);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe("-".repeat(20));
  });

  it("is deterministic (byte-equal on repeated calls)", () => {
    const a = renderDivider({ kind: "Divider" }, 40);
    const b = renderDivider({ kind: "Divider" }, 40);
    expect(a).toEqual(b);
  });

  it("rectangular contract: every line has length === width", () => {
    const widths = [10, 20, 40, 60];
    for (const w of widths) {
      const r = renderDivider({ kind: "Divider" }, w);
      expect(r.every((l) => l.length === w)).toBe(true);
    }
  });
});
