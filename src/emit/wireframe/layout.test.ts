// Tests for src/emit/wireframe/layout.ts — 60-col frame composer.
// Covers: D-38 PHONE_WIDTH=60, D-40 header-in-top-border with graceful
// overflow cascade (RESEARCH Pitfall 5), D-41 when-trigger placement,
// padRight contract, drawFrame rectangular-output contract.
import { describe, expect, it } from "vitest";
import { buildVariantHeader, drawFrame, PHONE_WIDTH, padRight } from "./layout.ts";

describe("PHONE_WIDTH", () => {
  it("is 60 per D-38", () => {
    expect(PHONE_WIDTH).toBe(60);
  });
});

describe("buildVariantHeader (D-40, D-41)", () => {
  it("renders canonical empty-variant header at width 60 (stage-1 fit)", () => {
    // When-expr deliberately short so the full `+-- ... --+` shape fits stage 1
    // at width 60 without invoking the stage-3 truncate path (Plan 03-03).
    // The canonical at-60-cols lock is: +-- screen: home  variant: empty  when <short> ----+
    const header = buildVariantHeader("home", "empty", "collection /H/t", 60);
    expect(header.length).toBe(60);
    expect(header).toContain("screen: home");
    expect(header).toContain("variant: empty");
    expect(header).toContain("when collection /H/t");
    expect(header.startsWith("+--")).toBe(true);
    expect(header.endsWith("--+")).toBe(true);
  });

  it("content variant has no when-trigger (D-41)", () => {
    const header = buildVariantHeader("home", "content", undefined, 60);
    expect(header.length).toBe(60);
    expect(header).toContain("screen: home");
    expect(header).toContain("variant: content");
    expect(header).not.toContain("when ");
  });

  it.skip("UNSKIP after Plan 03-03 ships truncate — moderate overflow degrades to single-dash close `-+`", () => {
    // Pick a case where full `--+` overflows by 1 char; -+ saves it.
    // NOTE: stage 2 at this screenId length also overflows, so this actually
    // tests stage-3 truncation (see also the extreme-overflow test below).
    // Depends on truncate() — unskipped when Plan 03-03 lands.
    const header = buildVariantHeader(
      "very-long-screen-id",
      "loading",
      "async /Entity/field-with-long",
      60,
    );
    expect(header.length).toBe(60);
    expect(header.startsWith("+--")).toBe(true);
    const endsCorrectly = header.endsWith("--+") || header.endsWith("-+");
    expect(endsCorrectly).toBe(true);
  });

  it.skip("UNSKIP after Plan 03-03 ships truncate — extreme overflow truncates content with ...", () => {
    const header = buildVariantHeader(
      "supercalifragilisticexpialidocious-screen-identifier",
      "error",
      "field_error /Entity/field-with-extremely-long-name",
      60,
    );
    expect(header.length).toBe(60);
    expect(header.startsWith("+--")).toBe(true);
    expect(header).toContain("screen:");
    expect(header).toContain("variant:");
    expect(header).toContain("...");
  });

  it("stage-2 fit: moderate overflow degrades to single-dash close `-+` without truncate", () => {
    // Content length where stage 1 (needs +6 overhead) fails but stage 2 (+5) fits.
    // Target: content.length === 55 → stage1 needs 61, stage2 needs 60. Exact -+ close.
    // ` screen: a  variant: empty  when <W> ` = 34 + whenLen; need content=55 → whenLen=21
    // Use: "collection /Entity/fieldX" = 25 chars → content = 34 + 25 = 59 → stage1=65, stage2=64.
    // Try shorter when: "collection /Ent/fldX" = 20 chars → content = 34 + 20 = 54 → stage1=60 (fits).
    // Pick 21-char when: "collection /Ent/fldXX" = 21 chars → content = 55 → stage1=61 (fails), stage2=60 (fits).
    const header = buildVariantHeader("a", "empty", "collection /Ent/fldXX", 60);
    expect(header.length).toBe(60);
    expect(header.startsWith("+--")).toBe(true);
    expect(header.endsWith("-+")).toBe(true);
    expect(header.endsWith("--+")).toBe(false);
    expect(header).toContain("screen: a");
    expect(header).toContain("variant: empty");
    expect(header).toContain("when collection /Ent/fldXX");
  });

  it("null-marker path: loading/empty/error without when-expr renders cleanly", () => {
    const header = buildVariantHeader("home", "loading", undefined, 60);
    expect(header.length).toBe(60);
    expect(header).toContain("screen: home");
    expect(header).toContain("variant: loading");
    expect(header).not.toContain("when ");
  });

  it("is deterministic: two calls with identical args produce byte-identical output", () => {
    // Short when-expr so stage 1 fits at width 60 (no truncate dependency).
    const a = buildVariantHeader("home", "empty", "collection /H/t", 60);
    const b = buildVariantHeader("home", "empty", "collection /H/t", 60);
    expect(a).toBe(b);
  });
});

describe("padRight", () => {
  it("pads short string with trailing spaces to width", () => {
    const out = padRight("ab", 10);
    expect(out.length).toBe(10);
    expect(out).toBe("ab        ");
  });

  it("returns width spaces for empty input", () => {
    const out = padRight("", 10);
    expect(out.length).toBe(10);
    expect(out).toBe("          ");
  });

  it("returns input unchanged when length === width", () => {
    const out = padRight("exactly-10", 10);
    expect(out.length).toBe(10);
    expect(out).toBe("exactly-10");
  });

  it.skip("UNSKIP after Plan 03-03 ships truncate — delegates to truncate when input exceeds width", () => {
    const out = padRight("this-is-longer-than-width", 10);
    expect(out.length).toBe(10);
    expect(out.endsWith("...")).toBe(true);
  });
});

describe("drawFrame", () => {
  it("wraps a single-line body in top + body + bottom borders at width 60", () => {
    const frame = drawFrame(["hello"], 60);
    expect(frame.length).toBe(3);
    const [top, body, bottom] = frame;
    if (top === undefined || body === undefined || bottom === undefined) {
      throw new Error("expected 3 frame lines");
    }
    expect(top.length).toBe(60);
    expect(body.length).toBe(60);
    expect(bottom.length).toBe(60);
    expect(top).toBe(`+${"-".repeat(58)}+`);
    expect(bottom).toBe(`+${"-".repeat(58)}+`);
    expect(body.startsWith("| hello")).toBe(true);
    expect(body.endsWith(" |")).toBe(true);
  });

  it("empty body produces two borders only (null-marker collapse shape)", () => {
    const frame = drawFrame([], 60);
    expect(frame.length).toBe(2);
    const [top, bottom] = frame;
    if (top === undefined || bottom === undefined) {
      throw new Error("expected 2 frame lines");
    }
    expect(top.length).toBe(60);
    expect(bottom.length).toBe(60);
  });

  it("every output line has length === width (rectangular contract)", () => {
    const frame = drawFrame(["a", "bb", "ccc"], 60);
    for (const line of frame) {
      expect(line.length).toBe(60);
    }
  });
});
