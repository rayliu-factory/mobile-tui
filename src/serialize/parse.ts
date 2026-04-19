// src/serialize/parse.ts
// `parseSpecFile(path)` — Phase-2 public read entry point.
//
// GUARANTEES:
//   - NEVER throws on schema-error inputs; every error path returns
//     Diagnostic[]. Exceptions ONLY for:
//       * ENOENT / EACCES from fs.readFile
//       * YAML.parseDocument syntax errors (unrecoverable)
//       * .tmp-suffixed input path (authoring mistake, Open Q#4)
//   - Returns { spec, astHandle, diagnostics, body }.
//   - spec is null iff Stage A (validateSpec) fails OR the file had no
//     frontmatter delimiters at all.
//
// PIPELINE (matches RESEARCH §Architecture Patterns data-flow on PARSE):
//   1. Reject .tmp paths (authoring mistake, not IO)
//   2. Read file bytes
//   3. splitFrontmatter → ParsedFrontmatter (incl. hasFrontmatter +
//      closingDelimiterTerminator per Plan 02 BLOCKER fixes #1+#2)
//   4. detectOrphanTmp → if present, push SPEC_ORPHAN_TEMP_FILE info
//   5. BLOCKER fix #2: if !parsed.hasFrontmatter → emit
//      SERDE_MISSING_DELIMITER error + short-circuit. Do NOT conflate
//      with parsed.isEmpty (empty map between delimiters is a VALID
//      fixture; only the complete-absence-of-delimiters case is an
//      error).
//   6. normalizeSigilsOnDoc(doc, sigilOrigins) — mutates AST to triple
//      form + records origin in WeakMap. MUST run BEFORE partitionTopLevel
//      so the knownSubset snapshot captures the triple-form label/action/
//      testID fields (sigil labels on interactables fail Phase-1's
//      printable-ASCII + SIGIL validators otherwise).
//   7. partitionTopLevel → { knownSubset, unknownKeys }
//      - For each unknown present in the imported ADVERSARIAL_KEYS set
//        (see unknown.ts for the authoritative names), emit
//        SPEC_UNKNOWN_TOP_LEVEL_KEY error (defense-in-depth Layer 2 on
//        top of Object.create(null) in partitionTopLevel; Layer 3 is
//        writeSpecFile's AST pre-gate).
//   8. YAML-1.1 gotcha lint pass: scan scalars with value matching
//      /^(yes|no|on|off|y|n|true|false)$/i that are PLAIN (unquoted) →
//      emit SERDE_YAML11_GOTCHA info (non-blocking)
//   8.5. runMigrations(knownSubset, fromVersion, toVersion) — SERDE-08:
//        migrate older schema versions before validateSpec rejects them.
//        On unknown-version throw: push SPEC_SCHEMA_VERSION diagnostic, continue.
//   9. validateSpec(knownSubset) — Phase-1 contract
//  10. Return { spec, astHandle, diagnostics, body: bodyBytes }
//
// THREAT T-02-ProtoPollution: step 6 flags adversarial prototype-vector
//   keys (see ADVERSARIAL_KEYS in unknown.ts) as error-severity so the
//   caller sees the signal. knownSubset never contains the adversarial
//   key (Object.create(null) in partitionTopLevel). writeSpecFile
//   (Plan 04) ALSO re-checks the AST directly — Layer 3.
//
// THREAT T-02-Input: step 1 rejects .tmp paths. steps 2/3 surface IO and
//   YAML syntax errors via throws (unrecoverable per Phase-1 contract).
//
// WARNING #5 — yaml is imported via ESM only. No CommonJS require of
// the yaml module, no TS-error suppression on the yaml import, no
// CommonJS fallback.
//
// RELATED: frontmatter.ts, unknown.ts (exports ADVERSARIAL_KEYS),
//          sigil.ts, atomic.ts (step 4), ../model/invariants.ts (step 9),
//          write.ts (Plan 04, Layer 3 adversarial-key AST pre-gate).
import { promises as fs } from "node:fs";
import { resolve } from "node:path";
import type { Document } from "yaml";
import YAML, { visit } from "yaml";
import { runMigrations, type SpecVersion } from "../migrations/index.ts";
import type { Spec } from "../model/index.ts";
import { validateSpec } from "../model/index.ts";
import type { JsonPointer } from "../primitives/path.ts";
import type { AstHandle } from "./ast-handle.ts";
import { detectOrphanTmp } from "./atomic.ts";
import { type Diagnostic, error, info } from "./diagnostics.ts";
import { splitFrontmatter } from "./frontmatter.ts";
import { createSigilOriginsMap, normalizeSigilsOnDoc } from "./sigil.ts";
import { ADVERSARIAL_KEYS, partitionTopLevel } from "./unknown.ts";

export interface ParseResult {
  spec: Spec | null;
  astHandle: AstHandle | null;
  diagnostics: Diagnostic[];
  body: string;
}

const YAML11_GOTCHA_RE = /^(yes|no|on|off|y|n|true|false)$/i;

export async function parseSpecFile(path: string): Promise<ParseResult> {
  // Step 1 — Reject .tmp paths (Open Q#4).
  if (path.endsWith(".tmp")) {
    throw new Error(
      `parseSpecFile: refusing to parse temp file ${path}. ` +
        `Pass the target path (e.g., habit-tracker.spec.md), not the .tmp sibling.`,
    );
  }

  const abs = resolve(path);

  // Step 2 — Read file.
  const raw = await fs.readFile(abs, "utf8");

  // Step 3 — splitFrontmatter.
  const parsed = splitFrontmatter(raw);

  const diagnostics: Diagnostic[] = [];

  // Step 4 — Orphan .tmp detection.
  const orphanTempPath = await detectOrphanTmp(abs);
  if (orphanTempPath) {
    diagnostics.push(
      info(
        "SPEC_ORPHAN_TEMP_FILE",
        "" as JsonPointer,
        `orphan temp file detected at ${orphanTempPath}; previous save may have failed mid-rename`,
      ),
    );
  }

  // Step 5 — BLOCKER fix #2: delimiters completely absent?
  //   Signal = !parsed.hasFrontmatter.
  //   NOTE: parsed.isEmpty means "map BETWEEN delimiters is empty" —
  //   that's a VALID fixture. Only !hasFrontmatter is the missing-
  //   delimiter error.
  if (!parsed.hasFrontmatter) {
    diagnostics.push(
      error(
        "SERDE_MISSING_DELIMITER",
        "" as JsonPointer,
        `file does not begin with YAML frontmatter delimiter`,
      ),
    );
    // Short-circuit: no spec to produce.
    return { spec: null, astHandle: null, diagnostics, body: "" };
  }

  // Step 6 — Sigil normalization. Runs BEFORE partition so knownSubset
  //   captures the triple-form label/action/testID fields; raw sigil
  //   labels fail Phase-1's printable-ASCII + SIGIL validators.
  const sigilOrigins = createSigilOriginsMap();
  normalizeSigilsOnDoc(parsed.doc, sigilOrigins);

  // Step 7 — Partition + adversarial-key flag.
  let partition = partitionTopLevel(parsed.doc);
  for (const key of partition.unknownKeys) {
    if (ADVERSARIAL_KEYS.has(key)) {
      diagnostics.push(
        error(
          "SPEC_UNKNOWN_TOP_LEVEL_KEY",
          `/${key}` as JsonPointer,
          `adversarial top-level key ${key} rejected (prototype pollution defense)`,
        ),
      );
    }
  }

  // Step 8 — YAML-1.1 gotcha lint (info, non-blocking).
  diagnostics.push(...yaml11GotchaLint(parsed.doc));

  // Step 8.5 — Run migrations before validation (SERDE-08).
  // Extract version suffix from schema value: "mobile-tui/1" → "1".
  // If schema is absent or not in "mobile-tui/N" format, skip migration
  // (validateSpec will produce the SPEC_SCHEMA_VERSION diagnostic).
  // If the migration chain has no path for this version, runMigrations
  // returns a diagnostic (never throws). Downgraded to warning for
  // parse-time — validateSpec below provides structural errors.
  const schemaValue =
    typeof partition.knownSubset.schema === "string" ? partition.knownSubset.schema : null;
  const versionMatch = schemaValue?.match(/^mobile-tui\/(\d+)$/);
  if (versionMatch) {
    const fromVersion = versionMatch[1] as SpecVersion;
    const toVersion: SpecVersion = "1";
    if (fromVersion !== toVersion) {
      const { result: migrated, diagnostic: migrationDiag } = runMigrations(
        partition.knownSubset,
        fromVersion,
        toVersion,
      );
      if (migrationDiag) {
        diagnostics.push({
          ...migrationDiag,
          // Downgrade to warning for parse-time — structural errors surfaced
          // by validateSpec below are more actionable.
          severity: "warning",
          path: "" as JsonPointer,
        });
      } else {
        partition = { ...partition, knownSubset: migrated as Record<string, unknown> };
      }
    }
  }

  // Step 9 — validateSpec on known subset.
  const { spec, diagnostics: validationDiagnostics } = validateSpec(partition.knownSubset);
  diagnostics.push(...validationDiagnostics);

  // Step 10 — Build AstHandle.
  const astHandle: AstHandle = {
    doc: parsed.doc,
    bodyBytes: parsed.bodyBytes,
    origBytes: parsed.origBytes,
    sigilOrigins,
    lineEndingStyle: parsed.lineEndingStyle,
    orphanTemp: orphanTempPath,
    frontmatterStart: parsed.frontmatterStart,
    frontmatterEnd: parsed.frontmatterEnd,
    closingDelimiterTerminator: parsed.closingDelimiterTerminator,
    hasFrontmatter: parsed.hasFrontmatter,
  };

  return {
    spec,
    astHandle: spec ? astHandle : null,
    diagnostics,
    body: parsed.bodyBytes,
  };
}

/** Walk every scalar; flag plain/unquoted YAML-1.1-gotcha values.
 *  WARNING #5: uses ESM `visit` only — no require, no fallback. */
function yaml11GotchaLint(doc: Document): Diagnostic[] {
  const out: Diagnostic[] = [];
  visit(doc, {
    Scalar(_key, scalar) {
      if (
        typeof scalar.value === "string" &&
        YAML11_GOTCHA_RE.test(scalar.value) &&
        // Plain scalar = unquoted. Check via srcToken type.
        scalar.srcToken !== undefined &&
        (scalar.srcToken as { type: string }).type === "scalar"
      ) {
        out.push(
          info(
            "SERDE_YAML11_GOTCHA",
            "" as JsonPointer,
            `unquoted YAML-1.1 boolean-like scalar "${scalar.value}" — quote it or use an explicit boolean`,
          ),
        );
      }
    },
  });
  return out;
}

// Reference the default YAML import so tree-shakers + biome don't flag it
// as unused — some downstream callers import YAML via this module.
// (WARNING #5: preserves ESM-only import shape.)
export { YAML };
