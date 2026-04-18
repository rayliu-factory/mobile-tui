// Tests for renderSpacer (Plan 03-04) — size → blank-line count per D-36.
import { describe, expect, it } from "vitest";
import { renderSpacer } from "./spacer.ts";

describe("renderSpacer (D-36)", () => {
  it("size=sm → 1 blank line at width", () => {
    const r = renderSpacer({ kind: "Spacer", size: "sm" }, 60);
    expect(r).toHaveLength(1);
    expect(r[0]).toBe(" ".repeat(60));
    expect(r).toMatchSnapshot();
  });

  it("size=md → 2 blank lines (DEFAULT)", () => {
    const r = renderSpacer({ kind: "Spacer", size: "md" }, 60);
    expect(r).toHaveLength(2);
    expect(r.every((l) => l === " ".repeat(60))).toBe(true);
  });

  it("size=lg → 3 blank lines", () => {
    const r = renderSpacer({ kind: "Spacer", size: "lg" }, 60);
    expect(r).toHaveLength(3);
    expect(r.every((l) => l === " ".repeat(60))).toBe(true);
  });

  it("size omitted → md default (2 lines)", () => {
    const r = renderSpacer({ kind: "Spacer" }, 60);
    expect(r).toHaveLength(2);
    expect(r.every((l) => l === " ".repeat(60))).toBe(true);
  });

  it("is deterministic (byte-equal on repeated calls)", () => {
    const a = renderSpacer({ kind: "Spacer", size: "lg" }, 40);
    const b = renderSpacer({ kind: "Spacer", size: "lg" }, 40);
    expect(a).toEqual(b);
  });

  it("rectangular contract: every line has length === width", () => {
    const r = renderSpacer({ kind: "Spacer", size: "lg" }, 40);
    expect(r.every((l) => l.length === 40)).toBe(true);
  });
});
