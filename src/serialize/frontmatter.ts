// src/serialize/frontmatter.ts
// Bridge from gray-matter@^4.0.3's file-split surface to our internal
// ParsedFrontmatter shape.
//
// QUIRKS ISOLATED HERE (do not leak these outside this module):
//   1. gray-matter strips one \r?\n after the closing --- (Pitfall 2)
//      → we ignore file.content and extract body from file.orig ourselves
//   2. gray-matter's engines.yaml.parse return value is passed to
//      file.data WITHOUT wrapping (Assumption A3) → we can return
//      YAML.Document and consume it downstream
//   3. engines.yaml.stringify is never called by our save path
//      → we throw defensively to catch any accidental wiring
//   4. BLOCKER fix #1: gray-matter does NOT tell us which exact
//      newline terminated the closing "---" — it could be \n, \r\n,
//      or none (file ended at ---). We capture this ourselves via
//      findFrontmatterBounds.closingTerminator and propagate it as
//      ParsedFrontmatter.closingDelimiterTerminator.
//   5. BLOCKER fix #2: gray-matter.isEmpty means "the map BETWEEN
//      delimiters was empty" — TRUE for `---\n---\n\nbody\n`. We need
//      a SEPARATE signal for "delimiters completely absent" so Plan 05
//      parse.ts can emit SERDE_MISSING_DELIMITER correctly. That signal
//      is `hasFrontmatter: boolean` derived from findFrontmatterBounds
//      !== null.
//
// SCOPE:
//   - splitFrontmatter(raw): ParsedFrontmatter
//   - detectLineEndingStyle(raw): "lf" | "crlf"
//
// THREAT T-02-YAMLBomb: YAML 1.2 mode has no exploitable expansion bomb;
// aliases are parsed but not expanded to attacker-chosen depth. Phase-1's
// MAX_INPUT_BYTES = 5MB cap at validateSpec() entry is additive.
//
// RELATED: body.ts (findFrontmatterBounds produces closingTerminator),
//          ast-handle.ts (ParsedFrontmatter members become AstHandle
//          fields — closingDelimiterTerminator + hasFrontmatter),
//          parse.ts (consumer, Plan 05), write.ts (re-emits
//          closingDelimiterTerminator verbatim — Plan 04 step 7).
import matter from "gray-matter";
import type { Document } from "yaml";
import YAML from "yaml";
import type { LineEndingStyle } from "./ast-handle.ts";
import { findFrontmatterBounds } from "./body.ts";

export interface ParsedFrontmatter {
  doc: Document;
  matterStr: string;
  bodyBytes: string;
  origBytes: string;
  /** gray-matter flag: the map BETWEEN delimiters is empty. NOT the
   *  "no delimiters at all" signal — see hasFrontmatter for that. */
  isEmpty: boolean;
  /** BLOCKER fix #2: TRUE iff findFrontmatterBounds found both opening
   *  and closing "---". FALSE when the file had no frontmatter
   *  delimiters at all (e.g. raw Markdown). Plan 05 parse.ts emits
   *  SERDE_MISSING_DELIMITER iff !hasFrontmatter. */
  hasFrontmatter: boolean;
  /** BLOCKER fix #1: the newline that terminated the closing "---"
   *  line. Write path splices this between "---" and bodyBytes. */
  closingDelimiterTerminator: "\n" | "\r\n" | "";
  lineEndingStyle: LineEndingStyle;
  frontmatterStart: number;
  frontmatterEnd: number;
}

export function detectLineEndingStyle(raw: string): LineEndingStyle {
  // First newline in the input wins. If no \n at all, default to lf.
  const firstCrLf = raw.indexOf("\r\n");
  const firstLf = raw.indexOf("\n");
  if (firstCrLf !== -1 && (firstLf === -1 || firstCrLf <= firstLf)) return "crlf";
  return "lf";
}

export function splitFrontmatter(raw: string): ParsedFrontmatter {
  const file = matter(raw, {
    engines: {
      yaml: {
        // gray-matter's engine contract requires `object`. YAML.Document is
        // a class instance (object), so this is structurally correct even
        // though gray-matter's types don't know about YAML.Document.
        parse: (str: string): object =>
          YAML.parseDocument(str, { version: "1.2", keepSourceTokens: true }),
        stringify: () => {
          throw new Error(
            "gray-matter.stringify is not part of the write path — " +
              "see src/serialize/write.ts for manual-splice emission.",
          );
        },
      },
    },
  });

  // gray-matter sets `file.isEmpty = true` at runtime when the map
  // BETWEEN delimiters is empty, but the property is not in its .d.ts.
  // Narrow through an indexed record access rather than `as any`.
  const fileIndexed = file as unknown as Record<string, unknown>;
  const isEmpty = fileIndexed.isEmpty === true;

  const origBytes = typeof file.orig === "string" ? file.orig : file.orig.toString("utf8");
  const bounds = findFrontmatterBounds(origBytes);
  // hasFrontmatter is the AUTHORITATIVE signal per BLOCKER fix #2.
  const hasFrontmatter = bounds !== null;
  const frontmatterStart = bounds?.start ?? 0;
  const frontmatterEnd = bounds?.end ?? 0;
  const closingDelimiterTerminator = bounds?.closingTerminator ?? "";
  const bodyBytes = bounds ? origBytes.slice(bounds.end) : "";

  return {
    doc: file.data as unknown as Document,
    matterStr: typeof file.matter === "string" ? file.matter : "",
    bodyBytes,
    origBytes,
    isEmpty,
    hasFrontmatter,
    closingDelimiterTerminator,
    lineEndingStyle: detectLineEndingStyle(origBytes),
    frontmatterStart,
    frontmatterEnd,
  };
}
