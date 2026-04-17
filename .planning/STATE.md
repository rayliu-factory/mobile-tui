---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: Ready to execute
last_updated: "2026-04-17T13:11:36.099Z"
progress:
  total_phases: 9
  completed_phases: 0
  total_plans: 8
  completed_plans: 3
  percent: 38
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
Plan: 4 of 8
**Milestone**: v1
**Phase**: 1 — Spec Model & Invariants
**Plan**: Wave 2 partial (`01-03-PLAN.md` complete). Next is `01-04-PLAN.md` — ComponentNodeSchema (the one recursive union in Phase 1, z.lazy + z.union).
**Status**: Wave 2 leaf schemas shipped — version, back-behavior, action (6-kind discriminated union), data model, variants factory. 60 new model assertions + 63 primitive assertions = 123 cumulative unit tests green. `npx tsc --noEmit` + `npx biome check src/model/` both clean. `createScreenVariantsSchema(treeSchema)` factory is ready for Plan 04's ComponentNodeSchema to be threaded through by Plan 05.

**Progress**: Phase 0/9 complete. Plans 3/8 in Phase 1.

```
[████░░░░░░] 38% — 3/8 Phase-1 plans complete
```

## Performance Metrics

| Metric | Value |
|--------|-------|
| v1 requirements | 58 |
| Requirements mapped | 58 (100%) |
| Phases planned | 9 |
| Plans complete | 3 |
| Fixtures committed | 0 |
| Round-trip fixtures | 0 / 20 (target) |
| Reference wireframes | 0 / 20 (target for Phase 3 dogfood gate) |

### Plan Timing

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| 01-01 (toolchain scaffolding) | 3m 23s | 3 | 13 |
| 01-02 (L1 primitives) | 3m 54s | 3 (6 TDD commits) | 7 |
| 01-03 (Wave 2 leaf schemas) | 3m 44s | 4 (8 TDD commits) | 9 |

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

**Last session**: 2026-04-17 — Wave 2 leaf schemas complete (01-03-PLAN.md executed).
**Stopped at**: Completed 01-03-PLAN.md (version + back-behavior + action + data + variant). Next: `01-04-PLAN.md` (ComponentNodeSchema — the one recursive union in Phase 1).
**Next session**: Execute `01-04-PLAN.md` — recursive `ComponentNodeSchema` using `z.lazy + z.union` with the 18-kind A2UI-shaped component catalog. Plan 05 will then thread ComponentNodeSchema into `createScreenVariantsSchema` for the full Spec root.

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

**Repo root (Wave 0 toolchain + Wave 1 primitives + Wave 2 leaf schemas)**:

- `package.json`, `package-lock.json`, `tsconfig.json`, `biome.json`, `vitest.config.ts`, `.gitignore`
- `src/index.ts` (empty re-export placeholder — populated by Plan 01-06)
- `src/primitives/` — populated: `ids.ts`, `ids.test.ts`, `path.ts`, `path.test.ts`, `diagnostic.ts`, `diagnostic.test.ts`, `index.ts` (barrel)
- `src/model/` — populated by Plan 03: `version.ts`, `back-behavior.ts`, `back-behavior.test.ts`, `action.ts`, `action.test.ts`, `data.ts`, `data.test.ts`, `variant.ts`, `variant.test.ts` (legacy `.gitkeep` still present; removable once Plan 04-05 finish populating)
- `src/migrations/` (still `.gitkeep` only; Plan 01-07 populates)
- `fixtures/`, `fixtures/targets/` (`.gitkeep` only; Plan 01-08 populates)
- `tests/helpers/parse-fixture.ts` — Phase-1-only fixture reader

---

*Last updated: 2026-04-17 after 01-03-PLAN.md execution.*
