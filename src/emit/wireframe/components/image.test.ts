// Tests for renderImage (Plan 03-04) — 3-line `+--IMG--+` box per D-Claude.
import { describe, expect, it } from "vitest";
import { renderImage } from "./image.ts";

describe("renderImage (D-Claude, RESEARCH §Component Emitter Details §Image)", () => {
  it("default 3-line box at width 60 — alt visible", () => {
    const r = renderImage({ kind: "Image", source: "/a.png", alt: "icon" }, 60);
    expect(r).toHaveLength(3);
    expect(r.every((l) => l.length === 60)).toBe(true);
    // Top border starts with `+--IMG`; bottom border starts with `+---`.
    expect(r[0].startsWith("+--IMG")).toBe(true);
    expect(r[1]).toContain("icon");
    expect(r[2].startsWith("+---")).toBe(true);
    expect(r).toMatchSnapshot();
  });

  it("width < 8 falls back to inline `[img:alt]`", () => {
    const r = renderImage({ kind: "Image", source: "/a.png", alt: "x" }, 6);
    expect(r).toHaveLength(1);
    expect(r[0].length).toBe(6);
    expect(r[0].startsWith("[img:")).toBe(true);
  });

  it("empty alt falls back to `(no alt)` inline defensive literal", () => {
    // Phase-1 schema requires alt; this is a defense-in-depth check.
    // Plan 03-04 <behavior>: render `(no alt)` inline, single line, padded to width.
    const r = renderImage({ kind: "Image", source: "/a.png", alt: "" }, 60);
    expect(r).toHaveLength(1);
    expect(r[0]).toHaveLength(60);
    expect(r[0]).toContain("(no alt)");
    expect(r[0].startsWith("(no alt)")).toBe(true);
  });

  it("rectangular contract: every line has length === width at varied widths", () => {
    for (const w of [8, 10, 20, 40, 60]) {
      const r = renderImage({ kind: "Image", source: "/a.png", alt: "ic" }, w);
      expect(r.every((l) => l.length === w)).toBe(true);
    }
  });

  it("is deterministic (byte-equal on repeated calls)", () => {
    const a = renderImage({ kind: "Image", source: "/a.png", alt: "icon" }, 60);
    const b = renderImage({ kind: "Image", source: "/a.png", alt: "icon" }, 60);
    expect(a).toEqual(b);
  });
});
