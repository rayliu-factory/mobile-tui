// Tests for renderNavBar (Plan 03-07) — D-37 single-line `< Title [trailing]`
// + `---` rule beneath. Leading `< ` assumed (non-root default) per PATTERNS.md
// §components/nav-bar.ts; root-screen stripping is deferred to Plan 03-08's
// variants.ts composer. D-42 not applicable (NavBar.title is not an action ref).
import { describe, expect, it } from "vitest";
import { renderNavBar } from "./nav-bar.ts";

describe("renderNavBar (D-37)", () => {
  it("emits `< Title` + --- rule at width 60", () => {
    const r = renderNavBar({ kind: "NavBar", title: "Home" }, 60);
    expect(r).toHaveLength(2);
    expect(r[0]).toHaveLength(60);
    expect(r[0]?.startsWith("< Home")).toBe(true);
    expect(r[1]).toBe("-".repeat(60));
    expect(r).toMatchSnapshot();
  });

  it("includes trailing widget when present", () => {
    const r = renderNavBar(
      {
        kind: "NavBar",
        title: "Home",
        trailing: {
          kind: "Button",
          label: "+",
          action: "add",
          testID: "add_btn",
          variant: "text",
        },
      },
      60,
    );
    expect(r[0]).toContain("Home");
    expect(r[0]).toContain("+"); // button glyph
  });

  it("truncates overlong title with `...`", () => {
    const r = renderNavBar(
      { kind: "NavBar", title: "A very long screen title that exceeds budget" },
      20,
    );
    expect(r[0]).toHaveLength(20);
    expect(r[0]?.startsWith("< ")).toBe(true);
  });

  it("every line has length === width", () => {
    const r = renderNavBar({ kind: "NavBar", title: "X" }, 40);
    expect(r.every((l) => l.length === 40)).toBe(true);
  });

  it("is deterministic (byte-equal on repeated calls)", () => {
    const a = renderNavBar({ kind: "NavBar", title: "Home" }, 60);
    const b = renderNavBar({ kind: "NavBar", title: "Home" }, 60);
    expect(a).toEqual(b);
  });

  it("rectangular contract holds across widths", () => {
    const widths = [20, 30, 40, 60];
    for (const w of widths) {
      const r = renderNavBar({ kind: "NavBar", title: "Screen" }, w);
      expect(r.every((l) => l.length === w)).toBe(true);
    }
  });
});
