// tests/cli-edit.test.ts
// EDITOR-06: CLI integration test for scripts/cli-edit.ts.
//
// NOVEL PATTERN: This is the first spawn-based CLI integration test in the repo.
// Prior tests are pure-function unit tests or in-process integration tests.
// Here we use `node:child_process.spawn` (stdlib, no new dep) to exercise
// cli-edit as a subprocess. This validates the full exit-code matrix (D-68)
// and confirms the diagnostic stderr format from end to end.
//
// NOTE: spawn-based tests are slower (~1-2s per test due to tsx startup).
// Timeout is set to 30000ms for the entire describe block.
//
// SECURITY NOTE: Tests use tmp files (tests/tmp/<uuid>.spec.md) so the
// fixture is never mutated. afterEach deletes the tmp file.
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const FIXTURE_PATH = resolve(process.cwd(), "fixtures", "habit-tracker.spec.md");
const TMP_DIR = resolve(process.cwd(), "tests", "tmp");

function runCli(args: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    const child = spawn("npx", ["tsx", "scripts/cli-edit.ts", ...args], {
      env: { ...process.env },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d: Buffer) => (stdout += d.toString()));
    child.stderr.on("data", (d: Buffer) => (stderr += d.toString()));
    child.on("exit", (code: number | null) => resolve({ stdout, stderr, code: code ?? 0 }));
  });
}

describe("EDITOR-06: cli-edit exit codes (D-68)", { timeout: 30000 }, () => {
  let tmpPath: string;

  beforeEach(async () => {
    await fs.mkdir(TMP_DIR, { recursive: true });
    tmpPath = resolve(TMP_DIR, `cli-${randomUUID()}.spec.md`);
    await fs.copyFile(FIXTURE_PATH, tmpPath);
  });

  afterEach(async () => {
    try {
      await fs.unlink(tmpPath);
    } catch {
      // Ignore if file already gone (e.g., never written)
    }
  });

  it("exit 0 on happy path add-screen with back_behavior", async () => {
    const r = await runCli([
      tmpPath,
      "add-screen",
      "--id",
      "settings_screen",
      "--title",
      "Settings",
      "--kind",
      "regular",
      "--back_behavior",
      "pop",
    ]);
    expect(r.code).toBe(0);
    expect(r.stdout).toMatch(/applied add-screen → wrote/);
  });

  it("exit 1 on unknown command", async () => {
    const r = await runCli([tmpPath, "bogus-command"]);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain("EDITOR_COMMAND_NOT_FOUND");
  });

  it("exit 1 on missing spec file", async () => {
    const r = await runCli(["nonexistent.spec.md", "add-screen", "--id", "x"]);
    expect(r.code).toBe(1);
  });

  it("exit 1 on arg parse failure (invalid id with spaces)", async () => {
    const r = await runCli([
      tmpPath,
      "add-screen",
      "--id",
      "INVALID ID WITH SPACES",
      "--title",
      "T",
      "--kind",
      "regular",
    ]);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain("EDITOR_COMMAND_ARG_INVALID");
  });

  it("exit 2 on save-gate (add non-root screen without back_behavior)", async () => {
    // Adding a non-root screen without back_behavior triggers validateSpec
    // severity:error → writeSpecFile returns { written: false } → exit 2 (D-68).
    const r = await runCli([
      tmpPath,
      "add-screen",
      "--id",
      "no_back_screen",
      "--title",
      "No Back",
      "--kind",
      "regular",
      // Intentionally omit --back_behavior to trigger save-gate
    ]);
    expect(r.code).toBe(2);
  });

  it("stdout is terse on success: exactly 'applied <command> → wrote <path>'", async () => {
    const r = await runCli([
      tmpPath,
      "add-screen",
      "--id",
      "terse_screen",
      "--title",
      "Terse",
      "--kind",
      "regular",
      "--back_behavior",
      "pop",
    ]);
    expect(r.code).toBe(0);
    // stdout must be exactly one line: "applied <command> → wrote <path>\n"
    expect(r.stdout.trim()).toBe(`applied add-screen → wrote ${tmpPath}`);
  });

  it("stderr format D-68: diagnostics match <severity> <path>: <message>", async () => {
    // The save-gate path (exit 2) writes validateSpec diagnostics to stderr
    // using the D-68 format: `${d.severity} ${d.path}: ${d.message}`.
    // d.severity is "error"|"warning"|"info" (from Diagnostic factory).
    // This tests the Diagnostic format emitted via the store.apply diagnostics path.
    const r = await runCli([
      tmpPath,
      "add-screen",
      "--id",
      "no_back_screen2",
      "--title",
      "No Back",
      "--kind",
      "regular",
      // Intentionally omit --back_behavior to trigger save-gate diagnostics
    ]);
    expect(r.code).toBe(2);
    // At least one line in stderr must match D-68 format: `<severity> <path>: <message>`
    // where severity is one of the Diagnostic factory values: error|warning|info
    const lines = r.stderr.split("\n").filter((l) => l.trim().length > 0);
    const hasFormatted = lines.some((l) => /^(error|warning|info) [^:]+: .+$/.test(l));
    expect(hasFormatted).toBe(true);
  });
});
