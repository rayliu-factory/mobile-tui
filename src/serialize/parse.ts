// src/serialize/parse.ts
// `parseSpecFile(path)` — Phase-2 public read entry point.
//
// GUARANTEES (Plan 02-02 implements, Plan 02-05 swaps the temporary
// stub for the real gray-matter + eemeli/yaml pipeline):
//   - NEVER throws on schema-error inputs; only on ENOENT / EACCES /
//     YAML syntax errors from eemeli/yaml.
//   - Returns { spec, astHandle, diagnostics, body }.
//
// THREAT T-02-Input MITIGATION (Plan 02-02): reject paths ending in ".tmp"
// (RESEARCH Open Q#4).
//
// RELATED: frontmatter.ts, unknown.ts, sigil.ts, atomic.ts (orphan-tmp
//          detection), ../model/invariants.ts (validateSpec).
//
// ────────────────────────────────────────────────────────────────────
// WAVE-0 STUB BODY
// ────────────────────────────────────────────────────────────────────
// This module's current implementation reads the `.spec.json` sibling
// produced by Phase-1's fixture convention (see STATE.md decision
// "[01-01] Fixture parse helper uses .spec.json / .spec.ts sibling
// strategy"). That lets the four Phase-1 integration tests
// (tests/fixtures.test.ts, tests/malformed.test.ts,
// tests/catalog-coverage.test.ts, tests/fidelity.test.ts) migrate off
// tests/helpers/parse-fixture.ts TODAY while the real parser is built
// in Plan 02-02. Plan 02-05, Task 4 swaps this body for a call into
// the real pipeline and deletes the `.spec.json` siblings.
//
// Contract IS stable: { spec, astHandle, diagnostics, body }. Only the
// internals change.
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, extname, resolve } from "node:path";
import type { Spec } from "../model/index.ts";
import { validateSpec } from "../model/index.ts";
import type { AstHandle } from "./ast-handle.ts";
import type { Diagnostic } from "./diagnostics.ts";

export interface ParseResult {
  spec: Spec | null;
  astHandle: AstHandle | null;
  diagnostics: Diagnostic[];
  body: string;
}

/**
 * WAVE-0 STUB: reads `.spec.md`'s `.spec.json` sibling (Phase-1 convention).
 * Plan 02-02 replaces the internals with gray-matter + eemeli/yaml + unknown
 * partition + sigil normalization. Plan 02-05 deletes the `.spec.json`
 * siblings AND this fallback branch simultaneously.
 */
export async function parseSpecFile(path: string): Promise<ParseResult> {
  const abs = resolve(path);
  const dir = dirname(abs);
  const base = basename(abs, extname(abs)).replace(/\.spec$/, "");
  const jsonSibling = resolve(dir, `${base}.spec.json`);

  if (!existsSync(jsonSibling)) {
    throw new Error(
      `parseSpecFile WAVE-0 stub expects ${jsonSibling} sibling. ` +
        `Plan 02-02 lands the real gray-matter + eemeli/yaml parser; ` +
        `Plan 02-05 deletes this fallback.`,
    );
  }

  const raw = readFileSync(jsonSibling, "utf8");
  const input: unknown = JSON.parse(raw);
  const { spec, diagnostics } = validateSpec(input);

  return {
    spec,
    astHandle: null, // no AST until the real parser lands in Plan 02-02
    diagnostics,
    body: "",
  };
}
