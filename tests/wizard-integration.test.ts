// tests/wizard-integration.test.ts — WIZARD-02, WIZARD-03, WIZARD-04 end-to-end
// Full integration: new file → 8 steps → graduation. Uses tmp-copy pattern.
// Skipped until WizardRoot + scripts/wizard.ts implemented in plan 06-06.
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, it } from "vitest";

const TMP_DIR = resolve(process.cwd(), "tests", "tmp");

describe("wizard integration (WIZARD-02, WIZARD-03, WIZARD-04)", () => {
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

  it.skip("new file → createSeedSpec → parseSpecFile → WizardRoot renders without throw", async () => {});
  it.skip("advancing through all 8 steps → graduation → RootCanvas renders without throw", async () => {});
  it.skip("re-opening spec after partial completion resumes at first unanswered step (D-96)", async () => {});
  it.skip("re-entry: completed step input is pre-populated from spec (D-97)", async () => {});
});
