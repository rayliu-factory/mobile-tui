// src/serialize/body.ts
// Opaque-string body extract (D-18). Pure function.
//
// SCOPE:
//   - `findFrontmatterBounds(origBytes)` — byte offsets of opening and
//     closing `---` delimiter lines PLUS the exact terminator consumed
//     when computing `end` (BLOCKER fix #1).
//   - `extractBodyBytes(origBytes)` — verbatim slice from origBytes AFTER
//     the closing delimiter line (including any leading blank lines)
//
// WHY WE IGNORE gray-matter's file.content: gray-matter strips one
// \r?\n after the closing --- AND may strip additional leading
// whitespace inconsistently. For byte-identical round-trip (SERDE-05),
// the body must come from origBytes directly (RESEARCH §Pitfall 7).
//
// WHY closingTerminator IS LOAD-BEARING (BLOCKER fix #1):
//   When `end` consumes the terminating "\n" (or "\r\n", or nothing),
//   the write path needs to re-emit that exact byte pattern between
//   the closing "---" and bodyBytes — otherwise Buffer.equals fails
//   on every fixture with non-empty body. The offset alone loses the
//   distinction between LF, CRLF, and "no trailing newline" (empty-body
//   fixture). Callers (splitFrontmatter) propagate this into
//   AstHandle.closingDelimiterTerminator.
//
// DELIMITER MATCHER: /^---+[ \t]*$/m matches `---` (or more dashes) followed
// by OPTIONAL trailing spaces/tabs on the delimiter line. We explicitly
// EXCLUDE `\n` and `\r` from the trailing-whitespace class; if we allowed
// `\s*` the regex would greedily consume the terminating newline into
// `match[0]`, leaving `closingTerminator` unable to distinguish LF / CRLF /
// empty. That distinction is BLOCKER fix #1 — load-bearing for
// Buffer.equals round-trip. Phase 2 accepts ONLY YAML frontmatter — the
// TOML `+++` form is out-of-scope (SERDE-02 pins YAML). parse.ts emits
// SERDE_MISSING_DELIMITER if no match.
//
// WHY ORDER MATTERS: the match must find the OPENING delimiter
// (first `---` line) BEFORE searching for the CLOSING one. Swapping
// would let a `---` appearing in the body ruin the split.
//
// RELATED: frontmatter.ts (caller wrapping this + doc parse),
//          parse.ts (emits SERDE_MISSING_DELIMITER diagnostic),
//          write.ts (re-emits closingTerminator verbatim — Plan 04 step 7).

const DELIMITER_REGEX = /^---+[ \t]*$/m;

export interface FrontmatterBounds {
  /** Byte offset of first char of opening "---" line. */
  start: number;
  /** Byte offset of first char AFTER the closing "---" line's
   *  terminating newline (or end of input if no newline). */
  end: number;
  /** BLOCKER fix #1 — the exact terminator consumed when advancing `end`
   *  past the closing "---" line. The write path MUST re-emit this
   *  verbatim for byte-identical round-trip. */
  closingTerminator: "\n" | "\r\n" | "";
}

export function findFrontmatterBounds(origBytes: string): FrontmatterBounds | null {
  const openMatch = origBytes.match(DELIMITER_REGEX);
  if (!openMatch || openMatch.index === undefined) return null;
  const start = openMatch.index;
  const afterOpen = start + openMatch[0].length;
  // Look for closing delimiter in the remaining input.
  const rest = origBytes.slice(afterOpen);
  const closeMatch = rest.match(DELIMITER_REGEX);
  if (!closeMatch || closeMatch.index === undefined) return null;
  // Byte position of the closing `---` line's last character.
  const closeRelativeEnd = closeMatch.index + closeMatch[0].length;
  // Absolute offset of first byte AFTER the closing "---" (before terminator).
  const afterCloseDelim = afterOpen + closeRelativeEnd;
  // Detect + consume the terminator that ended the closing "---" line.
  let closingTerminator: "\n" | "\r\n" | "" = "";
  let end = afterCloseDelim;
  if (origBytes[end] === "\r" && origBytes[end + 1] === "\n") {
    closingTerminator = "\r\n";
    end += 2;
  } else if (origBytes[end] === "\n") {
    closingTerminator = "\n";
    end += 1;
  }
  // else: file ended at "---" with no terminator; closingTerminator stays "".
  return { start, end, closingTerminator };
}

export function extractBodyBytes(origBytes: string): string {
  const bounds = findFrontmatterBounds(origBytes);
  if (!bounds) return "";
  return origBytes.slice(bounds.end);
}
