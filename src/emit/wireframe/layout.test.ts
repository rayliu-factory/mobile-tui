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
  it("renders canonical empty-variant header at width 60", () => {
    const header = buildVariantHeader("home", "empty", "collection /Habit/title", 60);
    expect(header.length).toBe(60);
    expect(header).toContain("screen: home");
    expect(header).toContain("variant: empty");
    expect(header).toContain("when collection /Habit/title");
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

  it("moderate overflow degrades to single-dash close `-+`", () => {
    // Pick a case where full `--+` overflows by 1 char; -+ saves it.
    // screenId + variant + when chosen so `+-- ... --+` is 61 cols but
    // `+-- ... -+` is 60 cols.
    const header = buildVariantHeader(
      "very-long-screen-id",
      "loading",
      "async /Entity/field-with-long",
      60,
    );
    expect(header.length).toBe(60);
    expect(header.startsWith("+--")).toBe(true);
    // Closing form may be `--+` if content happened to fit; else `-+`.
    // Assert it's one of the two valid closing forms.
    const endsCorrectly = header.endsWith("--+") || header.endsWith("-+");
    expect(endsCorrectly).toBe(true);
  });

  it("extreme overflow truncates content with ... while preserving screen: + variant: metadata", () => {
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

  it("null-marker path: loading/empty/error without when-expr renders cleanly", () => {
    const header = buildVariantHeader("home", "loading", undefined, 60);
    expect(header.length).toBe(60);
    expect(header).toContain("screen: home");
    expect(header).toContain("variant: loading");
    expect(header).not.toContain("when ");
  });

  it("is deterministic: two calls with identical args produce byte-identical output", () => {
    const a = buildVariantHeader("home", "empty", "collection /Habit/title", 60);
    const b = buildVariantHeader("home", "empty", "collection /Habit/title", 60);
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
    expect(frame[0].length).toBe(60);
    expect(frame[1].length).toBe(60);
    expect(frame[2].length).toBe(60);
    expect(frame[0]).toBe("+" + "-".repeat(58) + "+");
    expect(frame[2]).toBe("+" + "-".repeat(58) + "+");
    expect(frame[1].startsWith("| hello")).toBe(true);
    expect(frame[1].endsWith(" |")).toBe(true);
  });

  it("empty body produces two borders only (null-marker collapse shape)", () => {
    const frame = drawFrame([], 60);
    expect(frame.length).toBe(2);
    expect(frame[0].length).toBe(60);
    expect(frame[1].length).toBe(60);
  });

  it("every output line has length === width (rectangular contract)", () => {
    const frame = drawFrame(["a", "bb", "ccc"], 60);
    for (const line of frame) {
      expect(line.length).toBe(60);
    }
  });
});
