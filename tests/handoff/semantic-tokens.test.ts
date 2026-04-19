// tests/handoff/semantic-tokens.test.ts
// RED phase: tests for SEMANTIC_TOKENS set and token-budget helpers.
// These tests MUST fail before implementation (TDD RED gate).
import { describe, expect, it } from "vitest";
import { SEMANTIC_TOKENS } from "../../src/emit/handoff/semantic-tokens.ts";
import { countTokens, isWithinBudget } from "../../src/emit/handoff/token-budget.ts";

describe("SEMANTIC_TOKENS — allowlist coverage", () => {
  it("covers Button.variant: primary", () => {
    expect(SEMANTIC_TOKENS.has("primary")).toBe(true);
  });

  it("covers Text.style: heading-1", () => {
    expect(SEMANTIC_TOKENS.has("heading-1")).toBe(true);
  });

  it("covers Text.style: heading-2", () => {
    expect(SEMANTIC_TOKENS.has("heading-2")).toBe(true);
  });

  it("covers Text.style: body", () => {
    expect(SEMANTIC_TOKENS.has("body")).toBe(true);
  });

  it("covers Text.style: caption", () => {
    expect(SEMANTIC_TOKENS.has("caption")).toBe(true);
  });

  it("covers size/gap tokens: sm", () => {
    expect(SEMANTIC_TOKENS.has("sm")).toBe(true);
  });

  it("covers size/gap tokens: md", () => {
    expect(SEMANTIC_TOKENS.has("md")).toBe(true);
  });

  it("covers size/gap tokens: lg", () => {
    expect(SEMANTIC_TOKENS.has("lg")).toBe(true);
  });

  it("covers Button.variant: secondary", () => {
    expect(SEMANTIC_TOKENS.has("secondary")).toBe(true);
  });

  it("covers Button.variant: text", () => {
    expect(SEMANTIC_TOKENS.has("text")).toBe(true);
  });

  it("covers Column/Row.align: start", () => {
    expect(SEMANTIC_TOKENS.has("start")).toBe(true);
  });

  it("covers Column/Row.align: center", () => {
    expect(SEMANTIC_TOKENS.has("center")).toBe(true);
  });

  it("covers Column/Row.align: end", () => {
    expect(SEMANTIC_TOKENS.has("end")).toBe(true);
  });

  it("covers NavEdge.transition: push", () => {
    expect(SEMANTIC_TOKENS.has("push")).toBe(true);
  });

  it("covers NavEdge.transition: modal", () => {
    expect(SEMANTIC_TOKENS.has("modal")).toBe(true);
  });

  it("covers NavEdge.transition: sheet", () => {
    expect(SEMANTIC_TOKENS.has("sheet")).toBe(true);
  });

  it("covers NavEdge.transition: replace", () => {
    expect(SEMANTIC_TOKENS.has("replace")).toBe(true);
  });

  it("covers NavEdge.transition: none", () => {
    expect(SEMANTIC_TOKENS.has("none")).toBe(true);
  });

  it("covers Screen.kind: regular", () => {
    expect(SEMANTIC_TOKENS.has("regular")).toBe(true);
  });

  it("covers Screen.kind: overlay", () => {
    expect(SEMANTIC_TOKENS.has("overlay")).toBe(true);
  });

  it("covers BackBehavior: pop", () => {
    expect(SEMANTIC_TOKENS.has("pop")).toBe(true);
  });

  it("covers BackBehavior: dismiss", () => {
    expect(SEMANTIC_TOKENS.has("dismiss")).toBe(true);
  });

  it("rejects pixel values like 42px", () => {
    expect(SEMANTIC_TOKENS.has("42px")).toBe(false);
  });

  it("rejects arbitrary strings", () => {
    expect(SEMANTIC_TOKENS.has("xyz-unknown")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(SEMANTIC_TOKENS.has("")).toBe(false);
  });
});

describe("token-budget helpers", () => {
  it("countTokens returns a positive integer for a non-empty string", () => {
    const n = countTokens("hello world");
    expect(n).toBeGreaterThan(0);
    expect(Number.isInteger(n)).toBe(true);
  });

  it("countTokens returns 0 for an empty string", () => {
    expect(countTokens("")).toBe(0);
  });

  it("isWithinBudget returns true for a short string under 2000", () => {
    expect(isWithinBudget("hello", 2000)).toBe(true);
  });

  it("isWithinBudget returns false for a very long string over 2000 tokens", () => {
    expect(isWithinBudget("x ".repeat(10000), 2000)).toBe(false);
  });

  it("isWithinBudget returns true for exactly limit tokens (edge case)", () => {
    // "a" is 1 token; 5 tokens is well within 2000
    expect(isWithinBudget("a a a a a", 2000)).toBe(true);
  });
});
