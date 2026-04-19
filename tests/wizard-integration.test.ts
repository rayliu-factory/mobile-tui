// tests/wizard-integration.test.ts — WIZARD-02, WIZARD-03, WIZARD-04 end-to-end
// Full integration: new file → seed spec → WizardRoot renders. Uses tmp-copy pattern.
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import YAML from "yaml";
import { createStore } from "../src/editor/store.ts";
import { parseSpecFile } from "../src/serialize/index.ts";
import { WizardRoot } from "../src/wizard/root.ts";
import { createSeedSpec } from "../src/wizard/seed-spec.ts";
import { firstUnansweredStep } from "../src/wizard/steps/index.ts";

const TMP_DIR = resolve(process.cwd(), "tests", "tmp");

describe("wizard integration (WIZARD-02, WIZARD-03, WIZARD-04)", { timeout: 15000 }, () => {
  let tmpPath: string;

  beforeEach(async () => {
    await fs.mkdir(TMP_DIR, { recursive: true });
    tmpPath = resolve(TMP_DIR, `wizard-${randomUUID()}.spec.md`);
  });

  afterEach(async () => {
    try {
      await fs.unlink(tmpPath);
    } catch {
      /* ignore */
    }
  });

  it("new file → createSeedSpec → parseSpecFile → WizardRoot renders without throw", async () => {
    // Write seed spec to tmp file
    const seedSpec = createSeedSpec();
    const seedYaml = `---\n${YAML.stringify(seedSpec)}---\n`;
    await fs.writeFile(tmpPath, seedYaml, "utf-8");

    const parseResult = await parseSpecFile(tmpPath);
    expect(parseResult.spec).toBeTruthy();

    const store = createStore({
      spec: parseResult.spec!,
      astHandle: parseResult.astHandle!,
      filePath: tmpPath,
    });

    const mockTheme = { fg: (_token: string, s: string) => s };
    const root = new WizardRoot(store, { theme: mockTheme });

    const lines = root.render(80);
    expect(lines.length).toBeGreaterThan(0);
  });

  it("re-opening spec after partial completion resumes at first unanswered step (D-96)", async () => {
    // Write a seed spec with app_idea filled in but nothing else
    const seedSpec = createSeedSpec();
    // Manually set app_idea on the spec (as store.apply would do)
    const partialSpec = { ...seedSpec, app_idea: "My Task App" };
    const seedYaml = `---\n${YAML.stringify(partialSpec)}---\n`;
    await fs.writeFile(tmpPath, seedYaml, "utf-8");

    const parseResult = await parseSpecFile(tmpPath);
    expect(parseResult.spec).toBeTruthy();

    // firstUnansweredStep should return 1 (primary_user not answered)
    const step = firstUnansweredStep(parseResult.spec!);
    expect(step).toBe(1);

    const store = createStore({
      spec: parseResult.spec!,
      astHandle: parseResult.astHandle!,
      filePath: tmpPath,
    });

    const mockTheme = { fg: (_token: string, s: string) => s };
    const root = new WizardRoot(store, { theme: mockTheme });

    // WizardRoot initializes stepCursor from firstUnansweredStep
    expect(root.getStepCursor()).toBe(1);
  });
});
