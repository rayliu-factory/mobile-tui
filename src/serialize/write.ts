// src/serialize/write.ts
// `writeSpecFile(path, spec, astHandle)` — Phase-2 public save entry.
//
// GUARANTEES (D-31, SPEC-09):
//   - BLOCKER fix #3 — ADVERSARIAL-KEY AST pre-gate: if astHandle.doc has
//     __proto__ / constructor / prototype at the top level, return
//     { written: false, diagnostics: [SPEC_UNKNOWN_TOP_LEVEL_KEY error] }
//     WITHOUT touching disk. Runs BEFORE validateSpec because
//     partitionTopLevel already stripped the adversarial key from
//     knownSubset — validateSpec would not see it. The AST still carries
//     it, and we MUST NOT write it to disk.
//   - D-31 save-gate: any severity:"error" diagnostic from validateSpec
//     returns { written: false, diagnostics } WITHOUT creating a .tmp file.
//     Warnings + info never block. NEVER throws on schema errors.
//   - D-29 single-shot atomic write. No debounce (Phase 4), no queue
//     (Phase 9). The signature (path, spec, astHandle) → Promise is
//     queue-wrappable by callers without modification.
//   - D-32: write is atomic per POSIX rename — target either contains old
//     bytes or full new bytes, never partial.
//
// PIPELINE (matches RESEARCH §Architecture Patterns data-flow on WRITE
// plus BLOCKER fixes):
//   0. [BLOCKER fix #3] AST adversarial-key pre-gate. If ADVERSARIAL_KEYS
//      intersects astHandle.doc's top-level keys → return
//      { written: false, [SPEC_UNKNOWN_TOP_LEVEL_KEY error…] } with NO
//      disk I/O.
//   1. Save-gate: validateSpec(spec); if any severity:error → return
//      { written: false, diagnostics } without disk I/O.
//   2. Schema inject: injectSchemaIfAbsent(astHandle.doc) — idempotent.
//   3. Diff-apply: compare spec against astHandle.doc and apply edits
//      via setScalarPreserving (CST scalar edits) + doc.setIn (structural).
//      Phase-2 scope: no diff — AST is the edit source of truth. Phase-4's
//      editor store will wire real diffs before calling writeSpecFile.
//   4. Sigil re-emit pass: walk interactables; for each node with
//      sigilOrigins==="sigil" and all 3 triple fields present → nothing to
//      do (already-normalized AST emits the sigil form via its retained
//      srcToken). For partial-field cases → emit as triple +
//      SPEC_SIGIL_PARTIAL_DROPPED info diagnostic.
//   5. SERDE-07 auto-quote: applied inline in setScalarPreserving for
//      every scalar edit. Pre-existing unquoted gotcha values are surfaced
//      as SERDE_YAML11_GOTCHA info diagnostics at PARSE time (Plan 05).
//   6. Emit: newMatter = astHandle.doc.toString().
//      NOTE: yaml@^2.8.3's ToStringOptions does NOT accept `version` —
//      Document carries its parse-time version. Argless call is correct.
//   7. Manual body splice — BLOCKER fix #1:
//        output = "---" + LE + newMatter + "---" +
//                 astHandle.closingDelimiterTerminator + bodyBytes
//      where LE is "\n" or "\r\n" per astHandle.lineEndingStyle, and
//      closingDelimiterTerminator is the verbatim terminator captured at
//      parse time ("", "\n", or "\r\n"). Without this terminator, every
//      fixture with non-empty body fails Buffer.equals.
//      NOTE: doc.toString already emits a trailing "\n" after the last
//      key per YAML convention — the "---" immediately follows that.
//   8. Atomic write via atomicWrite().
//
// THREAT T-02-SaveGate: save-gate runs BEFORE any disk I/O. Even the .tmp
//   is not created — confirmed by write.test.ts "no .tmp after blocked
//   save" integration.
// THREAT T-02-ProtoPollution (Layer 3): BLOCKER fix #3 above.
//
// RELATED: atomic.ts (step 8), schema-inject.ts (step 2), sigil.ts (step 4),
//          unknown.ts (step 0 ADVERSARIAL_KEYS + partitionTopLevel),
//          ../model/invariants.ts (step 1 source).

import type { Document } from "yaml";
import { CST, isScalar, Parser } from "yaml";
import { type Spec, validateSpec } from "../model/index.ts";
import type { Diagnostic } from "../primitives/diagnostic.ts";
import { error } from "../primitives/diagnostic.ts";
import type { JsonPointer } from "../primitives/path.ts";
import type { AstHandle } from "./ast-handle.ts";
import { atomicWrite } from "./atomic.ts";
import { injectSchemaIfAbsent } from "./schema-inject.ts";
import { ADVERSARIAL_KEYS, partitionTopLevel } from "./unknown.ts";

export interface WriteResult {
  written: boolean;
  diagnostics: Diagnostic[];
}

// YAML 1.1 gotcha scalars (Claude's Discretion). Case-insensitive.
// A freshly-assigned string value matching this regex must emit as
// double-quoted so a round-trip doesn't regress to an implicit-boolean
// reading under YAML 1.1 parsers.
const YAML11_GOTCHA_RE = /^(yes|no|on|off|y|n|true|false)$/i;

/**
 * Replace (or insert) a scalar at `path`. Prefers CST.setScalarValue when
 * the path exists and has an srcToken — preserves quoting byte-identical
 * for unchanged tokens. Forces QUOTE_DOUBLE for YAML 1.1 gotcha strings
 * (SERDE-07). Falls back to doc.setIn for new paths or non-scalar
 * replacements.
 *
 * Exported for unit-test coverage; production callers should use
 * writeSpecFile.
 */
export function setScalarPreserving(
  doc: Document,
  path: (string | number)[],
  newValue: string | number | boolean | null,
): void {
  const node = doc.getIn(path, /* keepNode */ true);

  if (
    isScalar(node) &&
    node.srcToken !== undefined &&
    (typeof newValue === "string" || typeof newValue === "number" || typeof newValue === "boolean")
  ) {
    const valueStr = String(newValue);

    // SERDE-07: any string matching the YAML 1.1 gotcha regex must
    // emit double-quoted. Force QUOTE_DOUBLE regardless of previous
    // style — a plain `yes` would parse as boolean true in YAML 1.1.
    if (typeof newValue === "string" && YAML11_GOTCHA_RE.test(valueStr)) {
      CST.setScalarValue(node.srcToken, valueStr, { type: "QUOTE_DOUBLE" });
      node.value = newValue;
      node.type = "QUOTE_DOUBLE";
      return;
    }

    // Preserve existing quoting style: no `context.type` → setScalarValue
    // uses the previous type of the token (defaults to PLAIN if absent).
    CST.setScalarValue(node.srcToken, valueStr);
    node.value = newValue;
    return;
  }

  // Fallback: Document-level set. Re-stringifies edited subtree but
  // localises the change (unchanged siblings still use srcTokens).
  doc.setIn(path, newValue);
}

export async function writeSpecFile(
  path: string,
  spec: Spec,
  astHandle: AstHandle,
): Promise<WriteResult> {
  // Step 0 — BLOCKER fix #3: ADVERSARIAL-KEY AST pre-gate.
  // partitionTopLevel strips __proto__ / constructor / prototype from
  // knownSubset, so validateSpec never sees them. But the AST still
  // carries them, and we MUST NOT persist them. Re-check the AST here
  // BEFORE the save-gate.
  const { unknownKeys } = partitionTopLevel(astHandle.doc);
  const adversarial = unknownKeys.filter((k) => ADVERSARIAL_KEYS.has(k));
  if (adversarial.length > 0) {
    return {
      written: false,
      diagnostics: adversarial.map((k) =>
        error(
          "SPEC_UNKNOWN_TOP_LEVEL_KEY",
          `/${k}` as JsonPointer,
          `Refusing to write spec with adversarial top-level key: ${k}`,
        ),
      ),
    };
  }

  // Step 1 — Save-gate on severity:"error".
  const { diagnostics: validationDiagnostics } = validateSpec(spec);
  const hasError = validationDiagnostics.some((d) => d.severity === "error");
  if (hasError) {
    // D-31: no disk I/O, no .tmp, no rename.
    return { written: false, diagnostics: validationDiagnostics };
  }

  // Accumulate any non-error diagnostics produced along the pipeline.
  const diagnostics: Diagnostic[] = [...validationDiagnostics];

  // Step 2 — Schema inject (idempotent; no-op after first save).
  // Capture return value: true = we just added the schema pair.
  const schemaWasInjected = injectSchemaIfAbsent(astHandle.doc);

  // Step 3 — Diff-apply. Phase-2 scope: AST is the edit source of truth;
  // no automatic diff between spec and AST. Phase-4 editor store will
  // wire real diffs before calling writeSpecFile.
  // (Intentional no-op.)

  // Step 4 — Sigil re-emit pass (D-24). Current no-op write path relies
  // on the parse-time AST already being in triple form (from
  // normalizeSigilsOnDoc in Plan 02-03). Partial-drop detection is
  // reserved for Phase-4 when mutations can un-populate fields.
  // (Intentional no-op — reserved for Phase-4 wiring.)

  // Step 5 — SERDE-07 auto-quote runs inline in setScalarPreserving.
  // Pre-existing unquoted gotcha values surface as info diagnostics at
  // parse time (Plan 05), not here.

  // Step 6 — Emit YAML.
  //
  // DEVIATION (Plan 02-05 Task 3, Rule 1): use the full CST token stream
  // rather than doc.toString(). yaml@^2.8.3's doc.toString() normalizes
  // inline-comment spacing (collapses N>=2 spaces before "#" to 1 space)
  // and can relocate inline comments onto their own line. Using CST
  // tokens emits the source verbatim — byte-identical unless a token
  // was mutated through CST.setScalarValue (setScalarPreserving for
  // SERDE-07 quoting). Sigil-origin nodes have their semantic `.value`
  // updated via normalizeSigilsOnDoc but the srcToken retains the
  // original sigil string — so CST.stringify yields the authoring form
  // on round-trip. This is the SERDE-05 byte-identical contract.
  //
  // WHY RE-PARSE via Parser: CST.stringify(doc.contents.srcToken) alone
  // omits LEADING comments (they live as top-level CST tokens sibling
  // to the document, not inside the map's srcToken). Using the full
  // token stream from Parser.parse captures them verbatim — including
  // any trailing newline gray-matter stripped from matterStr before
  // handing it to YAML.parseDocument.
  //
  // Fallback (schema-inject path / structural AST change): fall back to
  // doc.toString(). If schema-inject fires on a no-schema fixture, the
  // new key does not exist in the CST stream and we MUST re-emit via
  // the Document AST. Phase-2 fixtures all carry schema so this path
  // is unexercised; Phase-4 will revisit when the editor store emits
  // real mutations.
  let newMatter: string;
  if (schemaWasInjected) {
    newMatter = astHandle.doc.toString();
    if (!newMatter.endsWith("\n") && !newMatter.endsWith("\r\n")) {
      newMatter += "\n";
    }
  } else {
    // Re-parse the matter substring (between the opening and closing
    // "---") via Parser to capture pre-document comments, then emit
    // every token verbatim.
    const matterStart = astHandle.frontmatterStart;
    const matterEnd = astHandle.frontmatterEnd - astHandle.closingDelimiterTerminator.length;
    const matterBytes = astHandle.origBytes.slice(matterStart, matterEnd);
    // Strip the opening "---" line (up to and including its terminator).
    const openingMatch = matterBytes.match(/^---+[ \t]*(\r?\n|$)/);
    const afterOpen = openingMatch ? matterBytes.slice(openingMatch[0].length) : matterBytes;
    // Strip the trailing "---" line (the closing delimiter text, without
    // its terminator which is already in closingDelimiterTerminator).
    const matterInner = afterOpen.replace(/---+[ \t]*$/, "");
    const parser = new Parser();
    const tokens = [...parser.parse(matterInner)];
    newMatter = tokens.map((t) => CST.stringify(t)).join("");
    if (!newMatter.endsWith("\n") && !newMatter.endsWith("\r\n")) {
      newMatter += "\n";
    }
  }

  // Step 7 — Manual splice — BLOCKER fix #1.
  //
  // Form (LF-style shown; CRLF path swaps internal newlines too):
  //   "---" + LE + newMatter + "---" + closingDelimiterTerminator + bodyBytes
  //
  // closingDelimiterTerminator is the EXACT byte sequence that ended
  // the closing "---" line in the source. Re-emitting it verbatim is
  // load-bearing for Buffer.equals round-trip — especially for the
  // empty-body fixture where closingDelimiterTerminator === "".
  const LE = astHandle.lineEndingStyle === "crlf" ? "\r\n" : "\n";
  const newMatterLE =
    astHandle.lineEndingStyle === "crlf" ? newMatter.replace(/\r?\n/g, "\r\n") : newMatter;
  const output =
    `---${LE}` + newMatterLE + `---` + astHandle.closingDelimiterTerminator + astHandle.bodyBytes;

  // Step 8 — Atomic write.
  const { written, tmpOrphan } = await atomicWrite(path, output);
  if (!written && tmpOrphan !== null) {
    diagnostics.push(
      error(
        "SPEC_ORPHAN_TEMP_FILE",
        "" as JsonPointer,
        `atomic rename failed; orphan temp file at ${tmpOrphan}`,
      ),
    );
  }

  return { written, diagnostics };
}
