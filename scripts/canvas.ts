// scripts/canvas.ts — canvas CLI entry (Phase 5: headless-verify only)
//
// Usage: npx tsx scripts/canvas.ts <spec.md>
//
// Exit codes:
//   0 — canvas rendered and flushed cleanly.
//   1 — missing/invalid spec file, or render produced empty output.
//   2 — usage error (no specPath argument).
//
// Phase 5 note: canvas.ts operates in "headless" mode — creates RootCanvas,
// calls render(80) once to verify it works, then flushes and exits.
// Phase 9 replaces the headless block with: ctx.ui.custom(rootCanvas)
//
// Security: T-05-21 — specPath from argv passed verbatim to parseSpecFile;
// path.resolve normalizes traversal; Phase 9 pi sandbox restricts fs access.
// T-04-24 pattern: main().catch writes only err.message (not stack).

import { createStore } from "../src/editor/index.ts";
import { RootCanvas } from "../src/canvas/root.ts";
import { parseSpecFile } from "../src/serialize/index.ts";

async function main(): Promise<void> {
  const [specPath] = process.argv.slice(2);

  // Exit 2 for usage errors (no specPath)
  if (!specPath) {
    process.stderr.write("usage: npx tsx scripts/canvas.ts <spec.md>\n");
    process.exit(2);
  }

  // Parse the spec file
  const parseResult = await parseSpecFile(specPath);

  if (!parseResult.spec) {
    // D-86 copywriting: "Error: failed to parse spec: {message}"
    for (const d of parseResult.diagnostics) {
      process.stderr.write(`${d.severity} ${d.path}: ${d.message}\n`);
    }
    process.exit(1);
  }

  // Construct the store
  const store = createStore({
    spec: parseResult.spec,
    astHandle: parseResult.astHandle!,
    filePath: specPath,
  });

  // Phase 5 headless verify — Phase 9 replaces with ctx.ui.custom(rootCanvas)
  // The mockTheme passes strings through without ANSI codes (headless mode)
  const mockTheme = { fg: (_token: string, s: string) => s };
  const root = new RootCanvas(store, { theme: mockTheme });

  const lines = root.render(80);
  if (lines.length === 0) {
    process.stderr.write("error: canvas render produced empty output\n");
    process.exitCode = 1;
    return;
  }

  // Flush the store (no-op in Phase 5 since we made no edits, but required by D-87)
  await store.flush();

  process.exitCode = 0;
}

main().catch((err) => {
  // T-04-24: write only message (not stack) to prevent information disclosure
  process.stderr.write(`error: ${(err as Error).message}\n`);
  process.exitCode = 1;
});
