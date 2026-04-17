---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: Ready to execute
last_updated: "2026-04-17T13:50:56.303Z"
progress:
  total_phases: 9
  completed_phases: 0
  total_plans: 8
  completed_plans: 6
  percent: 75
---

# mobile-tui — STATE

Project memory. Updated at every phase transition and plan completion.

## Project Reference

**Name**: mobile-tui
**What it is**: pi.dev TypeScript extension — terminal-native wizard+canvas TUI for authoring LLM-consumable mobile app specs (Markdown + YAML frontmatter + ASCII wireframes + Maestro flows).
**Core value**: ASCII wireframes good enough that a developer would share them. Everything else is structure around that wireframe.
**Current focus**: Phase 1 — Spec Model & Invariants.

## Current Position

Phase: 01 (spec-model-invariants) — EXECUTING
Plan: 7 of 8
**Milestone**: v1
**Phase**: 1 — Spec Model & Invariants
**Plan**: Wave 4 COMPLETE (`01-06-PLAN.md` validateSpec two-stage pipeline shipped). Next is `01-07-PLAN.md` — migration runner scaffold (SERDE-08 + no-op v1→v2 migration).
**Status**: Wave 4 complete — `validateSpec(input: unknown)` is now the SPEC-09 public contract. Two-stage pipeline: (A) `SpecSchema.safeParse` → `zodIssuesToDiagnostics` (12-entry ZOD_CODE_MAP, invalid_union → SPEC_UNKNOWN_COMPONENT); (B) `crossReferencePass` emitting 5 SPEC_* codes (SPEC_MISSING_BACK_BEHAVIOR, SPEC_UNRESOLVED_ACTION, SPEC_TESTID_COLLISION, SPEC_JSONPTR_UNRESOLVED, SPEC_ACTION_TYPE_MISMATCH). Serialize-once pre-check enforces 5MB cap (T-01-01) AND catches cycles/BigInts (SPEC_INPUT_NOT_SERIALIZABLE) in one try/catch. NEVER throws for any input. Cross-ref errors leave `spec: Spec` populated (Phase 2 preview usable even when save is gated). Public API via `src/index.ts` barrel: `import { validateSpec, SCHEMA_VERSION, type Spec, type Diagnostic } from 'mobile-tui'` works cleanly. 54 new assertions + 210 prior = 264 cumulative tests green. `npx tsc --noEmit` + `npx biome check src/` both clean across 32 files. Plans 07 + 08 can start in parallel.

**Progress**: Phase 0/9 complete. Plans 6/8 in Phase 1.

```
[████████░░] 75% — 6/8 Phase-1 plans complete
```

## Performance Metrics

| Metric | Value |
|--------|-------|
| v1 requirements | 58 |
| Requirements mapped | 58 (100%) |
| Phases planned | 9 |
| Plans complete | 6 |
| Fixtures committed | 0 |
| Round-trip fixtures | 0 / 20 (target) |
| Reference wireframes | 0 / 20 (target for Phase 3 dogfood gate) |

### Plan Timing

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| 01-01 (toolchain scaffolding) | 3m 23s | 3 | 13 |
| 01-02 (L1 primitives) | 3m 54s | 3 (6 TDD commits) | 7 |
| 01-03 (Wave 2 leaf schemas) | 3m 44s | 4 (8 TDD commits) | 9 |
| 01-04 (recursive ComponentNode) | 4m 6s | 2 (3 TDD commits) | 2 |
| 01-05 (Screen + Nav + Spec root) | 4m 52s | 3 (6 TDD commits) | 6 |
| 01-06 (validateSpec two-stage) | 9m 17s | 3 (6 TDD commits) | 8 |

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

**Last session**: 2026-04-17 — Wave 4 COMPLETE (01-06 validateSpec two-stage pipeline shipped).
**Stopped at**: Completed 01-06-PLAN.md — `validateSpec(input: unknown) → { spec: Spec | null, diagnostics: Diagnostic[] }` is now the SPEC-09 public contract. Two-stage pipeline (Zod safeParse + crossReferencePass) plus 5MB size cap (T-01-01) via serialize-once `JSON.stringify` pre-check (also catches cycles/BigInts → `SPEC_INPUT_NOT_SERIALIZABLE`). `src/model/index.ts` barrel + rewritten `src/index.ts` expose the public API: `import { validateSpec, SCHEMA_VERSION, type Spec, type Diagnostic } from 'mobile-tui'` works cleanly. 54 new assertions; cumulative 264/264 green; tsc + biome clean across 32 files. Next: `01-07-PLAN.md` (migration runner scaffold — SERDE-08 placeholder + v1→v2 no-op migration with re-validation via `validateSpec` post-upgrade).
**Next session**: Execute `01-07-PLAN.md` — ship the migration runner with a single no-op v1→v2 migration (SERDE-08). Design per RESEARCH Pitfall #7: `MIGRATIONS` array with `from/to/run` entries; `runMigrations(spec, fromVersion, toVersion)` reducer; caller re-validates the upgraded payload via `validateSpec` (now available from Plan 06). Plans 07 and 08 run in Wave 5 and can proceed in parallel since both depend only on Plan 06 artifacts.

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

**Repo root (Wave 0 toolchain + Wave 1 primitives + Wave 2 model schemas + Wave 3 composition COMPLETE)**:

- `package.json`, `package-lock.json`, `tsconfig.json`, `biome.json`, `vitest.config.ts`, `.gitignore`
- `src/index.ts` (empty re-export placeholder — populated by Plan 01-06)
- `src/primitives/` — populated: `ids.ts`, `ids.test.ts`, `path.ts`, `path.test.ts`, `diagnostic.ts`, `diagnostic.test.ts`, `index.ts` (barrel)
- `src/model/` — Wave 3 complete: `version.ts`, `back-behavior.ts`, `back-behavior.test.ts`, `action.ts`, `action.test.ts`, `data.ts`, `data.test.ts`, `variant.ts`, `variant.test.ts`, `component.ts` (18-kind recursive catalog), `component.test.ts`, `screen.ts`, `screen.test.ts`, `navigation.ts`, `navigation.test.ts`, `spec.ts` (root composition with `.strict()`), `spec.test.ts`
- `src/migrations/` (still `.gitkeep` only; Plan 01-07 populates)
- `fixtures/`, `fixtures/targets/` (`.gitkeep` only; Plan 01-08 populates)
- `tests/helpers/parse-fixture.ts` — Phase-1-only fixture reader

---

*Last updated: 2026-04-17 after 01-05-PLAN.md execution.*
