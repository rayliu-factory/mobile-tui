// Tests for src/emit/wireframe/text-style.ts — D-43 ASCII style mapping.
import { describe, expect, it } from "vitest";
import { applyTextStyle } from "./text-style.ts";

describe("applyTextStyle (D-43)", () => {
  describe("heading-1 (ALL CAPS)", () => {
    it("uppercases mixed-case input", () => {
      expect(applyTextStyle("My Habits", "heading-1")).toBe("MY HABITS");
    });
    it("is idempotent on already-uppercase input", () => {
      expect(applyTextStyle("MY HABITS", "heading-1")).toBe("MY HABITS");
    });
    it("uppercases ASCII mix of digits + punctuation + letters", () => {
      expect(applyTextStyle("v1.0 release", "heading-1")).toBe("V1.0 RELEASE");
    });
    it("returns empty string for empty input", () => {
      expect(applyTextStyle("", "heading-1")).toBe("");
    });
  });

  describe("heading-2 (identity — respect author capitalization)", () => {
    it("leaves Title Case unchanged", () => {
      expect(applyTextStyle("Drink water", "heading-2")).toBe("Drink water");
    });
    it("leaves mixed capitalization unchanged (no forced transform)", () => {
      expect(applyTextStyle("drink WATER", "heading-2")).toBe("drink WATER");
    });
    it("leaves acronym-containing text unchanged (no Title-Case mangle)", () => {
      expect(applyTextStyle("API reference", "heading-2")).toBe("API reference");
    });
  });

  describe("body (identity)", () => {
    it("passes through unchanged", () => {
      expect(applyTextStyle("plain text", "body")).toBe("plain text");
    });
    it("passes through with punctuation intact", () => {
      expect(applyTextStyle("Hello, world!", "body")).toBe("Hello, world!");
    });
  });

  describe("caption (parens wrap)", () => {
    it("wraps input in parens", () => {
      expect(applyTextStyle("2 of 5 habits complete", "caption")).toBe("(2 of 5 habits complete)");
    });
    it("wraps empty string consistently (degenerate but total)", () => {
      expect(applyTextStyle("", "caption")).toBe("()");
    });
  });

  describe("undefined style (default === body)", () => {
    it("passes through as body identity", () => {
      expect(applyTextStyle("untagged", undefined)).toBe("untagged");
    });
    it("passes through when style arg is omitted", () => {
      expect(applyTextStyle("untagged")).toBe("untagged");
    });
  });

  describe("determinism (T-03-04)", () => {
    it("two calls with identical args produce byte-equal output", () => {
      const a = applyTextStyle("Hello world", "heading-1");
      const b = applyTextStyle("Hello world", "heading-1");
      expect(a).toBe(b);
    });
  });
});
