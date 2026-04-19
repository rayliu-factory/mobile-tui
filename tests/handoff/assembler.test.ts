// tests/handoff/assembler.test.ts
// RED phase: tests for assemblePrompt pure function (HANDOFF-02, D-203).
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { assemblePrompt } from "../../src/emit/handoff/assembler.ts";
import { SEMANTIC_TOKENS } from "../../src/emit/handoff/semantic-tokens.ts";
import { isWithinBudget } from "../../src/emit/handoff/token-budget.ts";
import { parseSpecFile } from "../../src/serialize/index.ts";
import type { Spec } from "../../src/model/index.ts";

async function loadFixture(name: string): Promise<Spec> {
  const r = await parseSpecFile(resolve(`fixtures/${name}.spec.md`));
  if (!r.spec) throw new Error(`fixture ${name} failed to parse`);
  return r.spec;
}

describe("assemblePrompt — pure function (HANDOFF-02)", () => {
  it("returns identical strings on two calls with same input (determinism)", async () => {
    const spec = await loadFixture("habit-tracker");
    const a = assemblePrompt(spec, "home", "swiftui");
    const b = assemblePrompt(spec, "home", "swiftui");
    expect(a).toBe(b);
  });

  it("returns prompt within 2000 token budget for habit-tracker/home", async () => {
    const spec = await loadFixture("habit-tracker");
    const prompt = assemblePrompt(spec, "home", "swiftui");
    expect(isWithinBudget(prompt, 2000)).toBe(true);
  });

  it("returns prompt within 2000 token budget for habit-tracker/new_habit", async () => {
    const spec = await loadFixture("habit-tracker");
    const prompt = assemblePrompt(spec, "new_habit", "swiftui");
    expect(isWithinBudget(prompt, 2000)).toBe(true);
  });

  it("section order: Task before Screen Spec before Acceptance Criteria before Navigation Neighbors before Data Entities", async () => {
    const spec = await loadFixture("habit-tracker");
    const prompt = assemblePrompt(spec, "home", "swiftui");
    const taskPos = prompt.indexOf("## Task");
    const specPos = prompt.indexOf("## Screen Spec");
    const acceptPos = prompt.indexOf("## Acceptance Criteria");
    const navPos = prompt.indexOf("## Navigation Neighbors");
    const dataPos = prompt.indexOf("## Data Entities");
    expect(taskPos).toBeGreaterThanOrEqual(0);
    expect(specPos).toBeGreaterThan(taskPos);
    expect(acceptPos).toBeGreaterThan(specPos);
    expect(navPos).toBeGreaterThan(acceptPos);
    expect(dataPos).toBeGreaterThan(navPos);
  });

  it("tests target contains ## Actions & TestIDs section", async () => {
    const spec = await loadFixture("habit-tracker");
    const prompt = assemblePrompt(spec, "home", "tests");
    expect(prompt).toContain("## Actions & TestIDs");
  });

  it("swiftui target does NOT contain ## Actions & TestIDs section", async () => {
    const spec = await loadFixture("habit-tracker");
    const prompt = assemblePrompt(spec, "home", "swiftui");
    expect(prompt).not.toContain("## Actions & TestIDs");
  });

  it("compose target does NOT contain ## Actions & TestIDs section", async () => {
    const spec = await loadFixture("habit-tracker");
    const prompt = assemblePrompt(spec, "home", "compose");
    expect(prompt).not.toContain("## Actions & TestIDs");
  });

  it("output contains <!-- spec-props: string", async () => {
    const spec = await loadFixture("habit-tracker");
    const prompt = assemblePrompt(spec, "home", "swiftui");
    expect(prompt).toContain("<!-- spec-props:");
  });

  it("all prop values in spec-props comment are semantic tokens", async () => {
    const spec = await loadFixture("habit-tracker");
    const prompt = assemblePrompt(spec, "home", "swiftui");
    const match = prompt.match(/<!-- spec-props: ({.*?}) -->/s);
    if (!match) throw new Error("spec-props comment not found in prompt");
    const propMap = JSON.parse(match[1]!) as Record<string, string>;
    for (const [prop, value] of Object.entries(propMap)) {
      expect(SEMANTIC_TOKENS.has(value), `${prop}: "${value}" is not a semantic token`).toBe(true);
    }
  });

  it("output contains no pixel values (no px/pt/dp/rem/#hex)", async () => {
    const spec = await loadFixture("habit-tracker");
    const prompt = assemblePrompt(spec, "home", "swiftui");
    expect(prompt).not.toMatch(/[0-9]+(?:px|pt|dp|rem|#[0-9a-fA-F]{3,6})/);
  });

  it("screen spec section is present even in degraded mode", async () => {
    const spec = await loadFixture("habit-tracker");
    // Both full and degraded paths must emit ## Screen Spec
    const prompt = assemblePrompt(spec, "home", "swiftui");
    expect(prompt).toContain("## Screen Spec");
  });

  it("acceptance criteria section is present", async () => {
    const spec = await loadFixture("habit-tracker");
    const prompt = assemblePrompt(spec, "home", "swiftui");
    expect(prompt).toContain("## Acceptance Criteria");
  });

  it("throws if screenId not found in spec", async () => {
    const spec = await loadFixture("habit-tracker");
    expect(() => assemblePrompt(spec, "nonexistent_screen_xyz", "swiftui")).toThrow(
      /nonexistent_screen_xyz/,
    );
  });

  it("swiftui preamble contains SwiftUI", async () => {
    const spec = await loadFixture("habit-tracker");
    const prompt = assemblePrompt(spec, "home", "swiftui");
    expect(prompt).toContain("SwiftUI");
  });

  it("compose preamble contains Jetpack Compose", async () => {
    const spec = await loadFixture("habit-tracker");
    const prompt = assemblePrompt(spec, "home", "compose");
    expect(prompt).toContain("Jetpack Compose");
  });

  it("tests preamble contains Maestro", async () => {
    const spec = await loadFixture("habit-tracker");
    const prompt = assemblePrompt(spec, "home", "tests");
    expect(prompt).toContain("Maestro");
  });
});

describe("assemblePrompt — degradation behavior (D-201)", () => {
  it("screen spec section is NEVER omitted regardless of neighbors", async () => {
    const spec = await loadFixture("habit-tracker");
    for (const screen of spec.screens) {
      const prompt = assemblePrompt(spec, screen.id, "swiftui");
      expect(prompt).toContain("## Screen Spec");
    }
  });
});
