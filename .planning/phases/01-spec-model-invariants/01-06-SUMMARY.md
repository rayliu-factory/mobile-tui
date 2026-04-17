---
phase: 01-spec-model-invariants
plan: 06
subsystem: model
tags: [typescript, zod, two-stage-validation, cross-reference, diagnostic-adapter, barrel, public-api, vitest]

# Dependency graph
requires:
  - phase: 01-spec-model-invariants
    provides: "L1 primitives (Plan 02: Diagnostic, JsonPointer + pathToJsonPointer, branded ID types); leaf schemas (Plan 03: Action 6-kind discriminated union, DataModel with Entity+Field, Variant factory); recursive ComponentNodeSchema (Plan 04) with 18-kind catalog + sigil triple; Screen + Navigation + Spec root composition (Plan 05) giving typed `Spec = z.infer<typeof SpecSchema>`"
provides:
  - "src/model/zod-issue-adapter.ts — zodIssuesToDiagnostics() maps Zod v4 $ZodIssue[] to Diagnostic[] via pathToJsonPointer and a 12-entry ZOD_CODE_MAP. invalid_union → SPEC_UNKNOWN_COMPONENT (ComponentNode is the only recursive union; discriminatedUnion kinds yield invalid_union_discriminator → SPEC_INVALID_DISCRIMINATOR). Unmapped codes fall through to ZOD_<UPPER>. Severity is always 'error'."
  - "src/model/cross-reference.ts — crossReferencePass(spec: Spec): Diagnostic[]. Stage B of validateSpec. Emits 5 SPEC_* codes: SPEC_MISSING_BACK_BEHAVIOR (non-root screen without back_behavior), SPEC_UNRESOLVED_ACTION (navigate.screen / submit.entity / present.overlay / Button.action / nav edge.from/to/trigger), SPEC_ACTION_TYPE_MISMATCH (present.overlay points to kind='regular' screen), SPEC_TESTID_COLLISION (full recursive walker per RESEARCH Pitfall #3), SPEC_JSONPTR_UNRESOLVED (entity/field prefix resolution per RESEARCH Pitfall #4). Exports walkComponentTree for reuse."
  - "src/model/invariants.ts — validateSpec(input: unknown) → { spec: Spec | null, diagnostics: Diagnostic[] }. The SPEC-09 public contract. Two-stage pipeline: (A) Zod safeParse → zodIssuesToDiagnostics, (B) crossReferencePass on typed data. Pre-stage serialize-once check enforces MAX_INPUT_BYTES = 5MB (T-01-01) AND detects cycles/BigInts → SPEC_INPUT_NOT_SERIALIZABLE. NEVER throws for any input."
  - "src/model/index.ts — public barrel for the model layer. Re-exports all Zod schemas + inferred types + SCHEMA_VERSION + validateSpec + crossReferencePass + zodIssuesToDiagnostics + MAX_INPUT_BYTES."
  - "src/index.ts — library entry rewritten from placeholder to real re-export. `export * from './model/index.ts'` surfaces the full model layer; selected primitives re-exported as named. Migrations exposure (Plan 07) placeholder-commented."
affects:
  - 01-07 (migration runner): `validateSpec()` is now the post-upgrade re-validation target. Plan 07's runMigrations(spec, from, to) returns `unknown`; callers invoke `validateSpec(result)` to confirm the upgraded payload conforms to the current SpecSchema.
  - 01-08 (fixtures): Each hand-authored fixture asserts against `validateSpec()` — happy-path fixtures expect `{ spec: Spec, diagnostics: [] }`; malformed fixtures expect specific SPEC_* codes at specific paths.
  - Phase 2 (serializer / round-trip): `validateSpec()` is the save-gating contract — Phase 2 parses YAML, hands the result to `validateSpec`, and blocks write-through if any Diagnostic has severity === 'error'. The `spec` field of the return is typed `Spec`, fully usable for serializer emitters even when cross-ref errors are present.
  - Phase 3 (wireframe renderer) + Phase 7 (Maestro emitter) + Phase 9 (pi extension): all consume `validateSpec` and the re-exported `Spec`, `Diagnostic`, `SCHEMA_VERSION` via `import ... from 'mobile-tui'`.

# Tech tracking
tech-stack:
  added: []  # Pure composition of existing zod + jsonpointer (already installed in Plan 01-01)
  patterns:
    - "Two-stage validation — Stage A (zod safeParse, structural) runs first; failure returns { spec: null } with Zod-derived diagnostics. Stage B (crossReferencePass, semantic) runs only on typed data; failure returns { spec: Spec, diagnostics } because the shape is still usable read-only. This separation is per RESEARCH §Pattern 3 Option B and is load-bearing for Phase 2's save-gate: the save gate reads severity === 'error' and can STILL hand the typed `spec` to the serializer for 'preview with errors' UX."
    - "Serialize-once pre-check for size + serializability — `JSON.stringify(input)` inside try/catch catches BOTH 5MB-cap overflow (T-01-01) AND cyclic/BigInt/non-JSON inputs (T-01-03 defense-in-depth), in one traversal. No separate cycle detector, no separate WeakSet. This is a common small-scale pattern that collapses 2 concerns into 1 line of work."
    - "Recursive visitor for testID + action ref collection — walkComponentTree as a full recursive function per RESEARCH Pitfall #3. Every recursive kind (Column, Row, Card, List, ListItem, NavBar, TabBar, Modal, Sheet) is enumerated explicitly in a switch statement. Adding a new container kind in component.ts requires adding a case here, or the subtree is silently skipped — fail-loud discipline preserved."
    - "JSON Pointer prefix resolution without the jsonpointer library — `resolveJsonPointerPrefix` splits the pointer string manually and checks `/Entity/field_name` against the entity/field namespace. The `jsonpointer` library's `.get(obj, ptr)` resolves against a populated JSON instance; our data model is a TYPE definition (Entity + Fields), not a data instance. Using the library would require synthesizing a fake instance, which is slower and semantically confusing."
    - "Cross-ref errors do NOT null the spec — `validateSpec(specWithUnresolvedAction)` returns `{ spec: Spec, diagnostics: [SPEC_UNRESOLVED_ACTION] }`. Contract-locked by the test 'returns spec with diagnostics when cross-ref fails'. This is the explicit read-usability guarantee Phase 2 leans on: the serializer can still emit a spec that has a dangling action reference; the save gate blocks the write; but the preview is still renderable."
    - "TDD per-task commit pair (RED → GREEN) — 3 tasks × 2 commits = 6 commits total. Identical cadence to Plans 02/03/04/05. Each RED commit verified failure with 'Cannot find module' before GREEN landed."

key-files:
  created:
    - src/model/zod-issue-adapter.ts
    - src/model/zod-issue-adapter.test.ts
    - src/model/cross-reference.ts
    - src/model/cross-reference.test.ts
    - src/model/invariants.ts
    - src/model/invariants.test.ts
    - src/model/index.ts
  modified:
    - src/index.ts  # placeholder → real re-export of model barrel + selected primitives

key-decisions:
  - "Two-stage Option B wins over Option A (single-pass z.superRefine). Reasons: (1) superRefine requires operating on a pre-validated partial shape, which leaks structural errors into cross-ref logic; (2) pure-function cross-ref pass is trivially unit-testable; (3) diagnostic code partitioning is cleaner — Zod issues map to SPEC_INVALID_* / SPEC_UNKNOWN_* (structural), cross-ref emits SPEC_UNRESOLVED_* / SPEC_TESTID_COLLISION / SPEC_ACTION_TYPE_MISMATCH / SPEC_JSONPTR_UNRESOLVED / SPEC_MISSING_BACK_BEHAVIOR (semantic). Zero collision between the two namespaces."
  - "MAX_INPUT_BYTES = 5 MB cap via JSON.stringify pre-check is the T-01-01 mitigation. Rationale: realistic specs are <100 KB (the habit-tracker reference spec is ~20 KB); 5 MB gives ≥50× margin for 'large but legitimate' specs (think: a 40-screen enterprise app with Markdown-body prose) while rejecting anything that would need depth-unbounded traversal or memory-explosion via dense object graphs. The 5MB check is cheap (O(n) string size) and happens before any Zod parse or tree walk."
  - "Serialize-once strategy collapses the 5MB check and the cycle/BigInt check into one try/catch. JSON.stringify throws on cycles and BigInts; we catch it and return SPEC_INPUT_NOT_SERIALIZABLE. This avoids a separate WeakSet cycle detector (~40 LOC + tests) and the equivalent BigInt-safe serializer. The two failure modes produce two distinct codes (SPEC_INPUT_TOO_LARGE vs SPEC_INPUT_NOT_SERIALIZABLE) so downstream can tell them apart."
  - "Cross-ref errors DO NOT null the spec. The function signature `{ spec: Spec | null; diagnostics: Diagnostic[] }` is intentional: Stage A failures null the spec (shape unusable); Stage B failures populate diagnostics but leave the typed spec present. Phase 2's save gate blocks write-through on severity === 'error' from EITHER stage, but the preview renderer (Phase 3) can still emit from a spec that has unresolved action refs — user sees '[BROKEN LINK]' markers rather than a blank canvas. This is an explicit product choice documented in the tests."
  - "Zod `invalid_union` → SPEC_UNKNOWN_COMPONENT (not SPEC_INVALID_UNION). Rationale: in the Spec model, the ONLY recursive `z.union` is ComponentNodeSchema (the 18-kind catalog uses z.union + z.lazy because discriminatedUnion breaks with recursion — RESEARCH Pitfall #1). Action, BackBehavior, and the variant discriminators use z.discriminatedUnion which yields `invalid_union_discriminator` instead. So `invalid_union` errors in practice almost always mean 'ComponentNode with unknown kind' — wiring it to SPEC_UNKNOWN_COMPONENT produces the most useful diagnostic message for the primary failure mode."
  - "`jsonpointer` library is NOT imported in cross-reference.ts. Reason: the library's `.get(obj, ptr)` resolves against a populated JSON INSTANCE, but our data model is a TYPE definition (Entity name + Field names, not actual data). Using the library would require synthesizing a fake instance like `{ Habit: { title: undefined, done: undefined } }` for every reference check — slower, more memory, and semantically confusing. Manual `string.slice(1).split('/')` is 3 lines, explicit, and exactly correct for prefix-only resolution per RESEARCH Pitfall #4. jsonpointer stays in package.json for runtime resolution inside Phase 2 (where we DO operate on JSON instances during serialization)."
  - "walkComponentTree enumerates every recursive kind in a `switch` instead of using a generic `if ('children' in node)` or reflection-based walker. Reason: explicit > implicit. Adding a new container kind to component.ts (say, a Tab that nests screens) will fail loud — the new kind's subtree won't be walked, testIDs inside it won't be collected, and the sigil-collision test for that kind will fail. Catching 'forgot to add the recursion case' at test time is much cheaper than catching 'two screens share a testID and we didn't notice' at runtime."
  - "src/model/index.ts barrel re-exports EVERY public schema + type + constant. Rationale: the barrel is the Phase-1 contract boundary — any downstream plan or phase that imports from 'mobile-tui' (via src/index.ts which re-exports * from this barrel) should be able to get every public name in ONE import line. Internal co-located tests (e.g., src/model/screen.test.ts) continue to import from direct files (`./screen.ts`) for brevity, but the public face is barrel-only."
  - "src/index.ts uses `export * from './model/index.ts'` + selective named re-exports from primitives. The model layer gets a full re-export because the entire model is public. Primitives gets selective re-export because `src/primitives/index.ts` also re-exports internal regex constants (SNAKE_CASE, PASCAL_CASE) that aren't public API — a blanket `export *` would leak those. The selective list names only what Phase 2+ consumers actually need."

patterns-established:
  - "Two-stage validation composed from (a) Zod adapter + (b) cross-ref visitor is the canonical pattern for every `*Schema + validate*()` pair going forward. Phase 2's serializer will follow: YAML parse → gray-matter split → `validateSpec` → error/spec return. Every future validator in the codebase (command-schema in Phase 4, wireframe-DSL in Phase 3) should reuse the same shape: a `safeParse`-style adapter + a typed cross-ref pass + a single entry point returning `{ data: T | null, diagnostics: Diagnostic[] }`."
  - "Serialize-once pre-check for input-size + serializability. Every public API entry point that accepts `unknown` input should do this first — cheap guard, catches multiple attack vectors, produces Diagnostic output instead of throwing."
  - "Never-throws hostile-input sweep as part of the test suite. Every public entry point gets a `it.each([null, undefined, 42, 'string', true, [], {}])` baseline that asserts the function returns a structured diagnostic rather than throwing. Cyclic + BigInt inputs get dedicated cases. This is the RESEARCH Pitfall #6 regression gate and should ship with every new public API surface."
  - "Barrel + src/index.ts seam. The public API of the package lives at exactly one file (src/index.ts); every internal module is private-by-default. Internal tests import directly from leaf files for co-location; external consumers import from the package name. This is the standard npm-package shape and matches how the pi-mono ecosystem packages are laid out."

requirements-completed: [SPEC-01, SPEC-02, SPEC-03, SPEC-04, SPEC-05, SPEC-06, SPEC-07]
# Plan frontmatter requirements: [SPEC-01, SPEC-02, SPEC-03, SPEC-04, SPEC-05, SPEC-06, SPEC-07]
# These are the seven requirements that `validateSpec()` now exercises end-to-end.
# Prior plans shipped the shapes; Plan 06 is where they become enforced via the
# public contract.

# Metrics
duration: 9m 17s
completed: 2026-04-17
---

# Phase 01 Plan 06: Wave 4 validateSpec Two-Stage Pipeline Summary

**Ships the validator heart of Phase 1: `validateSpec(input: unknown) → { spec: Spec | null, diagnostics: Diagnostic[] }` — the SPEC-09 public contract that Phase 2 gates write-through save on. Two-stage pipeline (Zod safeParse + cross-reference visitor), MAX_INPUT_BYTES = 5 MB cap with serialize-once T-01-01 mitigation, SPEC_INPUT_NOT_SERIALIZABLE for cyclic/BigInt inputs, NEVER throws for any input. Adds `zodIssuesToDiagnostics` (Stage A translator with 12-entry ZOD_CODE_MAP), `crossReferencePass` (Stage B visitor emitting 5 SPEC_* codes: SPEC_MISSING_BACK_BEHAVIOR, SPEC_UNRESOLVED_ACTION, SPEC_TESTID_COLLISION, SPEC_JSONPTR_UNRESOLVED, SPEC_ACTION_TYPE_MISMATCH), `walkComponentTree` full recursive visitor per RESEARCH Pitfall #3, `src/model/index.ts` barrel re-exporting every public schema + type + constant, and rewritten `src/index.ts` surfacing the full model layer. 54 new test assertions green; cumulative 264/264 green; tsc + biome clean. `import { validateSpec, SCHEMA_VERSION, type Spec, type Diagnostic } from 'mobile-tui'` works cleanly for downstream consumers. Wave 4 COMPLETE — Plans 07 (migrations) and 08 (fixtures) can start immediately.**

## Performance

- **Duration:** 9m 17s
- **Started:** 2026-04-17T13:37:15Z
- **Completed:** 2026-04-17T13:46:32Z
- **Tasks:** 3 / 3 (6 commits — one RED test + one GREEN feat per task)
- **Files created:** 7 (3 source + 3 test + 1 barrel) and 1 modified (src/index.ts placeholder → real)
- **New assertions:** 54 (14 zod-issue-adapter + 24 cross-reference + 16 invariants)
- **Cumulative test suite:** 264/264 (up from 210/210 at Plan 05 completion)

## Accomplishments

- **`zodIssuesToDiagnostics` adapter shipped** with ZOD_CODE_MAP (12 entries) covering `invalid_type`, `invalid_literal`, `invalid_value`, `invalid_enum_value`, `unrecognized_keys`, `invalid_union` (→ SPEC_UNKNOWN_COMPONENT since ComponentNode is the only recursive z.union in the model), `invalid_union_discriminator` (→ SPEC_INVALID_DISCRIMINATOR for Action/BackBehavior/Variant), `too_small`, `too_big`, `invalid_format`, `invalid_string`, `custom`. Unmapped codes fall through to `ZOD_<UPPER>` for traceability. All diagnostics `severity: 'error'`; paths converted via `pathToJsonPointer`; messages surface Zod's sanitized text (V8 input-leak resistance verified by test using a secret-like input).
- **`crossReferencePass` shipped** as the Stage B visitor. Collects declarations once (`declaredScreens`, `declaredEntities`, `declaredActions`, `testIDRegistry`), then walks every populated variant tree emitting diagnostics. Action intent cross-checks (D-13): navigate.screen, submit.entity, present.overlay (with overlay-kind discriminator check producing SPEC_ACTION_TYPE_MISMATCH), mutate.target (prefix resolution under data model per RESEARCH Pitfall #4). Navigation cross-refs: root existence + edge.from/to/trigger. Per-screen: SPEC_MISSING_BACK_BEHAVIOR on non-root screens without back_behavior. No `jsonpointer` library import — manual string.split is intentional (data model is a type definition, not a JSON instance).
- **`walkComponentTree` full recursive visitor shipped** per RESEARCH Pitfall #3. Enumerates every recursive kind explicitly (Column, Row, Card, List, ListItem, NavBar, TabBar-items, Modal, Sheet) in a switch statement. Collects testIDs via `'testID' in node` guard (covers Button / TextField / Toggle / SegmentedControl + optional ListItem + inline TabBar items). Test coverage: depth-3 collision (List → Card → Column → Button) flagged correctly.
- **`validateSpec` shipped** as the public contract. Signature: `(input: unknown) → { spec: Spec | null, diagnostics: Diagnostic[] }`. NEVER throws — verified for null, undefined, 42, 'string', true, [], {}, cyclic self-reference, `{ n: 123n }` BigInt field (9 hostile-input test assertions). 5MB input cap via `JSON.stringify` pre-check → SPEC_INPUT_TOO_LARGE (T-01-01). Cyclic/BigInt → SPEC_INPUT_NOT_SERIALIZABLE (stringify throws, we catch). Stage A failure nulls the spec; Stage B failure leaves `spec: Spec` populated so Phase 2's serializer can still emit from a spec with cross-ref errors (save gate blocks write, preview still works).
- **`src/model/index.ts` barrel shipped** re-exporting every public name: SpecSchema/Spec, SCHEMA_VERSION/SchemaVersion, ScreenSchema/Screen/ScreenKind/SCREEN_KINDS/ScreenVariantsWithComponentsSchema, ComponentNodeSchema/ComponentNode/ComponentKind/COMPONENT_KINDS, ActionSchema/Action/ActionsRegistrySchema/ActionsRegistry/MUTATE_OPS/MutateOp, Field*/Entity*/DataModel*/FIELD_TYPES, NavigationGraphSchema/NavigationGraph/NavEdgeSchema/NavEdge/TRANSITIONS/NavTransition, BackBehaviorSchema/BackBehavior, variant schemas + factories, validateSpec + MAX_INPUT_BYTES, crossReferencePass + walkComponentTree, zodIssuesToDiagnostics + ZOD_CODE_MAP.
- **`src/index.ts` rewritten** from Plan 01 placeholder (`export {};`) to real re-export. `export * from './model/index.ts'` carries the full model layer; selected named re-exports from `./primitives/index.ts` expose Diagnostic, DiagnosticSeverity, JsonPointer, ScreenId/ActionId/TestID/EntityName branded types + their Zod schemas + error/warning/info factory helpers + pathToJsonPointer/encodeSegment/decodeSegment. Migrations exposure (Plan 07) left as a placeholder comment.
- **Public-API smoke-test passed**: `node --input-type=module -e "import { validateSpec, SCHEMA_VERSION } from './src/index.ts'; const r = validateSpec({ schema: SCHEMA_VERSION }); console.log('spec:', r.spec, 'diagnostics:', r.diagnostics.length);"` outputs `spec: null diagnostics count: 4` with `first diagnostic: SPEC_INVALID_TYPE /screens` — downstream consumers can import and call cleanly.
- **T-01-02 mitigation enforced by design**: JsonPointer in cross-reference.ts is RFC 6901 only, NEVER passed to `fs.*` or any filesystem API. Resolution is a pure in-memory namespace lookup. Documented in the module header.
- **T-01-03 mitigation enforced by design**: `crossReferencePass` is read-only over the spec. No Object.assign / spread / mutation into new containers. Zod's `.strict()` at Stage A already rejected `__proto__` / `constructor` / `prototype`. Documented in the module header.

## Task Commits

Six per-task commits in strict RED → GREEN order (verified via `git log --oneline | grep '01-06'`):

1. **Task 1 RED: Zod → Diagnostic adapter tests** — `040575e` (test)
2. **Task 1 GREEN: zodIssuesToDiagnostics + ZOD_CODE_MAP** — `270984a` (feat)
3. **Task 2 RED: cross-reference pass tests** — `d510761` (test)
4. **Task 2 GREEN: crossReferencePass + walkComponentTree + 5 SPEC_* codes** — `6c99866` (feat)
5. **Task 3 RED: validateSpec contract tests** — `0c3bd9f` (test)
6. **Task 3 GREEN: validateSpec + model barrel + src/index.ts** — `7b03e2a` (feat)

**Plan metadata commit:** pending (will include this SUMMARY.md, STATE.md, ROADMAP.md, REQUIREMENTS.md).

## Files Created/Modified

- `src/model/zod-issue-adapter.ts` — 71 lines. ZOD_CODE_MAP (12 entries) + zodIssuesToDiagnostics() adapter. Normalizes `issue.path: PropertyKey[]` to `(string|number)[]` before pathToJsonPointer conversion (Zod v4 admits symbols; JSON/YAML input can't produce them, but tsc doesn't know that).
- `src/model/zod-issue-adapter.test.ts` — 137 lines, 14 assertions. Empty input, 6 code-map assertions (invalid_type → SPEC_INVALID_TYPE, etc.), path conversion to JSON Pointer, empty-path-at-root case, severity-is-error, SPEC_INVALID_TYPE on type mismatch, SPEC_UNKNOWN_FIELD on .strict() + Object.assign (NOT literal __proto__, which sets prototype), unmapped code → ZOD_<UPPER>, V8 input-leak resistance (secret-like input never appears in message).
- `src/model/cross-reference.ts` — 408 lines. WalkContext interface, walkComponentTree recursive visitor, visitNode dispatch by kind, collectTestID / registerTestID / checkActionRef / registerActionRef helpers, resolveJsonPointerPrefix (manual string split for entity/field namespace), resolveWhenPath helper, crossReferencePass entry point with per-screen back_behavior + variant walks + action intent cross-checks (D-13) + navigation.root + nav edge resolution.
- `src/model/cross-reference.test.ts` — 425 lines, 24 assertions. Happy path, root/non-root back_behavior exemption, 4 SPEC_UNRESOLVED_ACTION variants, 2 SPEC_ACTION_TYPE_MISMATCH cases, 3 SPEC_TESTID_COLLISION cases (nested, cross-screen, no-collision control), 5 SPEC_JSONPTR_UNRESOLVED cases including Pitfall-#4 deeper-path-past-prefix OK, 4 navigation cross-ref cases, walkComponentTree depth-3 direct test, JSON-Pointer-shaped-path sweep.
- `src/model/invariants.ts` — 86 lines. MAX_INPUT_BYTES = 5 * 1024 * 1024. validateSpec() with serialize-once pre-check (size + non-serializability), Stage A SpecSchema.safeParse, Stage B crossReferencePass on parsed.data.
- `src/model/invariants.test.ts` — 140 lines, 16 assertions. Hostile inputs via `it.each` (7 values), cyclic + BigInt each in own test, happy path (2 assertions), cross-ref errors leave spec non-null, Stage A wrong-version + missing-field, JSON-Pointer-shaped-path sweep, 6MB input SPEC_INPUT_TOO_LARGE.
- `src/model/index.ts` — 70 lines. Barrel re-exports for every public schema + type + constant across 11 model files.
- `src/index.ts` — 42 lines (up from 10). Library entry re-exports model barrel + selected primitives.

## Decisions Made

See frontmatter `key-decisions` for the canonical list. Highlights:

- **Two-stage Option B wins** — Zod safeParse then crossReferencePass, separate pure functions, separate test files, non-overlapping diagnostic namespaces.
- **MAX_INPUT_BYTES = 5 MB via JSON.stringify pre-check** — T-01-01 mitigation + free cycle/BigInt detection in one try/catch.
- **Cross-ref errors do NOT null the spec** — Phase 2 serializer can still emit from a spec with dangling refs; save gate blocks write, preview still works.
- **`invalid_union` → SPEC_UNKNOWN_COMPONENT** — in the model, the only recursive union is ComponentNode; Action/BackBehavior/Variant use discriminatedUnion (yielding `invalid_union_discriminator` → SPEC_INVALID_DISCRIMINATOR).
- **No `jsonpointer` library import in cross-reference.ts** — data model is a type definition, not a JSON instance; manual string.split is 3 lines and exactly correct per RESEARCH Pitfall #4.
- **walkComponentTree enumerates every recursive kind in a switch** — explicit > implicit; adding a new container kind without updating the walker fails loud at test time.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Zod v4 `$ZodIssue.path` typed as `PropertyKey[]` (admits symbols)**

- **Found during:** Task 1 GREEN — `npx tsc --noEmit` after writing zod-issue-adapter.ts flagged `Argument of type 'PropertyKey[]' is not assignable to parameter of type 'readonly (string | number)[]'. Type 'symbol' is not assignable to type 'string | number'.`
- **Issue:** Zod v4's `issue.path` type is `PropertyKey[]`, which includes `symbol`. Our `pathToJsonPointer` adapter accepts `(string | number)[]`. TypeScript rightly refused the direct pass-through.
- **Fix:** Map `issue.path` through `seg => typeof seg === 'symbol' ? String(seg) : seg` before handing it to `pathToJsonPointer`. Symbols can't appear in JSON or YAML input (they're runtime-only JS values with no serialization), so the coercion is safe — it only exists to satisfy tsc.
- **Files modified:** `src/model/zod-issue-adapter.ts` only.
- **Verification:** `npx tsc --noEmit` exits 0; 14/14 zod-issue-adapter tests pass.
- **Committed in:** Task 1 GREEN commit `270984a`.

**2. [Rule 1 - Bug] Literal `{ __proto__: "bad" }` sets prototype, not a data key**

- **Found during:** Task 1 GREEN — test `emits SPEC_UNKNOWN_FIELD for unrecognized keys under .strict()` failed because `result.success` was `true` (not `false`).
- **Issue:** JavaScript's object literal syntax `{ __proto__: "bad" }` is a special case that sets the prototype of the literal, not a "__proto__" data property. So `z.object({ x: z.string() }).strict().safeParse({ x: "ok", __proto__: "bad" })` sees ONLY `{ x: "ok" }` at runtime — no unrecognized key.
- **Fix:** Use `Object.assign({}, { x: "ok", unwanted_extra: "bad" })` to create an actual own key that `.strict()` will reject. Functional intent preserved (reject an unknown field); mechanism corrected.
- **Files modified:** `src/model/zod-issue-adapter.test.ts` only.
- **Verification:** Test now passes; biome check clean after format.
- **Committed in:** Task 1 GREEN commit `270984a`.

**3. [Rule 1 - Bug] `setTitle` camelCase action id rejected by ActionId snake_case schema**

- **Found during:** Task 2 GREEN — test `mutate.target with deeper path past known prefix is OK (Pitfall #4 — prefix-only)` failed with `ZodError: action id must match /^[a-z][a-z0-9_]*$/ (snake_case)`.
- **Issue:** Authored the test with `actions.setTitle = { kind: "mutate", ... }` but `ActionIdSchema` (primitives/ids.ts) enforces snake_case. The test spec failed Stage A parse, so crossReferencePass was never invoked with the deeper-path data.
- **Fix:** Renamed the action id from `setTitle` to `set_title`. Purely test-side; no production code change.
- **Files modified:** `src/model/cross-reference.test.ts` only.
- **Verification:** Test now passes; full suite 264/264.
- **Committed in:** Task 2 GREEN commit `6c99866`.

**4. [Rule 3 - Blocking] Biome format line-break + organize-imports**

- **Found during:** Task 1 GREEN, Task 2 GREEN, Task 3 GREEN — after each GREEN's write, `npx biome check` reported formatter-would-have-printed diffs (single-line vs multi-line function signatures, sorted export ordering in the barrel).
- **Issue:** Biome's formatter prefers single-line function signatures when they fit, and enforces alphabetical-within-group export ordering. Handwritten code didn't match exactly.
- **Fix:** Ran `npx biome format --write` after each GREEN; committed formatted output. For the barrel, ran `npx biome check --write` to apply organize-imports (alphabetical grouping within each `export { ... } from '...'` clause).
- **Files modified:** `src/model/zod-issue-adapter.ts`, `src/model/invariants.ts`, `src/model/index.ts`, `src/index.ts` — all cosmetic formatting only.
- **Verification:** `npx biome check src/` exits 0 across all 32 source files; tsc and full suite both remain green after each format pass.
- **Committed in:** Individual GREEN commits (`270984a`, `6c99866`, `7b03e2a`).

---

**Total deviations:** 4 auto-fixed (3 x Rule-1 bugs in test authoring, 1 x Rule-3 formatter alignment).
**Impact on plan:** Zero on scope. Two bug fixes (#2, #3) were test-authoring quirks that would have been caught at first `vitest run`; one bug fix (#1) was a Zod v4 type-refinement surprise; one (#4) is the same class of formatter-alignment fix seen in Plans 04 and 05. No architectural changes, no test softening, no schema semantics modified.

## Issues Encountered

No blockers. Each RED commit failed with `Cannot find module './<file>.ts'` as expected. Each GREEN landed with implementations that passed tsc + its targeted tests; the three test-authoring bugs documented above surfaced on first GREEN `vitest run` and were trivially corrected. Biome formatting was applied after each GREEN as routine cleanup. No test flakes, no refactor cycles required, no cascading primitive-level regressions.

## User Setup Required

None — Plan 01-06 is pure composition of existing dependencies + new source files. No external services, credentials, environment variables, or manual verification steps.

## Verification Evidence

All plan-level success criteria satisfied:

| Criterion | Result |
|-----------|--------|
| `src/model/zod-issue-adapter.ts` exports `zodIssuesToDiagnostics`, `ZOD_CODE_MAP` | PASS |
| `ZOD_CODE_MAP` maps ≥8 Zod codes including `invalid_union → SPEC_UNKNOWN_COMPONENT` | PASS (12 entries) |
| All adapter diagnostics have `severity: 'error'` | PASS |
| Path uses `pathToJsonPointer` from primitives | PASS |
| `src/model/cross-reference.ts` exports `crossReferencePass`, `walkComponentTree` | PASS |
| All 5 cross-ref diagnostic codes present: SPEC_MISSING_BACK_BEHAVIOR, SPEC_UNRESOLVED_ACTION, SPEC_TESTID_COLLISION, SPEC_JSONPTR_UNRESOLVED, SPEC_ACTION_TYPE_MISMATCH | PASS |
| testID collision detected at ANY depth (Pitfall #3) | PASS (24/24 cross-ref tests; Card-wrapped depth-3 test) |
| JSON Pointer resolution uses `resolveJsonPointerPrefix` entity/field namespace | PASS |
| Root screen exempt from SPEC_MISSING_BACK_BEHAVIOR | PASS |
| No `jsonpointer` library IMPORT in cross-reference.ts | PASS (`grep -n '^import' shows only diagnostic/path/component/spec`) |
| `src/model/invariants.ts` exports `validateSpec` with exact signature | PASS |
| Stage A calls `SpecSchema.safeParse(input)`; Stage B calls `crossReferencePass(parsed.data)` only on success | PASS |
| `MAX_INPUT_BYTES = 5MB`; `SPEC_INPUT_TOO_LARGE` emitted on overflow | PASS |
| `SPEC_INPUT_NOT_SERIALIZABLE` emitted for cyclic + BigInt inputs | PASS (2 dedicated tests) |
| `validateSpec` NEVER throws (test for null, undefined, 42, 'string', true, [], {}, cyclic, BigInt) | PASS (9 hostile-input assertions; `expect(() => validateSpec(cyclic)).not.toThrow()`) |
| Cross-ref errors leave `spec: Spec` non-null | PASS |
| `src/model/index.ts` re-exports `validateSpec` + `SCHEMA_VERSION` + `Spec` + all subschemas | PASS |
| `src/index.ts` re-exports `export * from './model/index.ts'` + `Diagnostic` | PASS |
| Public API smoke-test: `import { validateSpec, SCHEMA_VERSION } from './src/index.ts'` works | PASS (outputs `spec: null diagnostics count: 4` with `first diagnostic: SPEC_INVALID_TYPE /screens`) |
| `npx tsc --noEmit` exits 0 | PASS |
| `npx vitest run` exits 0 | PASS (264/264 cumulative green) |
| `npx biome check src/` clean | PASS (32 files) |
| ≥20 new assertions across the 3 new test files | PASS (54 new ≥ 20 target) |
| TDD gate: RED commit precedes GREEN commit for all 3 tasks | PASS (reconstructable via `git log --oneline \| grep '01-06'`) |

## Next Phase Readiness

**Wave 4 is COMPLETE.** The entire Phase 1 validator stack — primitives (Plan 02), leaf model schemas (Plan 03), recursive ComponentNodeSchema (Plan 04), Screen + Nav + Spec root composition (Plan 05), and now the two-stage validateSpec + cross-reference + adapter + barrels (Plan 06) — is in place and fully tested. Plans 07 (migration runner) and 08 (fixtures) can now run in Wave 5 in parallel.

Ready-to-consume artifacts for downstream plans:

- `validateSpec(input: unknown)` ⇒ Plan 07 (migrations) calls it post-upgrade to confirm the migrated payload conforms to the current SpecSchema; Plan 08 (fixtures) asserts happy-path fixtures return `[]` diagnostics and malformed fixtures return expected SPEC_* codes at expected paths; Phase 2 (serializer) uses it as the write-through save gate; Phase 3 (wireframe renderer) uses it to validate before rendering.
- `type Spec`, `type Diagnostic`, `type DiagnosticSeverity` ⇒ typed consumer surface for every later phase.
- `SCHEMA_VERSION` + `MAX_INPUT_BYTES` ⇒ Plan 07 pins migration targets and size policy.
- `crossReferencePass`, `walkComponentTree` ⇒ reusable for Phase 3's renderer if it wants to re-walk the tree for wireframe-layout computation (without re-invoking validation).
- `zodIssuesToDiagnostics`, `ZOD_CODE_MAP` ⇒ reusable for Phase 2's YAML parser when it wants to wrap its own Zod errors into Diagnostic shape.
- `src/index.ts` ⇒ published-package surface is now real. `import ... from 'mobile-tui'` works for any downstream test harness.

**No blockers for Plans 07 and 08.** All dependencies of the Phase-1 validator are stable, tsc-clean, biome-clean, and test-green.

## Self-Check: PASSED

All claimed files present on disk:

- `src/model/zod-issue-adapter.ts` — FOUND (71 lines)
- `src/model/zod-issue-adapter.test.ts` — FOUND (137 lines)
- `src/model/cross-reference.ts` — FOUND (408 lines)
- `src/model/cross-reference.test.ts` — FOUND (425 lines)
- `src/model/invariants.ts` — FOUND (86 lines)
- `src/model/invariants.test.ts` — FOUND (140 lines)
- `src/model/index.ts` — FOUND (70 lines)
- `src/index.ts` — FOUND (42 lines, rewritten from placeholder)

All 6 task commits verified in `git log --oneline`:

- `040575e` (Task 1 RED) — FOUND
- `270984a` (Task 1 GREEN) — FOUND
- `d510761` (Task 2 RED) — FOUND
- `6c99866` (Task 2 GREEN) — FOUND
- `0c3bd9f` (Task 3 RED) — FOUND
- `7b03e2a` (Task 3 GREEN) — FOUND

## TDD Gate Compliance

Plan frontmatter specifies `type: execute`; each task declares `tdd="true"`. TDD gate applies per-task, three times.

- **Task 1 (Zod adapter):** `test(01-06): add failing test for Zod issue → Diagnostic adapter` (`040575e`) RED — verified failure with `Cannot find module './zod-issue-adapter.ts'`. Followed by `feat(01-06): implement Zod issue → Diagnostic adapter (Stage A translator)` (`270984a`) GREEN — 14/14 assertions pass after auto-fixes for Zod v4 PropertyKey[] narrowing and __proto__-literal test authoring bug.
- **Task 2 (Cross-ref pass):** `test(01-06): add failing tests for Stage B cross-reference pass` (`d510761`) RED — verified failure with `Cannot find module './cross-reference.ts'`. Followed by `feat(01-06): implement Stage B cross-reference pass (5 SPEC_* diagnostics)` (`6c99866`) GREEN — 24/24 assertions pass after auto-fix for setTitle → set_title snake_case action id.
- **Task 3 (validateSpec + barrels):** `test(01-06): add failing tests for validateSpec two-stage pipeline` (`0c3bd9f`) RED — verified failure with `Cannot find module './invariants.ts'`. Followed by `feat(01-06): implement validateSpec + model barrel + public src/index.ts` (`7b03e2a`) GREEN — 16/16 assertions pass on first run; biome organize-imports + format applied post-GREEN as routine cleanup.

Full TDD sequence reconstructable via `git log --oneline | grep '01-06'`:

```
7b03e2a feat(01-06): implement validateSpec + model barrel + public src/index.ts
0c3bd9f test(01-06): add failing tests for validateSpec two-stage pipeline
6c99866 feat(01-06): implement Stage B cross-reference pass (5 SPEC_* diagnostics)
d510761 test(01-06): add failing tests for Stage B cross-reference pass
270984a feat(01-06): implement Zod issue → Diagnostic adapter (Stage A translator)
040575e test(01-06): add failing test for Zod issue → Diagnostic adapter
```

REFACTOR gate commits were unnecessary — each GREEN implementation passed all tests after the documented auto-fixes, and biome-formatting was applied before each commit. Consistent with Plan 02 / 03 / 04 / 05 precedent.

---
*Phase: 01-spec-model-invariants*
*Plan: 06*
*Completed: 2026-04-17*
