// scripts/render-wireframe.ts
// CLI: npx tsx scripts/render-wireframe.ts <spec-path> <screen-id> [variant]
// With 3rd arg: render only that variant (content|empty|loading|error).
// Without 3rd arg: render all 4 variants stacked.
//
// Exit codes (RESEARCH Open Q 3 recommendation):
//   0 — render succeeded (may include [BROKEN LINK] markers on Stage-B errors)
//   1 — spec is null (Stage-A fatal or missing frontmatter); diagnostics to stderr
//   2 — usage error (missing argv or invalid variant)
//
// `[BROKEN LINK]` markers injected inline when parseSpecFile returns
// Stage-B error diagnostics; renderer never throws except on unknown screenId.
import { render, renderSingleVariant } from "../src/emit/wireframe/index.ts";
import { parseSpecFile } from "../src/serialize/index.ts";

const VARIANT_KINDS = ["content", "empty", "loading", "error"] as const;
type VariantKind = (typeof VARIANT_KINDS)[number];

function isVariantKind(v: string): v is VariantKind {
  return (VARIANT_KINDS as readonly string[]).includes(v);
}

async function main(): Promise<void> {
  const [specPath, screenId, maybeVariant] = process.argv.slice(2);
  if (!specPath || !screenId) {
    process.stderr.write(
      "usage: render-wireframe <spec-path> <screen-id> [content|empty|loading|error]\n",
    );
    process.exit(2);
  }
  if (maybeVariant !== undefined && !isVariantKind(maybeVariant)) {
    process.stderr.write(
      `usage: invalid variant "${maybeVariant}"; must be one of ${VARIANT_KINDS.join(", ")}\n`,
    );
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
  const out = maybeVariant
    ? renderSingleVariant(result.spec, screenId, maybeVariant, {
        diagnostics: result.diagnostics,
      })
    : render(result.spec, screenId, { diagnostics: result.diagnostics });
  process.stdout.write(out);
}

main().catch((err) => {
  process.stderr.write(`error: ${(err as Error).message}\n`);
  process.exit(1);
});
