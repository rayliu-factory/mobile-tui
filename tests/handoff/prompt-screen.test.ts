// tests/handoff/prompt-screen.test.ts
// Smoke tests for assemblePrompt covering all three targets and fixture files.
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { assemblePrompt } from "../../src/emit/handoff/assembler.ts";
import { isWithinBudget } from "../../src/emit/handoff/token-budget.ts";
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
