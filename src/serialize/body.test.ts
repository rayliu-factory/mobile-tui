import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { extractBodyBytes, findFrontmatterBounds } from "./body.ts";

describe("body.ts — findFrontmatterBounds", () => {
  it("locates opening and closing --- with LF; captures closingTerminator='\\n'", () => {
    const raw = "---\nfoo: 1\n---\n# body\n";
    const bounds = findFrontmatterBounds(raw);
    if (bounds === null) throw new Error("expected bounds to be non-null");
    expect(bounds.start).toBe(0);
    expect(bounds.closingTerminator).toBe("\n");
    // Check body slice is what we expect rather than asserting exact offset.
    expect(raw.slice(bounds.end)).toBe("# body\n");
  });

  it("locates opening and closing --- with CRLF; captures closingTerminator='\\r\\n'", () => {
    const raw = "---\r\nfoo: 1\r\n---\r\n# body\r\n";
    const bounds = findFrontmatterBounds(raw);
    if (bounds === null) throw new Error("expected bounds to be non-null");
    expect(bounds.closingTerminator).toBe("\r\n");
    expect(raw.slice(bounds.end)).toBe("# body\r\n");
  });

  it("captures closingTerminator='' when file ends at closing --- with no newline (BLOCKER fix #1)", () => {
    const raw = "---\nfoo: 1\n---";
    const bounds = findFrontmatterBounds(raw);
    if (bounds === null) throw new Error("expected bounds to be non-null");
    expect(bounds.closingTerminator).toBe("");
    expect(raw.slice(bounds.end)).toBe("");
  });

  it("returns null when opening --- missing", () => {
    expect(findFrontmatterBounds("no frontmatter here\n")).toBeNull();
  });

  it("returns null when closing --- missing", () => {
    expect(findFrontmatterBounds("---\nfoo: 1\n")).toBeNull();
  });
});

describe("body.ts — extractBodyBytes", () => {
  it("returns body slice verbatim including leading blank lines (Pitfall 7)", () => {
    expect(extractBodyBytes("---\nfoo: 1\n---\n\n# comment-only\n")).toBe("\n# comment-only\n");
  });

  it("returns empty string when body is empty", () => {
    expect(extractBodyBytes("---\nfoo: 1\n---")).toBe("");
    expect(extractBodyBytes("---\nfoo: 1\n---\n")).toBe("");
  });

  it("returns empty string when input has no frontmatter", () => {
    expect(extractBodyBytes("no frontmatter")).toBe("");
  });

  it("preserves CRLF bytes verbatim", () => {
    expect(extractBodyBytes("---\r\nfoo: 1\r\n---\r\n# body\r\n")).toBe("# body\r\n");
  });

  it("extracts body from real Phase-1 fixture (habit-tracker.spec.md)", () => {
    const raw = readFileSync(resolve("fixtures/habit-tracker.spec.md"), "utf8");
    const body = extractBodyBytes(raw);
    expect(body).toMatch(/^\n<!-- Phase 1 fixture: triple-form YAML/);
    expect(body).toMatch(/# habit-tracker/);
  });
});
