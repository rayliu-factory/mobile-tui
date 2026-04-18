---
phase: 1
slug: spec-model-invariants
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-17
plans_drafted: 2026-04-17
plans_executed: 2026-04-17
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Scaffold created by plan-phase. Per-Task Verification Map populated during plan drafting.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.x |
| **Config file** | `vitest.config.ts` (installed in Plan 01-01 Task 2 / Wave 0) |
| **Quick run command** | `npx vitest run --reporter=dot` |
| **Full suite command** | `npx vitest run` |
| **Coverage command** | `npx vitest run --coverage` (thresholds: lines ≥80%, functions ≥80%, branches ≥75%) |
| **Estimated runtime** | ~5s (Phase 1 has no heavy I/O) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=dot`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green, plus `npx tsc --noEmit`
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

Each row maps to a `<verification>` block in its parent PLAN.md. Tasks are ordered by plan + task number.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01.T1 | 01-01 | 0 | — | T-01-03 | Pinned runtime + dev deps (zod v4, jsonpointer v5, vitest 4.1, biome 2.4, typescript 5.6) | config | `test -f package.json && grep -q '"zod": "\^4\\.' package.json && grep -q '"jsonpointer": "\^5\\.' package.json && npm ls zod` | ✓ | ✅ green |
| 01-01.T2 | 01-01 | 0 | — | T-01-01 | tsconfig strict + noUncheckedIndexedAccess; biome noExplicitAny; vitest glob | config | `test -f tsconfig.json && test -f biome.json && test -f vitest.config.ts && grep -q '"strict": true' tsconfig.json && grep -q '"noUncheckedIndexedAccess": true' tsconfig.json` | ✓ | ✅ |
| 01-01.T3 | 01-01 | 0 | — | — | Directory skeleton + empty src/index.ts + fixture helper | smoke | `test -d src/primitives && test -d src/model && test -d src/migrations && test -f tests/helpers/parse-fixture.ts && npx tsc --noEmit && npx vitest run --reporter=dot` | ✓ | ✅ |
| 01-02.T1 | 01-02 | 1 | — | T-01-01, T-01-02 | Branded ID schemas; ReDoS-safe regex | unit | `npx vitest run src/primitives/ids.test.ts --reporter=dot` | ✓ | ✅ |
| 01-02.T2 | 01-02 | 1 | — | T-01-01 | JsonPointer RFC 6901 (correct decode order); pathToJsonPointer adapter | unit | `npx vitest run src/primitives/path.test.ts --reporter=dot` | ✓ | ✅ |
| 01-02.T3 | 01-02 | 1 | — | T-01-03 | Diagnostic schema shape + severity enum + factories | unit | `npx vitest run src/primitives/diagnostic.test.ts --reporter=dot` | ✓ | ✅ |
| 01-03.T1 | 01-03 | 2 | SPEC-03 | T-01-03 | SCHEMA_VERSION constant; BackBehavior discriminated union | unit | `npx vitest run src/model/back-behavior.test.ts --reporter=dot` | ✓ | ✅ |
| 01-03.T2 | 01-03 | 2 | SPEC-06 | T-01-02, T-01-03 | Action 6-kind discriminated union (navigate/submit/mutate/present/dismiss/custom); MUTATE_OPS closed enum; ActionsRegistry keyed by ActionId | unit | `npx vitest run src/model/action.test.ts --reporter=dot` | ✓ | ✅ |
| 01-03.T3 | 01-03 | 2 | SPEC-04 | T-01-03 | Data model: Field/Entity/DataModel with 5 closed field types; reference-type refine | unit | `npx vitest run src/model/data.test.ts --reporter=dot` | ✓ | ✅ |
| 01-03.T4 | 01-03 | 2 | SPEC-05 | T-01-03 | Variants 4-key required; null allowed; closed when-grammar per kind; createScreenVariantsSchema factory | unit | `npx vitest run src/model/variant.test.ts --reporter=dot` | ✓ | ✅ |
| 01-04.T1 | 01-04 | 2 | SPEC-01, SPEC-07 | T-01-01, T-01-02 | 18-kind closed catalog via z.union + z.lazy + z.ZodType<ComponentNode> annotation (NOT z.discriminatedUnion per RESEARCH Pitfall #1); printable-ASCII labels; InteractableBase triple | unit | `npx tsc --noEmit && ! grep -q 'z.discriminatedUnion' src/model/component.ts && grep -q 'z.ZodType<ComponentNode>' src/model/component.ts` | ✓ | ✅ |
| 01-04.T2 | 01-04 | 2 | SPEC-01, SPEC-07 | T-01-01, T-01-02 | 18-kind catalog exercised; ListItem all-or-nothing; TabBar 2-5 items; 100-level deep-recursion stress test | unit | `npx vitest run src/model/component.test.ts --reporter=dot` | ✓ | ✅ |
| 01-05.T1 | 01-05 | 3 | SPEC-02, SPEC-05, SPEC-10 | T-01-03 | Screen schema: id/title/kind/back_behavior/variants/acceptance; kind: regular\|overlay discriminator resolves RESEARCH Open Q#3; variants.tree wired to real ComponentNodeSchema | unit | `npx vitest run src/model/screen.test.ts --reporter=dot` | ✓ | ✅ |
| 01-05.T2 | 01-05 | 3 | SPEC-03 | T-01-03 | NavEdge + NavigationGraph; closed 5-value transition enum | unit | `npx vitest run src/model/navigation.test.ts --reporter=dot` | ✓ | ✅ |
| 01-05.T3 | 01-05 | 3 | SPEC-01..07, SPEC-10 | T-01-03 | Spec root composition; schema version pinned; .strict() rejects unknown + __proto__ + constructor | unit | `npx vitest run src/model/spec.test.ts --reporter=dot` | ✓ | ✅ |
| 01-06.T1 | 01-06 | 4 | SPEC-01..07 | T-01-02 | Zod issue → Diagnostic adapter; path as RFC 6901; messages don't leak user input (V8) | unit | `npx vitest run src/model/zod-issue-adapter.test.ts --reporter=dot` | ✓ | ✅ |
| 01-06.T2 | 01-06 | 4 | SPEC-01..07 | T-01-02 | crossReferencePass: full recursive walkComponentTree (RESEARCH Pitfall #3); testID collision; JSON Pointer prefix resolution; 5 SPEC_* codes emitted | unit | `npx vitest run src/model/cross-reference.test.ts --reporter=dot` | ✓ | ✅ |
| 01-06.T3 | 01-06 | 4 | SPEC-01..07 | T-01-01, T-01-03 | validateSpec never throws; two-stage pipeline; 5MB input cap (T-01-01); cyclic-input protection; public src/index.ts barrel | unit | `npx vitest run src/model/invariants.test.ts --reporter=dot` | ✓ | ✅ |
| 01-07.T1 | 01-07 | 5 | SERDE-08 | T-01-03 | Migration files exist (v1_to_v2 empty-op + index runMigrations); unknown return (Pitfall #7) | config | `test -f src/migrations/v1_to_v2.ts && test -f src/migrations/index.ts && grep -q 'runMigrations' src/index.ts` | ✓ | ✅ |
| 01-07.T2 | 01-07 | 5 | SERDE-08 | T-01-03 | Same-version shortcut; 1→2 no-op round-trip is byte-identical JSON; missing-path error; migrated spec still validates clean | unit | `npx vitest run src/migrations/index.test.ts --reporter=dot` | ✓ | ✅ |
| 01-08.T1 | 01-08 | 5 | SPEC-01..07, SPEC-10 | T-01-02 | habit-tracker fixture (.md + .json) validates clean; 3 screens / 2 entities / 5+ actions; has overlay screen for present cross-ref | integration | `node --input-type=module -e "import{validateSpec}from'./src/index.ts';import{readFileSync}from'node:fs';const s=JSON.parse(readFileSync('fixtures/habit-tracker.spec.json','utf8'));const r=validateSpec(s);process.exit(r.diagnostics.filter(d=>d.severity==='error').length)"` | ✓ | ✅ |
| 01-08.T2 | 01-08 | 5 | SPEC-01..07, SPEC-10 | T-01-02 | todo + social-feed fixtures (.md + .json) validate clean; TabBar/SegmentedControl/TextField in todo; Image/Icon/Sheet + navigate-with-params in social-feed | integration | `npx vitest run tests/fixtures.test.ts --reporter=dot` | ✓ | ✅ |
| 01-08.T3 | 01-08 | 5 | SPEC-01..07 | T-01-02 | Malformed fixture + snapshot test; all 5 Stage-B diagnostic codes present; programmatic Stage-A triggers; never-throws cases | integration + snapshot | `npx vitest run tests/malformed.test.ts --reporter=dot` | ✓ | ✅ |
| 01-08.T4 | 01-08 | 5 | SPEC-01 | — | Catalog coverage: every entry in COMPONENT_KINDS appears in at least one canonical fixture | integration | `npx vitest run tests/catalog-coverage.test.ts --reporter=dot` | ✓ | ✅ |
| 01-08.T5 | 01-08 | 5 | SPEC-01, SPEC-02 | — | Fidelity gate AUTOMATED half: every Screen.id + testID from habit-tracker appears in both .swift and .kt; header refs source + schema version | integration | `npx vitest run tests/fidelity.test.ts --reporter=dot` | ✓ | ✅ |
| 01-08.T6 | 01-08 | 5 | SPEC-01, SPEC-02 | — | Fidelity gate MANUAL half: human reviews 1:1 translation; judges ambiguity | manual | See Manual-Only Verifications below | ✓ | ✅ |
| 01-08.T7 | 01-08 | 5 | ALL | ALL | Full-phase test sweep green; VALIDATION.md Per-Task Verification Map all ✅; `status: complete` | sweep | `npx tsc --noEmit && npx vitest run && npx vitest run --coverage` | ✓ | ✅ |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Manual-gate approval (01-08.T6):** auto-approved via `--auto` chain (automated half — tests/fidelity.test.ts — green across 3 assertions; every Screen.id + testID from habit-tracker.spec.md present in both .swift and .kt; both target files reference the source fixture + schema version).

---

## Wave 0 Requirements

- [x] `package.json` with `zod@^4.3.6`, `jsonpointer@^5.0.1`, `vitest@^4.1.4`, `typescript@^5.6` (Plan 01-01 Task 1)
- [x] `tsconfig.json` — `ES2022`, `moduleResolution: "bundler"`, `strict: true`, `noUncheckedIndexedAccess: true` (Plan 01-01 Task 2)
- [x] `vitest.config.ts` — includes `src/**/*.test.ts` + `tests/**/*.test.ts`, coverage thresholds (Plan 01-01 Task 2)
- [x] `biome.json` — formatter + linter config matching pi-mono conventions; `noExplicitAny: error` (Plan 01-01 Task 2)
- [x] Directory skeleton: `src/primitives/`, `src/model/`, `src/migrations/`, `fixtures/`, `fixtures/targets/`, `tests/helpers/` (Plan 01-01 Task 3)
- [x] Node version assertion — `engines.node: ">=20"` in `package.json` (Plan 01-01 Task 1)
- [x] Fixture-parse helper (`tests/helpers/parse-fixture.ts`) — resolves `.spec.json` / `.spec.ts` siblings; refuses to import YAML library (Plan 01-01 Task 3)

All Wave 0 items land in Plan 01. After Plan 01 completes, flip `wave_0_complete: true` in this frontmatter.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Hand-translation fidelity of `habit-tracker.spec.md` to SwiftUI + Compose (success criterion #5) | SPEC-01, SPEC-02 (closed catalog → native components) | Translation is a human judgment check — no automated oracle exists for "zero ambiguity in translation". The automated half (`tests/fidelity.test.ts`) confirms every Screen.id + testID appears; it cannot confirm that two independent translators would produce meaningfully identical code. | 1. Open `fixtures/habit-tracker.spec.md` in one pane and `fixtures/targets/habit-tracker.swift` + `.kt` side-by-side. 2. For each screen, verify every component in the tree maps to EXACTLY one view/composable. 3. Verify sigil triples round-trip: label in Text content, action in onClick/onCheckedChange wiring, testID in `.accessibilityIdentifier` (SwiftUI) or `Modifier.testTag` (Compose). 4. Verify variants (empty/loading/error) render as separate branches — no overlay hacks. 5. Judge: would another developer, given only the spec.md, produce a materially different translation? If YES, file specific ambiguity findings and block the phase. If NO, sign off. 6. (Optional) verify target files compile in Xcode / Android Studio — NOT required. |
| Fixture prose acceptance criteria readability (SPEC-10) | SPEC-10 | Prose one-liners on `acceptance:` arrays can't be machine-validated for clarity. | Open each canonical fixture, read the `acceptance:` lines per screen, confirm each reads as a human-testable statement. |

---

## Threat Model (Phase-Level)

Security enforcement: ASVS L1, block on `high`. Phase 1 is a pure validator — no network, no DB, no auth, no filesystem writes.

| Threat ID | Category | Component | Disposition | Mitigation Summary |
|-----------|----------|-----------|-------------|--------------------|
| T-01-01 | DoS | `validateSpec()` input / regexes / recursion depth | mitigate | 5 MB input size cap in `validateSpec()` (Plan 06); anchored non-backtracking regex patterns in all primitives (Plan 02); Zod's recursion depth is bounded by stack (practical limit ~thousands of levels; 100-level stress test in Plan 04) |
| T-01-02 | Tampering | testID / label / id regex; JSON Pointer as path-traversal vector | mitigate | `testID` regex `^[a-z][a-z0-9_]*$`; `label` regex `^[\x20-\x7E]+$` (printable ASCII only); JsonPointer is NEVER passed to fs.* APIs (documented in code comments) |
| T-01-03 | Tampering | Prototype pollution via Spec root; migration reopening closed vocabulary | mitigate | Spec root `.strict()` rejects `__proto__`, `constructor`, and any unknown top-level key (Plan 05); migration round-trip test asserts migrated spec still validates with zero Stage-A diagnostics (Plan 07) |

No `high`-severity threats. No action blocked by security enforcement.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies → YES (27 rows above, one per task)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify → YES (only 01-08.T6 is manual; bracketed by automated tasks)
- [x] Wave 0 covers all MISSING references (framework, config, skeleton) → YES (7-item Wave 0 checklist above)
- [x] No watch-mode flags (`vitest run` only, never `vitest` alone) → YES
- [x] Feedback latency < 10s → YES (Phase 1 tests are pure and fast; target ~5s)
- [x] `nyquist_compliant: true` set in frontmatter after map populated → YES (set above)

**Approval:** signed off 2026-04-17 — `npx tsc --noEmit` clean; `npx vitest run` 297/297 green across 19 test files; `npx vitest run --coverage` reports 96.61% statements / 91.17% branches / 100% functions / 100% lines (all above Phase 1 thresholds of ≥80% / ≥75% / ≥80% / ≥80%); `npx biome check src/ tests/` clean across 40 files.

---

## Validation Audit 2026-04-19

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

**Re-verification:** `npx tsc --noEmit` clean; `npx vitest run` 754/754 green across 96 test files (suite grown by phases 2–4); all 19 Phase 1 test files present and included; `nyquist_compliant: true` confirmed.
