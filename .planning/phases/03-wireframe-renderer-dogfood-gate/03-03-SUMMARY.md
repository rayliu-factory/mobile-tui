---
phase: 03-wireframe-renderer-dogfood-gate
plan: 03
subsystem: ui
tags: [wireframe, ascii, text-transform, truncate, ellipsis, text-style, emit, d-43, d-44]

# Dependency graph
requires:
  - phase: 03-wireframe-renderer-dogfood-gate
    plan: 01
    provides: "NYI stubs for truncate at src/emit/wireframe/overflow.ts and applyTextStyle + TextStyle union at src/emit/wireframe/text-style.ts"
  - phase: 03-wireframe-renderer-dogfood-gate
    plan: 02
    provides: "layout.ts padRight + buildVariantHeader already import truncate; 3 `.skip` tests tagged for UNSKIP after this plan lands"
provides:
  - "truncate(str, width): string — D-44 deterministic 1-line truncation (identity | `.`.repeat fallback | slice + `...`)"
  - "applyTextStyle(text, style?): string — D-43 mapping (heading-1 UPPER | heading-2/body identity | caption parens-wrap | undefined=body)"
  - "TextStyle union type exported from src/emit/wireframe/text-style.ts"
  - "Rule-1 fix in layout.ts stage-3 header overflow: preserves `screen:` + `variant:` metadata under extreme truncation (was dropping `variant:` off the right edge)"
  - "3 previously-skipped layout.test.ts assertions unskipped and GREEN (padRight overflow delegation, stage-2 single-dash close, stage-3 truncate-with-ellipsis)"
affects: [03-04 leaf emitters, 03-05 interactable emitters, 03-06 structural emitters, 03-07 chrome+overlay emitters, 03-08 variants composition, 03-09 dogfood gate]

# Tech tracking
tech-stack:
  added: []  # Zero new runtime deps
  patterns:
    - "Pure string → string transform module (single-concern leaf) mirroring `src/primitives/path.ts` precedent — co-located `.test.ts` sibling, describe-per-fn + it-per-case, deterministic byte-equal assertions per T-03-04"
    - "Structured budget-allocation for multi-segment overflow (stage-3 header truncation shaves screenId + when-expr individually to preserve `variant:` load-bearing marker)"
    - "Template-literal preference (Biome lint/style/useTemplate) applied consistently to new emitter files"

key-files:
  created:
    - src/emit/wireframe/overflow.test.ts
    - src/emit/wireframe/text-style.test.ts
  modified:
    - src/emit/wireframe/overflow.ts
    - src/emit/wireframe/text-style.ts
    - src/emit/wireframe/layout.ts
    - src/emit/wireframe/layout.test.ts

key-decisions:
  - "truncate signature chose `.repeat(width)` fallback for width < 3 (RESEARCH Pattern 3) rather than throwing — keeps rectangular-output contract total across all inputs; callers never need to guard width pre-call."
  - "applyTextStyle heading-2 is identity, not Title Case — D-43 says 'respect author capitalization.' A forced transform would mangle acronyms (API→Api). heading-1 compresses emphasis via CAPS; heading-2 leaves it to the author."
  - "caption wraps empty string to `()` (degenerate but total) rather than returning empty — consistency of the transform over edge-case aesthetics; callers can filter empty captions upstream if desired."
  - "undefined style defaults to body (identity), matching `component.ts` ScreenSchema TextNode.style.optional() — zero-config default for untagged text nodes."
  - "Rule-1 deviation in layout.ts: plan 03-02's stage-3 implementation blindly truncated the composed content string, dropping `variant: <kind>` off the right edge in extreme-overflow cases — directly contradicting its own docblock 'preserve `screen:` + `variant:` metadata'. Replaced with a structured allocator: fixed overhead for `screen: ` + `  ` + `variant: <kind>` (~29-31 chars), then distribute remaining budget to screenId (truncate) and when-expr (truncate). Variant marker now visible on any width ≥ 36 cols."

patterns-established:
  - "TDD RED-before-GREEN for pure leaf transforms: write test.ts first (compiles against NYI stub, all assertions fail), commit with `test(...): RED`, then replace stub body, commit with `feat(...): GREEN`. Full gate (tsc + biome + vitest) must pass at both commits."
  - "Rectangular-contract assertion in the same test file that defines the transform — overflow.test.ts ships a dedicated `output.length <= width in all cases` test with 8-case input matrix; codifies the 'every helper output respects its budget' invariant explicitly."
  - "`.skip` unskip in a separate commit with a Rule-1 fix note — keeps the test-as-paper-trail story auditable when the unskipped test surfaces latent bugs in the dependency."

requirements-completed: [WIREFRAME-01, WIREFRAME-02]
# Plan 03-03's contribution to each:
#   - WIREFRAME-01 (18-kind render catalog): truncate + applyTextStyle are load-bearing primitives for every interactable/leaf renderer in Plans 03-04..03-07. With both landed (plus layout.ts from 03-02), the emitter modules have their full helper toolkit.
#   - WIREFRAME-02 (persisted-wireframe ASCII contract): both primitives operate on PRINTABLE_ASCII-validated inputs (Phase-1 regex at src/model/component.ts:54 guarantees `\x20-\x7E` reaches these functions) and emit ASCII-only output. Rectangular-contract test in overflow.test.ts codifies this at the function-output level.

# Metrics
duration: ~5min
completed: 2026-04-18
---

# Phase 03 Plan 03: Text-Transform Primitives (truncate + applyTextStyle) Summary

**D-44 1-line `...`-truncation + D-43 heading-1/caption ASCII style mapping as pure leaf transforms; Rule-1 fix preserves `variant:` metadata under extreme header overflow.**

## Performance

- **Duration:** 4m 43s
- **Started:** 2026-04-18T05:36:35Z
- **Completed:** 2026-04-18T05:41:18Z
- **Tasks:** 3 (5 commits: 2 TDD pairs + 1 Task-3 unskip-with-fix)
- **Files modified:** 2 created + 4 modified = 6

## Accomplishments

- `truncate(str, width)` lands in `src/emit/wireframe/overflow.ts` with 8 assertions (len<width, exact-fit, overlong-with-`...`, empty, width 0, width<3 `.`-fallback, determinism, 8-case rectangular-contract matrix) — all GREEN.
- `applyTextStyle(text, style?)` lands in `src/emit/wireframe/text-style.ts` with 14 assertions across 6 describe blocks (heading-1 CAPS, heading-2 identity, body identity, caption parens-wrap, undefined=body default, determinism) — all GREEN. Type `TextStyle` exported.
- All 3 `.skip` markers in `src/emit/wireframe/layout.test.ts` stripped; the three previously-deferred truncate-dependent tests (padRight overflow delegation, stage-2 single-dash close, stage-3 extreme-overflow truncate-with-`...`) now run and pass.
- Rule-1 deviation: fixed latent bug in `layout.ts` stage-3 overflow path where blind `truncate(content, avail)` was dropping the `variant: <kind>` marker off the right edge in extreme-overflow inputs — violating the docblock's own "preserve `screen:` + `variant:` metadata" contract. Replaced with structured budget allocator.
- Full gate GREEN: vitest 464 passed + 3 skipped (unchanged skips are out-of-scope Wave-0 harness stubs in `tests/dogfood-gate.test.ts` + `tests/wireframe-catalog.test.ts` targeting future plans); tsc exit 0; biome exit 0.

## Task Commits

Each task committed atomically per TDD RED→GREEN discipline:

1. **Task 1 RED: overflow.test.ts (8 assertions)** — `6787e80` (test)
2. **Task 1 GREEN: truncate per D-44** — `c4cdf11` (feat)
3. **Task 2 RED: text-style.test.ts (14 assertions)** — `d284e2f` (test)
4. **Task 2 GREEN: D-43 style mapping** — `f05303d` (feat)
5. **Task 3 + Deviation: unskip 3 layout.test.ts tests + stage-3 variant-preserving fix** — `14629f3` (fix)

Test count delta: +22 new GREEN assertions (8 overflow + 14 text-style) + 3 previously-skipped unskipped = **+25 pass / –3 skip** against the Plan 03-02 baseline (439/6 → 464/3).

## Files Created/Modified

- `src/emit/wireframe/overflow.ts` (modified) — Replaces NYI stub with `truncate(str, width)`: identity when `str.length ≤ width`, `.`.repeat(width) when `width < 3`, else `${str.slice(0, width-3)}...`.
- `src/emit/wireframe/overflow.test.ts` (created) — 8 assertions covering D-44 behavior + rectangular-contract matrix + determinism.
- `src/emit/wireframe/text-style.ts` (modified) — Replaces NYI stub with `applyTextStyle` switch over `TextStyle` union; exports `TextStyle` type.
- `src/emit/wireframe/text-style.test.ts` (created) — 14 assertions across 6 describe blocks covering all 4 styles + undefined default + determinism.
- `src/emit/wireframe/layout.ts` (modified) — Rule-1 fix: stage-3 overflow path now preserves `screen:` + `variant:` metadata via structured budget allocator instead of blind tail-truncating the composed content string.
- `src/emit/wireframe/layout.test.ts` (modified) — Strip `.skip` from 3 `it()` blocks (padRight overflow delegation, stage-2 single-dash close, stage-3 extreme-overflow truncate-with-`...`); retain inline "Now running after Plan 03-03" paper-trail comments.

## Decisions Made

- **`.repeat(width)` fallback for width < 3** (rather than throwing): keeps `truncate` a total function and upholds the rectangular-output contract for every caller without requiring width pre-validation.
- **heading-2 is identity, not Title Case**: D-43's "respect author capitalization" rule. A forced Title-Case transform would mangle acronyms (`API reference → Api Reference`) and erase author intent.
- **caption wraps empty input to `()`**: total-function consistency over degenerate-case aesthetics. Callers can filter upstream if the `()` display is undesired for a given context.
- **Stage-3 structured allocator**: allocating fixed overhead for `screen: ` + `  ` + `variant: <kind>` first, then distributing the remainder to screenId (truncate) and when-expr (truncate), guarantees the `variant:` load-bearing marker remains visible on any width ≥ 36 cols. Blind tail-truncation (original layout.ts behavior) violated the docblock's own "preserve `screen:` + `variant:` metadata" promise.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] layout.ts stage-3 header overflow dropped `variant:` metadata off the right edge**
- **Found during:** Task 3 (unskipping the "extreme overflow truncates content with ..." assertion in layout.test.ts)
- **Issue:** Plan 03-02's `buildVariantHeader` stage-3 path implemented the documented "preserve `screen:` + `variant:` metadata" contract as `truncate(content, avail)` applied to the entire composed content string. With screenId = `"supercalifragilisticexpialidocious-screen-identifier"` + kind = `"error"`, this truncation ate through the content from the right, discarding everything after the screenId midway — including `variant: error`. The unskipped test correctly asserted `header.toContain("variant:")` and failed.
- **Fix:** Replaced stage-3 body with a structured budget allocator: reserve fixed overhead for `screen: ` (8) + `  ` (2) + `variant: <kind>` (9-16), distribute remaining `avail - fixedOverhead` chars to screenId (at least 3 chars minimum guard) and when-expr. Each variable segment gets its own `truncate(...)` call. `variant:` is now structurally guaranteed to remain visible so long as `width ≥ 36`. Defensive fallback retained for pathological tiny widths where even the fixed prefix does not fit.
- **Files modified:** `src/emit/wireframe/layout.ts` (Stage 3 block, lines ~64-83)
- **Verification:** `npx vitest run src/emit/wireframe/layout.test.ts` → 15/15 GREEN (was 14/1-fail). The extreme-overflow test now asserts `header` contains both `screen:` and `variant:` and ends at exactly 60 cols. Full suite re-run: 464 pass + 3 skip, no regression elsewhere.
- **Committed in:** `14629f3` (combined with Task 3 unskip).
- **Why Rule 1 (bug) not Rule 4 (architectural)**: the fix honors the existing docblock contract without changing signatures, exports, or the 3-stage cascade shape. It is a corrective implementation of what Plan 03-02's layout.ts docblock already promised.

---

**Total deviations:** 1 auto-fixed (1 bug fix surfaced by unskipping a Wave-1-deferred test). No scope creep — the unskipping was explicit Task-3 work and the `variant:` preservation was already in layout.ts's own docblock.

**Impact on plan:** Deviation was necessary to satisfy the plan's own success criterion "Previously-skipped truncate-dependent tests in layout.test.ts now UNSKIPPED and GREEN." Unskipping alone would have left the extreme-overflow test RED.

## Issues Encountered

- Biome `lint/style/useTemplate` info on initial `str.slice(0, width - 3) + "..."` — auto-converted to template literal `${str.slice(0, width - 3)}...`. Caught by in-task biome check before GREEN commit; no separate commit.
- Biome line-length formatting on caption-describe test block — three-line `.toBe(` call was inlined to single line per Biome formatter request. Caught pre-RED-commit; no separate commit.

## User Setup Required

None — pure string transforms; no external services, no config files, no env vars.

## Next Phase Readiness

- **Wave 2 CLOSED.** Both Wave 1 (layout.ts, Plan 03-02) and Wave 2 (overflow.ts + text-style.ts, Plan 03-03) primitives shipped. The emitter toolkit is complete: `PHONE_WIDTH`, `VariantKind`, `buildVariantHeader`, `padRight`, `drawFrame`, `truncate`, `applyTextStyle`, `TextStyle`.
- **Wave 3 (Plans 03-04..03-07, parallelizable per-kind emitters) unblocked.** All 18 component-kind renderers can now import the primitive set and are free to land in parallel.
- **Zero regression on Phase 1/2 baseline**: full suite 464 pass + 3 skip (3 skips = unrelated Wave-0 harness stubs for Plans 03-08/03-09); tsc exit 0; biome exit 0.

---
*Phase: 03-wireframe-renderer-dogfood-gate*
*Completed: 2026-04-18*

## Self-Check: PASSED

All 7 claimed files confirmed on disk:
- `src/emit/wireframe/overflow.ts`, `src/emit/wireframe/overflow.test.ts`
- `src/emit/wireframe/text-style.ts`, `src/emit/wireframe/text-style.test.ts`
- `src/emit/wireframe/layout.ts`, `src/emit/wireframe/layout.test.ts`
- `.planning/phases/03-wireframe-renderer-dogfood-gate/03-03-SUMMARY.md`

All 5 claimed commits confirmed in git log:
- `6787e80` (Task 1 RED), `c4cdf11` (Task 1 GREEN)
- `d284e2f` (Task 2 RED), `f05303d` (Task 2 GREEN)
- `14629f3` (Task 3 unskip + Rule-1 variant-preservation fix)

Full gate: `npx vitest run` → 464 pass + 3 skip (unrelated Wave-0 harness); `npx tsc --noEmit` → exit 0; `npx biome check .` → exit 0.
