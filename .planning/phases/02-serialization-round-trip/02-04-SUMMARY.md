---
phase: 02-serialization-round-trip
plan: 04
subsystem: serialization
tags: [yaml, cst, atomic-write, writeSpecFile, prototype-pollution, save-gate, serde]

# Dependency graph
requires:
  - phase: 01-spec-model-invariants
    provides: validateSpec (save-gate source), Spec type, SCHEMA_VERSION, cross-reference SPEC_UNRESOLVED_ACTION error severity
  - phase: 02-serialization-round-trip
    provides: AstHandle (Plan 02-01), partitionTopLevel + ADVERSARIAL_KEYS (Plan 02-02), injectSchemaIfAbsent (Plan 02-03), normalizeSigilsOnDoc + INTERACTABLE_KINDS (Plan 02-03)
provides:
  - src/serialize/atomic.ts — POSIX atomic write primitive (atomicWrite + detectOrphanTmp)
  - src/serialize/write.ts — writeSpecFile orchestrator with 9-step pipeline
  - setScalarPreserving CST scalar edit helper (exported for unit testing)
  - BLOCKER fix #3 at the write layer — defense-in-depth Layer 3 against prototype pollution
  - BLOCKER fix #1 — closingDelimiterTerminator re-emission in step-7 splice
  - SERDE-07 auto-quote enforcement on YAML 1.1 gotcha scalars
affects: [phase-02-plan-05-e2e-roundtrip, phase-04-editor-store, phase-09-pi-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "9-step save pipeline with BLOCKER-fix ordering (adversarial AST pre-gate → validateSpec save-gate → schema inject → CST/Document diff-apply → sigil re-emit → SERDE-07 auto-quote → doc.toString argless → manual closing-delimiter splice → atomic rename)"
    - "POSIX atomic write via .{basename}.tmp + fs.rename; D-30 orphan-tmp branch on rename failure"
    - "vi.spyOn(fs.rename) crash simulation — observable: pre-existing target bytes preserved (D-32)"
    - "setScalarPreserving: CST.setScalarValue(token) with no context.type preserves previous quoting; {type: QUOTE_DOUBLE} forces quoting for YAML 1.1 gotcha strings"

key-files:
  created:
    - src/serialize/atomic.ts
    - src/serialize/atomic.test.ts
    - src/serialize/write.test.ts
  modified:
    - src/serialize/write.ts (stub → full orchestrator)

key-decisions:
  - "doc.toString() called ARGLESS — yaml@^2.8.3's ToStringOptions excludes `version`; Document carries parse-time version (confirmed against node_modules/yaml/dist/options.d.ts)."
  - "Minimal valid Spec in tests required at least one Entity (DataModelSchema has .min(1) on entities); plan's example {entities: []} adjusted to {entities: [{name: 'Thing', fields: [{name: 'title', type: 'string'}]}]} so save-gate happy-path tests exercise a valid spec."
  - "setScalarPreserving: pass no context to CST.setScalarValue in the common path (uses token's previous type); only pass {type: 'QUOTE_DOUBLE'} for YAML 1.1 gotchas. Matches yaml's setScalarValue contract that `type` defaults to previous token type when undefined."

patterns-established:
  - "Pattern: AST re-check at the write layer for defense-in-depth against keys stripped by earlier layers. partitionTopLevel strips __proto__ from knownSubset (Layer 1); writeSpecFile re-scans the AST (Layer 3) so adversarial keys never reach disk."
  - "Pattern: save-gate before any disk I/O. The severity:error check runs BEFORE .tmp creation, so a blocked save produces zero filesystem artifacts. Tested via fs.access assertion on the expected .tmp path."
  - "Pattern: observable crash simulation. Cannot actually crash mid-syscall in vitest, so we assert via the observable contract: pre-existing target bytes preserved when rename throws AFTER writeFile succeeded."

requirements-completed: [SERDE-03, SERDE-06, SERDE-07, SPEC-09]

# Metrics
duration: 6min 23s
completed: 2026-04-17
---

# Phase 02 Plan 04: Wave 3 Write Path Summary

**Atomic POSIX `writeSpecFile(path, spec, astHandle)` orchestrator with 9-step pipeline — AST-layer adversarial-key pre-gate + save-gate + idempotent schema inject + CST-preserving scalar edits + SERDE-07 YAML 1.1 auto-quote + closing-delimiter splice + atomic `.tmp`+rename write.**

## Performance

- **Duration:** 6min 23s
- **Started:** 2026-04-17T21:47:21Z
- **Completed:** 2026-04-17T21:53:44Z
- **Tasks:** 2 (4 TDD commits: 2 × RED/GREEN pair)
- **Files created/modified:** 3 new, 1 modified

## Accomplishments

- **`src/serialize/atomic.ts`** ships `atomicWrite` and `detectOrphanTmp`. Writes to `.{basename}.tmp` sibling, then `fs.rename`. writeFile failure path cleans up any partial tmp + re-throws. Rename failure AFTER writeFile leaves the .tmp on disk and returns `tmpOrphan` (D-30). D-32 simulated-crash invariant verified via `vi.spyOn(fs, "rename")`: pre-existing target bytes preserved when rename throws.
- **`src/serialize/write.ts`** ships `writeSpecFile` orchestrator with the full 9-step pipeline from RESEARCH §Architecture Patterns plus BLOCKER fixes #1 and #3.
- **BLOCKER fix #3** — AST-layer adversarial-key pre-gate. `partitionTopLevel` strips `__proto__` / `constructor` / `prototype` from knownSubset so `validateSpec` never sees them. The write layer re-scans the AST BEFORE the save-gate and blocks the write with `SPEC_UNKNOWN_TOP_LEVEL_KEY` error. Zero disk I/O on block. Defense-in-depth Layer 3 (parse.ts in Plan 05 is Layer 2; unknown.ts is Layer 1).
- **BLOCKER fix #1** — Step-7 manual splice re-emits `astHandle.closingDelimiterTerminator` verbatim between the closing `---` and `bodyBytes`. Tests cover `"\n"` (canonical LF), `""` (empty-body fixture ending exactly at `---`), and `"\r\n"` (CRLF body).
- **D-31 save-gate** — `validateSpec(spec).diagnostics.some(d => d.severity === "error")` short-circuits with `{ written: false }` and zero disk I/O. Trigger verified: `navigation.root: "nonexistent_screen"` → `SPEC_UNRESOLVED_ACTION` error (cross-reference.ts:368-373) → no `.tmp` file created.
- **SERDE-07 auto-quote** fires inline in `setScalarPreserving` for all 8 YAML 1.1 gotcha literals (`yes/no/on/off/y/n/true/false`, case-insensitive). Any scalar replacement where `newValue` matches the gotcha regex is forced to `QUOTE_DOUBLE`, preventing round-trip regression to implicit boolean under a YAML 1.1 parser.
- **setScalarPreserving** uses `CST.setScalarValue(token)` with no `context.type` in the common path (preserves previous quoting style); passes `{ type: "QUOTE_DOUBLE" }` only for gotchas.
- **Never-throws contract (D-31)** honored: `writeSpecFile` on a structurally invalid spec (`screens: "not-an-array"`) resolves to `{ written: false, diagnostics }`, does not throw.

## Task Commits

1. **Task 1: atomic.ts — POSIX atomic write primitive**
   - `b22ef66` (test) — RED: 7 cases covering happy path, fixed `.{basename}.tmp` suffix, writeFile failure cleanup, rename-failure orphan branch, D-32 existing-target preservation, detectOrphanTmp present/absent
   - `5be223d` (feat) — GREEN: atomicWrite + detectOrphanTmp
2. **Task 2: write.ts — writeSpecFile orchestrator (BLOCKER fixes #1 + #3)**
   - `4feaaaf` (test) — RED: 12 cases covering adversarial pre-gate, save-gate, never-throws, happy-path, closing-delimiter splice × 3 (LF/empty/CRLF), schema-inject, CST scalar preservation, SERDE-07 auto-quote (8 gotcha variants)
   - `09ec9a9` (feat) — GREEN: writeSpecFile orchestrator + setScalarPreserving

**Plan metadata:** (this SUMMARY commit follows)

## Files Created/Modified

- `src/serialize/atomic.ts` (new) — atomicWrite + detectOrphanTmp
- `src/serialize/atomic.test.ts` (new) — 7 unit tests
- `src/serialize/write.ts` (rewritten — stub → orchestrator)
- `src/serialize/write.test.ts` (new) — 12 unit tests covering both BLOCKER fixes and the 9-step pipeline

## Decisions Made

- **`doc.toString()` called argless** — yaml@^2.8.3's `ToStringOptions` type does NOT accept `version`; the Document carries its parse-time version sticky. Plan's recommendation `doc.toString({ version: "1.2" })` was a type error (acknowledged in STATE.md 02-03 quirk note). Argless call is the correct production form.
- **Minimal valid Spec in tests required non-empty Entities** — `DataModelSchema.entities` has `.min(1)` (src/model/data.ts:55). Plan's `data: { entities: [] }` sample would fail `validateSpec` with `SPEC_MIN_ITEMS` (or similar) — unintentional save-gate trigger. Adjusted to one-entity `{ entities: [{ name: "Thing", fields: [{ name: "title", type: "string" }] }] }` so save-gate happy-path tests exercise a truly valid spec.
- **setScalarPreserving argless for common path** — `CST.setScalarValue(token, value)` uses the token's previous type when `context.type` is omitted. Plan's pattern of reading `node.srcToken.type` and passing it through created type-mismatch churn (CST token types `'scalar' | 'single-quoted-scalar' | 'double-quoted-scalar'` vs. Scalar.Type values `'PLAIN' | 'QUOTE_SINGLE' | 'QUOTE_DOUBLE' | 'BLOCK_FOLDED' | 'BLOCK_LITERAL'`). Simpler + correct: pass no context for preserve, pass `{ type: "QUOTE_DOUBLE" }` only for gotchas.

## Deviations from Plan

None — plan executed as written, with three minor implementation refinements documented under "Decisions Made" above (argless `doc.toString()`, non-empty entities in test spec, argless `setScalarValue` for preserve). None of these changed the plan's contracts or the test matrix.

## Issues Encountered

- **Biome auto-fix** — first draft had verbose multi-line template concat; Biome's formatter collapsed it to a single template literal. `npx biome check --write` applied automatically; no semantic change.
- **Import ordering** — initial import block had `import { CST, isScalar }` before `import type { Document }`; Biome's import organizer flipped them. Auto-fix applied.

## Observations for Plan 05 (RESEARCH Open Qs)

- **CST.setScalarValue edge cases** — the current write.ts unit tests exercise PLAIN + double-quote forcing only. Block scalars (`|`, `>`), multi-line quoted strings, and anchored/aliased scalars were NOT exercised in Plan 04. Plan 05's 20-fixture round-trip matrix must cover these. setScalarValue's docstring warns: "Best efforts are made to retain any comments previously associated with the `token`, though all contents within a collection's `items` will be overwritten." — note for nested-structure edits.
- **CRLF line-ending path** — `newMatter.replace(/\r?\n/g, "\r\n")` does naive global conversion. If `doc.toString()` already emits embedded `\r\n` (unlikely but possible), the `\r?\n` tolerant pattern prevents double-conversion. Plan 05 fixtures should include one CRLF file to integration-test this path.
- **closingDelimiterTerminator round-trip** — the 3 tested values (`"\n"`, `""`, `"\r\n"`) all produce the expected splice output. Verified for the empty-body edge case (`"" + "" = ""` correctly ends the file exactly at `---`).
- **BLOCKER fix #3 false-positive scan** — manually ran `partitionTopLevel` over all 3 canonical fixtures (habit-tracker, todo, social-feed); each returned `unknownKeys: []`, confirming zero false positives on valid fixtures.
- **Simulated-crash observability** — vi.spyOn(fs, "rename") with `mockRejectedValueOnce` reliably trips the orphan branch. The D-32 invariant (pre-existing target bytes preserved) is confirmed by asserting `fs.readFile(target) === "OLD CONTENT"` after a rejected rename.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Plan 05 (Wave 4 — E2E round-trip)** unblocked. writeSpecFile is wave-wrappable: `(path, spec, astHandle) → Promise<{ written, diagnostics }>` — Phase 9 queue wraps without modification.
- **Wave-0/1/2 baselines preserved** — 374 → 393 tests (+19 Plan 04, all green). Phase-1 regression intact.
- **Anti-grep gate** clean: no `YAML.stringify(…)` or `stringify(spec…)` anywhere in `src/serialize/` (SERDE-03 discipline).

## Self-Check: PASSED

**Files created exist:**
- FOUND: src/serialize/atomic.ts
- FOUND: src/serialize/atomic.test.ts
- FOUND: src/serialize/write.test.ts
- FOUND (modified): src/serialize/write.ts

**Commits referenced exist:**
- FOUND: b22ef66 (test(02-04) RED atomic)
- FOUND: 5be223d (feat(02-04) GREEN atomic)
- FOUND: 4feaaaf (test(02-04) RED write)
- FOUND: 09ec9a9 (feat(02-04) GREEN write)

**Gates green:**
- `npx vitest run` → 393/393 across 28 files
- `npx tsc --noEmit` → 0 errors
- `npx biome check .` → 0 errors (1 info)
- `grep -rE 'YAML\\.stringify\\s*\\(|stringify\\(spec' src/serialize/` → 0 matches

---
*Phase: 02-serialization-round-trip*
*Completed: 2026-04-17*
