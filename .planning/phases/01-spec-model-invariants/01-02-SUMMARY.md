---
phase: 01-spec-model-invariants
plan: 02
subsystem: model
tags: [typescript, zod, jsonpointer, rfc-6901, branded-types, diagnostics, vitest]

# Dependency graph
requires:
  - phase: 01-spec-model-invariants
    provides: "Strict TS config (noUncheckedIndexedAccess), zod@4.3.6 + jsonpointer@5.0.1 installed, vitest discovery on src/**/*.test.ts, three-dir src skeleton (primitives/, model/, migrations/)"
provides:
  - Branded ID schemas — `ScreenId`, `ActionId`, `TestID` (snake_case) and `EntityName` (PascalCase) — each a Zod schema that parses to a branded string
  - Reusable regex constants `SNAKE_CASE` and `PASCAL_CASE` so downstream plans import one definition
  - `JsonPointer` branded type + `JsonPointerSchema` (RFC 6901 anchored regex) — Phase 1's single path grammar for data bindings, variant `when` paths, and diagnostic paths (decision D-09)
  - RFC 6901 `encodeSegment` / `decodeSegment` helpers with correct encode-order (~ before /) and decode-order (~1 before ~0)
  - `pathToJsonPointer(path)` adapter — the ONLY conversion from Zod `issue.path` arrays to our Diagnostic.path field (RESEARCH §Pattern 4)
  - `Diagnostic` shape `{ code, severity, path, message }` with closed severity enum (`error | warning | info`) and SCREAMING_SNAKE_CASE code regex
  - `error(code, path, message)` / `warning(...)` / `info(...)` factory helpers for consistent diagnostic construction
  - `src/primitives/index.ts` barrel — downstream `src/model/` imports everything through `../primitives`
affects:
  - 01-03 (L2 model — component catalog, action intents): imports `ScreenIdSchema`, `ActionIdSchema`, `TestIDSchema`, `EntityNameSchema` + regex constants
  - 01-04 (recursion — variants, component tree): imports `JsonPointerSchema` for `when.collection / when.async / when.field_error` paths (D-08)
  - 01-05 (Spec root): composes `DiagnosticSchema`, `JsonPointer`, entity+screen+action IDs
  - 01-06 (validator): imports `pathToJsonPointer` for `zodIssuesToDiagnostics` + `error/warning/info` factory helpers throughout the cross-reference pass; imports `Diagnostic` shape as return type of `validateSpec()`
  - 01-07 (migration runner): no direct imports; depends only on schema version constant (Plan 05)
  - Phase 2 (serializer): reads severity from Diagnostic[] to gate SPEC-09 save behavior
  - Phase 7 (Maestro emitter): consumes `TestID` brand to emit Maestro `id:` selectors

# Tech tracking
tech-stack:
  added: []  # Plan 01-02 uses only the existing zod@^4.3.6 runtime dep; no new packages added.
  patterns:
    - "Branded string pattern: `type X = string & { readonly __brand: 'X' }` — compile-time nominal typing with zero runtime overhead"
    - "Zod `.transform((s) => s as Brand)` to bridge from validated-string to branded-string — brand only exists in the TypeScript space, never in the serialized form"
    - "Anchored, non-backtracking regex for all primitive validators — `^[a-z][a-z0-9_]*$`, `^[A-Z][A-Za-z0-9]*$`, `^[A-Z][A-Z0-9_]*$`, `^(\\/([^~/]|~[01])*)*$`. Threat T-01-01 mitigation baked into the grammar, not enforced by a separate check."
    - "RFC 6901 §3/§4 escape-order invariants encoded as decade-stable unit-test constants: round-trip over `[plain, a/b, a~b, a~/b, /~, '']` plus the ~01 gotcha case"
    - "Barrel re-export pattern (`src/primitives/index.ts`) — downstream plans import from `../primitives`, never from leaf files; keeps one seam for future surface evolution"
    - "TDD cycle per task: RED test commit → GREEN implementation commit. Six commits total, three pairs of `test({phase}-{plan})` + `feat({phase}-{plan})`"

key-files:
  created:
    - src/primitives/ids.ts
    - src/primitives/ids.test.ts
    - src/primitives/path.ts
    - src/primitives/path.test.ts
    - src/primitives/diagnostic.ts
    - src/primitives/diagnostic.test.ts
    - src/primitives/index.ts
  modified: []  # No files outside src/primitives/ touched this plan.

key-decisions:
  - "Brand pattern uses `string & { readonly __brand: 'X' }` (not class wrapper, not nominal enum). Runtime cost: zero — brand is a pure TypeScript overlay. Serialized output: plain JSON string. Compile-time: requires explicit cast via schema `.transform` or a deliberate `as X`, catching accidental raw-string leaks at downstream schema composition time."
  - "`Diagnostic.path` typed as `z.string()` at the schema level, not `JsonPointerSchema`. Producers build paths through `pathToJsonPointer()` which already guarantees RFC 6901 shape; re-validating on every diagnostic creation would be defensive without improving correctness. The JsonPointer brand lives at construction sites (factory helper signatures take `JsonPointer`) where it matters."
  - "Regex constants `SNAKE_CASE` and `PASCAL_CASE` exported from `ids.ts`. Downstream plans reuse these instead of re-declaring. Any future rule change (e.g., allow digits at position 2+ only) edits one line and the whole spec model tightens."
  - "RFC 6901 decode order (~1 before ~0) preserved in `decodeSegment` with an explicit unit test for the `~01` case. The wrong order corrupts `a~01b` → `a/b` instead of the correct `a~1b` — spec-data-corruption bug class that's silent until a label with a literal `~1` inside a `~0`-escaped segment round-trips."
  - "Barrel file ordering: `diagnostic.ts` → `ids.ts` → `path.ts` (alphabetical). `diagnostic.ts` imports `JsonPointer` as a type-only import from `./path.ts`, so barrel order does not affect resolution (ESM re-exports are hoisted)."

patterns-established:
  - "Per-task TDD commit pair: `test(XX-YY): add failing tests for <feature>` then `feat(XX-YY): implement <feature>`. Lets `git log --oneline | grep 'test\\|feat'` reconstruct the TDD sequence for any plan."
  - "ReDoS sanity test idiom: `const haystack = 'a'.repeat(100_000); const start = performance.now(); PATTERN.test(haystack); expect(performance.now() - start).toBeLessThan(50)`. Concrete, enforceable, catches regex regressions."
  - "Round-trip test idiom for encode/decode pairs: `for (const s of EDGE_CASES) expect(decode(encode(s))).toBe(s);`. Covers the common failure mode where encode and decode drift apart."

requirements-completed: []  # Plan 01-02 ships primitives used BY requirements; the requirement IDs (SPEC-01..SPEC-10, SERDE-08) only complete when the full Spec schema + validator land in later Wave-1 plans.

# Metrics
duration: 3m 54s
completed: 2026-04-17
---

# Phase 01 Plan 02: L1 Primitives Summary

**Ships the L1 primitive layer — branded ID schemas (Screen / Action / TestID / EntityName), RFC 6901 JSON Pointer with correct encode/decode-order helpers, and the Diagnostic shape with factory helpers — as 63 passing unit tests, clean tsc, and clean biome.**

## Performance

- **Duration:** 3m 54s
- **Started:** 2026-04-17T12:56:20Z
- **Completed:** 2026-04-17T13:00:14Z
- **Tasks:** 3 / 3 (6 commits — one RED test + one GREEN feat per task)
- **Files created:** 7 (4 source + 3 test + 1 barrel, where `index.ts` is source and accounts for the +1)

## Accomplishments

- Shipped the L1 primitive layer verbatim per RESEARCH §Code Examples + §Pattern 4 — no invention, no drift.
- Locked the one RFC 6901 encode/decode implementation in the project. Future plans that need path manipulation import `encodeSegment` / `decodeSegment` / `pathToJsonPointer` from here; none re-implement.
- Established the branded-string discipline: `ScreenId`, `ActionId`, `TestID`, `EntityName`, and `JsonPointer` are all nominal types with zero runtime weight and compile-time enforcement. Wave 2 (`01-03-PLAN.md`) can now reference these by schema import without any downstream ambiguity about case conventions.
- Verified T-01-01 (regex ReDoS) mitigation at the grammar level: four regexes, all anchored, all non-backtracking, all benchmarked against 100kB pathological input with a sub-50ms ceiling in CI.
- Full TDD discipline on all three tasks — RED failing test committed before GREEN implementation for every feature, giving the git log an auditable trail of what was proven to fail before it passed.

## Task Commits

Six per-task commits in strict RED → GREEN order:

1. **Task 1 RED: failing tests for ID schemas** — `36f342c` (test)
2. **Task 1 GREEN: implement ID schemas + regex constants** — `7c13296` (feat)
3. **Task 2 RED: failing tests for JsonPointer primitives** — `75063fb` (test)
4. **Task 2 GREEN: implement JsonPointer + encode/decode + adapter** — `113912c` (feat)
5. **Task 3 RED: failing tests for Diagnostic primitive** — `9317404` (test)
6. **Task 3 GREEN: implement Diagnostic + barrel** — `2c2b6fc` (feat)

**Plan metadata commit:** pending (includes this SUMMARY, STATE.md, ROADMAP.md).

## Files Created/Modified

- `src/primitives/ids.ts` — `ScreenIdSchema` / `ActionIdSchema` / `TestIDSchema` (all snake_case), `EntityNameSchema` (PascalCase), branded types per schema, exported `SNAKE_CASE` + `PASCAL_CASE` regex constants for downstream reuse
- `src/primitives/ids.test.ts` — 27 assertions: parameterized snake_case checks across all three snake_case schemas, PascalCase entity tests, regex-constant passthrough tests, ReDoS sanity test on 100kB input
- `src/primitives/path.ts` — `JsonPointer` branded string + `JsonPointerSchema` (anchored non-backtracking regex), RFC 6901 `encodeSegment` + `decodeSegment` with documented escape-order invariants, `pathToJsonPointer(path)` adapter from Zod `issue.path` (string | number)[] → branded Pointer string
- `src/primitives/path.test.ts` — 23 assertions: encode cases, decode cases (including the ~01 gotcha), round-trip over `[plain, a/b, a~b, a~/b, /~, '']`, schema accept/reject matrix, ReDoS sanity on 100kB input
- `src/primitives/diagnostic.ts` — `DiagnosticSeveritySchema` closed enum `['error', 'warning', 'info']`, `DiagnosticSchema` with SCREAMING_SNAKE_CASE code regex + non-empty message min length, inferred `Diagnostic` type, `error` / `warning` / `info` factory helpers taking `(code, path: JsonPointer, message)` and returning a structurally-valid `Diagnostic`
- `src/primitives/diagnostic.test.ts` — 13 assertions: severity enum accept/reject, schema rejection for lowercase / kebab-case / leading-digit codes, empty-message rejection, severity rejection matrix, factory correctness for all three severities, schema round-trip on factory output
- `src/primitives/index.ts` — Barrel file re-exporting all of `ids.ts`, `path.ts`, `diagnostic.ts` with `export *`; downstream `src/model/` files import from `../primitives`

## Decisions Made

- **Branded-string pattern (not class wrapper)** — `type X = string & { readonly __brand: 'X' }` + `z.string().…transform(s => s as X)`. Zero runtime cost; branded-only at compile time. Rejected alternatives: (a) class wrappers (runtime allocation for every ID, serializer pain), (b) tagged-object wrappers (changes on-disk shape, defeats the purpose of a branded string).
- **`Diagnostic.path` schema-level type is `z.string()`, not `JsonPointerSchema`** — The branded `JsonPointer` type lives at construction sites (factory helper argument type), not at schema-parse time. Every in-code Diagnostic producer routes through `pathToJsonPointer()` which already produces a well-formed pointer; re-validating on construction is defensive without catching any real-world error class.
- **Regex constants exported from `ids.ts`** — `SNAKE_CASE` and `PASCAL_CASE` are exported (not kept module-private) so Plan 01-03's discriminated-union schemas can reuse them when narrowing to sub-types. One definition of case-convention across the project.
- **RFC 6901 decode order (~1 before ~0) encoded both in implementation and in a unit test with an explanatory comment** — The wrong order corrupts `a~01b` → `a/b` instead of `a~1b`. Silent, data-dependent, catastrophic for round-trip. Inlined the explanation in the test file so the reason the order matters is preserved for any future reader.
- **Barrel file uses `export *`, not explicit named re-exports** — Three files, fifteen public names, no name collisions. Explicit re-exports would be noise. If name collision ever arises (e.g., future `path.ts` `error` vs `diagnostic.ts` `error`), this is the moment we switch to named re-exports; until then, `export *` is the lowest-maintenance form.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Biome formatter auto-fixed long import line in `diagnostic.test.ts`**
- **Found during:** Task 3 (post-GREEN `npx biome check src/primitives/` run as part of plan acceptance criteria)
- **Issue:** Multi-line import `import { DiagnosticSchema, DiagnosticSeveritySchema, error, info, warning } from "./diagnostic.ts"` was written in the six-line wrapped form; Biome's 100-col formatter prefers the single-line form when it fits. `biome check` exited 1.
- **Fix:** Ran `npx biome check --write src/primitives/`. Biome collapsed the import to one line. Content identical; only whitespace changed.
- **Files modified:** `src/primitives/diagnostic.test.ts`
- **Verification:** `npx biome check src/primitives/` exits 0; `npx vitest run src/primitives/` still 63/63 passing; `npx tsc --noEmit` still clean.
- **Committed in:** `2c2b6fc` (Task 3 GREEN commit — autofix applied before commit, inline with plan's precedent from Plan 01-01 deviation #2)

---

**Total deviations:** 1 auto-fixed (formatter hygiene).
**Impact on plan:** Zero. Cosmetic change that would have landed on any subsequent `biome check --write` pass. No scope change, no architectural concession.

## Issues Encountered

None. Every acceptance criterion in `01-02-PLAN.md §verify` and §acceptance_criteria passed on first run after GREEN implementation landed. The TDD cycle (RED → GREEN) succeeded on first attempt for all three tasks — the failing test always failed with "Cannot find module" (expected — the source file didn't exist), the passing test always passed after writing the source file verbatim from RESEARCH §Code Examples.

## User Setup Required

None — Plan 01-02 is a pure type + schema layer with no external services, credentials, or environment variables.

## Verification Evidence

All plan-level success criteria satisfied:

| Criterion | Result |
|-----------|--------|
| `src/primitives/ids.ts` exports branded types + schemas + regex constants | PASS (grep confirmed for `ScreenIdSchema`, `ActionIdSchema`, `TestIDSchema`, `EntityNameSchema`, `SNAKE_CASE`, `PASCAL_CASE`) |
| `src/primitives/path.ts` exports `JsonPointer`, `JsonPointerSchema`, `encodeSegment`, `decodeSegment`, `pathToJsonPointer` | PASS |
| `src/primitives/diagnostic.ts` exports `Diagnostic`, `DiagnosticSchema`, `DiagnosticSeveritySchema`, `error`, `warning`, `info` | PASS |
| `src/primitives/index.ts` re-exports all three leaf modules with `export *` | PASS |
| Each source file has a matching `*.test.ts` with ≥10 assertions | PASS (ids.test.ts 27, path.test.ts 23, diagnostic.test.ts 13 — total 63) |
| All regexes anchored + non-backtracking | PASS (four regexes: `^[a-z][a-z0-9_]*$`, `^[A-Z][A-Za-z0-9]*$`, `^[A-Z][A-Z0-9_]*$`, `^(\\/([^~/]|~[01])*)*$`) |
| 100kB ReDoS sanity test passes (<50ms) | PASS (three ReDoS tests — SNAKE_CASE, PASCAL_CASE, JsonPointer) |
| `npx tsc --noEmit` exits 0 | PASS |
| `npx vitest run src/primitives/` exits 0 | PASS (63/63) |
| `npx biome check src/primitives/` exits 0 | PASS (post-autofix) |
| Barrel enumerates expected public names | PASS (15 exports: `ActionIdSchema`, `DiagnosticSchema`, `DiagnosticSeveritySchema`, `EntityNameSchema`, `JsonPointerSchema`, `PASCAL_CASE`, `SNAKE_CASE`, `ScreenIdSchema`, `TestIDSchema`, `decodeSegment`, `encodeSegment`, `error`, `info`, `pathToJsonPointer`, `warning`) |
| Round-trip test for `[plain, a/b, a~b, a~/b, /~, '']` | PASS |
| RFC 6901 decode-order gotcha: `decodeSegment("a~01b") === "a~1b"` | PASS |

## Next Phase Readiness

**Wave 1 L1 primitives: COMPLETE — Wave 2 (`01-03-PLAN.md` — L2 model schemas) can begin.**

Ready-to-consume artifacts for downstream plans:
- `ScreenIdSchema`, `ActionIdSchema`, `TestIDSchema`, `EntityNameSchema` ⇒ `01-03-PLAN.md` imports these for every `id` / `name` field across Screen, Action, Entity, Component schemas.
- `JsonPointerSchema` ⇒ `01-04-PLAN.md` variant discriminated union (`when.collection`, `when.async`, `when.field_error`) and `01-03-PLAN.md` binding paths use this directly.
- `pathToJsonPointer` ⇒ `01-06-PLAN.md` validator imports this to map Zod `issue.path` arrays to `Diagnostic.path` in `zodIssuesToDiagnostics`.
- `error` / `warning` / `info` factory helpers ⇒ `01-06-PLAN.md` cross-reference pass constructs diagnostics through these instead of object literals.
- `Diagnostic` type ⇒ `01-06-PLAN.md` declares `validateSpec(): { spec: Spec | null, diagnostics: Diagnostic[] }` signature.
- `SNAKE_CASE` / `PASCAL_CASE` exported constants ⇒ any future schema that needs to narrow to a new ID namespace reuses these regexes rather than re-declaring.

**No blockers for Wave 2.** The primitives are feature-complete for Phase 1 — no further primitive work is expected in this phase.

## Self-Check: PASSED

All 7 claimed files present on disk:

- `src/primitives/ids.ts` — FOUND
- `src/primitives/ids.test.ts` — FOUND
- `src/primitives/path.ts` — FOUND
- `src/primitives/path.test.ts` — FOUND
- `src/primitives/diagnostic.ts` — FOUND
- `src/primitives/diagnostic.test.ts` — FOUND
- `src/primitives/index.ts` — FOUND

All 6 task commits verified in `git log --oneline --all`:

- `36f342c` (Task 1 RED) — FOUND
- `7c13296` (Task 1 GREEN) — FOUND
- `75063fb` (Task 2 RED) — FOUND
- `113912c` (Task 2 GREEN) — FOUND
- `9317404` (Task 3 RED) — FOUND
- `2c2b6fc` (Task 3 GREEN) — FOUND

## TDD Gate Compliance

Plan frontmatter specifies `type: execute` at the plan level but every task declares `tdd="true"`, so the TDD gate applies per-task. Each task has both a `test(01-02): …` commit preceding a `feat(01-02): …` commit — RED then GREEN, in that order, auditable by `git log --oneline | grep '01-02'`. REFACTOR gate commits were unnecessary (no cleanup beyond formatter autofix, which was batched into the GREEN commit per plan conventions).

---
*Phase: 01-spec-model-invariants*
*Plan: 02*
*Completed: 2026-04-17*
