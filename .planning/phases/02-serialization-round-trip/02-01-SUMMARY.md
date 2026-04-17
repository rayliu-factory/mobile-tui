---
phase: 02-serialization-round-trip
plan: 01
subsystem: serialization
tags: [yaml, gray-matter, tdd, diagnostics, scaffolding, phase-2-wave-0]

# Dependency graph
requires:
  - phase: 01-spec-model-invariants
    provides: validateSpec, Spec, Diagnostic, JsonPointer, SPEC_* diagnostic codes, 4 canonical/malformed .spec.md fixtures + .spec.json siblings
provides:
  - src/serialize/ L3 layer scaffold (12 files — 10 leaf modules + 1 barrel + 1 type + 1 registry test)
  - parseSpecFile Wave-0 stub reading .spec.json siblings (contract stable; swapped for real gray-matter + eemeli/yaml in Plan 02-02 / 02-05)
  - SERDE_CODES registry (6 Phase-2 diagnostic codes, SCREAMING_SNAKE_CASE)
  - AstHandle opaque type with load-bearing closingDelimiterTerminator + hasFrontmatter fields (BLOCKER fixes #1 + #2 from revision)
  - yaml@^2.8.3 + gray-matter@^4.0.3 dependencies + package-lock.json
  - tests/no-js-yaml.test.ts architectural-invariant audit banning js-yaml
  - .gitattributes pinning *.spec.md + fixtures/**/*.spec.md to LF
  - .gitignore excluding tests/tmp/ round-trip sandbox
affects: [02-02 (real parser), 02-03 (sigil normalizer), 02-04 (writeSpecFile), 02-05 (.spec.json deletion), all Phase 3-9 consumers via src/serialize/index.ts barrel]

# Tech tracking
tech-stack:
  added:
    - yaml@^2.8.3 (eemeli/yaml — Document AST, comment-preserving round-trip)
    - gray-matter@^4.0.3 (frontmatter splitter; wired to eemeli/yaml via engines option in Plan 02-02)
  patterns:
    - "Phase-2 serialize layer mirrors Phase-1 model layer structure: leaf modules + co-located tests + explicit-named barrel (NOT export *)"
    - "Wave-0 stub body inside production module (parse.ts) — stable public contract, internals swap in Plan 02-05"
    - "Architectural-invariant test (no-js-yaml) — walks disk + package.json at test time to assert negative-space stack decisions"

key-files:
  created:
    - src/serialize/index.ts (public barrel)
    - src/serialize/parse.ts (parseSpecFile Wave-0 stub)
    - src/serialize/write.ts (writeSpecFile signature stub)
    - src/serialize/ast-handle.ts (AstHandle type w/ BLOCKER-fix fields)
    - src/serialize/diagnostics.ts (SERDE_CODES + re-exports)
    - src/serialize/diagnostics.test.ts (9 assertions)
    - src/serialize/body.ts (empty stub → Plan 02-02)
    - src/serialize/sigil.ts (empty stub → Plans 02-02/04)
    - src/serialize/unknown.ts (empty stub → Plans 02-02/04)
    - src/serialize/schema-inject.ts (empty stub → Plan 02-04)
    - src/serialize/frontmatter.ts (empty stub → Plan 02-02)
    - src/serialize/atomic.ts (empty stub → Plan 02-04)
    - tests/no-js-yaml.test.ts (3 assertions: package.json + deps + source grep)
    - .gitattributes (LF pin for *.spec.md)
  modified:
    - package.json (dependencies + devDependencies)
    - package-lock.json (+12 packages)
    - .gitignore (+tests/tmp/)
    - tests/fixtures.test.ts (readFixture → parseSpecFile)
    - tests/malformed.test.ts (readFixture → parseSpecFile)
    - tests/catalog-coverage.test.ts (readFixture → parseSpecFile)
    - tests/fidelity.test.ts (readFixture → parseSpecFile)
  deleted:
    - tests/helpers/parse-fixture.ts (superseded by parseSpecFile Wave-0 stub)

key-decisions:
  - "parseSpecFile Wave-0 stub reads .spec.json sibling internally — stable public contract lets the 4 Phase-1 integration tests migrate off parse-fixture.ts TODAY while the real parser is still being built. Plan 02-05 swaps the body and deletes the siblings simultaneously."
  - "AstHandle ships with closingDelimiterTerminator + hasFrontmatter fields from day 1 (BLOCKER fixes #1 + #2 from revision). Adding these later would require a coordinated edit across parse.ts + write.ts + every consumer; registering them up-front makes the write-path reconstruction in Plan 02-04 a pure additive change."
  - "src/serialize/index.ts uses explicit-named exports (NOT export *) — matches src/model/index.ts precedent. Adding a new public name is a deliberate edit here rather than an implicit surface-area expansion."
  - "No-js-yaml audit excludes its own file via self-path check — the describe/it titles and header comment contain the literal string 'from js-yaml' as explanatory text; without the exclusion the grep self-matches."
  - ".spec.json fixture siblings are RETAINED in Plan 02-01 (deletion moves to Plan 02-05). Wave-0 stub needs them; sequencing deletion after the real parser proves green against all 20 fixtures avoids a mega-commit."
  - "gray-matter@4.0.3 pulls js-yaml@3.14.2 as a TRANSITIVE nested dep for its default YAML engine. Accepted per threat T-02-SupplyChain-Transitive (disposition: accept). Phase 02-02 wires gray-matter to eemeli/yaml via the engines option so our runtime never actually reaches the transitive."

patterns-established:
  - "Phase-2 TDD per-task commit pair: test(02-XX): RED ... → feat(02-XX): GREEN ... (mirrors Phase-1 convention). Refactor tasks use refactor(02-XX): ..."
  - "Wave-0 stub pattern: production module (src/serialize/parse.ts) carries a temporary implementation body that satisfies the public contract via a fallback path (.spec.json read). Replaced by real implementation in a later plan without touching the callers."
  - "Load-bearing opaque type pattern: AstHandle carries fields (closingDelimiterTerminator) that WRITE-time code depends on. Adding them at creation time prevents a forward-compat rupture."
  - "Architectural-invariant audit pattern: tests/no-js-yaml.test.ts walks disk + package.json to assert CLAUDE.md stack decisions stay honored. Failure = silent reversal of policy."

requirements-completed: [SERDE-02, SPEC-09]

# Metrics
duration: 8m 35s
completed: 2026-04-17
---

# Phase 02 Plan 01: Serialization Wave-0 Substrate Summary

**yaml + gray-matter dependencies wired; src/serialize/ L3 layer scaffolded with 12 files; AstHandle carries BLOCKER-fix closingDelimiterTerminator + hasFrontmatter; 4 Phase-1 integration tests migrated off parse-fixture.ts onto parseSpecFile Wave-0 stub; full gate green at 309/309 tests.**

## Performance

- **Duration:** 8m 35s
- **Started:** 2026-04-17T21:03:47Z
- **Completed:** 2026-04-17T21:12:22Z
- **Tasks:** 2 (5 commits: 2 RED + 2 GREEN + 1 REFACTOR)
- **Files created:** 14
- **Files modified:** 7
- **Files deleted:** 1

## Accomplishments

- **yaml@^2.8.3 + gray-matter@^4.0.3** installed; `npm ls` confirms yaml@2.8.3 deduped with vite's transitive; package-lock.json locks the full transitive tree.
- **src/serialize/ L3 layer** scaffolded with the exact 12 files specified: ast-handle.ts, atomic.ts, body.ts, diagnostics.{ts,test.ts}, frontmatter.ts, index.ts, parse.ts, schema-inject.ts, sigil.ts, unknown.ts, write.ts.
- **SERDE_CODES registry** registers 6 Phase-2 diagnostic codes (SPEC_ORPHAN_TEMP_FILE, SPEC_SIGIL_PARTIAL_DROPPED, SPEC_UNKNOWN_TOP_LEVEL_KEY, SERDE_YAML11_GOTCHA, SERDE_BYTE_DRIFT_DETECTED, SERDE_MISSING_DELIMITER); re-exports Phase-1 error/info/warning factories for single-module ergonomics.
- **AstHandle opaque type** carries `closingDelimiterTerminator: "\n" | "\r\n" | ""` (BLOCKER fix #1) and `hasFrontmatter: boolean` (BLOCKER fix #2) as load-bearing fields for byte-identical round-trip.
- **parseSpecFile Wave-0 stub** reads `.spec.json` sibling (Phase-1 convention) internally — stable public contract `{spec, astHandle, diagnostics, body}` lets the 4 Phase-1 integration tests migrate off `tests/helpers/parse-fixture.ts` today; Plan 02-02 swaps the body for the real gray-matter + eemeli/yaml pipeline.
- **tests/no-js-yaml.test.ts** architectural-invariant audit (3 assertions: no js-yaml in deps, yaml + gray-matter present at pinned majors, no `from "js-yaml"` imports in src/ or tests/). Covers CLAUDE.md "What NOT to Use" decision.
- **.gitattributes** pins `*.spec.md` and `fixtures/**/*.spec.md` to LF (RESEARCH Pitfall 5 — Buffer.equals round-trip fails on CRLF drift).
- **.gitignore** adds `tests/tmp/` round-trip write sandbox (RESEARCH Open Q#2).
- **4 Phase-1 tests migrated:** tests/{fixtures,malformed,catalog-coverage,fidelity}.test.ts now import `parseSpecFile` from `../src/serialize/index.ts`; `tests/helpers/parse-fixture.ts` deleted (zero remaining consumers).
- **309/309 tests across 21 files** (was 297/19 at baseline → +3 no-js-yaml + 9 diagnostics registry = 309); `npx tsc --noEmit` 0 errors; `npx biome check .` 0 errors.

## Task Commits

Each task committed atomically with the TDD per-task pair convention established in Phase 1:

1. **Task 1: Deps + audit + .gitattributes + .gitignore** — TDD RED/GREEN pair
   - RED: `c67fb55` — `test(02-01): RED — no-js-yaml audit + .gitattributes + .gitignore tmp/`
   - GREEN: `a9400a2` — `feat(02-01): GREEN — add yaml@^2.8.3 + gray-matter@^4.0.3; audit passes`

2. **Task 2: Scaffold src/serialize/ + migrate Phase-1 tests** — TDD RED/GREEN/REFACTOR triple
   - RED: `62c385d` — `test(02-01): RED — src/serialize/diagnostics.test.ts registry assertions`
   - GREEN: `4400578` — `feat(02-01): GREEN — scaffold src/serialize/; stub parseSpecFile via .spec.json`
   - REFACTOR: `a68f896` — `refactor(02-01): migrate 4 Phase-1 tests to parseSpecFile; delete parse-fixture helper`

_(Plan metadata commit follows SUMMARY.md + STATE.md write-through step.)_

## Files Created/Modified

### Created
- `src/serialize/index.ts` — public barrel (explicit-named exports: parseSpecFile, ParseResult, writeSpecFile, WriteResult, AstHandle, LineEndingStyle, ClosingDelimiterTerminator, SERDE_CODES, SerdeCode)
- `src/serialize/parse.ts` — parseSpecFile Wave-0 stub (delegates to .spec.json sibling; contract stable for Plan 02-02 swap)
- `src/serialize/write.ts` — writeSpecFile signature stub (throws "see Plan 02-04")
- `src/serialize/ast-handle.ts` — AstHandle opaque type + LineEndingStyle + ClosingDelimiterTerminator
- `src/serialize/diagnostics.ts` — SERDE_CODES (6 codes) + re-exports of Phase-1 error/info/warning/DiagnosticSchema
- `src/serialize/diagnostics.test.ts` — registry shape + re-export round-trip tests (9 assertions)
- `src/serialize/body.ts` — empty stub (Plan 02-02 opaque-string body splice)
- `src/serialize/sigil.ts` — empty stub (Plan 02-02 normalizer + Plan 02-04 emitter)
- `src/serialize/unknown.ts` — empty stub (Plan 02-02 partition + Plan 02-04 re-injection)
- `src/serialize/schema-inject.ts` — empty stub (Plan 02-04 first-save schema version inject)
- `src/serialize/frontmatter.ts` — empty stub (Plan 02-02 findFrontmatterBounds)
- `src/serialize/atomic.ts` — empty stub (Plan 02-04 atomicWrite + orphan-tmp detector)
- `tests/no-js-yaml.test.ts` — 3 architectural-invariant audit tests
- `.gitattributes` — `*.spec.md text eol=lf` + fixture dir-specific rule

### Modified
- `package.json` — added `yaml: ^2.8.3` + `gray-matter: ^4.0.3` to dependencies (dep list now alphabetized: gray-matter, jsonpointer, yaml, zod)
- `package-lock.json` — +12 packages net (yaml family + gray-matter + js-yaml@3.14.2 transitive nested under gray-matter)
- `.gitignore` — +`tests/tmp/`
- `tests/fixtures.test.ts` — import swap readFixture → parseSpecFile; await + destructure
- `tests/malformed.test.ts` — import swap; Stage-A clones now JSON-round-trip the validated Spec object; "never throws" reshaped to `.resolves.toBeDefined()`
- `tests/catalog-coverage.test.ts` — import swap; walker consumes Spec directly (not raw JSON)
- `tests/fidelity.test.ts` — import swap; walker typed against Spec

### Deleted
- `tests/helpers/parse-fixture.ts` — superseded by `parseSpecFile` Wave-0 stub (grep confirms zero remaining imports)
- `tests/helpers/` directory (became empty after helper deletion; removed implicitly by git)

## Decisions Made

- **parseSpecFile Wave-0 stub reads `.spec.json` sibling internally** — inverting the dependency order lets the 4 Phase-1 integration tests migrate off parse-fixture.ts TODAY, without waiting for the real parser in Plan 02-02. The stub's public contract is stable (`{spec, astHandle, diagnostics, body}`); Plan 02-05 swaps the body and deletes the `.spec.json` fixtures simultaneously.
- **AstHandle ships with BLOCKER-fix fields from day 1** — `closingDelimiterTerminator: "\n" | "\r\n" | ""` and `hasFrontmatter: boolean` are load-bearing for byte-identical round-trip (SERDE-05). Registering them up-front makes the write-path reconstruction in Plan 02-04 a pure additive change rather than a coordinated multi-file edit.
- **Explicit-named barrel (NOT `export *`) in src/serialize/index.ts** — matches src/model/index.ts precedent. Adding a new public name is a deliberate edit here rather than an implicit surface-area broadening.
- **No-js-yaml audit self-exclusion** — the test file's describe/it titles and header comment contain the literal string `from 'js-yaml'` as explanatory text. Without a self-path exclusion, the grep loop false-positives on its own content. Scoped the walk filter to `f !== resolve("tests/no-js-yaml.test.ts")`.
- **`.spec.json` fixture siblings RETAINED in Plan 02-01** — deletion moves to Plan 02-05. Wave-0 stub needs them to keep the 4 Phase-1 tests green while the real parser is still being built. Deleting in this plan would require the real parser to already exist.
- **gray-matter's transitive js-yaml@3.14.2 is ACCEPTED** — per threat T-02-SupplyChain-Transitive (plan frontmatter threat_model, disposition `accept`). Phase 02-02 wires gray-matter to eemeli/yaml via its `engines` option (CLAUDE.md + RESEARCH §Example 1 wiring), so the runtime never actually reaches the transitive js-yaml. Direct-dep audit in tests/no-js-yaml.test.ts stays green.
- **Snapshot regeneration was a no-op** — tests/__snapshots__/malformed.test.ts.snap unchanged after `vitest run --update`. Expected, because the diagnostic sorting is stable and the `.spec.json` → validateSpec path is byte-identical to the pre-migration code.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] no-js-yaml audit self-matches its own comments**
- **Found during:** Task 1 (verifying RED state on audit test)
- **Issue:** The grep `from\s+["']js-yaml["']` matched the describe/it titles and header comment of `tests/no-js-yaml.test.ts` itself, producing a false-positive offender list even before any real source code imports were checked.
- **Fix:** Added a `selfPath = resolve("tests/no-js-yaml.test.ts")` filter to the walk output. Documented in-line: "its string literals in comments + describe/it titles would false-positive against the import grep".
- **Files modified:** `tests/no-js-yaml.test.ts`
- **Verification:** Re-ran the audit in RED state; only the dep-presence assertion still failed (the intentional RED signal), and the self-reference false-positive disappeared.
- **Committed in:** `c67fb55` (Task 1 RED commit)

**2. [Rule 1 - Bug] Biome flagged unsorted exports in src/serialize/index.ts**
- **Found during:** Task 2 GREEN (biome check after scaffold landed)
- **Issue:** Biome's `assist/source/organizeImports` rule flagged the `export { type SerdeCode, SERDE_CODES }` and `export { parseSpecFile, type ParseResult }` declarations as unsorted (wanted `type` prefix after the value name in sort order).
- **Fix:** Ran `npx biome check --write .` to auto-apply the safe fix (no semantic change; purely alphabetical reorder within each re-export statement).
- **Files modified:** `src/serialize/index.ts`, `src/serialize/diagnostics.test.ts`
- **Verification:** `npx biome check .` 0 errors post-fix; tests still pass 9/9.
- **Committed in:** `4400578` (Task 2 GREEN commit — landed as part of the scaffold)

**3. [Rule 1 - Bug] Biome format adjustment on tests/fixtures.test.ts**
- **Found during:** Task 2 REFACTOR (biome check after test migration)
- **Issue:** Biome's printer wanted the `it.each(CANONICAL)(...)` call reflowed across multiple lines (arguments on separate lines due to total width).
- **Fix:** Ran `npx biome check --write .` to auto-apply.
- **Files modified:** `tests/fixtures.test.ts`
- **Verification:** `npx biome check .` clean; vitest run 309/309.
- **Committed in:** `a68f896` (Task 2 REFACTOR commit)

---

**Total deviations:** 3 auto-fixed (all Rule 1 — Bug; all lint/format issues with safe auto-fixes, no semantic changes).
**Impact on plan:** Zero scope creep. All three are mechanical tooling adjustments that restored green-gate state without altering any tested behaviour or public contract.

## Threat Flags

None. No new security-relevant surface introduced beyond what the plan's `<threat_model>` already covers (npm supply-chain via yaml + gray-matter; read-only disk walks in audit test; existing `validateSpec` threat mitigations unchanged).

## Issues Encountered

- **gray-matter@4.0.3 pulls js-yaml@3.14.2 as a transitive.** Initially surfaced in `npm ls js-yaml` after the GREEN install step. Verified against threat model T-02-SupplyChain-Transitive — disposition is `accept`. Runtime never reaches this transitive because Plan 02-02 wires gray-matter to eemeli/yaml via the `engines` option. The direct-dependency audit (`tests/no-js-yaml.test.ts`) only walks our own `package.json` dep fields, so the transitive presence is not a regression signal. **Re-check at every `npm install`** remains a standing action per threat model.
- **No other issues.** Both tasks ran clean RED→GREEN (→REFACTOR for Task 2) with three mechanical lint/format auto-fixes noted above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Wave 0 gate CLOSED.** All downstream Phase-2 plans (02-02 real parser, 02-03 sigil normalizer, 02-04 writeSpecFile, 02-05 .spec.json deletion) can now compile and run — `yaml` and `gray-matter` are installed, the `src/serialize/` scaffold compiles, and `parseSpecFile` is importable with a stable contract.
- **Phase 1 regression intact.** 297 Phase-1 tests still green after migrating off `parse-fixture.ts` onto `parseSpecFile` — validates that the Wave-0 stub is byte-identical behaviorally to the old helper for `.spec.json`-backed fixtures.
- **BLOCKER fixes landed up-front.** `closingDelimiterTerminator` + `hasFrontmatter` on `AstHandle` are registered; Plan 02-02 produces them via `findFrontmatterBounds`; Plan 02-04 consumes `closingDelimiterTerminator` in the write-path reconstruction.
- **`.spec.json` siblings deliberately retained.** Scheduled for deletion in Plan 02-05 Task 4 after the real parser proves green against all 20 fixtures. Retaining now lets Plan 02-02 replace the Wave-0 stub body in a single focused commit instead of a mega-commit.

## Self-Check

Verification of all claims in this SUMMARY against disk + git:

- ✅ `src/serialize/index.ts` — FOUND
- ✅ `src/serialize/parse.ts` — FOUND
- ✅ `src/serialize/write.ts` — FOUND
- ✅ `src/serialize/ast-handle.ts` — FOUND
- ✅ `src/serialize/diagnostics.ts` — FOUND
- ✅ `src/serialize/diagnostics.test.ts` — FOUND
- ✅ `src/serialize/body.ts` — FOUND
- ✅ `src/serialize/sigil.ts` — FOUND
- ✅ `src/serialize/unknown.ts` — FOUND
- ✅ `src/serialize/schema-inject.ts` — FOUND
- ✅ `src/serialize/frontmatter.ts` — FOUND
- ✅ `src/serialize/atomic.ts` — FOUND
- ✅ `tests/no-js-yaml.test.ts` — FOUND
- ✅ `.gitattributes` — FOUND
- ✅ `tests/helpers/parse-fixture.ts` — ABSENT (deleted as planned)
- ✅ Commit `c67fb55` — FOUND (Task 1 RED)
- ✅ Commit `a9400a2` — FOUND (Task 1 GREEN)
- ✅ Commit `62c385d` — FOUND (Task 2 RED)
- ✅ Commit `4400578` — FOUND (Task 2 GREEN)
- ✅ Commit `a68f896` — FOUND (Task 2 REFACTOR)

## Self-Check: PASSED

---
*Phase: 02-serialization-round-trip*
*Completed: 2026-04-17*
