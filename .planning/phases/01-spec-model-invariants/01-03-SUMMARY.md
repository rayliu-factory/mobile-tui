---
phase: 01-spec-model-invariants
plan: 03
subsystem: model
tags: [typescript, zod, discriminated-union, schema-version, back-behavior, actions, data-model, variants, vitest]

# Dependency graph
requires:
  - phase: 01-spec-model-invariants
    provides: "L1 primitives — ScreenIdSchema / ActionIdSchema / EntityNameSchema (ids.ts), JsonPointerSchema (path.ts), SNAKE_CASE regex constant (ids.ts) — shipped by Plan 01-02"
provides:
  - SCHEMA_VERSION constant — exactly the literal string `"mobile-tui/1"` typed via `as const`; the `SchemaVersion` type alias is `typeof SCHEMA_VERSION` (SERDE-08 anchor)
  - BackBehaviorSchema — closed discriminated behavior over `"pop" | "dismiss" | "reset-to-root" | { kind: "replace", screen: ScreenId }` with `.strict()` on the replace object (SPEC-03 shape contribution)
  - ActionSchema — `z.discriminatedUnion("kind", ...)` over exactly 6 branches: NavigateAction, SubmitAction, MutateAction, PresentAction, DismissAction, CustomAction; each branch `.strict()` (SPEC-06)
  - MUTATE_OPS readonly tuple `["toggle", "set", "push", "remove"]` + `MutateOp` type alias — closed mutate op vocabulary
  - ActionsRegistrySchema — `z.record(ActionIdSchema, ActionSchema)` (top-level actions map keyed by snake_case ActionId)
  - FieldSchema / FieldTypeSchema / FIELD_TYPES — closed field type enum `[string, number, boolean, date, reference]` with `.refine` enforcing `of: EntityName` when type is `reference` (SPEC-04)
  - EntitySchema — PascalCase name + ≥1 field + optional typed relationships; `RELATIONSHIP_KINDS = [has_one, has_many, belongs_to]`
  - DataModelSchema — `{ entities: EntitySchema[] }` with `.min(1)` on entities
  - createVariantSchemas / createScreenVariantsSchema factory — generic over a tree-schema parameter, returns ContentVariant / EmptyVariant / LoadingVariant / ErrorVariant with per-kind closed `when:` grammar (collection / async / field_error)
  - ScreenVariantsSchema — all 4 keys required (D-06); content non-nullable; empty/loading/error nullable
  - Default (placeholder) variant schemas using `z.array(z.unknown())` for the tree — standalone-testable in this plan; Plan 05 rewires with real ComponentNodeSchema via the factory
affects:
  - 01-04 (ComponentNode recursion): no direct import; 01-04 may freely ship its recursive `z.lazy + z.union` without touching variant.ts (the factory defers the tree-schema binding)
  - 01-05 (Spec root): will call `createScreenVariantsSchema(ComponentNodeSchema)` with Plan 04's schema to produce the real variant type; will also import `SCHEMA_VERSION`, `BackBehaviorSchema`, `ActionsRegistrySchema`, `DataModelSchema` for Spec.frontmatter composition
  - 01-06 (validateSpec): cross-reference pass will resolve navigate.screen / submit.entity / mutate.target / present.overlay against the rest of the parsed spec; this plan only validates SHAPE
  - 01-07 (migration runner): imports `SCHEMA_VERSION` as the v1 anchor
  - 01-08 (fixtures): Plan 01-08 hand-authored fixtures use the shapes locked here (action kinds, mutate ops, back_behavior vocabulary, variant keys)

# Tech tracking
tech-stack:
  added: []  # Pure schema layer; no new runtime deps beyond zod which landed in 01-01
  patterns:
    - "z.discriminatedUnion(\"kind\", ...) for flat tagged unions (Action, per-kind Variant) — chosen over z.union for O(1) discriminator lookup and targeted error messages; recursive unions remain on z.lazy+z.union (reserved for Plan 04's ComponentNode)"
    - "Closed vocabularies as readonly tuples + z.enum: `MUTATE_OPS`, `FIELD_TYPES`, `RELATIONSHIP_KINDS`. Export the tuple so downstream tests can parametrize via `it.each(...)` without re-declaring the set."
    - "Factory pattern for deferred schema wiring (`createScreenVariantsSchema(treeSchema)`) — sidesteps Plan 04's ComponentNodeSchema forward-declaration without falling back to z.lazy at this layer. The default exports close over `z.unknown()` for Plan 03 standalone testing; Plan 05 closes over the real ComponentNodeSchema."
    - "`.strict()` on every object branch — rejects unknown keys at parse time. Threat T-01-03 (prototype pollution via unknown discriminator/key) mitigated structurally."
    - "FieldSchema `.refine` enforces reference-type → `of: EntityName` dependency. Zod's refine is the right tool for single-field cross-condition checks; multi-sibling cross-refs (e.g., does `of` resolve to an existing entity?) are Plan 06's job."
    - "TDD per-task commit pair: `test(01-03): …` RED then `feat(01-03): …` GREEN. Eight commits total (4 tasks × 2). Each RED commit verified to fail with `Cannot find module` before GREEN lands."

key-files:
  created:
    - src/model/version.ts
    - src/model/back-behavior.ts
    - src/model/back-behavior.test.ts
    - src/model/action.ts
    - src/model/action.test.ts
    - src/model/data.ts
    - src/model/data.test.ts
    - src/model/variant.ts
    - src/model/variant.test.ts
  modified: []  # No files outside src/model/ touched.

key-decisions:
  - "ActionSchema uses `z.discriminatedUnion(\"kind\", ...)` with six `.strict()` branches. Closed kind literal set rejects unknown discriminator values (teleport, __proto__, etc.). This is the correct tool because Action is non-recursive — all six branches are flat objects. The recursive path (ComponentNode) uses z.union + z.lazy and lives in Plan 04; the two patterns do NOT mix here."
  - "`createScreenVariantsSchema(treeSchema)` factory is a deferred-binding pattern rather than a `z.lazy(() => ComponentNodeSchema)` forward reference. Rationale: Plan 04 has not landed, so the ComponentNode identifier is not yet importable. The factory inverts control — variant.ts ships a schema generator, Plan 05 (composition) decides what tree schema to thread through. The default placeholder (z.array(z.unknown())) keeps Plan 03 tests standalone. No forward-import cycle, no `.ts` reference to a not-yet-existing module."
  - "MUTATE_OPS declared as `readonly` tuple (`as const`) with a separate `z.enum(MUTATE_OPS)` declaration. Tests parameterize over the tuple via `it.each(MUTATE_OPS)`, ensuring the test suite fails closed if a future change adds an op without a test case for it."
  - "FieldSchema `.refine` on `(field.type !== \"reference\" || field.of !== undefined)` encodes the SPEC-04 reference-requires-target rule at shape-validation time. Cross-ref resolution (`of` must name an existing entity) is Plan 06. Keeping the conditional requirement here prevents a class of malformed specs from ever reaching cross-ref."
  - "All object schemas use `.strict()`. Unknown keys are structurally rejected at parse time. This is load-bearing for two reasons: (a) T-01-03 threat mitigation — `__proto__` / `constructor` / arbitrary keys never reach JS object space; (b) authoring hygiene — typos in spec files (`kin` instead of `kind`) fail loud instead of silently parsing as a different variant."
  - "ScreenVariantsSchema top-level `.strict()` + explicit null-union on 3 of 4 keys encodes D-06 \"forbids omission, permits null\". Tests enforce both halves: omission fails, `null` succeeds, extra keys fail. This is the shape contract the Phase 2 serializer will round-trip (emit `empty: null` as literal YAML null, not absent key)."

patterns-established:
  - "Factory-as-deferred-binding: ship a schema generator `create<Thing>Schema(inner)` when a later plan owns the concrete `inner`. Avoids forward module references and keeps each plan's test suite standalone. Pattern reusable for any recursive-type plumbing that arrives late."
  - "Every new object schema: export readonly tuple of valid enum values + export z.enum wrapping that tuple + test `.each(TUPLE)` to parameterize acceptance. If an enum ever grows, the tuple gets a new entry and the test grows in lock-step, for free."
  - "Confined recursion: only Plan 04's ComponentNodeSchema uses z.union + z.lazy. Every other union in Phase 1 (Action, BackBehavior, Variant) is flat and uses z.discriminatedUnion. A `grep -r 'z.union\\|z.lazy' src/model/` audit at Plan 08 will confirm only one module uses the recursive pattern."
  - "TDD per-task commits (`test:` RED, `feat:` GREEN) with `git log --oneline | grep '01-03'` reconstructing the full TDD cycle. Total of 8 commits for Plan 03 (4 tasks × 2) — matching Plan 02's 6 commits (3 tasks × 2) cadence."

requirements-completed: [SPEC-03, SPEC-04, SPEC-05, SPEC-06]  # SHAPE coverage only — cross-ref resolution for SPEC-03/SPEC-06 completes in Plan 06

# Metrics
duration: 3m 44s
completed: 2026-04-17
---

# Phase 01 Plan 03: Wave 2 Leaf Model Schemas Summary

**Ships the five non-recursive leaf model schemas — `version.ts`, `back-behavior.ts`, `action.ts`, `data.ts`, `variant.ts` — plus four matching `*.test.ts` files. 60 new assertions (123 cumulative with primitives) pass; `tsc --noEmit` and `biome check src/model/` are clean. Action discriminated union is closed over exactly 6 kinds; mutate.op is closed over exactly 4 ops; variants cover all four D-06 keys with content-required / others-nullable; createScreenVariantsSchema factory defers ComponentNodeSchema binding so Plan 04 and Plan 03 have zero intersection.**

## Performance

- **Duration:** 3m 44s
- **Started:** 2026-04-17T13:05:01Z
- **Completed:** 2026-04-17T13:08:45Z
- **Tasks:** 4 / 4 (8 commits — one RED test + one GREEN feat per task)
- **Files created:** 9 (5 source + 4 test)

## Accomplishments

- Locked the SCHEMA_VERSION anchor: `"mobile-tui/1" as const`, typed as `SchemaVersion = typeof SCHEMA_VERSION`. Plan 07's migration runner consumes this directly; serializer (Phase 2) emits this into frontmatter.
- BackBehavior vocabulary fully encoded: three literal variants + one structured `replace` variant with a strict `ScreenId` target. Rejects unknown literals, PascalCase screen ids, missing screen field, unknown kind values, and extra keys on the replace object (7 distinct test cases).
- Action 6-kind discriminated union shipped verbatim per RESEARCH §Pattern 2: `NavigateAction`, `SubmitAction`, `MutateAction`, `PresentAction`, `DismissAction`, `CustomAction`. All branches use `.strict()`; `mutate.target` is a validated `JsonPointer`; `custom.name` is constrained to snake_case for downstream Maestro/handoff consistency.
- MUTATE_OPS closed tuple `["toggle", "set", "push", "remove"]` exported + parameterized test coverage (one test per op).
- ActionsRegistrySchema = `z.record(ActionIdSchema, ActionSchema)` — key schema validation rejects non-snake-case keys (verified by test with `"1invalid"` as key).
- Data model schemas cover SPEC-04 at shape level: FIELD_TYPES `[string, number, boolean, date, reference]`, `.refine` dependency enforcing `of: EntityName` when type is reference, RELATIONSHIP_KINDS closed enum, `.min(1)` on both fields and entities arrays, `.strict()` on every object.
- Variant system establishes the per-kind closed `when:` grammar (D-08): `collection` for empty, `async` for loading, `field_error` for error. Cross-kind fields are rejected (empty with `when: { async }` fails). Missing `when` fails. ScreenVariantsSchema forbids omission of any of the four keys and forbids `content: null` (D-06). Extra keys on the wrapper are rejected.
- `createScreenVariantsSchema(treeSchema)` factory exported — Plan 05 will call it with Plan 04's `ComponentNodeSchema` to produce the real variant type without this plan needing any forward reference.

## Task Commits

Eight per-task commits in strict RED → GREEN order:

1. **Task 1 RED: failing tests for schema version + back-behavior** — `469d904` (test)
2. **Task 1 GREEN: implement schema version constant + BackBehavior schema** — `369491a` (feat)
3. **Task 2 RED: failing tests for Action 6-kind union + registry** — `2434b7a` (test)
4. **Task 2 GREEN: implement Action 6-kind discriminated union + registry** — `a22d0fd` (feat)
5. **Task 3 RED: failing tests for data model schemas** — `ca03007` (test)
6. **Task 3 GREEN: implement data model schemas (Field, Entity, DataModel)** — `f569bbd` (feat)
7. **Task 4 RED: failing tests for Variant schemas + ScreenVariants** — `fa2f32e` (test)
8. **Task 4 GREEN: implement Variant schemas + ScreenVariants factory** — `766a0bf` (feat)

**Plan metadata commit:** pending (includes this SUMMARY.md, STATE.md, ROADMAP.md, REQUIREMENTS.md).

## Files Created/Modified

- `src/model/version.ts` — `SCHEMA_VERSION = "mobile-tui/1" as const` + `SchemaVersion` type alias
- `src/model/back-behavior.ts` — `BackBehaviorSchema` (union of 3 literals + strict replace object) + `BackBehavior` type
- `src/model/back-behavior.test.ts` — 10 assertions (SCHEMA_VERSION constant check + BackBehavior parametrized + reject cases)
- `src/model/action.ts` — `MUTATE_OPS` tuple + `MutateOp` type + six branch schemas + `ActionSchema` discriminated union + `ActionsRegistrySchema` record + inferred types `Action`, `ActionsRegistry`
- `src/model/action.test.ts` — 21 assertions covering all 6 kinds, mutate.op parametrization, registry key validation, and the MUTATE_OPS constant
- `src/model/data.ts` — `FIELD_TYPES` tuple + `FieldTypeSchema` + `FieldSchema` with `.refine` for reference dependency + RELATIONSHIP_KINDS + `RelationshipSchema` + `EntitySchema` + `DataModelSchema` + inferred types
- `src/model/data.test.ts` — 17 assertions covering all 5 field types + reference enforcement + entity shape + data model shape
- `src/model/variant.ts` — `createVariantSchemas(treeSchema)` + `createScreenVariantsSchema(treeSchema)` factories + default placeholder exports (ContentVariantSchema / EmptyVariantSchema / LoadingVariantSchema / ErrorVariantSchema / ScreenVariantsSchema) + inferred types
- `src/model/variant.test.ts` — 12 assertions covering per-kind when: grammar + cross-kind rejection + missing when rejection + ScreenVariants 4-key discipline + content-non-null + strict extra-key rejection

## Decisions Made

- **ActionSchema uses `z.discriminatedUnion` (not `z.union`)** — plan text explicitly warned against mixing the two patterns; this plan is non-recursive. Verified by `grep "z.union\|z.lazy" src/model/action.ts` returning empty. The recursive pattern is reserved exclusively for Plan 04's ComponentNode.
- **Factory pattern over forward import for variant tree schema** — `createScreenVariantsSchema(treeSchema)` accepts any Zod schema as the tree type. Plan 03's default exports close over `z.unknown()` so this plan's tests run standalone; Plan 05 (composition) will close over the real `ComponentNodeSchema` from Plan 04. Alternative — a `z.lazy(() => ComponentNodeSchema)` forward reference — would require this plan to have a TypeScript dependency on a not-yet-existing module, which violates the wave-parallelism architecture.
- **Every object branch uses `.strict()`** — applied to all six Action branches, both Field and Entity objects, Relationship, DataModel, BackBehavior's replace-object, every variant object (Content / Empty / Loading / Error), the ScreenVariants wrapper, and the nested `when:` objects. This is the T-01-03 structural mitigation; verified by explicit "reject extra keys" tests on BackBehavior, each Action branch, and ScreenVariants.
- **MUTATE_OPS, FIELD_TYPES, RELATIONSHIP_KINDS all exported as `readonly` tuples and wrapped in `z.enum(...)`** — pattern from Plan 02's SNAKE_CASE/PASCAL_CASE exports. Tests parameterize over the tuple (`it.each(MUTATE_OPS)`, `it.each(FIELD_TYPES)`) so a future enum-extension gets a new test row for free.
- **FieldSchema `.refine` encodes the reference-requires-`of` rule at shape level** — rejected specs with `{ name: "author", type: "reference" }` without `of`. Chosen over moving the check to Plan 06's cross-ref pass: keeping it here ensures malformed specs are caught earlier and with a clearer error (the refine message names the exact dependency).
- **`custom.name` constrained to snake_case via `z.string().regex(SNAKE_CASE, ...)`** — rather than accepting any string. Reason: CONTEXT.md's "ID case conventions" applies to all author-defined identifiers that cross the spec ↔ Maestro boundary. A PascalCase custom action name would break downstream Maestro selector hygiene.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Biome formatter normalized Plan-prescribed indentation in all new files**
- **Found during:** After Task 1 GREEN (first `biome check src/model/` run).
- **Issue:** Plan snippets used a mix of tabs and 2-space indentation; biome.json enforces 2-space indentation consistently. `biome check` exited 1 on all new files with "Formatter" errors.
- **Fix:** Ran `npx biome check --write src/model/` after each GREEN implementation and before each RED commit. Content identical in every case; only whitespace changed.
- **Files modified:** All files listed under Files Created (via biome autofix pass before each commit).
- **Verification:** `npx biome check src/model/` exits 0; `npx vitest run src/primitives/ src/model/` remained 123/123 throughout; `npx tsc --noEmit` clean.
- **Committed in:** The respective GREEN / RED commit for each task — autofix applied immediately before `git add`, consistent with Plan 01-02's precedent (deviation #1 in 01-02-SUMMARY.md).

---

**Total deviations:** 1 auto-fixed (formatter hygiene).
**Impact on plan:** Zero. Cosmetic only. No scope change, no architectural concession, no extra tests added, no test expectations softened.

## Issues Encountered

None. Every task's RED commit failed with the expected `Cannot find module './<file>.ts'` error (source file not yet written). Every GREEN commit's implementation passed all target tests on the first run. `tsc --noEmit` clean on every GREEN commit. Cumulative `vitest run src/primitives/ src/model/` remained 123/123 after each GREEN commit. No test flakes, no cascading primitive-level regressions, no refactor cycles needed.

## User Setup Required

None — Plan 01-03 is a pure schema + type layer with no external services, credentials, or environment variables.

## Verification Evidence

All plan-level success criteria satisfied:

| Criterion | Result |
|-----------|--------|
| `src/model/version.ts` exports `SCHEMA_VERSION = "mobile-tui/1" as const` and `SchemaVersion` type | PASS (exact grep match, verified) |
| `src/model/back-behavior.ts` exports `BackBehaviorSchema` + `BackBehavior` type | PASS |
| BackBehavior accepts exactly 3 literals + 1 object kind; rejects all others (SPEC-03 shape) | PASS (10 assertions) |
| ActionSchema is `z.discriminatedUnion("kind", ...)` over exactly 6 kinds | PASS (grep confirmed; 21 assertions exercising every kind) |
| `mutate.op` is a closed enum of exactly 4 values; MUTATE_OPS tuple exactly `["toggle", "set", "push", "remove"]` | PASS |
| ActionsRegistrySchema keys validated via ActionIdSchema (snake_case key rejection) | PASS (explicit "1invalid" test case) |
| FieldSchema has 5 closed types; reference type enforces `of` via `.refine`; EntitySchema requires ≥1 field; DataModelSchema requires ≥1 entity | PASS |
| ScreenVariantsSchema rejects both key omission and `content: null`; per-kind closed `when:` grammar present | PASS (5 assertions on ScreenVariants discipline) |
| Zero uses of `z.union` + `z.lazy` in this plan (reserved for Plan 04) | PASS (`grep -r "z\\.lazy" src/model/` returns nothing) |
| All schemas use `.strict()` to prevent unknown-key injection (T-01-03) | PASS (grep shows `.strict()` on every object schema; reject-extra-key tests on BackBehavior + Action + ScreenVariants) |
| Test suite ≥50 assertions | PASS (60 new + 63 primitive = 123 cumulative; 60 new ≥ 50 target) |
| `npx tsc --noEmit` exits 0 | PASS |
| `npx vitest run src/model/` exits 0 | PASS (60/60) |
| `npx vitest run src/primitives/ src/model/` exits 0 (cumulative) | PASS (123/123) |
| `npx biome check src/model/` exits 0 after autofix | PASS |

## Next Phase Readiness

**Wave 2 Plan 01-03 COMPLETE.** Wave 2 Plan 01-04 (ComponentNodeSchema — the ONE recursive union in Phase 1) can run in parallel with or immediately after this plan. Wave 3 Plan 01-05 (spec.ts composition) will thread Plan 04's `ComponentNodeSchema` through `createScreenVariantsSchema` and compose the full Spec root from these building blocks.

Ready-to-consume artifacts for downstream plans:

- `SCHEMA_VERSION` ⇒ `01-05-PLAN.md` imports for frontmatter `schema:` field; `01-07-PLAN.md` imports as migration-runner v1 anchor
- `BackBehaviorSchema` ⇒ `01-05-PLAN.md` imports for per-screen `back_behavior:` field composition
- `ActionSchema`, `ActionsRegistrySchema` ⇒ `01-05-PLAN.md` imports for top-level `actions:` registry composition
- `DataModelSchema` ⇒ `01-05-PLAN.md` imports for top-level `data:` composition
- `createScreenVariantsSchema`, `ContentVariantSchema`, etc. ⇒ `01-05-PLAN.md` calls `createScreenVariantsSchema(ComponentNodeSchema)` with Plan 04's schema to produce the real `ScreenVariantsSchema`
- `MUTATE_OPS`, `FIELD_TYPES`, `RELATIONSHIP_KINDS` tuples ⇒ any future plan needing to parametrize over these vocabularies imports the tuple directly

**No blockers for Wave 2 continuation or Wave 3 composition.** All primitives + Plan 03 leaf schemas are stable, fully tested, `tsc`-clean, and `biome`-clean.

## Self-Check: PASSED

All 9 claimed files present on disk:

- `src/model/version.ts` — FOUND
- `src/model/back-behavior.ts` — FOUND
- `src/model/back-behavior.test.ts` — FOUND
- `src/model/action.ts` — FOUND
- `src/model/action.test.ts` — FOUND
- `src/model/data.ts` — FOUND
- `src/model/data.test.ts` — FOUND
- `src/model/variant.ts` — FOUND
- `src/model/variant.test.ts` — FOUND

All 8 task commits verified in `git log --oneline --all`:

- `469d904` (Task 1 RED) — FOUND
- `369491a` (Task 1 GREEN) — FOUND
- `2434b7a` (Task 2 RED) — FOUND
- `a22d0fd` (Task 2 GREEN) — FOUND
- `ca03007` (Task 3 RED) — FOUND
- `f569bbd` (Task 3 GREEN) — FOUND
- `fa2f32e` (Task 4 RED) — FOUND
- `766a0bf` (Task 4 GREEN) — FOUND

## TDD Gate Compliance

Plan frontmatter specifies `type: execute`; each task declares `tdd="true"`, so the TDD gate applies per-task. Each task has both a `test(01-03): …` commit preceding a `feat(01-03): …` commit — RED then GREEN, in that order. Reconstructable via `git log --oneline | grep '01-03'`. RED commit was verified to fail with `Cannot find module` before every GREEN implementation. REFACTOR gate commits were unnecessary (no cleanup beyond biome formatter autofix, batched into GREEN commits per the Plan 02 precedent).

---
*Phase: 01-spec-model-invariants*
*Plan: 03*
*Completed: 2026-04-17*
