---
phase: 02-serialization-round-trip
plan: 02
subsystem: serialization
tags: [yaml, gray-matter, eemeli-yaml, tdd, frontmatter, prototype-pollution, phase-2-wave-1]

# Dependency graph
requires:
  - phase: 02-serialization-round-trip
    provides: src/serialize/ scaffold (Plan 02-01), AstHandle type with closingDelimiterTerminator + hasFrontmatter fields, SERDE_CODES registry, parseSpecFile Wave-0 stub, 4 Phase-1 canonical/malformed .spec.md fixtures
  - phase: 01-spec-model-invariants
    provides: SCHEMA_VERSION literal + SpecSchema.strict() root (5-key shape) — informs KNOWN_TOP_LEVEL_KEYS
provides:
  - src/serialize/body.ts — findFrontmatterBounds + extractBodyBytes (opaque-slab body extraction from origBytes, D-18)
  - src/serialize/frontmatter.ts — splitFrontmatter + detectLineEndingStyle (gray-matter → eemeli/yaml wiring, BLOCKER fixes #1 + #2 propagated into ParsedFrontmatter)
  - src/serialize/unknown.ts — partitionTopLevel + KNOWN_TOP_LEVEL_KEYS + ADVERSARIAL_KEYS (D-26/D-27 AST-native unknown preservation + BLOCKER fix #3 save-gate hook)
  - Co-located test coverage: 3 test files / 31 assertions (5 bounds + 5 body + 11 frontmatter + 3 detect + 7 unknown)
affects: [02-03 (sigil normalizer consumes ParsedFrontmatter.doc), 02-04 (writeSpecFile consumes closingDelimiterTerminator + ADVERSARIAL_KEYS), 02-05 (real-parser swap of parseSpecFile stub), all Phase 3-9 consumers via parseSpecFile]

# Tech tracking
tech-stack:
  added: []  # No new deps; consumes yaml@^2.8.3 + gray-matter@^4.0.3 already installed in 02-01
  patterns:
    - "gray-matter ↔ eemeli/yaml wiring: engines.yaml.parse returns YAML.Document verbatim (Assumption A3); engines.yaml.stringify defensively throws (write path uses manual splice, never matter.stringify)"
    - "Byte-level delimiter detection: /^---+[ \\t]*$/m regex explicitly EXCLUDES \\n/\\r from the trailing-whitespace class so closingTerminator can distinguish LF / CRLF / empty (BLOCKER fix #1)"
    - "AST-native unknown-key partition via Object.create(null) knownSubset (T-02-ProtoPollution Layer 1 defense); ADVERSARIAL_KEYS exported as a Set for save-time re-check (BLOCKER fix #3)"
    - "isEmpty access via indexed Record cast (gray-matter runtime sets the flag but .d.ts omits it)"

key-files:
  created:
    - src/serialize/body.test.ts (10 tests)
    - src/serialize/frontmatter.test.ts (14 tests)
    - src/serialize/unknown.test.ts (7 tests)
  modified:
    - src/serialize/body.ts (empty stub → full implementation with findFrontmatterBounds + extractBodyBytes)
    - src/serialize/frontmatter.ts (empty stub → full implementation with splitFrontmatter + detectLineEndingStyle)
    - src/serialize/unknown.ts (empty stub → full implementation with partitionTopLevel + KNOWN_TOP_LEVEL_KEYS + ADVERSARIAL_KEYS)

key-decisions:
  - "DELIMITER_REGEX uses [ \\t]* (not \\s*) for trailing whitespace — \\s matches newline chars, which would be greedily consumed into match[0] and erase the LF/CRLF/empty distinction that closingTerminator load-bears."
  - "gray-matter's `isEmpty` flag is missing from its .d.ts but set at runtime. Reading via `(file as unknown as Record<string, unknown>).isEmpty === true` keeps the path TypeScript-clean without `as any` (Biome bans noExplicitAny)."
  - "`parse: (str: string): object` not `unknown` — gray-matter's engines contract requires `object`. YAML.Document is a class instance (structurally `object`), so no runtime wrapping needed."
  - "Cast `file.data as unknown as Document` uses double-cast because gray-matter types file.data as `{[key: string]: any}` — a direct `as Document` fails with noExplicitAny downstream. Intermediate `unknown` is the compliant pattern."
  - "KNOWN_TOP_LEVEL_KEYS array collapsed to single-line literal by Biome's printer (under line-width 100). Signal is preserved as `readonly [...] as const`; ordering mirrors SpecSchema fields."
  - "Non-map Document (scalar or sequence at root) early-returns empty partition instead of throwing. parse.ts (Plan 05) owns the SERDE_* diagnostic decision."
  - "Unknown-subtree value projection uses `pair.value.toJSON()` when available so validateSpec sees plain JS. Comments in subtree values are intentionally lost in this transient copy; the Document AST itself is untouched, so write-path re-emission preserves them."

patterns-established:
  - "TDD commit pair per task: test(02-02): RED — ... → feat(02-02): GREEN — ... (mirrors Phase-1 / Plan 02-01 convention; reconstructable via `git log --oneline | grep 02-02`)"
  - "BLOCKER-fix threading: Plan-01 reserves load-bearing fields on AstHandle (closingDelimiterTerminator, hasFrontmatter); Plan-02 populates them via findFrontmatterBounds → ParsedFrontmatter; Plan-04 consumes them in writeSpecFile."
  - "ADVERSARIAL_KEYS re-export: security primitives exposed at the module boundary (not inlined) so sibling modules in later plans can re-check without rebuilding the registry."
  - "Test-file narrowing pattern: `if (bounds === null) throw new Error(...)` replaces non-null assertions (Biome `noNonNullAssertion` forbids `!`). Same pattern for `match[1]` capture access."

requirements-completed: [SERDE-01, SERDE-02, SERDE-04, SPEC-08]

# Metrics
duration: 7m 24s
completed: 2026-04-18
---

# Phase 02 Plan 02: Serialize L1 Primitives Summary

**gray-matter + eemeli/yaml wiring with Document-AST return; byte-level frontmatter delimiter detection capturing exact closing terminator; AST-native top-level unknown-key partition with prototype-pollution defense; 31 unit tests green across 3 modules.**

## Performance

- **Duration:** 7m 24s
- **Started:** 2026-04-17T21:20:26Z
- **Completed:** 2026-04-17T21:27:50Z
- **Tasks:** 2 (4 commits: 2 RED + 2 GREEN)
- **Files created:** 3 test files
- **Files modified:** 3 source modules (stub → full impl)
- **Tests added:** 31 (delta 309 → 340 full suite)

## Accomplishments

- **src/serialize/body.ts** — pure-function delimiter detector. `findFrontmatterBounds(origBytes)` returns `{ start, end, closingTerminator: "\n" | "\r\n" | "" }` via a single regex pass followed by explicit terminator inspection; `extractBodyBytes(origBytes)` slices `origBytes.slice(bounds.end)` so leading whitespace after the closing `---` survives verbatim (Pitfall 7). BLOCKER fix #1 materialized.
- **src/serialize/frontmatter.ts** — wires `gray-matter@^4.0.3` to `eemeli/yaml@^2.8.3` via `engines.yaml.parse = YAML.parseDocument(str, { version: "1.2", keepSourceTokens: true })`. `engines.yaml.stringify` throws defensively. `ParsedFrontmatter` carries `doc: Document`, `bodyBytes`, `origBytes`, `isEmpty` (gray-matter's signal: map-between-delimiters-empty), `hasFrontmatter` (BLOCKER fix #2: delimiters-found signal), `closingDelimiterTerminator` (BLOCKER fix #1), `lineEndingStyle`, and frontmatter byte offsets. `detectLineEndingStyle` picks CRLF if it appears at or before the first LF.
- **src/serialize/unknown.ts** — AST-native partition. `KNOWN_TOP_LEVEL_KEYS = ["schema","screens","actions","data","navigation"] as const` mirrors `SpecSchema` root (D-27). `ADVERSARIAL_KEYS = Set(["__proto__","constructor","prototype"])` exported for Plan 04 writeSpecFile re-check (BLOCKER fix #3). `partitionTopLevel(doc)` iterates `doc.contents.items` once, builds `knownSubset` via `Object.create(null)` (T-02-ProtoPollution Layer 1), classifies adversarial + foreign keys as unknown. Non-map document early-returns empty. AST never mutated.
- **Test coverage** — 31 assertions across 3 co-located test files, all green:
  - body.test.ts (10): LF/CRLF/empty-terminator bounds; empty-body + comment-only-body + no-frontmatter extraction; CRLF preservation; habit-tracker fixture slice check.
  - frontmatter.test.ts (14): habit-tracker Document-AST verification (schema+screens+actions+data+navigation); hasFrontmatter LF fixture; lineEndingStyle; body-from-orig Pitfall 7; frontmatterStart/End bracket check; BLOCKER fix #2 no-delimiter + empty-map cases; BLOCKER fix #1 no-trailing-newline + CRLF terminator cases; isEmpty zero-key check; defensive stringify-throw source grep; detectLineEndingStyle 3 branches.
  - unknown.test.ts (7): KNOWN_TOP_LEVEL_KEYS 5-key registry; ADVERSARIAL_KEYS 3-key registry; partition with one unknown; __proto__ defense (unknownKeys contains it, knownSubset prototype is null); non-map document empty partition; AST-items length+order unchanged; real habit-tracker fixture 5-known / 0-unknown.
- **Full gate green:** `npx vitest run` 340/340 across 24 files (was 309 baseline + 31 new); `npx tsc --noEmit` 0 errors; `npx biome check .` 0 errors.

## Assumption A1 / A3 / A7 findings from real-fixture runs

- **A3 (gray-matter passes engine.parse return verbatim to file.data)** — CONFIRMED. The real habit-tracker fixture returns `parsed.doc instanceof YAML.Document === true` with all 5 top-level keys queryable via `.has(key)`. No wrapping, no coercion. The only type-level friction is gray-matter declaring `file.data` as `{[key: string]: any}`, requiring `file.data as unknown as Document` at the return-site (documented key decision).
- **A7 (SERDE_MISSING_DELIMITER signal)** — CONFIRMED to require BLOCKER fix #2. `gray-matter` treats `"---\n---\n\nbody\n"` as `isEmpty: true` with `hasFrontmatter: true` semantics (matterStr empty but delimiters present). Our `hasFrontmatter` field — authoritatively derived from `findFrontmatterBounds !== null` — is the ONLY correct signal for "delimiters completely absent" (e.g., raw Markdown). Plan 05 parse.ts will use `!hasFrontmatter` (not `isEmpty && matterStr === ""`) to emit SERDE_MISSING_DELIMITER.
- **A1 (eemeli/yaml consumes the slice between delimiters)** — PARTIALLY EXERCISED. Our engine receives `str = file.matter` (the substring gray-matter extracts between delimiters). The Document returned round-trips all 5 known keys for habit-tracker. Full Buffer.equals round-trip is validated in Plan 02-05, not here.

## Delimiter regex behavior on edge-case fixtures

| Input                                   | Bounds start | Terminator | Body slice                |
|-----------------------------------------|--------------|------------|---------------------------|
| `---\nfoo: 1\n---\n# body\n`            | 0            | `"\n"`     | `"# body\n"`              |
| `---\r\nfoo: 1\r\n---\r\n# body\r\n`    | 0            | `"\r\n"`   | `"# body\r\n"`            |
| `---\nfoo: 1\n---`                      | 0            | `""`       | `""` (empty-body)         |
| `---\nfoo: 1\n---\n`                    | 0            | `"\n"`     | `""` (empty-body + nl)    |
| `---\nfoo: 1\n---\n\n# comment-only\n`  | 0            | `"\n"`     | `"\n# comment-only\n"`    |
| `no frontmatter here\n`                 | (null)       | n/a        | `""` (no-frontmatter)     |
| `---\nfoo: 1\n` (unterminated)          | (null)       | n/a        | `""` (no-frontmatter)     |

The load-bearing insight: `/^---+[ \t]*$/m` excludes `\n`/`\r` from trailing-whitespace matching so the terminator stays OUTSIDE `match[0]` and can be inspected byte-by-byte afterwards. With `/^---+\s*$/m` the terminator was being greedily absorbed, breaking BLOCKER fix #1.

## Fixture partition sanity check (habit-tracker.spec.md)

Extracted frontmatter slice via `raw.match(/^---\n([\s\S]*?)\n---/)[1]`, passed to `YAML.parseDocument(slice, { version: "1.2", keepSourceTokens: true })`, then `partitionTopLevel(doc)`:

- `knownSubset` keys: `["actions", "data", "navigation", "schema", "screens"]` (5/5 expected)
- `unknownKeys`: `[]` (0 expected — fixture is fully canonical)
- `closingDelimiterTerminator` observed on the full file: `"\n"` (LF, consistent with `.gitattributes` pin)

## Distribution of closingDelimiterTerminator values across fixtures

Not directly observed in this plan's test matrix (that integration lands in Plan 02-05). The unit tests do exercise all three values against synthetic inputs:
- `"\n"` — LF (7 test cases including habit-tracker real fixture)
- `"\r\n"` — CRLF (3 test cases: body.ts bounds, body.ts extractBodyBytes, frontmatter.ts splitFrontmatter)
- `""` — empty (3 test cases: bounds no-newline, extractBody no-newline, splitFrontmatter no-newline)

## Task Commits

Each task committed atomically with the TDD per-task pair convention:

1. **Task 1: frontmatter.ts + body.ts (gray-matter wiring + body-bytes extractor + closing-terminator capture)** — TDD RED/GREEN pair
   - RED: `3fabe2d` — `test(02-02): RED — body.ts + frontmatter.ts unit tests (incl. closingTerminator + hasFrontmatter)`
   - GREEN: `7672e3f` — `feat(02-02): GREEN — split frontmatter + capture closing terminator + hasFrontmatter signal`

2. **Task 2: unknown.ts — top-level key partition (AST-native unknown preservation) + exported ADVERSARIAL_KEYS** — TDD RED/GREEN pair
   - RED: `42251e5` — `test(02-02): RED — unknown.ts partition tests (incl. __proto__ defense + ADVERSARIAL_KEYS export)`
   - GREEN: `d924abe` — `feat(02-02): GREEN — partitionTopLevel + exported ADVERSARIAL_KEYS for Plan 04 re-check`

_(Plan metadata commit follows SUMMARY.md + STATE.md write-through step.)_

## Files Created/Modified

### Created
- `src/serialize/body.test.ts` — 10 assertions across findFrontmatterBounds (5) + extractBodyBytes (5)
- `src/serialize/frontmatter.test.ts` — 14 assertions across splitFrontmatter (11) + detectLineEndingStyle (3)
- `src/serialize/unknown.test.ts` — 7 assertions across KNOWN_TOP_LEVEL_KEYS + ADVERSARIAL_KEYS + partitionTopLevel (5)

### Modified
- `src/serialize/body.ts` — empty stub (7 lines) → full implementation (83 lines): DELIMITER_REGEX, `FrontmatterBounds` interface, `findFrontmatterBounds`, `extractBodyBytes`
- `src/serialize/frontmatter.ts` — empty stub (7 lines) → full implementation (114 lines): `ParsedFrontmatter` interface, `detectLineEndingStyle`, `splitFrontmatter`
- `src/serialize/unknown.ts` — empty stub (7 lines) → full implementation (93 lines): `KNOWN_TOP_LEVEL_KEYS`, `ADVERSARIAL_KEYS`, `PartitionResult`, `partitionTopLevel`

### Deleted
- None

## Decisions Made

- **DELIMITER_REGEX `/^---+[ \t]*$/m` (not `\s*`)** — `\s` matches newlines; allowing it would let the regex greedily absorb the closing terminator into `match[0]`, erasing the LF / CRLF / empty distinction that `closingTerminator` load-bears. This was discovered during the GREEN phase when 6/24 tests failed with `expected '\r\n' to be '\n'` and `expected '\n# body\n' to be '# body\n'` — the regex fix restored all three terminator variants simultaneously.
- **gray-matter's undeclared `isEmpty` runtime property accessed via indexed Record cast** — the `.d.ts` omits the property, but the runtime sets it. Using `(file as unknown as Record<string, unknown>).isEmpty === true` satisfies `noExplicitAny` (forbids `as any`) while keeping the semantic access visible.
- **`parse: (str: string): object`** — gray-matter's engines contract requires `object`. `YAML.Document` is structurally `object` (class instance), so the type fits without wrapping. Returning `unknown` directly failed tsc with "not assignable to `object`".
- **`file.data as unknown as Document` double-cast** — gray-matter types `file.data` as `{[key: string]: any}` (noExplicitAny via transitive). Direct `as Document` would propagate `any`; intermediate `unknown` is the compliant pattern.
- **Partition non-map Document returns empty `{knownSubset:{}, unknownKeys:[]}`** — keeps the function total. Diagnostic emission for pathological cases is parse.ts's job (Plan 05), not this leaf module's.
- **KNOWN_TOP_LEVEL_KEYS line-wrapped to single line by Biome** — `["schema","screens","actions","data","navigation"] as const` fits under line-width 100. Readonly tuple semantics preserved; string-array grep still counts all 5 via a single match.
- **Test assertion pattern for nullable bounds: `if (bounds === null) throw new Error("expected bounds to be non-null")`** — Biome's `noNonNullAssertion` rule forbids `bounds!.start`. The early-throw narrows TypeScript's control flow and produces the same fail-fast behavior on test breakage.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Initial DELIMITER_REGEX `/^---+\s*$/m` greedily consumed terminator**
- **Found during:** Task 1 (Task 1 GREEN vitest run after initial implementation)
- **Issue:** `\s*` matches `\n` and `\r`. In multi-line mode, the regex matched `---\n` into `match[0]` — `match[0].length` became 4 (not 3), so the closing-terminator inspection byte-range landed PAST the terminator. 6/24 tests failed: CRLF bounds (`'\n'` observed vs `'\r\n'` expected), leading-blank body extraction (`'# comment-only\n'` vs `'\n# comment-only\n'`), habit-tracker real fixture (`'<!-- Phase 1...'` vs `'\n<!-- Phase 1...'`), and mirrors in splitFrontmatter tests.
- **Fix:** Tightened the trailing-whitespace class to `[ \t]*` (exclude `\n`, `\r`). Documented the reasoning inline in body.ts header comment.
- **Files modified:** `src/serialize/body.ts`
- **Verification:** All 24 Task-1 tests went from 6 failed → 24 passed after the regex change.
- **Committed in:** `7672e3f` (Task 1 GREEN commit)

**2. [Rule 3 - Blocking] gray-matter engine `parse` signature rejects `unknown` return type**
- **Found during:** Task 1 (Task 1 GREEN tsc check after initial implementation)
- **Issue:** tsc error `TS2322: Type '(str: string) => unknown' is not assignable to type '(input: string) => object'`. gray-matter's `GrayMatterOption.engines` requires the YAML-engine `parse` closure to return `object`.
- **Fix:** Changed the closure signature from `(str: string): unknown` to `(str: string): object`. YAML.Document is structurally an object (class instance), so the return is valid without wrapping.
- **Files modified:** `src/serialize/frontmatter.ts`
- **Verification:** `npx tsc --noEmit` now exits 0.
- **Committed in:** `7672e3f` (Task 1 GREEN commit)

**3. [Rule 3 - Blocking] gray-matter `file.isEmpty` runtime property missing from .d.ts**
- **Found during:** Task 1 (Task 1 GREEN tsc check after initial implementation)
- **Issue:** tsc error `TS2339: Property 'isEmpty' does not exist on type 'GrayMatterFile<string>'`. gray-matter's type declaration lacks the `isEmpty` property even though the runtime sets it (see `node_modules/gray-matter/gray-matter.d.ts:39-47`).
- **Fix:** Access via `(file as unknown as Record<string, unknown>).isEmpty === true`. Documented the reason inline: "gray-matter sets file.isEmpty = true at runtime but the property is not in its .d.ts". Biome's `noExplicitAny` rule precludes `as any` so the `unknown`-then-Record pattern is the compliant form.
- **Files modified:** `src/serialize/frontmatter.ts`
- **Verification:** `npx tsc --noEmit` now exits 0; BLOCKER fix #2 test `isEmpty=true for zero-key frontmatter` still passes.
- **Committed in:** `7672e3f` (Task 1 GREEN commit)

**4. [Rule 1 - Bug] Biome import-order flagged `import YAML` before `import type { Document }`**
- **Found during:** Task 1 (Task 1 GREEN biome check after initial implementation)
- **Issue:** Biome's import-sorter wanted `import type { Document } from "yaml"` BEFORE `import YAML from "yaml"` (type-first on same source).
- **Fix:** Reordered the two yaml imports.
- **Files modified:** `src/serialize/frontmatter.ts`
- **Verification:** `npx biome check .` reduced from 1 error to 0 errors.
- **Committed in:** `7672e3f` (Task 1 GREEN commit)

**5. [Rule 1 - Bug] Biome `useLiteralKeys` flagged `fileIndexed["isEmpty"]` bracket access**
- **Found during:** Task 1 (Task 1 GREEN biome check after fix #3)
- **Issue:** Biome info-level suggestion: "The computed expression can be simplified without the use of a string literal." Wanted `.isEmpty` property access rather than `["isEmpty"]`.
- **Fix:** Changed to `fileIndexed.isEmpty === true`.
- **Files modified:** `src/serialize/frontmatter.ts`
- **Verification:** `npx biome check .` exits 0 (was 1 info).
- **Committed in:** `7672e3f` (Task 1 GREEN commit)

**6. [Rule 1 - Bug] Biome formatter wanted single-line `KNOWN_TOP_LEVEL_KEYS` array literal**
- **Found during:** Task 2 (Task 2 GREEN biome check)
- **Issue:** The 5-element array `["schema","screens","actions","data","navigation"]` fit under the 100-char line-width limit; Biome's printer wanted it collapsed to a single line.
- **Fix:** Ran `npx biome check --write src/serialize/unknown.ts` to apply the auto-fix. Semantic unchanged (readonly tuple `as const` preserved).
- **Files modified:** `src/serialize/unknown.ts`
- **Verification:** `npx biome check .` exits 0; 7/7 unknown.test.ts tests still pass; `grep -cE '"schema"|"screens"|"actions"|"data"|"navigation"'` still confirms all 5 keys present (all on a single line now).
- **Committed in:** `d924abe` (Task 2 GREEN commit)

**7. [Rule 1 - Bug] Test file indentation + non-null assertions clashed with Biome config**
- **Found during:** Task 1 RED phase (biome check on newly-created test files)
- **Issue:** Two biome errors: (a) tests were using tab indentation but Biome config specifies `indentStyle: "space", indentWidth: 2`; (b) tests used non-null assertions like `bounds!.start` which Biome's `noNonNullAssertion` rule rejects.
- **Fix:** Rewrote both test files with 2-space indentation. Replaced non-null assertions with explicit narrowing pattern: `if (bounds === null) throw new Error("expected bounds to be non-null")` for bounds and `if (!match) throw new Error(...)` for regex capture. Same pattern used in frontmatter.test.ts for nullable bounds.
- **Files modified:** `src/serialize/body.test.ts`, `src/serialize/frontmatter.test.ts`
- **Verification:** Biome 0 errors on both files; tests still fail for the right reasons in RED state (function-not-found errors, confirming the GREEN target).
- **Committed in:** `3fabe2d` (Task 1 RED commit — applied inline before RED commit landed)

---

**Total deviations:** 7 auto-fixed (4 × Rule 1 — Bug; 3 × Rule 3 — Blocking compile errors). All were tsc/biome/regex-behavior mismatches surfaced at GREEN-gate verification; no semantic changes to the tested contracts. No scope creep.

## Threat Flags

None. No new security-relevant surface introduced beyond what the plan's `<threat_model>` already covers (T-02-ProtoPollution mitigated via Object.create(null) + ADVERSARIAL_KEYS registry; T-02-YAMLBomb explicitly accepted via YAML 1.2 pinning + Phase-1 5MB input cap; T-02-Input mapped to SERDE_MISSING_DELIMITER via hasFrontmatter signal).

## Issues Encountered

- **Regex greediness issue** (deviation #1 above) was the only substantive issue; all other deviations were mechanical tooling adjustments (import order, literal-key style, array-line-wrap). The regex bug would have been caught by the CRLF-terminator test regardless of which direction the test was written — having the test in RED phase BEFORE implementing body.ts let the bug surface instantly at GREEN check rather than hiding behind downstream flakiness.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Plan 02-03 (sigil normalizer)** can now consume `ParsedFrontmatter.doc: Document` directly. The Document AST has CST srcTokens retained (`keepSourceTokens: true`), which is the prerequisite for round-trip-stable sigil ↔ triple rewriting.
- **Plan 02-04 (writeSpecFile)** can now consume `AstHandle.closingDelimiterTerminator` (BLOCKER fix #1, propagated from ParsedFrontmatter when parse.ts builds the handle) for byte-identical reconstruction. `ADVERSARIAL_KEYS` is importable from `./unknown.ts` for the save-time re-check (BLOCKER fix #3).
- **Plan 02-05 (real-parser swap)** can now replace the Wave-0 `.spec.json` fallback in `parse.ts` with `splitFrontmatter` + `partitionTopLevel` + sigil normalization + validateSpec orchestration. All three modules this plan ships have stable public contracts; the swap is purely additive.
- **Phase-1 regression intact.** 309 → 340 tests (added 31; zero deletions). All 309 pre-existing tests continue to pass — the parseSpecFile Wave-0 stub still backs tests/{fixtures,malformed,catalog-coverage,fidelity}.test.ts via `.spec.json` siblings, and nothing in Plan 02-02 altered that path.

## Self-Check

Verification of all claims in this SUMMARY against disk + git:

- FOUND: `src/serialize/body.ts` (modified stub → full impl)
- FOUND: `src/serialize/frontmatter.ts` (modified stub → full impl)
- FOUND: `src/serialize/unknown.ts` (modified stub → full impl)
- FOUND: `src/serialize/body.test.ts`
- FOUND: `src/serialize/frontmatter.test.ts`
- FOUND: `src/serialize/unknown.test.ts`
- FOUND: Commit `3fabe2d` — Task 1 RED
- FOUND: Commit `7672e3f` — Task 1 GREEN
- FOUND: Commit `42251e5` — Task 2 RED
- FOUND: Commit `d924abe` — Task 2 GREEN
- VERIFIED: `npx vitest run` 340/340 passing across 24 files
- VERIFIED: `npx tsc --noEmit` 0 errors
- VERIFIED: `npx biome check .` 0 errors

## Self-Check: PASSED

---
*Phase: 02-serialization-round-trip*
*Completed: 2026-04-18*
