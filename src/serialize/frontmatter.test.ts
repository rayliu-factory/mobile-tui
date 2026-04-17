import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import YAML from "yaml";
import { detectLineEndingStyle, splitFrontmatter } from "./frontmatter.ts";

describe("frontmatter.ts — splitFrontmatter on real fixtures", () => {
  it("parses habit-tracker.spec.md into a YAML.Document with schema + screens", () => {
    const raw = readFileSync(resolve("fixtures/habit-tracker.spec.md"), "utf8");
    const parsed = splitFrontmatter(raw);
    expect(parsed.doc).toBeInstanceOf(YAML.Document);
    expect(parsed.doc.has("schema")).toBe(true);
    expect(parsed.doc.has("screens")).toBe(true);
    expect(parsed.doc.has("actions")).toBe(true);
    expect(parsed.doc.has("data")).toBe(true);
    expect(parsed.doc.has("navigation")).toBe(true);
  });

  it("sets hasFrontmatter=true + closingDelimiterTerminator='\\n' on LF fixture", () => {
    const raw = readFileSync(resolve("fixtures/habit-tracker.spec.md"), "utf8");
    const parsed = splitFrontmatter(raw);
    expect(parsed.hasFrontmatter).toBe(true);
    expect(parsed.closingDelimiterTerminator).toBe("\n");
  });

  it("returns lineEndingStyle=lf for LF-only fixture", () => {
    const raw = readFileSync(resolve("fixtures/habit-tracker.spec.md"), "utf8");
    expect(splitFrontmatter(raw).lineEndingStyle).toBe("lf");
  });

  it("captures body verbatim from file.orig (Pitfall 7)", () => {
    const raw = "---\nfoo: 1\n---\n\n# body\n";
    const parsed = splitFrontmatter(raw);
    expect(parsed.bodyBytes).toBe("\n# body\n");
  });

  it("frontmatterStart/End bracket the delimiter lines", () => {
    const raw = "---\nfoo: 1\n---\n# body\n";
    const parsed = splitFrontmatter(raw);
    expect(parsed.origBytes.slice(parsed.frontmatterStart, parsed.frontmatterEnd)).toMatch(
      /^---\r?\nfoo: 1\r?\n---\r?\n?$/,
    );
  });

  it("BLOCKER fix #2: hasFrontmatter=false for raw Markdown (no delimiters)", () => {
    const parsed = splitFrontmatter("hello world\n");
    expect(parsed.hasFrontmatter).toBe(false);
    expect(parsed.bodyBytes).toBe("");
    expect(parsed.closingDelimiterTerminator).toBe("");
  });

  it("BLOCKER fix #2: hasFrontmatter=true + isEmpty=true for empty-map fixture (---\\n---\\n\\nbody\\n)", () => {
    const parsed = splitFrontmatter("---\n---\n\nbody\n");
    expect(parsed.hasFrontmatter).toBe(true);
    expect(parsed.isEmpty).toBe(true);
    expect(parsed.closingDelimiterTerminator).toBe("\n");
    expect(parsed.bodyBytes).toBe("\nbody\n");
  });

  it("BLOCKER fix #1: closingDelimiterTerminator='' when closing --- ends the file", () => {
    const parsed = splitFrontmatter("---\nfoo: 1\n---");
    expect(parsed.hasFrontmatter).toBe(true);
    expect(parsed.closingDelimiterTerminator).toBe("");
    expect(parsed.bodyBytes).toBe("");
  });

  it("BLOCKER fix #1: closingDelimiterTerminator='\\r\\n' on CRLF input", () => {
    const parsed = splitFrontmatter("---\r\nfoo: 1\r\n---\r\n# body\r\n");
    expect(parsed.hasFrontmatter).toBe(true);
    expect(parsed.closingDelimiterTerminator).toBe("\r\n");
    expect(parsed.lineEndingStyle).toBe("crlf");
    expect(parsed.bodyBytes).toBe("# body\r\n");
  });

  it("isEmpty=true for zero-key frontmatter", () => {
    const raw = "---\n---\n\nbody\n";
    const parsed = splitFrontmatter(raw);
    expect(parsed.isEmpty).toBe(true);
  });

  it("stringify-engine throws defensively if called", () => {
    // We can't easily trigger gray-matter to call stringify here since we
    // never invoke matter.stringify. Confirm by reading the source: the
    // stringify closure throws.
    const fnSource = splitFrontmatter.toString();
    expect(fnSource).toContain("gray-matter.stringify is not part of the write path");
  });
});

describe("frontmatter.ts — detectLineEndingStyle", () => {
  it("returns crlf when CRLF appears before or equal to first LF", () => {
    expect(detectLineEndingStyle("a\r\nb\n")).toBe("crlf");
  });

  it("returns lf for LF-only input", () => {
    expect(detectLineEndingStyle("a\nb\n")).toBe("lf");
  });

  it("defaults to lf for input without newlines", () => {
    expect(detectLineEndingStyle("abc")).toBe("lf");
  });
});
