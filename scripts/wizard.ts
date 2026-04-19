// scripts/wizard.ts — wizard CLI entry (Phase 6: headless-verify only)
//
// Usage: npx tsx scripts/wizard.ts <spec.md>
//
// Exit codes:
//   0 — wizard rendered and flushed cleanly.
//   1 — parse/render error.
//   2 — usage error (no specPath argument).
//
// Phase 6 note: wizard.ts operates in "headless" mode — creates WizardRoot,
// calls render(80) once to verify it works, then flushes and exits.
// Phase 9 replaces the headless block with: ctx.ui.custom(wizardRoot)
//
// D-104: If spec file does not exist, create a seed spec first.
//
// Security: T-06-14 — path.resolve(specPath) normalizes traversal;
// Phase 9 pi sandbox restricts fs access (T-05-21 pattern).
// T-04-24 pattern: main().catch writes only err.message (not stack).

import path from "node:path";
import { promises as fs } from "node:fs";
import YAML from "yaml";
import { createStore } from "../src/editor/index.ts";
import { RootCanvas } from "../src/canvas/root.ts";
import { parseSpecFile } from "../src/serialize/index.ts";
import { WizardRoot } from "../src/wizard/root.ts";
import { createSeedSpec } from "../src/wizard/seed-spec.ts";

async function main(): Promise<void> {
  const [specPath] = process.argv.slice(2);

  // Exit 2 for usage errors (no specPath)
  if (!specPath) {
    process.stderr.write("usage: npx tsx scripts/wizard.ts <spec.md>\n");
    process.exit(2);
  }

  const resolvedPath = path.resolve(specPath);

  // D-104: if file does not exist, create a new empty spec (T-06-16: seed, not user content)
  try {
    await fs.access(resolvedPath);
  } catch {
    // File does not exist — write seed spec
    const seedSpec = createSeedSpec();
    const seedYaml = `---\n${YAML.stringify(seedSpec)}---\n\n`;
    await fs.writeFile(resolvedPath, seedYaml, "utf-8");
  }

  // Parse the spec file
  const parseResult = await parseSpecFile(resolvedPath);

  if (!parseResult.spec) {
    for (const d of parseResult.diagnostics) {
      process.stderr.write(`${d.severity} ${d.path}: ${d.message}\n`);
    }
    process.exit(1);
  }

  // Construct the store
  const store = createStore({
    spec: parseResult.spec,
    astHandle: parseResult.astHandle!,
    filePath: resolvedPath,
  });

  // Phase 6 headless verify — Phase 9 replaces with ctx.ui.custom(wizardRoot)
  // The mockTheme passes strings through without ANSI codes (headless mode)
  const mockTheme = { fg: (_token: string, s: string) => s };
  const wizardRoot = new WizardRoot(store, { theme: mockTheme });

  // D-100, D-101: graduation callback — swap root component, store unchanged
  wizardRoot.onGraduate = () => {
    const canvasRoot = new RootCanvas(store, { theme: mockTheme });
    canvasRoot.onQuit = async () => {
      await store.flush();
    };
    // Phase 9: ctx.ui.custom(canvasRoot) — headless: render once
    const canvasLines = canvasRoot.render(80);
    process.stdout.write(canvasLines.join("\n") + "\n");
  };

  wizardRoot.onQuit = async () => {
    await store.flush();
  };

  // Phase 6 headless verify — render once to confirm no throw
  const lines = wizardRoot.render(80);
  if (lines.length === 0) {
    process.stderr.write("error: wizard render produced empty output\n");
    process.exitCode = 1;
    return;
  }

  // Flush the store (no-op since we made no edits, but required by D-87)
  await store.flush();

  process.exitCode = 0;
}

main().catch((err) => {
  // T-04-24: write only message (not stack) to prevent information disclosure
  process.stderr.write(`error: ${(err as Error).message}\n`);
  process.exitCode = 1;
});
