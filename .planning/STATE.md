---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: Ready to execute
last_updated: "2026-04-17T21:40:10.000Z"
progress:
  total_phases: 9
  completed_phases: 1
  total_plans: 13
  completed_plans: 11
  percent: 85
---

# mobile-tui — STATE

Project memory. Updated at every phase transition and plan completion.

## Project Reference

**Name**: mobile-tui
**What it is**: pi.dev TypeScript extension — terminal-native wizard+canvas TUI for authoring LLM-consumable mobile app specs (Markdown + YAML frontmatter + ASCII wireframes + Maestro flows).
**Core value**: ASCII wireframes good enough that a developer would share them. Everything else is structure around that wireframe.
**Current focus**: Phase 1 — Spec Model & Invariants.

## Current Position

Phase: 02 (serialization-round-trip) — EXECUTING
Plan: 4 of 5
**Milestone**: v1
**Phase**: 2 — Serialization / Round-Trip
**Plan**: Plan 02-03 (Wave 2 transforms — sigil + schema-inject) COMPLETE. Next: Plan 02-04 (Wave 3 write path).
**Status**: Wave 2 transform primitives CLOSED. src/serialize/sigil.ts ships `SIGIL_REGEX = /^\[(.+?) →([a-z][a-z0-9_]*) test:([a-z][a-z0-9_]*)\]$/` (anchored, non-backtracking — T-01-01 ReDoS-safe on 100KB input per dedicated regression), `INTERACTABLE_KINDS: ReadonlySet<string>` = 5-element set {Button, TextField, Toggle, SegmentedControl, ListItem} mirroring src/model/component.ts InteractableBase consumers (TabBar excluded per 01-04 inline-extended decision), pure `parseSigil(str): SigilTriple | null`, fresh-WeakMap factory `createSigilOriginsMap()`, and `normalizeSigilsOnDoc(doc, wm)` walking `doc[screens]` via isMap/isSeq/isScalar type guards — on sigil match: splits label scalar → triple, adds/updates action + testID pairs on the YAMLMap, records `'sigil'` origin; else records `'triple'`; non-interactables skipped (no WeakMap entry). src/serialize/schema-inject.ts ships idempotent `injectSchemaIfAbsent(doc): boolean` — returns false on doc.has('schema') early-return; mutation path creates schema pair via `doc.createPair('schema', SCHEMA_VERSION)` (literal NEVER inlined — imported from `../model/index.ts`), unshifts at items[0] position (D-28), sets `items[1].key.spaceBefore = true` to force blank line between schema and original first key (Pitfall 6 anchor). Empty/non-map doc handled via `doc.createNode({schema: SV}, {flow: false})`. 34 new unit tests across 2 co-located files all green (26 sigil + 8 schema-inject). Full gate GREEN: `npx vitest run` 374/374 across 26 files (was 340 baseline; +34 Plan 02-03); `npx tsc --noEmit` 0 errors; `npx biome check .` 0 errors. Phase-1 + Wave-0 + Wave-1 regression intact. Quirk noted for Plan 02-04: `doc.toString()` in yaml@^2.8.3 does NOT accept `{ version: '1.2' }` (`ToStringOptions` excludes `version`); parse-time version is sticky on the Document — emit-time call is argless or formatting-opts only.

**Progress**: Phase 1/9 complete (Phase 1 all 8 plans shipped). Plans 3/5 in Phase 2.

```
[██████░░░░] 60% — 3/5 Phase-2 plans complete
```

## Performance Metrics

| Metric | Value |
|--------|-------|
| v1 requirements | 58 |
| Requirements mapped | 58 (100%) |
| Phases planned | 9 |
| Plans complete | 9 |
| Fixtures committed | 4 (3 canonical + 1 malformed) |
| Round-trip fixtures | 3 / 20 (target; Phase 2 will extend) |
| Reference wireframes | 0 / 20 (target for Phase 3 dogfood gate) |
| Phase 01-spec-model-invariants P07 | 1m 58s | 2 tasks | 4 files |
| Phase 01-spec-model-invariants P08 | 8m 22s | 7 tasks | 16 files |
| Phase 02-serialization-round-trip P01 | 8m 35s | 2 tasks | 21 files |
| Phase 02-serialization-round-trip P02 | 7m 24s | 2 tasks | 6 files |
| Phase 02-serialization-round-trip P03 | 3m 14s | 2 tasks | 4 files |

### Plan Timing

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| 01-01 (toolchain scaffolding) | 3m 23s | 3 | 13 |
| 01-02 (L1 primitives) | 3m 54s | 3 (6 TDD commits) | 7 |
| 01-03 (Wave 2 leaf schemas) | 3m 44s | 4 (8 TDD commits) | 9 |
| 01-04 (recursive ComponentNode) | 4m 6s | 2 (3 TDD commits) | 2 |
| 01-05 (Screen + Nav + Spec root) | 4m 52s | 3 (6 TDD commits) | 6 |
| 01-06 (validateSpec two-stage) | 9m 17s | 3 (6 TDD commits) | 8 |
| 01-07 (migration runner scaffold) | 1m 58s | 2 | 4 |
| 01-08 (fixtures + hand-translations + fidelity gate) | 8m 22s | 7 | 16 |
| 02-01 (serialize scaffold + parseSpecFile stub) | 8m 35s | 2 (5 TDD commits) | 21 |
| 02-02 (Wave 1 L1 primitives: body + frontmatter + unknown) | 7m 24s | 2 (4 TDD commits) | 6 |
| 02-03 (Wave 2 transforms: sigil + schema-inject) | 3m 14s | 2 (4 TDD commits) | 4 |

## Accumulated Context

### Key Decisions (from PROJECT.md + research synthesis)

- pi.dev TypeScript extension (not skill, not CLI).
- Framework-agnostic A2UI-shaped spec targeting SwiftUI + Jetpack Compose only.
- Markdown + YAML frontmatter as the on-disk spec format; file IS the state.
- `eemeli/yaml` Document-AST diff-and-apply for round-trip; `js-yaml` banned.
- Zod v4 for internal validation; TypeBox only in the narrow pi tool-parameter slot.
- Detox deferred to v2; Maestro is the only v1 E2E emitter.
- Canvas is a superset of wizard; shared store, shared keybindings, mode-flip (not restart) graduation.
- `schema: mobile-tui/1` frontmatter + `migrations/` scaffold from commit 1.
- testID sigils bind wireframe ↔ spec ↔ Maestro selectors; coordinate taps and nth-child selectors forbidden.

### Decisions (from plan execution)

- **[01-01] TypeScript pinned to `^5.6`** — matches pi-mono ecosystem compat per CLAUDE.md (RESEARCH Open Q#1 resolved). Installed version: 5.9.3.
- **[01-01] Fixture parse helper uses `.spec.json` / `.spec.ts` sibling strategy** — defers YAML-parser adoption (gray-matter + eemeli/yaml) to Phase 2. RESEARCH Open Q#2 resolved. Plan 08 will ship both `.md` and `.spec.json` siblings; Phase 2 drops the JSON siblings.
- **[01-01] Vitest `passWithNoTests: true` for Wave-0 bootstrap** — avoids vitest@^4 exit-1 on empty test tree; becomes a no-op once downstream plans add the first tests.
- **[01-01] No `@mariozechner/pi-*` deps in Phase 1 `package.json`** — Phases 1-8 run as pure-Node headless tests; Phase 9 adds them as `peerDependencies` (never `dependencies`).
- **[01-02] Branded-string pattern `type X = string & { readonly __brand: 'X' }` + `z.string().transform(s => s as X)`** — chosen over class wrappers (runtime cost) and tagged-object wrappers (changes serialization shape). Zero runtime overhead; nominal type only at compile time; plain-string on disk.
- **[01-02] `Diagnostic.path` typed as `z.string()` at the schema level** — producers build paths through `pathToJsonPointer()` which already guarantees RFC 6901 shape. Re-validating at construction would be defensive without catching any real-world error class. The `JsonPointer` brand lives on factory helper argument types, not in `DiagnosticSchema`.
- **[01-02] Regex constants `SNAKE_CASE`, `PASCAL_CASE` exported from `src/primitives/ids.ts`** — downstream plans import these to narrow sub-types (e.g., Wave 2's discriminated unions) rather than re-declaring the case grammar.
- **[01-02] RFC 6901 decode order (`~1` before `~0`) preserved with explicit unit test and inlined explanatory comment** — wrong order silently corrupts `a~01b` → `a/b` instead of correct `a~1b`. The test documents the reason the order matters so the invariant survives future refactors.
- **[01-02] Barrel file `src/primitives/index.ts` uses `export *`** — three files, fifteen public names, no collisions. Switching to named re-exports is the contingency plan if a name clash appears; until then, `export *` minimizes maintenance overhead.
- **[01-02] TDD per-task commit pair convention: `test(XX-YY):` RED commit then `feat(XX-YY):` GREEN commit** — reconstructable via `git log --oneline | grep '01-02'`. Each RED commit is verified to fail with `Cannot find module` before GREEN lands.
- **[01-03] ActionSchema uses `z.discriminatedUnion("kind", ...)` (not `z.union`)** — non-recursive union pattern per RESEARCH §Pattern 2. The recursive `z.union + z.lazy` is reserved exclusively for Plan 04's `ComponentNodeSchema`. A `grep -r "z\.lazy" src/model/` audit at Plan 08 will confirm only one module uses the recursive pattern.
- **[01-03] `createScreenVariantsSchema(treeSchema)` factory defers Plan 04's ComponentNodeSchema binding** — Plan 05 (composition) closes over the real ComponentNodeSchema; Plan 03 default exports close over `z.unknown()` so Plan 03 tests stand alone. Factory inverts control without a forward-import cycle.
- **[01-03] Every object schema uses `.strict()`** — T-01-03 structural mitigation (prototype pollution via unknown discriminator / key) plus author-hygiene (typo keys like `kin` instead of `kind` fail loud). Verified by explicit reject-extra-key tests on BackBehavior, each Action branch, and ScreenVariants.
- **[01-03] Closed vocabularies exported as readonly tuples + `z.enum` wrapper** — `MUTATE_OPS`, `FIELD_TYPES`, `RELATIONSHIP_KINDS`. Tests parametrize via `it.each(TUPLE)` so enum extensions auto-extend test coverage without re-declaring the set.
- **[01-03] `FieldSchema.refine` encodes the reference-requires-`of` rule at shape level** — rather than deferring to Plan 06's cross-ref pass. Keeps malformed specs from reaching cross-ref and produces a clearer error message at the exact dependency site.
- **[01-03] `custom.name` constrained to snake_case via `z.string().regex(SNAKE_CASE, ...)`** — CONTEXT.md ID case conventions apply to all author-defined identifiers that cross the spec ↔ Maestro boundary. PascalCase custom action names would break downstream Maestro selector hygiene.
- **[01-04] `ComponentNodeSchema` uses `z.lazy + z.union + explicit z.ZodType<ComponentNode>`** — the canonical recursive-tree pattern per RESEARCH §Pattern 1. The discriminated-union API is banned for recursive schemas in this codebase (Zod v4 runtime-init + TS-inference bugs, issues #4264/#5288). ComponentNode is the ONE recursive schema in Phase 1; all other unions (Action, BackBehavior, Variant) remain on the discriminated-union API per Plan 03. Verified by grep gate: `! grep -q "z.discriminatedUnion" src/model/component.ts`.
- **[01-04] Forward `ComponentNode` TypeScript type union authoritative alongside the schema** — NOT derived via `z.infer`. The `z.ZodType<ComponentNode>` annotation is load-bearing: without it, TS inference on the recursive union collapses to `unknown` and every downstream type (Plan 05 `ScreenVariants.tree`) loses discrimination. Type/schema parity on the 18 kinds is enforced by the plan's grep gate on every kind literal. The `TypeScript inference sanity` test narrows `kind === "Text"` and accesses `.text` — compile-time proof.
- **[01-04] ListItem encodes D-02 all-or-nothing sigil triple via `.refine` in a SINGLE discriminated branch** — not a two-branch `TappableListItem | ContainerListItem` split. The split would duplicate `kind: "ListItem"` across the union, break Zod parse-time error attribution, and inflate COMPONENT_KINDS from 18 to 19. The refine message names D-02 so diagnostics pinpoint the exact rule violated.
- **[01-04] TabBar items INLINE-extend `InteractableBase` rather than accepting nested `ComponentNode`** — SwiftUI `TabView` and Jetpack Compose `NavigationBar` both treat tab items as leaf (label + icon + action). Nesting a Card inside a tab isn't representable natively. Bounds `.min(2).max(5)` match native tab-bar conventions. Constraint enforced at schema parse time, not deferred to Phase 7 Maestro/handoff.
- **[01-04] 100-level recursion stress test encodes T-01-01 depth-mitigation evidence** — real specs cap at ~5-8 nesting levels (Screen → Column → Card → Column → Row → Button); Zod's stack-bounded evaluator handles 100 trivially. No runtime `maxDepth` guard added at schema parse time; Plan 06 crossReferencePass gets a guard only if a future real fixture ever approaches the limit.
- **[01-04] Plan `verify` grep gate `! grep -q "z.discriminatedUnion"` matches on comments too** — initial component.ts mentioned the literal token in an implementation-note comment ("NOT z.discriminatedUnion"). Reworded to "NOT the discriminated-union API" to pass the gate without losing explanatory content. Lesson: plan grep gates should use `-E '\bz\.discriminatedUnion\s*\('` or similar to disambiguate identifier-use from comment-reference. Not tightened here — Plan 04 already passed.
- **[01-05] Screen `kind: 'regular' | 'overlay'` explicit discriminator** — resolves RESEARCH Open Q#3. Plan 06's `present.overlay` cross-ref becomes a direct screen-table lookup (`screens.find(s => s.id === overlay && s.kind === 'overlay')`) instead of tree-walking every Modal/Sheet subtree. Zero spec-authoring cost (typical specs have ≤5 overlays, all explicitly flagged). Test coverage rejects non-enum values (`popup` fails).
- **[01-05] `back_behavior` is OPTIONAL at the Screen schema layer** — D-12's "required on every non-root screen" is a cross-ref rule (root is named by `navigation.root`). Plan 06 enforces presence; Plan 05 keeps the per-Screen shape decoupled from NavigationGraph. Encoding "required except when root" at the Screen level would force upward coupling that breaks the Wave 3 composition order.
- **[01-05] SpecSchema root is `.strict()` — HARD Phase-1 boundary** per RESEARCH §Anti-Patterns. Unknown top-level keys (__proto__ / constructor / prototype / _unknown / anything) fail at parse time. Phase 2's SPEC-08 `_unknown:` bucket lives in the SERIALIZER (strip on parse, re-inject on save), NOT in the model schema. Model stays structurally closed; forward-compat lives in the round-trip layer. Load-bearing for T-01-03 (prototype-pollution mitigation) AND authoring hygiene. Explicit tests reject `__proto__`, `constructor`, `prototype`, `_unknown`.
- **[01-05] TRANSITIONS is the closed 5-value enum `['push', 'modal', 'sheet', 'replace', 'none']`** per D-13 — maps 1:1 to SwiftUI NavigationStack / fullScreenCover / sheet / replace / none AND Jetpack Compose NavHost / dialog / bottomSheet / popUpTo-inclusive / none. Additional transitions would need platform-specific handling in Phase 7 Maestro emitter; deferring enum expansion prevents unverifiable cross-platform commitments.
- **[01-05] `schema: z.literal(SCHEMA_VERSION)`** (not z.string() or z.enum([SCHEMA_VERSION])) — narrowest type inference (schema: 'mobile-tui/1' literal), exact equality, composes cleanly with Plan 07's migration runner (other versions fail parse → migration runner invoked → upgraded spec re-enters validation).
- **[01-05] Grep-gate micro-adjustment** — `grep -q "SpecSchema = z.object" src/model/spec.ts` required a single-line match but biome splits `SpecSchema = z\n  .object(...)`. Added a documentation comment referencing the literal `SpecSchema = z.object({...}).strict()` shape so the grep matches. Matches Plan 04 precedent. Future-plan recommendation: use `grep -qE 'SpecSchema\s*=\s*z'` or multi-line pattern to avoid documentation workarounds.
- **[01-05] `back_behavior` lives on Screen, NOT NavEdge** (D-12) — describes screen exits regardless of which edge brought the user in. Encoding per-edge would duplicate the rule and invite inconsistency. Verified: navigation.test.ts has NO back_behavior on any NavEdge test; screen.test.ts exercises all four back_behavior variants.
- **[01-05] `acceptance: z.array(z.string().min(1)).optional()`** — SPEC-10 prose one-liners per CONTEXT.md Claude's Discretion, no given/when/then structure. Per-line `.min(1)` rejects empty strings at shape time, preventing junk from polluting the Maestro emitter + LLM handoff output. No upper-bound count because the variance is too high (some screens have 0, some have 8).
- **[01-06] Two-stage validation (Option B)** — `safeParse` → `crossReferencePass` wins over single-pass `z.superRefine` at Spec root. Reasons: (1) superRefine needs a pre-validated partial shape, leaking structural errors into cross-ref; (2) pure-function cross-ref pass is trivially unit-testable; (3) diagnostic-code partitioning is clean — Zod issues → SPEC_INVALID_*/SPEC_UNKNOWN_* (structural); cross-ref → SPEC_UNRESOLVED_*/SPEC_TESTID_COLLISION/SPEC_ACTION_TYPE_MISMATCH/SPEC_JSONPTR_UNRESOLVED/SPEC_MISSING_BACK_BEHAVIOR (semantic). Zero collision between the two namespaces.
- **[01-06] MAX_INPUT_BYTES = 5MB via JSON.stringify pre-check** — T-01-01 mitigation AND free cycle/BigInt detection in one try/catch. `JSON.stringify` throws on cycles + BigInts; we catch it → `SPEC_INPUT_NOT_SERIALIZABLE`. Length overflow → `SPEC_INPUT_TOO_LARGE`. Two distinct codes keep the failure modes distinguishable. No separate WeakSet cycle detector required.
- **[01-06] Cross-ref errors DO NOT null the spec** — `validateSpec` returns `{ spec: Spec, diagnostics: [SPEC_UNRESOLVED_ACTION, …] }` when Stage A succeeds but Stage B flags semantic issues. Phase 2's save gate blocks write-through on `severity === 'error'` but the preview renderer can still emit from a spec with dangling refs (user sees `[BROKEN LINK]` markers, not a blank canvas). Contract-locked by a dedicated test.
- **[01-06] `invalid_union` → `SPEC_UNKNOWN_COMPONENT`** — in the Spec model, the only recursive `z.union` is `ComponentNodeSchema` (18-kind catalog). Action/BackBehavior/Variant use `z.discriminatedUnion` which yields `invalid_union_discriminator` → `SPEC_INVALID_DISCRIMINATOR`. So `invalid_union` almost always means "ComponentNode with unknown kind" — wiring to SPEC_UNKNOWN_COMPONENT produces the most useful diagnostic for the primary failure mode.
- **[01-06] No `jsonpointer` library IMPORT in cross-reference.ts** — library's `.get(obj, ptr)` resolves against a JSON instance; our data model is a TYPE definition (Entity + Field names). Using it would require synthesizing a fake instance per ref check. Manual `pointer.slice(1).split('/')` is 3 LOC and exactly correct for prefix-only resolution per RESEARCH Pitfall #4. `jsonpointer` stays in package.json for Phase 2 (serializer runs on JSON instances).
- **[01-06] `walkComponentTree` enumerates every recursive kind in a switch** — explicit > implicit. Adding a new container kind to `component.ts` (say `Tab` nesting screens) without adding a walker case will fail loud in the testID-collision test for that kind. Catches "forgot to recurse" at test time instead of runtime.
- **[01-06] `src/model/index.ts` barrel re-exports EVERY public schema + type + constant** — Phase-1 contract boundary. Downstream (Phase 2+) imports through `mobile-tui` (src/index.ts `export * from './model/index.ts'`) and gets every public name in one line. Internal co-located tests continue to import from leaf files. Primitives gets SELECTIVE named re-export (not `export *`) to keep internal regex constants private.
- **[01-06] Auto-fixed test-authoring bugs (3 × Rule-1)** — (a) Zod v4 `issue.path: PropertyKey[]` (admits symbols) required `.map(seg => typeof seg === 'symbol' ? String(seg) : seg)` coercion before `pathToJsonPointer`; (b) `{ __proto__: "bad" }` literal sets prototype (not data key) — switched to `Object.assign({}, { unwanted_extra: "bad" })` for .strict() reject-unknown-key test; (c) `setTitle` camelCase action id rejected by snake_case `ActionIdSchema` — renamed to `set_title` in Pitfall-#4 deeper-prefix test. All test-side, no production semantics changed.
- **[01-07] Migration runner returns `unknown` per RESEARCH Pitfall #7** — over-typing the chain has negative ROI with one migrator; callers re-validate via `validateSpec()`. `MIGRATIONS = [{ from: '1', to: '2', run: v1_to_v2 }] as const`; empty-op `return input as unknown as SpecV2` body. T-01-03 regression gate via `validateSpec(runMigrations(spec, '1', '2')).diagnostics === []`.
- **[01-08] Fixture convention: `.spec.md` + `.spec.json` sibling pair** — body header comment `<!-- Phase 1 fixture: triple-form YAML; sigil parser lands in Phase 2 -->` documents the Phase-1 triple-form convention. Phase 2 parser drops `.spec.json` siblings once parity is proven.
- **[01-08] `when.collection` / `when.async` / `when.field_error` JsonPointer requires two tokens `/Entity/field`** — bare-entity pointers (`/Habit`) fail SPEC_JSONPTR_UNRESOLVED because cross-ref's resolveJsonPointerPrefix requires `parts.length >= 2`. All fixture empty-variants bind to `/EntityName/fieldName` (e.g. `/Habit/title`, `/Task/title`, `/Post/text`). [Rule 1 - Bug] fix during Task 1; Phase 2 may widen the resolver.
- **[01-08] ONE Stage-A-valid Stage-B-invalid malformed fixture + programmatic Stage-A clones** — simpler than two malformed fixtures; keeps the fixture file a single-purpose cross-ref regression anchor. Stage-A codes (SPEC_UNKNOWN_COMPONENT + variant omission) tested via targeted JSON.parse(JSON.stringify(habit)) mutations in `tests/malformed.test.ts`.
- **[01-08] Catalog-coverage test excludes variant kinds from rogue-kind check** — walker sees both component kind and variant kind (content/empty/loading/error); COMPONENT_KINDS only enumerates components. Explicit `VARIANT_KINDS` filter set keeps the rogue-kind assertion from false-positiving.
- **[01-08] Auto-approved Task 6 human-verify checkpoint (D-16 fidelity gate)** — per --auto chain. Automated half (`tests/fidelity.test.ts` 3/3 green) confirms every Screen.id + testID appears in both `.swift` and `.kt`; structural mapping documented in header-comment mapping tables of both target files.
- **[02-01] parseSpecFile Wave-0 stub reads `.spec.json` sibling INTERNALLY** — inverted dependency: the public contract (`{spec, astHandle, diagnostics, body}`) ships stable in Plan 02-01, but the implementation body is a temporary `.spec.json` reader. Plan 02-05 swaps the body for the real gray-matter + eemeli/yaml pipeline AND deletes the siblings in one focused commit. Alternative (delete siblings + ship real parser in one plan) would require a mega-commit touching 10+ files; the staging lets Phase-1 tests migrate off `parse-fixture.ts` TODAY.
- **[02-01] AstHandle carries `closingDelimiterTerminator: "\n"|"\r\n"|""` + `hasFrontmatter: boolean` from day 1** — BLOCKER fixes #1 + #2 from the plan revision. `closingDelimiterTerminator` is load-bearing for Buffer.equals round-trip (SERDE-05): the write-path must re-emit the EXACT newline that terminated the closing `---` delimiter in origBytes. `hasFrontmatter` is the sole signal for SERDE_MISSING_DELIMITER (distinct from gray-matter's `isEmpty` — `isEmpty=true` means the map BETWEEN delimiters was empty, a valid fixture shape). Registering both at creation prevents a forward-compat rupture when Plan 02-04 needs them.
- **[02-01] `src/serialize/index.ts` uses EXPLICIT-NAMED exports (NOT `export *`)** — matches `src/model/index.ts` precedent. Adding a new public name is a deliberate edit to the barrel rather than an implicit surface-area broadening through wildcard re-export. Implementation details (partitionTopLevel, normalizeSigils, splitFrontmatter, etc.) intentionally NOT re-exported — co-located tests import directly from leaf modules.
- **[02-01] `tests/no-js-yaml.test.ts` self-path exclusion** — the audit test's describe/it titles + header comments contain the literal string `from 'js-yaml'` as explanatory text. Without a `selfPath = resolve("tests/no-js-yaml.test.ts")` filter on the walk output, the grep loop false-positives on its own content. [Rule 1 - Bug] fix during Task 1 RED phase.
- **[02-01] gray-matter@4.0.3 transitively pulls js-yaml@3.14.2 — ACCEPTED** per threat T-02-SupplyChain-Transitive (plan frontmatter `disposition: accept`). Phase 02-02 wires gray-matter to eemeli/yaml via the `engines` option (CLAUDE.md + RESEARCH §Example 1), so the runtime never reaches the transitive js-yaml. Direct-dependency audit (`tests/no-js-yaml.test.ts`) only walks our own `package.json` dep fields — the transitive presence does NOT fail the audit. Re-check at every `npm install` remains a standing action.
- **[02-01] `.spec.json` fixture siblings RETAINED in Plan 02-01** — deletion moves to Plan 02-05 Task 4, AFTER the real parser proves green against all 20 fixtures. The Wave-0 stub in `src/serialize/parse.ts` depends on them; deleting them in this plan would require the real parser to already exist.
- **[02-01] Wave-0 stub pattern established** — production module carries a temporary implementation body that satisfies the public contract via a fallback path (`.spec.json` read). Replaced by real implementation in a later plan without touching the callers. Reusable pattern for future phase-spanning scaffolding.
- **[02-01] Auto-fixed biome format issues (2 × Rule-1)** — (a) `src/serialize/index.ts` import-order ("type X before value X" alphabetical), auto-applied via `biome check --write`; (b) `tests/fixtures.test.ts` — biome's printer wanted `it.each(CANONICAL)(...)` reflowed across multiple lines due to total width. Both mechanical tooling adjustments; no semantic changes.
- **[02-02] DELIMITER_REGEX uses `[ \t]*` (not `\s*`) for trailing whitespace** — `\s` matches `\n`/`\r`, which would be greedily consumed into `match[0]` and erase the LF / CRLF / empty distinction that `closingTerminator` load-bears for BLOCKER fix #1. Discovered at GREEN phase when 6/24 tests failed with `expected '\r\n' to be '\n'` and `expected '\n# body\n' to be '# body\n'`. Lesson: in multi-line mode, `$` matches at EOL positions but `\s*` is still greedy around that position — trailing-whitespace classes on delimiter lines MUST exclude newline characters when the terminator itself is semantically load-bearing downstream.
- **[02-02] gray-matter's `isEmpty` runtime property accessed via `(file as unknown as Record<string, unknown>).isEmpty === true`** — the gray-matter@^4.0.3 `.d.ts` declares `GrayMatterFile<I>` without the `isEmpty` property even though the runtime sets it. Biome's `noExplicitAny` rule forbids `as any`, so the `unknown`-then-Record cast is the compliant pattern. Keeping the semantic access visible (explicit comment in splitFrontmatter explains why) rather than adding a library type-augmentation module.
- **[02-02] `engines.yaml.parse: (str: string): object`** (not `unknown`) — gray-matter's engines contract requires `object`. `YAML.Document` is a class instance (structurally `object`), so the return type fits without wrapping. Returning `unknown` fails tsc with "not assignable to `object`".
- **[02-02] `file.data as unknown as Document` double-cast** at splitFrontmatter return site — gray-matter types `file.data: {[key: string]: any}` (noExplicitAny via the transitive). Direct `as Document` would propagate `any`; intermediate `unknown` satisfies strict-mode.
- **[02-02] `hasFrontmatter: boolean` is the SOLE signal for SERDE_MISSING_DELIMITER** — BLOCKER fix #2 is CONFIRMED non-redundant with gray-matter's `isEmpty`. `isEmpty=true` means the map BETWEEN delimiters was empty (valid fixture like `---\n---\n\nbody\n`). `hasFrontmatter` is derived authoritatively from `findFrontmatterBounds !== null` and is the ONLY correct signal for "delimiters completely absent" (e.g., raw Markdown). Plan 02-05 parse.ts will check `!hasFrontmatter` (not `isEmpty && matterStr === ""`) to emit SERDE_MISSING_DELIMITER.
- **[02-02] `partitionTopLevel` returns empty partition for non-map documents** — scalar or sequence at root produces `{knownSubset: {}, unknownKeys: []}` rather than throwing. Keeps the function total; pathological-input diagnostic decision is parse.ts's responsibility (Plan 02-05), not this leaf module's. A `YAML.parseDocument("scalar-value\n")` test case verifies the early-return branch.
- **[02-02] `pair.value.toJSON()` projection in partitionTopLevel** — known-key values are projected to plain JS via `.toJSON()` before landing in `knownSubset`. Transient copy for validateSpec consumption; the Document AST itself is untouched, so write-path re-emission preserves comments and formatting intact. Unknown-key pair positions stay in `doc.contents.items` verbatim — no ADD, no COPY, no DELETE (D-26 invariant).
- **[02-02] Test assertion pattern `if (bounds === null) throw new Error(...)` replaces non-null assertion** — Biome's `noNonNullAssertion` rule rejects `bounds!.start`. Early-throw narrows TypeScript's control-flow analysis and produces identical fail-fast behavior with a clearer error message. Same pattern applied to `match[1]` capture access in the habit-tracker partition test.
- **[02-02] Auto-fixed biome format issues (3 × Rule-1)** — (a) initial test files used tab indentation against Biome's 2-space config; rewritten in-place before RED commit landed. (b) `src/serialize/frontmatter.ts` import-order wanted `import type { Document }` before `import YAML from "yaml"` (type-first on same source). (c) `src/serialize/unknown.ts` — Biome collapsed the 5-element `KNOWN_TOP_LEVEL_KEYS` array to a single line (fits under line-width 100). All three are mechanical; no semantic changes; readonly tuple `as const` preserved.
- **[02-03] SIGIL_REGEX inlines SNAKE_CASE class** — `(.+?) →([a-z][a-z0-9_]*) test:([a-z][a-z0-9_]*)` keeps the regex a single literal constant rather than composing via ids.ts. Accept-case tests against canonical snake_case values (`save`, `open_detail`, `add_habit`, `habit_row`) cover the parity. Matches Plan 01-02 SNAKE_CASE + ActionIdSchema split discipline: regex constants stay simple; branded types layer on top in the model layer only.
- **[02-03] `createSigilOriginsMap()` returns a fresh WeakMap per call, not a module-level singleton** — one handle per parsed Document so concurrent parseSpecFile calls don't share origin state. Consumer pattern: `const wm = createSigilOriginsMap(); normalizeSigilsOnDoc(doc, wm); astHandle.sigilOrigins = wm;`.
- **[02-03] `normalizeSigilsOnDoc` walks ONLY the `screens` subtree** — actions + data + navigation are schema-defined maps with no component nodes, so widening the walk adds traversal cost with zero behavioral gain. If a future kind carries components outside screens, extending the walker is a one-line `items.find(pair => ...)` addition per new top-level key.
- **[02-03] Interactable with missing / non-scalar label → `'triple'` origin (still recorded)** — walker always records an origin for every interactable node, so Plan 02-04's emit path never encounters a "no-entry" surface for D-24's partial-sigil-drop logic. Simplifies the emit-time decision to `wm.get(node)` without a null-check fallback branch.
- **[02-03] `doc.has('schema')` idempotency guard** — O(1) lookup on YAMLMap internals; semantically cleaner than a manual `items.find(pair => pair.key.value === 'schema')` scan. Matches migrations/v1_to_v2.ts's same-in-same-out pattern (SERDE-08 anchor) — first call mutates + returns true; subsequent calls no-op + return false.
- **[02-03] Pitfall 6 confirmed: spaceBefore lives on `items[1].key`, not `items[0].key`** — after `items.unshift(schemaPair)`, the ORIGINAL first key is now at index 1. Setting spaceBefore on its key-node forces a blank line BEFORE it in the emit, producing `schema: mobile-tui/1\n\n{rest}`. Setting on items[0] would add a blank line BEFORE schema (wrong side). Verified by the `^schema: mobile-tui\/1\n\nscreens:` emit assertion.
- **[02-03] QUIRK for Plan 02-04: `doc.toString()` in yaml@^2.8.3 does NOT accept `{ version: '1.2' }`** — `ToStringOptions` excludes `version`. Parse-time version (`parseDocument(str, {version: '1.2', ...})`) is sticky on the Document; emit-time call is argless or formatting-opts-only (`indent`, `defaultKeyType`, etc.). Discovered during sigil.test.ts triple-origin byte-identical test (TS2353 error); fixed in-file to `doc.toString()`. Plan 02-04 write.ts's `doc.toString()` calls must stay argless for this reason.
- **[02-03] Acceptance-criteria grep-gate pattern mismatches (cosmetic only)** — (a) `grep -cE 'Button.*TextField.*Toggle.*SegmentedControl.*ListItem'` returned 0 because Biome split the 5-element set across lines; semantic assertion via `[...INTERACTABLE_KINDS].sort()` test still passes. (b) `! grep -n "TabBar"` fails because TabBar appears in explanatory comments; set literal excludes it. Same class of issue as Plan 01-04's "NOT z.discriminatedUnion" comment. Future-plan recommendation: use `grep -qE '"Button"[^"]*"TextField"[^"]*"Toggle"'` or set-level intersection pattern, not line-anchored alternation.

### Open TODOs

- Resolve Open Questions during each phase's own research pass (see `.planning/research/SUMMARY.md §Open Questions`):
  - Q1 (Phase 3): final component catalog as union of ~20 reference wireframes.
  - Q2 (Phase 2): HTML-comment anchor convention vs heading-based markdown body keying.
  - Q3 (Phase 1): sigil grammar `[Label →action test:id]` — confirm while hand-crafting fixtures.
  - Q4 (Phase 1): `VariantTrigger` vocabulary.
  - Q5 (Phase 1): JSON Pointer vs alternative path DSL.
  - Q6 (Phase 2/4): exact debounce + atomic-rename save semantics.
  - Q7 (Phase 7): Maestro platform-branching heuristic (two files by default).
  - Q8 (post-launch): fixed 8 wizard steps vs variable 6–10.
  - Q9 (Phase 4 or later): `extract --screen` fragment format.

### Blockers

None. Phase 1 can start immediately.

### Flagged Placement Decisions

- **SERDE-08** (migration runner scaffold) placed in Phase 1 rather than Phase 2 — it's a schema-versioning invariant that lands with the model.
- **SPEC-08, SPEC-09** placed in Phase 2 rather than Phase 1 — both are observable only through serializer behavior (first-emit frontmatter injection; save-gating on diagnostic severity). The `validateSpec()` function itself lives in Phase 1; its save-gating contract materializes in Phase 2.

## Session Continuity

**Last session**: 2026-04-18 — Plan 02-03 (Wave 2 transforms — sigil + schema-inject) COMPLETE. Phase-1 + Wave-0 + Wave-1 regression intact (340 → 374 total; zero deletions of prior tests).
**Stopped at**: Completed 02-03-PLAN.md — sigil.ts ships SIGIL_REGEX (anchored + non-backtracking; 100KB T-01-01 regression verified <100ms) + INTERACTABLE_KINDS 5-element set (Button/TextField/Toggle/SegmentedControl/ListItem; TabBar excluded per 01-04) + pure parseSigil(str) + createSigilOriginsMap() fresh-WeakMap factory + normalizeSigilsOnDoc(doc, wm) walking doc[screens] via isMap/isSeq/isScalar type guards (sigil → split + 'sigil' origin; triple → 'triple' origin no mutation; non-interactable → skip, no WeakMap entry); schema-inject.ts ships idempotent injectSchemaIfAbsent(doc): boolean — doc.has('schema') O(1) early-return on present; mutation path via doc.createPair + items.unshift + items[1].key.spaceBefore = true (D-28 blank line, Pitfall 6 anchor); empty/non-map doc handled via doc.createNode({schema: SV}, {flow: false}); SCHEMA_VERSION imported from ../model/index.ts — literal "mobile-tui/1" never inlined (grep gate = 0). 34 new unit tests across 2 co-located files; full gate `npx vitest run` 374/374 across 26 files; `npx tsc --noEmit` 0 errors; `npx biome check .` 0 errors. Commits: 638f73b (T1 RED) → 4e3f79f (T1 GREEN) → 97cb7f1 (T2 RED) → 60e1a5b (T2 GREEN).
**Next session**: Plan 02-04 (Wave 3 write path). Implements src/serialize/atomic.ts (.tmp + rename primitive with simulated-crash coverage) + src/serialize/write.ts (save-gate on validateSpec severity === 'error' → {written: false, diagnostics} without touching disk per D-31; CST diff-apply over astHandle.doc; sigil re-emit consulting astHandle.sigilOrigins WeakMap from this plan; SERDE-07 auto-quote pass on YAML-1.1-gotcha scalars; manual body-bytes splice per D-18; ADVERSARIAL_KEYS re-check BEFORE save per BLOCKER fix #3). Consumes astHandle (02-01) + splitFrontmatter/partitionTopLevel (02-02) + injectSchemaIfAbsent + WeakMap origins (02-03). Gate: continue to hold 374/374 baseline and introduce tests that cover byte-identical round-trip on the Phase-1 canonical fixtures (habit-tracker + todo + social-feed) + simulated-crash atomicity. IMPORTANT QUIRK CARRYOVER for Plan 02-04: `doc.toString()` in yaml@^2.8.3 does NOT accept `{version: '1.2'}` — `ToStringOptions` excludes `version`. Parse-time version is sticky on the Document; emit-time call must be argless or formatting-opts-only.

**Artifacts on disk**:

- `.planning/PROJECT.md` — core value, constraints, decisions
- `.planning/REQUIREMENTS.md` — 58 v1 requirements (SPEC, SERDE, WIREFRAME, EDITOR, WIZARD, CANVAS, MAESTRO, HANDOFF, PI) with phase traceability
- `.planning/research/SUMMARY.md` — research synthesis, build-order implications, open questions
- `.planning/ROADMAP.md` — 9 phases, success criteria, coverage map
- `.planning/STATE.md` — this file
- `.planning/config.json` — workflow config (granularity: fine, mode: yolo, parallelization: on)
- `.planning/phases/01-spec-model-invariants/01-01-SUMMARY.md` — Wave 0 toolchain summary
- `.planning/phases/01-spec-model-invariants/01-02-SUMMARY.md` — Wave 1 L1 primitives summary
- `.planning/phases/01-spec-model-invariants/01-03-SUMMARY.md` — Wave 2 leaf model schemas summary
- `.planning/phases/01-spec-model-invariants/01-04-SUMMARY.md` — Wave 2 recursive ComponentNode summary
- `.planning/phases/01-spec-model-invariants/01-05-SUMMARY.md` — Wave 3 Screen + Navigation + Spec root composition summary
- `.planning/phases/01-spec-model-invariants/01-06-SUMMARY.md` — Wave 4 validateSpec two-stage pipeline summary
- `.planning/phases/01-spec-model-invariants/01-07-SUMMARY.md` — Wave 5a migration runner scaffold summary
- `.planning/phases/01-spec-model-invariants/01-08-SUMMARY.md` — Wave 5b fixtures + hand-translations + fidelity gate summary (Phase 1 close)
- `.planning/phases/02-serialization-round-trip/02-01-SUMMARY.md` — Phase 2 Wave-0 substrate (deps + scaffold + parseSpecFile stub)
- `.planning/phases/02-serialization-round-trip/02-02-SUMMARY.md` — Phase 2 Wave-1 L1 primitives (body + frontmatter + unknown)
- `.planning/phases/02-serialization-round-trip/02-03-SUMMARY.md` — Phase 2 Wave-2 transforms (sigil normalizer + schema injection)

**Repo root (Phase 1 COMPLETE + Phase 2 Plans 01 + 02 COMPLETE)**:

- `package.json`, `package-lock.json`, `tsconfig.json`, `biome.json`, `vitest.config.ts`, `.gitignore`, `.gitattributes` (Plan 02-01)
- `src/index.ts` — public API barrel (full model + migrations + selected primitives re-export)
- `src/primitives/` — `ids.ts`, `ids.test.ts`, `path.ts`, `path.test.ts`, `diagnostic.ts`, `diagnostic.test.ts`, `index.ts`
- `src/model/` — complete: `version.ts`, `back-behavior.ts`+`.test.ts`, `action.ts`+`.test.ts`, `data.ts`+`.test.ts`, `variant.ts`+`.test.ts`, `component.ts` (18-kind recursive catalog)+`.test.ts`, `screen.ts`+`.test.ts`, `navigation.ts`+`.test.ts`, `spec.ts`+`.test.ts`, `zod-issue-adapter.ts`+`.test.ts`, `cross-reference.ts`+`.test.ts`, `invariants.ts`+`.test.ts` (validateSpec entry), `index.ts` (barrel)
- `src/migrations/` — `v1_to_v2.ts` (empty-op anchor), `index.ts` (runMigrations chain runner), `index.test.ts` (7 assertions + T-01-03 gate)
- **`src/serialize/` (Plans 02-01 + 02-02 + 02-03)** — 17 files: `index.ts` (explicit-named barrel), `parse.ts` (parseSpecFile Wave-0 .spec.json stub), `write.ts` (signature stub), `ast-handle.ts` (AstHandle w/ closingDelimiterTerminator + hasFrontmatter), `diagnostics.ts` (SERDE_CODES + re-exports), `diagnostics.test.ts` (9 assertions), `body.ts` (findFrontmatterBounds + extractBodyBytes — Plan 02-02), `body.test.ts` (10 assertions — Plan 02-02), `frontmatter.ts` (splitFrontmatter + detectLineEndingStyle — Plan 02-02), `frontmatter.test.ts` (14 assertions — Plan 02-02), `unknown.ts` (KNOWN_TOP_LEVEL_KEYS + ADVERSARIAL_KEYS + partitionTopLevel — Plan 02-02), `unknown.test.ts` (7 assertions — Plan 02-02), `sigil.ts` (SIGIL_REGEX + INTERACTABLE_KINDS + parseSigil + createSigilOriginsMap + normalizeSigilsOnDoc — Plan 02-03), `sigil.test.ts` (26 assertions — Plan 02-03), `schema-inject.ts` (injectSchemaIfAbsent — Plan 02-03), `schema-inject.test.ts` (8 assertions — Plan 02-03), `atomic.ts` (empty stub for Plan 02-04)
- `fixtures/` — 8 files: `habit-tracker.spec.{md,json}`, `todo.spec.{md,json}`, `social-feed.spec.{md,json}`, `malformed.spec.{md,json}` (the `.spec.json` siblings remain as Wave-0 stub input; Plan 02-05 deletes them)
- `fixtures/targets/` — 2 files: `habit-tracker.swift` (SwiftUI translation), `habit-tracker.kt` (Jetpack Compose translation)
- `tests/fixtures.test.ts` — canonical-fixture integration test (6 assertions) — migrated to parseSpecFile in Plan 02-01
- `tests/malformed.test.ts` — malformed fixture + Diagnostic[] snapshot test (15 assertions) — migrated to parseSpecFile
- `tests/catalog-coverage.test.ts` — SPEC-01 closed-catalog coverage test (2 assertions) — migrated to parseSpecFile
- `tests/fidelity.test.ts` — D-16 two-target fidelity gate automated half (3 assertions) — migrated to parseSpecFile
- `tests/no-js-yaml.test.ts` — SERDE-02 architectural-invariant audit (3 assertions: package.json + deps + source grep)
- `tests/__snapshots__/malformed.test.ts.snap` — sorted full-Diagnostic[] regression snapshot (stable through migration)
- ~~`tests/helpers/parse-fixture.ts`~~ — deleted in Plan 02-01 (superseded by parseSpecFile Wave-0 stub)

---

*Last updated: 2026-04-18 after 02-03-PLAN.md execution.*
