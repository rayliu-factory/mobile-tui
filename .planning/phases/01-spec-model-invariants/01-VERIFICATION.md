---
phase: 01-spec-model-invariants
verified: 2026-04-17T02:24:00Z
status: human_needed
score: 5/5 must-haves verified (pending human fidelity judgment)
overrides_applied: 0
human_verification:
  - test: "Two-target fidelity gate — judge translation ambiguity (Phase 1 success criterion #5, VALIDATION.md §Manual-Only Verifications, Plan 01-08 Task 6)"
    expected: "Given ONLY fixtures/habit-tracker.spec.md, another developer would produce a materially IDENTICAL translation to fixtures/targets/habit-tracker.swift + .kt. Every spec component maps to exactly one native view/composable with zero ambiguity. Sigil triples round-trip: label in Text content, action in onClick/onCheckedChange wiring, testID in .accessibilityIdentifier (SwiftUI) / Modifier.testTag (Compose). Variants (empty/loading/error) render as separate branches — no overlay hacks."
    why_human: "Translation ambiguity is a human judgment check — no automated oracle can decide whether two independent translators would produce meaningfully identical code. The automated half (tests/fidelity.test.ts) confirms every Screen.id + testID appears and that both target files reference the source spec + schema version, but cannot judge semantic 1:1 mapping. Auto-approved by --auto chain in execute-phase, but not actually human-reviewed."
  - test: "Fixture prose acceptance criteria readability (SPEC-10)"
    expected: "For each canonical fixture (habit-tracker, todo, social-feed), every `acceptance:` prose line per screen reads as a human-testable statement."
    why_human: "Prose readability and human-testability cannot be machine-validated for clarity; no automated oracle exists."
---

# Phase 01: Spec Model & Invariants — Verification Report

**Phase Goal:** A developer (or any downstream layer) can describe a mobile app as a framework-agnostic component tree plus nav, data, and state, with invariants that catch malformed specs before any file hits disk.

**Verified:** 2026-04-17T02:24:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Three hand-authored fixture specs (3 screens + 2 entities + 5 interactions each) in `fixtures/` pass `validateSpec()` with zero errors | VERIFIED | Direct validateSpec run on habit-tracker/todo/social-feed all return 0 error diagnostics; D-14 shape asserted by tests/fixtures.test.ts (6/6 green) |
| 2 | Deliberately malformed fixture returns `Diagnostic[]` with `{code, severity, path, message}` shape — `validateSpec()` NEVER throws | VERIFIED | Direct run produces 7 diagnostics with all 5 expected Stage-B codes (SPEC_UNRESOLVED_ACTION, SPEC_JSONPTR_UNRESOLVED, SPEC_TESTID_COLLISION, SPEC_MISSING_BACK_BEHAVIOR, SPEC_ACTION_TYPE_MISMATCH); shape check passes; hostile inputs (null/undefined/42/[]/{}) never throw (tests/malformed.test.ts 15/15 green) |
| 3 | Closed 18-kind component catalog is the ONLY accepted vocabulary | VERIFIED | COMPONENT_KINDS in src/model/component.ts has exactly the 18 required kinds (verified by direct import); rogue kind `RogueKind` rejected by validateSpec; tests/catalog-coverage.test.ts (2/2) confirms all 18 kinds appear across canonical fixtures |
| 4 | `migrations/v1_to_v2.ts` exists and round-trips one fixture | VERIFIED | src/migrations/v1_to_v2.ts exports empty-op `migrate`; src/migrations/index.ts exposes `runMigrations` + MIGRATIONS table; runMigrations(habitTracker, '1', '2') returns byte-identical JSON; src/migrations/index.test.ts 7/7 green |
| 5 | One fixture's spec can be hand-translated to both SwiftUI and Jetpack Compose with zero ambiguity (habit-tracker) | PASSED (automated); HUMAN NEEDED (judgment) | fixtures/targets/habit-tracker.swift (152 LOC) + habit-tracker.kt (181 LOC) exist; every Screen.id + testID appears in both; both files header-reference source fixture + `mobile-tui/1`; full kind→native mapping tables in headers. Ambiguity judgment (would another translator produce materially identical code?) requires human review per VALIDATION.md §Manual-Only Verifications |

**Score:** 5/5 truths verified on automated evidence; #5 has an additional human-judgment half that remains outstanding (auto-approved via --auto chain, not actually reviewed).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/model/component.ts` | 18-kind closed catalog via z.union + z.lazy + z.ZodType<ComponentNode> (NOT discriminatedUnion) | VERIFIED | 274 LOC; COMPONENT_KINDS tuple has all 18 required kinds; `z.ZodType<ComponentNode>` annotation present; `z.discriminatedUnion` explicitly absent (both grep spot-checks pass) |
| `src/model/invariants.ts` | `validateSpec(input: unknown) → { spec: Spec \| null, diagnostics: Diagnostic[] }` never throws | VERIFIED | 86 LOC; two-stage pipeline (safeParse → crossReferencePass); 5MB MAX_INPUT_BYTES cap (T-01-01); try/catch wraps JSON.stringify for cyclic/BigInt; 16/16 tests green |
| `src/model/cross-reference.ts` | crossReferencePass emitting 5+ SPEC_* diagnostic codes | VERIFIED | 408 LOC; emits SPEC_UNRESOLVED_ACTION, SPEC_JSONPTR_UNRESOLVED, SPEC_TESTID_COLLISION, SPEC_MISSING_BACK_BEHAVIOR, SPEC_ACTION_TYPE_MISMATCH; 24/24 tests green |
| `src/model/zod-issue-adapter.ts` | Maps Zod issues to Diagnostic[] via pathToJsonPointer | VERIFIED | 71 LOC; ZOD_CODE_MAP present; 14/14 tests green |
| `src/model/spec.ts` | SpecSchema composing schema+screens+actions+data+navigation with .strict() | VERIFIED | 63 LOC; `.strict()` rejects unknown keys; literal schema version pinned; 13/13 tests green |
| `src/model/version.ts` | `SCHEMA_VERSION = "mobile-tui/1" as const` | VERIFIED | Direct import returns exact string; 4 LOC |
| `src/migrations/v1_to_v2.ts` | Empty-op migrate signature | VERIFIED | 20 LOC; `export function migrate(input: SpecV1): SpecV2` returns input as unknown as SpecV2 |
| `src/migrations/index.ts` | runMigrations chain runner + MIGRATIONS table + SpecVersion type | VERIFIED | 38 LOC; same-version shortcut; chain traversal; runMigrations re-exported from src/index.ts |
| `src/primitives/{ids,path,diagnostic,index}.ts` | Branded ID schemas, JsonPointer helpers, Diagnostic shape | VERIFIED | 38+57+45+6 LOC; all tests green (27+23+13 = 63 primitive tests) |
| `src/model/{back-behavior,action,data,variant,screen,navigation}.ts` | Leaf + composition schemas | VERIFIED | All present with matching tests; 10+21+17+12+16+18 = 94 model tests green |
| `fixtures/habit-tracker.spec.{md,json}` | Canonical fixture #1 w/ 3 screens + 2 entities + 5+ interactions | VERIFIED | 192+188 LOC; validateSpec returns 0 errors; 3 screens + 2 entities + 6 actions |
| `fixtures/todo.spec.{md,json}` | Canonical fixture #2 | VERIFIED | 218+208 LOC; 3 screens + 2 entities + 9 actions; 0 errors |
| `fixtures/social-feed.spec.{md,json}` | Canonical fixture #3 | VERIFIED | 203+215 LOC; 3 screens + 2 entities + 5 actions; 0 errors |
| `fixtures/malformed.spec.{md,json}` | Carries every diagnostic class | VERIFIED | 84+69 LOC; produces 7 diagnostics covering all 5 Stage-B codes; never throws |
| `fixtures/targets/habit-tracker.swift` | Hand-translated SwiftUI (D-16 artifact #1) | VERIFIED | 152 LOC; full kind→view mapping table; every Screen.id + testID present; references source + schema version |
| `fixtures/targets/habit-tracker.kt` | Hand-translated Compose (D-16 artifact #2) | VERIFIED | 181 LOC; full kind→composable mapping table; every Screen.id + testID present; references source + schema version |
| `tests/fixtures.test.ts`, `tests/malformed.test.ts`, `tests/catalog-coverage.test.ts`, `tests/fidelity.test.ts` | Integration test suite | VERIFIED | 6+15+2+3 = 26 assertions across 4 files; all green |
| `tests/helpers/parse-fixture.ts` | `.spec.json`/`.spec.ts` sibling reader | VERIFIED | Exports `readFixture`; resolves JSON siblings; refuses YAML lib per Phase 2 handoff |
| `src/index.ts` | Public barrel re-exporting validateSpec, SCHEMA_VERSION, Spec, Diagnostic, runMigrations | VERIFIED | Re-exports all required surface via model/index.ts + migrations/index.ts + primitives selectively |
| `package.json`, `tsconfig.json`, `biome.json`, `vitest.config.ts` | Toolchain configs | VERIFIED | zod@^4.3.6, jsonpointer@^5.0.1, vitest@^4.1.4, biome@^2.4.12, typescript@^5.6, `type: module`, `engines.node: ">=20"`; strict + noUncheckedIndexedAccess; noExplicitAny=error; src/**/*.test.ts + tests/**/*.test.ts discovery |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| validateSpec | SpecSchema.safeParse (Stage A) | sequential two-stage composition | WIRED | src/model/invariants.ts:69 calls SpecSchema.safeParse |
| validateSpec | crossReferencePass (Stage B) | sequential two-stage composition | WIRED | src/model/invariants.ts:80 calls crossReferencePass(parsed.data) |
| zodIssuesToDiagnostics | pathToJsonPointer | Zod issue path → RFC 6901 string | WIRED | imported and used to translate issue.path |
| src/index.ts | model + migrations + primitives | public re-export barrel | WIRED | `export * from './model/index.ts'`, `export { MIGRATIONS, runMigrations, SpecVersion } from './migrations/index.ts'` |
| ScreenSchema | ComponentNodeSchema + createScreenVariantsSchema | factory composition | WIRED | screen.ts composes variants via createScreenVariantsSchema(ComponentNodeSchema) |
| SpecSchema | ScreenSchema + ActionsRegistrySchema + DataModelSchema + NavigationGraphSchema + version | z.object composition | WIRED | spec.ts imports and composes all subschemas |
| runMigrations | v1_to_v2.migrate | MIGRATIONS table entry | WIRED | MIGRATIONS = [{ from: '1', to: '2', run: v1_to_v2 }] |
| tests/fixtures.test.ts | readFixture + validateSpec | readFixture → validateSpec chain | WIRED | Direct import + invocation |

### Data-Flow Trace (Level 4)

Phase 1 is a pure validator — no components render dynamic data. Level 4 not applicable. Instead, end-to-end validator behavior was exercised directly (see Behavioral Spot-Checks).

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `npx tsc --noEmit` clean | `npx tsc --noEmit` | exit 0, no output | PASS |
| Full test suite green | `npx vitest run` | 19 test files, 297 tests all passing in 642ms | PASS |
| 3 canonical fixtures validate with 0 errors | Direct validateSpec on each `.spec.json` | habit-tracker: OK, todo: OK, social-feed: OK (0 errors each) | PASS |
| Malformed fixture produces expected diagnostics without throwing | Direct validateSpec on malformed.spec.json | 7 diagnostics; all 5 Stage-B codes present; shape valid; did NOT throw | PASS |
| Migration v1→v2 round-trips byte-identical | runMigrations(habit-tracker, '1', '2') == input | byte-identical: true | PASS |
| 18-kind catalog enforced | COMPONENT_KINDS + RogueKind rejection | 18 kinds match expected; RogueKind rejected | PASS |
| SCHEMA_VERSION pinned | Direct import | "mobile-tui/1" | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SPEC-01 | 01-04, 01-06, 01-08 | Framework-agnostic 18-kind A2UI component tree | SATISFIED | COMPONENT_KINDS has exactly 18; catalog-coverage.test.ts confirms all 18 in fixtures; rogue kinds rejected |
| SPEC-02 | 01-05, 01-06, 01-08 | Screens with id/title/component tree | SATISFIED | ScreenSchema + fixtures × 3 validate; 13 spec tests + 16 screen tests green |
| SPEC-03 | 01-03, 01-05, 01-06 | Navigation graph + required back_behavior on non-root | SATISFIED | BackBehaviorSchema 10/10 tests; NavigationGraphSchema 18/18 tests; SPEC_MISSING_BACK_BEHAVIOR emitted by malformed fixture |
| SPEC-04 | 01-03 | Data entities + typed fields + JSON Pointer bindings | SATISFIED | DataModelSchema 17/17 tests; JsonPointer integrated; 5 closed field types including reference with `of:` refine |
| SPEC-05 | 01-03, 01-05 | Screen variants (content/empty/loading/error) as first-class | SATISFIED | ScreenVariantsSchema forces all 4 keys; 12 variant tests; null permitted for non-applicable |
| SPEC-06 | 01-03 | Named action refs (not inline handlers) | SATISFIED | ActionSchema 6-kind discriminated union; ActionsRegistrySchema keyed by ActionId; 21 tests green |
| SPEC-07 | 01-04 | testID sigils on interactables; validator fails on missing | SATISFIED | InteractableBase triple required on Button/TextField/Toggle/SegmentedControl/TabBar items; ListItem all-or-nothing refine; 40 component tests |
| SPEC-10 | 01-05, 01-08 | Optional acceptance criteria prose per screen | SATISFIED (automated); partial human | ScreenSchema has optional `acceptance: string[]?`; all 3 canonical fixtures carry acceptance prose. Readability judgment deferred to human verification |
| SERDE-08 | 01-07 | migrations/v{n}_to_v{n+1}.ts exists from commit 1 | SATISFIED | src/migrations/v1_to_v2.ts + src/migrations/index.ts ship; runMigrations + MIGRATIONS table; round-trip test green |

All 9 phase-mapped requirements SATISFIED on automated criteria. REQUIREMENTS.md already marked Complete for each.

### Anti-Patterns Found

Scanning files modified in this phase:

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (various) | — | No TODO/FIXME/XXX/HACK/PLACEHOLDER comments flagged as unresolved | — | None |
| src/migrations/v1_to_v2.ts | 18 | "No-op in Phase 1" comment — correctly documents empty-op per SERDE-08 | Info | Intentional; marked as v2 extension point |
| src/migrations/index.ts | 6-7 | Comment "callers MUST re-validate" — documents the deliberate throw contract flagged in REVIEW IN-05 | Info | Intentional; Phase 2 reconsideration recommended (REVIEW note) |

No blocker-severity anti-patterns. Review findings (WR-01, WR-02, WR-03, IN-01..IN-06) are correctness/completeness enhancements flagged by the standard-depth review; none invalidate any success criterion. The review findings concern uniqueness diagnostics for duplicate screen/entity names (not enumerated in success criteria) and polish for diagnostic code semantics. Tracking these as follow-ups does not block Phase 1 goal achievement.

### Human Verification Required

#### 1. Two-target fidelity gate — translation-ambiguity judgment

**Test:**
1. Open `fixtures/habit-tracker.spec.md` in one pane and `fixtures/targets/habit-tracker.swift` + `.kt` side-by-side.
2. For each screen (home, new_habit, detail_modal), verify every component in the tree maps to EXACTLY one view/composable.
3. Verify sigil triples round-trip: label in Text content, action in onClick / onCheckedChange wiring, testID in `.accessibilityIdentifier` (SwiftUI) or `Modifier.testTag` (Compose).
4. Verify variants (content/empty/loading/error) render as separate branches — no overlay hacks.
5. Judge: would another developer, given only the `.spec.md`, produce a materially different translation? If YES, file specific ambiguity findings and treat as gap. If NO, sign off.
6. (Optional) verify target files would compile in Xcode / Android Studio — NOT required.

**Expected:** Zero ambiguity. Each spec component has exactly one obvious native target primitive; sigil testIDs appear verbatim as `.accessibilityIdentifier` / `Modifier.testTag`; variant trees render as independent branches.

**Why human:** No automated oracle can judge whether two independent translators would produce meaningfully identical code. The automated half (tests/fidelity.test.ts 3/3 green) confirms every Screen.id + testID appears and that both target files reference the source fixture + schema version, but cannot judge semantic 1:1 mapping. 01-08.T6 was auto-approved by --auto chain — the judgment was not actually performed.

#### 2. Fixture prose acceptance criteria readability (SPEC-10)

**Test:** Open each canonical fixture (habit-tracker, todo, social-feed). For each screen, read the `acceptance:` prose lines. Confirm each reads as a human-testable statement (e.g., "User sees a list of habits with their daily-complete state" — yes; "this works" — no).

**Expected:** Every prose line is a concrete, testable statement of user-observable behavior.

**Why human:** Prose clarity and human-testability are subjective readability judgments; no automated oracle exists.

### Gaps Summary

No hard gaps — every automated success criterion passes empirically. The sole outstanding item is human judgment for the fidelity gate (success criterion #5, manual half) plus SPEC-10 acceptance-prose readability. Both were listed in VALIDATION.md §Manual-Only Verifications and the fidelity-gate manual task (01-08.T6) was auto-approved by the --auto orchestrator flag — not actually reviewed by a human. Per goal-backward verification, these must surface as `human_needed` rather than `passed`.

Advisory findings from the code review (01-REVIEW.md) — 3 warnings + 6 info items, all non-blocking — document completeness gaps (missing duplicate-screen-id and duplicate-entity-name diagnostics, RFC-6901-escape handling in resolveJsonPointerPrefix, Zod v4 invalid_key code mapping, navigation.root semantic-mismatch diagnostic code, migration runner throw vs never-throws asymmetry, etc.). None invalidate any of the 5 Phase 1 success criteria; all are appropriate follow-ups for Phase 2+.

---

_Verified: 2026-04-17T02:24:00Z_
_Verifier: Claude (gsd-verifier)_
