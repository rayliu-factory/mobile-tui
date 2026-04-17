// tests/helpers/parse-fixture.ts
// Phase-1-only fixture reader. NOT the production parser.
//
// Phase 2 will replace this with gray-matter + eemeli/yaml. Today we
// refuse to import a YAML library (js-yaml banned; eemeli/yaml is
// Phase 2's dep). Callers author fixtures as `.spec.md` for human
// review AND `.spec.json` for Phase 1 test consumption. Plan 08 ships
// both; Phase 2 drops the JSON siblings.
//
// Resolution order:
//   1. If `<base>.spec.json` exists → readFile + JSON.parse
//   2. Else if `<base>.spec.ts` exists → dynamic import default export
//   3. Else throw with a pointer at Phase 2 as the fix
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, extname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export async function readFixture(fixturePath: string): Promise<unknown> {
  const abs = resolve(process.cwd(), fixturePath);
  const dir = dirname(abs);
  const base = basename(abs, extname(abs)).replace(/\.spec$/, "");

  const jsonSibling = resolve(dir, `${base}.spec.json`);
  if (existsSync(jsonSibling)) {
    const raw = readFileSync(jsonSibling, "utf8");
    return JSON.parse(raw);
  }

  const tsSibling = resolve(dir, `${base}.spec.ts`);
  if (existsSync(tsSibling)) {
    const mod = (await import(pathToFileURL(tsSibling).href)) as { default: unknown };
    return mod.default;
  }

  throw new Error(
    `No Phase-1-readable sibling for "${fixturePath}". ` +
      `Expected "${base}.spec.json" or "${base}.spec.ts" next to the .md file. ` +
      `Phase 2 will replace this helper with a real Markdown+YAML parser.`,
  );
}
