// tests/handoff/prompt-screen.test.ts
// Smoke tests for assemblePrompt covering all three targets and fixture files.
// Also tests runPromptScreen runner (HANDOFF-02).
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { assemblePrompt } from "../../src/emit/handoff/assembler.ts";
import { isWithinBudget } from "../../src/emit/handoff/token-budget.ts";
import { runPromptScreen } from "../../src/editor/commands/prompt-screen.ts";
import { parseSpecFile } from "../../src/serialize/index.ts";
import type { Spec } from "../../src/model/index.ts";

async function loadFixture(name: string): Promise<Spec> {
  const r = await parseSpecFile(resolve(`fixtures/${name}.spec.md`));
  if (!r.spec) throw new Error(`fixture ${name} failed to parse`);
  return r.spec;
}

describe("assemblePrompt — token budget (HANDOFF-02)", () => {
  it("all screens in habit-tracker under 2000 tokens for swiftui", async () => {
    const spec = await loadFixture("habit-tracker");
    for (const screen of spec.screens) {
      const prompt = assemblePrompt(spec, screen.id, "swiftui");
      expect(isWithinBudget(prompt, 2000), `screen ${screen.id} over budget`).toBe(true);
    }
  });

  it("all screens in habit-tracker under 2000 tokens for compose", async () => {
    const spec = await loadFixture("habit-tracker");
    for (const screen of spec.screens) {
      const prompt = assemblePrompt(spec, screen.id, "compose");
      expect(isWithinBudget(prompt, 2000), `screen ${screen.id} over budget`).toBe(true);
    }
  });

  it("all screens in habit-tracker under 2000 tokens for tests", async () => {
    const spec = await loadFixture("habit-tracker");
    for (const screen of spec.screens) {
      const prompt = assemblePrompt(spec, screen.id, "tests");
      expect(isWithinBudget(prompt, 2000), `screen ${screen.id} over budget`).toBe(true);
    }
  });
});

describe("runPromptScreen runner (HANDOFF-02)", () => {
  it("emits prompt under 2000 tokens for swiftui", async () => {
    const spec = await loadFixture("habit-tracker");
    const firstScreenId = spec.screens[0]!.id;
    const result = await runPromptScreen(spec, firstScreenId, "swiftui");
    expect(result.ok).toBe(true);
    expect(result.prompt).toBeDefined();
    expect(isWithinBudget(result.prompt!, 2000)).toBe(true);
  });

  it("tests target includes ## Actions & TestIDs", async () => {
    const spec = await loadFixture("habit-tracker");
    const firstScreenId = spec.screens[0]!.id;
    const result = await runPromptScreen(spec, firstScreenId, "tests");
    expect(result.ok).toBe(true);
    expect(result.prompt).toContain("## Actions & TestIDs");
  });

  it("swiftui does not include ## Actions & TestIDs", async () => {
    const spec = await loadFixture("habit-tracker");
    const firstScreenId = spec.screens[0]!.id;
    const result = await runPromptScreen(spec, firstScreenId, "swiftui");
    expect(result.ok).toBe(true);
    expect(result.prompt).not.toContain("## Actions & TestIDs");
  });

  it("returns error for unknown screenId", async () => {
    const spec = await loadFixture("habit-tracker");
    const result = await runPromptScreen(spec, "nonexistent_screen_xyz", "swiftui");
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Prompt failed/);
  });
});
