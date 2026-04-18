// scripts/render-wireframe.ts
// CLI: npx tsx scripts/render-wireframe.ts <spec-path> <screen-id>
// Emits fixed-60-col ASCII wireframe for the named screen to stdout.
//
// Exit codes (RESEARCH Open Q 3 recommendation):
//   0 — render succeeded (may include [BROKEN LINK] markers on Stage-B errors)
//   1 — spec is null (Stage-A fatal or missing frontmatter); diagnostics to stderr
//   2 — usage error (missing argv)
//
// `[BROKEN LINK]` markers injected inline when parseSpecFile returns
// Stage-B error diagnostics; renderer never throws except on unknown screenId.
import { render } from "../src/emit/wireframe/index.ts";
import { parseSpecFile } from "../src/serialize/index.ts";

async function main(): Promise<void> {
  const [specPath, screenId] = process.argv.slice(2);
  if (!specPath || !screenId) {
    process.stderr.write("usage: render-wireframe <spec-path> <screen-id>\n");
    process.exit(2);
  }
  const result = await parseSpecFile(specPath);
  if (!result.spec) {
    process.stderr.write(
      `parse failed:\n${result.diagnostics
        .map((d) => `  ${d.code} @ ${d.path}: ${d.message}`)
        .join("\n")}\n`,
    );
    process.exit(1);
  }
  const out = render(result.spec, screenId, { diagnostics: result.diagnostics });
  process.stdout.write(out);
}

main().catch((err) => {
  process.stderr.write(`error: ${(err as Error).message}\n`);
  process.exit(1);
});
