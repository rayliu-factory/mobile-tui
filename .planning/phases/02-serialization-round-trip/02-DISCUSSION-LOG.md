# Phase 2: Serialization & Round-Trip — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-18
**Phase:** 02-serialization-round-trip
**Areas discussed:** Body anchor convention & splice contract, Sigil shorthand policy in Phase 2, `_unknown:` bucket mechanism, Atomic write + debounce contract

---

## Body Anchor Convention & Splice Contract

### Q1. Body scope in Phase 2

| Option | Description | Selected |
|--------|-------------|----------|
| Single opaque slab | Parser exposes `body: string` verbatim; serializer writes it back byte-for-byte. No anchor recognition in Phase 2. | ✓ |
| Anchor-aware structured view | Parser recognises `<!-- screen:ID -->` pairs NOW, exposes `{ prose, screenBlocks: Map<ScreenId, string> }`. | |
| Anchors recognised, content still opaque | Parser tokenises anchors into indexes but keeps body as one string; exposes `anchors: { id, startLine, endLine }[]`. | |

**User's choice:** Single opaque slab (Recommended).
**Notes:** Matches PITFALLS §4.2 "opaque string" guidance; anchor mechanism deferred to Phase 4/5 when a command actually needs per-screen splicing.

### Q2. Prose outside anchors — round-trip rule

| Option | Description | Selected |
|--------|-------------|----------|
| Preserve verbatim, byte-identical | Text outside anchors round-trips exactly as written; no diagnostics. | ✓ |
| Allowed, info diagnostic | Round-trips verbatim, but validator warns `SPEC_BODY_ORPHAN_PROSE`. | |
| Disallow — error | Non-anchored prose is a save-blocking error. | |

**User's choice:** Preserve verbatim, byte-identical (Recommended).
**Notes:** Narrative is sacred; no structure imposed on body text.

### Q3. New-screen anchor block placement (future phase)

| Option | Description | Selected |
|--------|-------------|----------|
| Append at end of body | Deterministic; new screens appended after all existing content. | ✓ |
| Insert in frontmatter declaration order | Walk `screens:` in order; place after predecessor's anchor. | |
| Don't auto-create anchor blocks in Phase 2 | Command layer (Phase 4/5) creates new blocks when a screen is added. | |

**User's choice:** Append at end of body (Recommended).
**Notes:** Decision pre-locked for Phase 4/5 so future phase doesn't re-litigate.

---

## Sigil Shorthand Policy in Phase 2

### Q1. Sigil scope in Phase 2

| Option | Description | Selected |
|--------|-------------|----------|
| Full origin-preserving (both forms on read, preserve origin on write) | Parser accepts sigil + triple; serializer tracks per-component origin and re-emits in same form. | ✓ |
| Parser-only (accept both, always emit triple) | Simplest serializer; first save against a human-authored sigil rewrites to triple. | |
| Defer sigil to a later phase | Phase 2 only handles triple; sigil lands in Phase 3/4. | |

**User's choice:** Full implementation (Recommended).
**Notes:** Byte-identical round-trip for both Phase-1 triple-form fixtures AND future human-authored sigil files. Requires AST-side origin marker.

### Q2. Partial sigil (missing a field) on emit

| Option | Description | Selected |
|--------|-------------|----------|
| Emit triple whenever any of the three is missing | Sigil reserved for all-three case; enforces D-03 at serializer boundary. | ✓ |
| Emit partial sigil like `[Cancel →cancel]` | More ergonomic but complicates grammar; breaks Maestro's testID assumption. | |
| Forbid partial (validator error) | Out-of-scope model change; Phase 1 model is frozen. | |

**User's choice:** Emit triple when partial (Recommended).
**Notes:** Clean all-or-nothing rule; emits `SPEC_SIGIL_PARTIAL_DROPPED` info diagnostic if origin was sigil but a field is missing.

### Q3. Phase-1 fixtures during Phase 2

| Option | Description | Selected |
|--------|-------------|----------|
| Leave as triple-form; add sigil-form fixtures separately | No rewrite; 3 of the 20 golden fixtures are explicitly sigil-form. | ✓ |
| Rewrite all three to sigil form | Mutates Phase-1 committed artifacts; invalidates existing snapshots. | |
| Provide both-form copies (dual golden fixtures) | Doubles fixture count; explicit coverage but more maintenance. | |

**User's choice:** Leave as triple-form (Recommended).
**Notes:** Zero rewrite churn; both origin paths covered by adding new sigil-form fixtures instead.

---

## `_unknown:` Bucket Mechanism

### Q1. Storage mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| AST-native (unknowns stay in Document at original position) | No literal `_unknown:` key in file; diff-and-apply never touches unknown nodes. | ✓ |
| Literal `_unknown:` key in the file | Parser gathers unknowns into a visible bucket; serializer persists under `_unknown:` on save. | |
| Hybrid (AST-native + expose in Spec type) | Adds `spec._unknown` field — requires Phase 1 model touch. | |

**User's choice:** AST-native (Recommended).
**Notes:** Fully faithful to diff-and-apply; user files are never mutated to add a visible bucket.

### Q2. Scope — top-level only vs nested

| Option | Description | Selected |
|--------|-------------|----------|
| Top-level frontmatter keys only | SPEC-08 explicit wording; forward-compat is additive at top level. | ✓ |
| Nested too — unknowns preserved at any depth | Model `.strict()` relaxation; looser invariants, typo-tolerant. | |
| Top-level + action-intent level only | Compromise; adds `.passthrough()` slots per union. | |

**User's choice:** Top-level only (Recommended).
**Notes:** Nested unknowns still rejected by `.strict()`; tight invariants preserved.

### Q3. `schema: mobile-tui/1` injection position (first save)

| Option | Description | Selected |
|--------|-------------|----------|
| Top of frontmatter, first key | Matches Jekyll/Hugo/Astro/11ty norms; easy to find; schema-version-first convention. | ✓ |
| End of frontmatter, last key | Minimally disruptive; matches append-convention tools. | |
| Sorted alphabetically | Consistent rule but visually weird. | |

**User's choice:** Top of frontmatter (Recommended).
**Notes:** Followed by a blank line before the next key; byte-identical on the rest of the document.

---

## Atomic Write + Debounce Contract

### Q1. Phase 2 debounce scope

| Option | Description | Selected |
|--------|-------------|----------|
| Atomic-write primitive only; Phase 4 wraps debounce | Phase 2 ships `writeSpecFile(path, spec, ast)`; Phase 4 owns timer loop + shutdown flush. | ✓ |
| Full debounce + flush in Phase 2 | Reusable `DebouncedSpecWriter` class with queue/flush/shutdown. | |
| Split: atomic-write + stateless `shouldWrite(now, lastEditMs)` helper | Awkward abstraction for one caller. | |

**User's choice:** Atomic-write primitive only (Recommended).
**Notes:** Success criterion #5 debounce half moves to Phase 4; Phase 2 keeps scope on serialization not orchestration.

### Q2. Temp-file naming

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed `.{basename}.tmp` suffix + orphan-cleanup diagnostic | Predictable path; `SPEC_ORPHAN_TEMP_FILE` info on next open. | ✓ |
| Random suffix per write: `.{basename}.tmp.{uuid}` | No cross-write collisions; noisier on crash. | |
| Stash in OS temp dir, rename across devices | Unnecessary complexity; `EXDEV` fallback needed. | |

**User's choice:** Fixed suffix (Recommended).
**Notes:** Concurrent-save races are Phase 9's problem via `withFileMutationQueue`.

### Q3. Save-gate on diagnostics severity === 'error'

| Option | Description | Selected |
|--------|-------------|----------|
| Return `{ written: boolean, diagnostics: Diagnostic[] }` | Never throws; caller inspects. Mirrors `validateSpec` never-throws contract. | ✓ |
| Throw typed `SaveBlockedError` | Breaks never-throws contract; try/catch required. | |
| Write to `.rejected` sibling + return diagnostics | Preserves in-progress edits but litters files. | |

**User's choice:** Result-typed return (Recommended).
**Notes:** Phase 4 editor store surfaces `written: false` as a "save blocked" indicator; CI tests assert the block.

---

## Claude's Discretion

No areas were left to "Claude's Discretion" as a first-class decision during this session. The following items are **defaults** Claude will carry forward unless researcher/planner objects:

- `gray-matter@^4.0.3` wired to `eemeli/yaml@^2.8.3` via `engines.yaml` override (`parseDocument` / `doc.toString()`)
- YAML version pinned to 1.2 in parser options
- SERDE-07 gotcha handling: auto-quote `yes|no|on|off|y|n|true|false` on emit + info-severity lint warning on read
- 20-fixture composition recipe (3 canonical triple + 1 malformed from Phase 1 + ~16 new: sigil, comments, reorders, unknowns, nested comments, YAML-1.1-gotchas, empty-body, comment-only)
- Byte-identical comparison via `Buffer.equals(before, after)` in CI
- Cross-ref errors (severity='error') block save per SPEC-09

## Deferred Ideas

See CONTEXT.md §deferred — summary: body anchor mechanism (Phase 4/5), debounce loop (Phase 4), `withFileMutationQueue` (Phase 9), sigil-label escape rules, cross-device rename fallback, `.rejected` sibling file, migration promotion of unknowns → known, auto-quote-wider-palette, per-screen body-edit commands.
