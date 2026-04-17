// src/serialize/ast-handle.ts
// Opaque state handle carrying everything the serializer needs to re-emit
// a spec file byte-identically.
//
// SCOPE:
//   - Hand-written TypeScript; NO Zod schema (Phase 2 adds no new Zod per
//     RESEARCH §Project Constraints "Zod v4 stays in the model layer only")
//   - All fields are the serializer's private state. Downstream consumers
//     (wireframe renderer, Maestro emitter) get the Spec only; AstHandle
//     passes through editor store → writeSpecFile as an opaque token.
//
// THREAT T-02-PartialWrite MITIGATION: `origBytes` allows re-emit to
// reconstruct a full file on write failure recovery (Phase 9 territory).
//
// RELATED: parse.ts (produces AstHandle), write.ts (consumes it), D-18
//          (body opaque string), D-23 (sigilOrigins WeakMap).
import type { Document } from "yaml";

export type LineEndingStyle = "lf" | "crlf";

/**
 * Terminator that ended the closing "---" delimiter line in the source
 * bytes. Write path splices this between the closing "---" and bodyBytes
 * for exact Buffer.equals round-trip.
 */
export type ClosingDelimiterTerminator = "\n" | "\r\n" | "";

export interface AstHandle {
  /** eemeli/yaml Document with CST srcTokens retained. */
  doc: Document;
  /** Body bytes verbatim from file.orig after closing ---. NOT from file.content. */
  bodyBytes: string;
  /** Full input bytes. For write-path reconstruction + drift-detection debugging. */
  origBytes: string;
  /** Sigil-origin annotation keyed by the YAML map/pair node for each interactable. */
  sigilOrigins: WeakMap<object, "sigil" | "triple">;
  /** First line-ending found in origBytes. Write path uses this (RESEARCH Pitfall 5). */
  lineEndingStyle: LineEndingStyle;
  /** Path of orphan .{basename}.tmp sibling next to target, or null. */
  orphanTemp: string | null;
  /** Byte offset of opening "---" in origBytes. */
  frontmatterStart: number;
  /**
   * Byte offset of the first character AFTER the closing "---" line
   * (INCLUDING its terminator, so `bodyBytes = origBytes.slice(frontmatterEnd)`).
   * This field consumes whatever newline terminated the closing "---" line;
   * that newline is recorded separately in `closingDelimiterTerminator`
   * for write-path reconstruction.
   */
  frontmatterEnd: number;
  /**
   * LOAD-BEARING for byte-identical round-trip (SERDE-05, BLOCKER fix #1).
   *
   * The newline that terminated the closing "---" delimiter line.
   *   - "\n"    — LF-terminated closing delimiter (most common)
   *   - "\r\n"  — CRLF-terminated closing delimiter
   *   - ""      — file ended exactly at "---" with NO trailing newline
   *               (edge case, e.g. fixtures/round-trip/empty-body.spec.md)
   *
   * Write-path reconstruction (Plan 04 step 7) MUST re-emit this exact
   * terminator between the closing "---" and bodyBytes:
   *   output = "---" + LE + newMatter + "---" + closingDelimiterTerminator + bodyBytes
   * Omitting it fails Buffer.equals on every fixture with non-empty body.
   *
   * Populated by findFrontmatterBounds() in Plan 02 (authoritative).
   */
  closingDelimiterTerminator: ClosingDelimiterTerminator;
  /**
   * True if the input contained a YAML frontmatter delimiter pair
   * (opening AND closing "---" both detected by findFrontmatterBounds).
   * False if findFrontmatterBounds returned null (no delimiters present).
   *
   * CRITICAL DISTINCTION (BLOCKER fix #2): this is NOT the same as
   * gray-matter's `isEmpty`. `isEmpty=true` means the map BETWEEN
   * delimiters was empty — a valid fixture like `---\n---\n\nbody\n`
   * has `hasFrontmatter=true, isEmpty=true`.
   *
   * Plan 05 parse.ts uses `!hasFrontmatter` as the SOLE signal to
   * emit SERDE_MISSING_DELIMITER. Do NOT conflate with isEmpty.
   */
  hasFrontmatter: boolean;
}
