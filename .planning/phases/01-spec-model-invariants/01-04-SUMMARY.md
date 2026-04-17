---
phase: 01-spec-model-invariants
plan: 04
subsystem: model
tags: [typescript, zod, recursive-union, z-lazy, component-catalog, a2ui, sigil-triple, vitest]

# Dependency graph
requires:
  - phase: 01-spec-model-invariants
    provides: "L1 primitives — TestIDSchema + SNAKE_CASE regex (ids.ts), JsonPointerSchema (path.ts) shipped by Plan 01-02"
provides:
  - ComponentNodeSchema — the ONE recursive Zod schema in Phase 1. Uses `z.lazy(() => z.union([...]))` with explicit `z.ZodType<ComponentNode>` annotation per RESEARCH §Pattern 1. 18 branches; 9 recursive (Column, Row, Card, List, ListItem, NavBar, Modal, Sheet, and TabBar via inline InteractableBase extension), 9 leaf (Text, Icon, Divider, Spacer, Image, Button, TextField, Toggle, SegmentedControl). SPEC-01 closed catalog.
  - ComponentNode — forward TypeScript discriminated union alongside the schema; authoritative for both compile-time narrowing (kind === "X" → branch-specific fields) and the `z.ZodType<ComponentNode>` annotation that terminates recursive inference.
  - COMPONENT_KINDS readonly tuple + ComponentKind type + ComponentKindSchema enum — closed 18-kind vocabulary. Parity between tuple and the schema's z.union branches is the grep-gated plan invariant.
  - InteractableBase — the sigil-triple base schema ({label: printable-ASCII, action: snake_case, testID: TestID}). Extended by Button, TextField, Toggle, SegmentedControl, and TabBar items. Encodes D-01 at schema time; SPEC-07 shape coverage.
  - ListItem all-or-nothing .refine — enforces D-02 dual-mode (tappable row vs. container row): either all three sigil fields present or none.
  - TabBar inline item grammar — items are InteractableBase.extend({icon}).strict(), not full ComponentNodes. Bounds [2,5] per reasonable mobile tab-bar limits.
affects:
  - 01-05 (Spec root composition): calls `createScreenVariantsSchema(ComponentNodeSchema)` from variant.ts to produce the real ScreenVariantsSchema with `tree: ComponentNode[]` typing rather than the Plan 03 `z.unknown()` placeholder. Also threads ComponentNodeSchema into Screen/Navigation wiring.
  - 01-06 (validateSpec): the recursive testID-walker in crossReferencePass descends ComponentNode trees to detect sigil collisions at every depth (RESEARCH §Common Pitfalls #3).
  - 01-08 (fixtures): hand-authored fixtures depend on this closed catalog; any fixture using an unknown kind fails schema parse before hitting cross-ref.

# Tech tracking
tech-stack:
  added: []  # Pure schema layer; no new runtime deps. Uses zod already installed in 01-01.
  patterns:
    - "Recursive discriminated-tree via `z.lazy(() => z.union([...]))` with explicit `z.ZodType<ComponentNode>` annotation — the RESEARCH §Pattern 1 structural template. Avoids Zod v4's discriminated-union API which collapses TS inference and throws at runtime on recursion (issues #4264, #5288)."
    - "Forward TypeScript type union alongside the schema — the type is authoritative for compile-time narrowing and the annotation; adding a new component kind requires updating both the type and the schema branches in lock-step. Parity enforced by grep gate on COMPONENT_KINDS entries."
    - "Shared `InteractableBase` Zod object extended via `.extend({...}).strict()` for per-kind interactable schemas — keeps the sigil triple defined in ONE place; adding a new interactable kind is a 3-line extension + one forward-type entry + one union branch."
    - "TabBar items use InteractableBase.extend({icon}).strict() INLINE (not via z.array of ComponentNode) — TabBar is not recursive over ComponentNode; its item grammar is a flat sigil record. Semantics + bounds (.min(2).max(5)) encoded at schema shape."
    - "All 18 object branches apply .strict() — defense-in-depth T-01-03 mitigation extended from Plan 03; unknown keys anywhere in the tree fail at parse time."
    - "`.refine` for ListItem all-or-nothing sigil — single-record cross-field dependency encoded at schema time, not deferred to crossReferencePass. Same pattern Plan 03 used for FieldSchema reference→of dependency."
    - "TDD per-task commit pattern preserved from Plan 02/03: `test(01-04):` RED → `feat(01-04):` GREEN → `test(01-04):` test expansion."

key-files:
  created:
    - src/model/component.ts
    - src/model/component.test.ts
  modified: []  # No files outside src/model/ touched.

key-decisions:
  - "ComponentNodeSchema uses `z.lazy + z.union + explicit z.ZodType<ComponentNode>` exactly per RESEARCH §Pattern 1 — NOT the discriminated-union API. Zod v4's discriminated-union does not compose with recursion (throws 'Cannot access X before initialization' at runtime and collapses TS inference to `unknown` at compile time). The annotation is load-bearing: without it, Plan 05 would see ScreenVariants.tree as `unknown[]`. Verified by the `TypeScript inference sanity` test that narrows on `kind === \"Text\"` and accesses `.text`."
  - "Forward `ComponentNode` type union is authoritative alongside the schema, not derived via `z.infer<>`. Reason: `z.infer` on a `z.ZodType<T>`-annotated lazy schema returns T itself — the annotation IS the type source. Inferring the other direction (infer the type from the schema) requires the schema to be constructible without a forward type, which z.lazy's self-reference needs. The duplication is one-for-one: adding a new kind is a single-atom diff in both the type union and the schema's union branches."
  - "ListItem uses `.refine` for the all-or-nothing sigil rule rather than two separate schemas (`TappableListItem | ContainerListItem`). Rationale: a single branch keeps the closed catalog at 18 kinds (a `TappableListItem` split would land us at 19 discriminated-union branches with `kind: \"ListItem\"` appearing twice — which Zod would reject structurally). The refine message names D-02 so the diagnostic pinpoints the exact spec rule violated."
  - "TabBar items inline-extend `InteractableBase` rather than being full ComponentNodes. Rationale: the tab-bar grammar is intentionally flat — a tab item is a sigil triple plus an optional icon, NOT an arbitrary nested tree. Allowing `ComponentNode` in TabBar.items would let authors nest a Card inside a tab, which isn't representable in SwiftUI/Compose tab bars. The `.min(2).max(5)` bounds match the iOS/Android native tab-bar conventions."
  - "Button declaration uses `InteractableBase.extend({kind: z.literal(\"Button\"), variant: z.enum([...]).optional()}).strict()` — merging the sigil triple INTO the Button schema rather than `z.object({kind, label, action, testID, variant})`. This makes the DRY intent explicit at the schema level (adding a new interactable kind = one `.extend` call, not a repeated triple definition) and makes `Button` a proper interactable at the Zod type level."
  - "PRINTABLE_ASCII regex `/^[\\x20-\\x7E]+$/` (anchored, non-backtracking, char-class) — matches ids.ts SNAKE_CASE / PASCAL_CASE pattern discipline. T-01-02 mitigation (no control chars, no Unicode, no emoji in labels). Verified by three targeted test cases: reject emoji, reject control char (0x00), reject control char (0x1F via action also but specifically label control-char test)."

patterns-established:
  - "Recursive-union-with-annotation is the ONE pattern for recursive Zod schemas in this codebase. Any future recursive type (Phase 2 might add a nested-AST, Phase 4 might add reactive-store tree nodes) MUST follow the RESEARCH §Pattern 1 template: forward type union + z.lazy + z.union + z.ZodType<T> annotation. Non-recursive unions continue to use the discriminated-union API per Plan 03 precedent."
  - "Closed vocabularies remain exported as readonly tuples + z.enum. COMPONENT_KINDS (18 entries) follows the same shape as MUTATE_OPS / FIELD_TYPES / RELATIONSHIP_KINDS. Tests parameterize over the tuple via it.each(KINDS) so adding a new kind grows test coverage for free."
  - "Sigil-bearing interactables extend InteractableBase via .extend({...}).strict(). Any interactable added in Phase 3+ (stretch: `Slider`, `DatePicker`, `Stepper`) inherits the triple automatically. Non-interactables do NOT extend it; they remain pure `z.object({kind, ...}).strict()`."
  - "TDD per-task commit pattern (test: RED → feat: GREEN → [optional test: expansion]) continues. Plan 04 has 3 commits total: one RED smoke test, one GREEN implementation, one test expansion to full 40-assertion coverage."

requirements-completed: [SPEC-01, SPEC-07]

# Metrics
duration: 4m 6s
completed: 2026-04-17
---

# Phase 01 Plan 04: Recursive ComponentNode Schema (Wave 2 completion) Summary

**Ships the 18-kind A2UI-shaped component catalog as a recursive Zod schema — the ONE recursive union in Phase 1 — using `z.lazy + z.union + explicit z.ZodType<ComponentNode>` per RESEARCH §Pattern 1. 40 new component-tree assertions exercise every kind, every sigil-triple enforcement path, the ListItem all-or-nothing refine, TabBar 2-5 bounds, 100-level deep-recursion stress, and the TypeScript inference sanity check. Cumulative: 163/163 tests (123 from Plans 01-03 + 40 new). `npx tsc --noEmit` and `npx biome check src/model/` both clean. Wave 2 is now complete — Plan 05 can thread `ComponentNodeSchema` through `createScreenVariantsSchema` to compose the full Spec root.**

## Performance

- **Duration:** 4m 6s
- **Started:** 2026-04-17T13:14:22Z
- **Completed:** 2026-04-17T13:18:28Z
- **Tasks:** 2 / 2 (3 commits — RED smoke test + GREEN implementation + full test expansion)
- **Files created:** 2 (component.ts + component.test.ts)

## Accomplishments

- Locked the 18-kind closed catalog (SPEC-01): `["Column", "Row", "Text", "Button", "TextField", "List", "ListItem", "Card", "Image", "Icon", "Divider", "Toggle", "SegmentedControl", "TabBar", "NavBar", "Modal", "Sheet", "Spacer"] as const`. Exported as `COMPONENT_KINDS` tuple, `ComponentKind` type, `ComponentKindSchema` z.enum wrapper. Any other `kind` value is rejected by the schema (verified via "Foo" + "Canvas" test cases).
- ComponentNodeSchema uses `z.lazy + z.union + z.ZodType<ComponentNode>` — the canonical recursive-tree pattern from RESEARCH. Verified `! grep -q 'z.discriminatedUnion' src/model/component.ts` (the literal token is absent — even in comments — so the plan's grep gate passes cleanly).
- All 9 recursive branches (Column, Row, Card, List, ListItem, NavBar, Modal, Sheet — plus TabBar's inline InteractableBase extension) correctly self-reference ComponentNodeSchema from inside the lazy thunk. Verified by "deeply nested Column-in-Card-in-Column parses" and "100-level nested Column tree parses without stack overflow" tests.
- InteractableBase encodes the sigil triple (D-01) in ONE place and is extended by Button, TextField, Toggle, SegmentedControl, and TabBar items. All four interactable `z.object` extensions apply `.strict()` to reject unknown keys (T-01-03).
- PRINTABLE_ASCII regex (D-03) restricts labels to `/^[\x20-\x7E]+$/` — anchored + non-backtracking (T-01-02 mitigation). Verified by rejection tests for emoji (U+1F680 rocket) and control char (U+0000).
- ListItem `.refine` enforces D-02 all-or-nothing sigil triple — zero OR three sigil fields succeed (container / tappable dual mode), exactly one or exactly two fails. Four parametrized test cases cover all four transitions.
- TabBar `.min(2).max(5)` bounds on items array — 1 item fails, 2 and 5 accept, 6 fails. Every TabBar item independently validates through `InteractableBase.extend({icon}).strict()` — missing testID on a single item fails the whole TabBar.
- TypeScript inference sanity test proves the `z.ZodType<ComponentNode>` annotation terminated recursive inference: narrowing on `kind === "Text"` gives access to `.text`. If inference had collapsed to `unknown`, the test file would fail to compile under `tsc --noEmit`.
- Zero regressions: 123 pre-existing primitive + model tests continue to pass alongside 40 new ones (163 cumulative).

## Task Commits

Three commits preserving the RED → GREEN TDD rhythm established by Plans 02-03:

1. **Task 1 RED: failing smoke test for COMPONENT_KINDS.length === 18** — `e1f001a` (test)
2. **Task 1 GREEN: implement recursive ComponentNode schema (18-kind catalog)** — `6199d5d` (feat)
3. **Task 2: expand component schema tests — 18 kinds + sigil + recursion + threats** — `118683d` (test)

**Plan metadata commit:** pending (will include this SUMMARY.md, STATE.md, ROADMAP.md, REQUIREMENTS.md).

## Files Created/Modified

- `src/model/component.ts` — 275 lines. 18-kind catalog constant + ComponentKind type + ComponentKindSchema + PRINTABLE_ASCII regex + InteractableBase + forward `ComponentNode` type union + TabItem (inline) + 9 leaf branch schemas (TextNode, IconNode, DividerNode, SpacerNode, ImageNode, ButtonNode, TextFieldNode, ToggleNode, SegmentedControlNode) + `ComponentNodeSchema: z.ZodType<ComponentNode> = z.lazy(() => z.union([...]))` with 9 recursive branches inline.
- `src/model/component.test.ts` — 411 lines. 40 assertions organized into 7 describe blocks: 18-kind closed catalog (3 tests), leaf components (6 tests), interactable sigil triple (11 tests — parametrized over missing-field rejections), List + ListItem (6 tests — including the 4 all-or-nothing transitions), TabBar (4 tests), containers + recursion (7 tests), threat T-01-01 deep-recursion stress (1 test), TypeScript inference sanity (1 test).

## Decisions Made

- **Pattern 1 recursive-union verbatim from RESEARCH** — no deviation from the structural template. ComponentNodeSchema is `z.lazy(() => z.union([...]))` with explicit `z.ZodType<ComponentNode>` annotation, exactly as prescribed. The discriminated-union API is absent from the file (verified by grep gate). This is the single recursive-schema module in Phase 1; every other union (Action, BackBehavior, Variant) stays on the discriminated-union API per Plan 03.
- **Forward TypeScript type union authoritative alongside schema** — the `export type ComponentNode = | ...` union drives both TypeScript narrowing and the `z.ZodType<ComponentNode>` annotation. Attempts to derive the type via `z.infer<typeof ComponentNodeSchema>` on a lazy-annotated schema yield the annotation type back (identity) — so the forward declaration is the source of truth and the one-for-one match with schema branches is the gate. The plan's grep enforcement on all 18 kind literals keeps the two in lock-step.
- **ListItem single-branch with `.refine`, not two discriminator-sharing branches** — a `TappableListItem` / `ContainerListItem` split would produce a union with `kind: "ListItem"` appearing twice, which breaks Zod's discriminator-lookup even in the `z.union` form (error messages degrade). The refine encodes D-02 cleanly in one place with a message that names the rule.
- **TabBar items NOT full ComponentNodes** — TabBar.items is `z.array(InteractableBase.extend({icon}).strict()).min(2).max(5)`. Rationale: SwiftUI `TabView` and Jetpack Compose `NavigationBar` both treat tab items as leaf (label + icon + action) — nesting a Card inside a tab item is not representable natively. The schema enforces this structural constraint at parse time rather than deferring to a Phase 7 Maestro/handoff-time check.
- **Button / TextField / Toggle / SegmentedControl via `InteractableBase.extend(...)`** — rather than duplicating the triple in each `z.object`. This keeps D-01 defined in ONE place; a future Phase (stretch scope) adding `Slider` or `DatePicker` as interactables is a 3-line `.extend({kind, bindsTo}).strict()` declaration plus one forward-type entry plus one union branch.
- **100-level recursion stress test encodes T-01-01 depth mitigation** — RESEARCH §Common Pitfalls (stack overflow on deep recursion) said "Zod's depth-first evaluation is stack-bounded in thousands, well beyond any real spec." The 100-level test proves the floor is WELL above any conceivable real spec (real specs cap at ~5-8 levels: Screen → Column → Card → Column → Row → Button). If a real fixture ever approaches this, Plan 06's crossReferencePass gets a `maxDepth` check — but schema parsing itself remains unguarded because the practical floor is so far below the theoretical limit.
- **Plan 03 TDD rhythm preserved** — `test(01-04):` RED commit of a minimal failing import test (verified to fail with `Cannot find module './component.ts'`), `feat(01-04):` GREEN with the full implementation (tsc clean, cumulative 124/124), `test(01-04):` extending to full coverage. Three commits total, matching Plan 02's smaller cadence (3 commits for 3 tasks with single-RED-GREEN per task).

## Deviations from Plan

**None — plan executed exactly as written, with one micro-adjustment to pass a grep gate:**

The plan's skeleton comment read `NOT z.discriminatedUnion`, but the plan's own verify rule was `! grep -q "z.discriminatedUnion" src/model/component.ts` — which fails on the literal token regardless of whether it appears in a comment. Before the first grep-gate run I reworded the comment to reference "the discriminated-union API" / "the discriminated-union variant" instead of the literal `z.discriminatedUnion` token. The semantic intent of the comment is preserved verbatim; only the surface phrasing changed. This is a grep-gate alignment fix, not a deviation from the plan's substantive design.

## Issues Encountered

**None during implementation.** The tsc check passed on the first write of `component.ts`; all 40 test assertions passed on the first `vitest run` after the implementation landed. RESEARCH §Pattern 1 was followed structurally (imports, type declaration order, schema branch order, annotation placement) and the pattern worked cleanly in the target Zod version (v4 already installed by Plan 01).

**Noted during grep-gate verification** (and resolved): the initial `component.ts` mentioned the literal token `z.discriminatedUnion` inside an implementation-note comment ("NOT z.discriminatedUnion"). The plan's verify rule matches the literal token regardless of comment syntax; I reworded the comment to "NOT the discriminated-union variant / discriminated-union API" so the gate passes without sacrificing the comment's explanatory content. See Deviations for detail.

## User Setup Required

None — Plan 01-04 is a pure schema + type layer. No external services, credentials, environment variables, or manual verification steps.

## Verification Evidence

All plan-level success criteria satisfied:

| Criterion | Result |
|-----------|--------|
| `COMPONENT_KINDS.length === 18` (verified at runtime via `node --input-type=module -e "..."`) | PASS — prints `18` |
| All 18 kinds present in source (grep each of 18 string literals) | PASS — 18/18 grep hits |
| ComponentNodeSchema uses `z.lazy` | PASS (`grep -q "z.lazy"` matches) |
| ComponentNodeSchema uses `z.union(` | PASS (`grep -q "z.union("` matches) |
| ComponentNodeSchema has `z.ZodType<ComponentNode>` annotation | PASS (the load-bearing annotation — `grep -q "z.ZodType<ComponentNode>"` matches) |
| NO `z.discriminatedUnion` anywhere in the file | PASS (after comment reword — `grep -c` returns 0) |
| PRINTABLE_ASCII defined via `/^[\x20-\x7E]+$/` | PASS (grep `\x20-\x7E` matches) |
| InteractableBase defined | PASS |
| ListItem has "all-or-nothing" refine comment | PASS |
| `.strict()` applied to every object branch | PASS (18 occurrences, one per branch, including InteractableBase extensions) |
| `npx tsc --noEmit` exits 0 | PASS |
| `npx vitest run src/model/component.test.ts` — all tests green | PASS (40/40) |
| `npx vitest run src/primitives/ src/model/` cumulative | PASS (163/163) |
| `npx biome check src/model/` clean | PASS (no fixes applied, no errors) |
| TDD gate: RED commit exists before GREEN commit for Task 1 | PASS (`e1f001a` test precedes `6199d5d` feat) |
| Test suite ≥30 new assertions | PASS (40 new ≥ 30 target) |
| ListItem all-or-nothing tested at all four transitions (0 ok, 3 ok, 1 fail, 2 fail) | PASS — 4 targeted test cases |
| Non-ASCII label rejection test (D-03 / T-01-02) | PASS |
| 100-level deep-recursion stress test (T-01-01 evidence) | PASS — parses without throwing |
| TypeScript inference sanity (annotation termination proof) | PASS — `kind === "Text"` narrow + `.text` access compiles |
| Grep gate asserted in prompt: `grep -q 'z.ZodType<ComponentNode>' src/model/component.ts` | PASS |
| Grep gate asserted in prompt: `! grep -q 'z.discriminatedUnion' src/model/component.ts` | PASS |

## Next Phase Readiness

**Wave 2 is now COMPLETE.** Plan 03's `createScreenVariantsSchema(treeSchema)` factory and Plan 04's `ComponentNodeSchema` are ready to be composed in Plan 05 — the intended wiring is:

```typescript
// Plan 05 sketch
import { ComponentNodeSchema } from "./component.ts";
import { createScreenVariantsSchema } from "./variant.ts";
export const ScreenVariantsSchema = createScreenVariantsSchema(ComponentNodeSchema);
// ScreenVariants.tree now typed as ComponentNode[], not unknown[]
```

Ready-to-consume artifacts for downstream plans:

- `ComponentNodeSchema` ⇒ `01-05-PLAN.md` threads through `createScreenVariantsSchema` to upgrade `tree: unknown[]` → `tree: ComponentNode[]`; also composes into Screen.variants shape.
- `ComponentNode` type ⇒ `01-05-PLAN.md` exports via barrel; `01-06-PLAN.md` uses for the testID-collision walker; `01-08-PLAN.md` uses for typed fixture authoring.
- `COMPONENT_KINDS` tuple + `ComponentKindSchema` ⇒ future diagnostic rendering (Phase 3 wireframe + Phase 7 Maestro emitter) uses the tuple to branch on component kind.
- `InteractableBase` ⇒ `01-06-PLAN.md` testID-collision walker uses the interactable kinds list to know which branches carry sigils.

**No blockers for Plan 05.** All primitives (Plan 02), leaf model schemas (Plan 03), and recursive component tree (Plan 04) are stable, fully tested, `tsc`-clean, and `biome`-clean. Plan 05 can start immediately.

## Self-Check: PASSED

All claimed files present on disk:

- `src/model/component.ts` — FOUND
- `src/model/component.test.ts` — FOUND
- `.planning/phases/01-spec-model-invariants/01-04-SUMMARY.md` — FOUND (this file, written by Write tool)

All 3 task commits verified in `git log --oneline`:

- `e1f001a` (Task 1 RED — test: add failing test for recursive ComponentNode schema) — FOUND
- `6199d5d` (Task 1 GREEN — feat: implement recursive ComponentNode schema) — FOUND
- `118683d` (Task 2 — test: expand component schema tests) — FOUND

## TDD Gate Compliance

Plan frontmatter specifies `type: execute`; each task declares `tdd="true"`. TDD gate applies per-task.

- **Task 1 (impl):** `test(01-04): add failing test for recursive ComponentNode schema` (`e1f001a`) RED — verified failure with `Cannot find module './component.ts'`. Followed by `feat(01-04): implement recursive ComponentNode schema` (`6199d5d`) GREEN — smoke test now passes.
- **Task 2 (tests):** `test(01-04): expand component schema tests` (`118683d`) — test expansion committed. Note: because Task 1 shipped a correct-on-first-pass implementation, the expanded Task 2 suite passed on its first `vitest run` against the already-landed implementation; the commit is a `test(...)` coverage expansion rather than a classical RED. This matches Plan 03 Task 4's precedent for test-only tasks — the test-first convention is honored at the plan-level RED (Task 1 RED), and downstream test-only commits carry the `test(...)` type without re-failing.

Full TDD sequence reconstructable via `git log --oneline | grep '01-04'`:

```
118683d test(01-04): expand component schema tests — 18 kinds + sigil + recursion + threats
6199d5d feat(01-04): implement recursive ComponentNode schema (18-kind catalog)
e1f001a test(01-04): add failing test for recursive ComponentNode schema
```

---
*Phase: 01-spec-model-invariants*
*Plan: 04*
*Completed: 2026-04-17*
