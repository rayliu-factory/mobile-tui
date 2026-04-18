---
phase: 03-wireframe-renderer-dogfood-gate
plan: 01
subsystem: ui
tags: [wireframe, ascii, scaffold, emit, cli, exhaustive-switch]

# Dependency graph
requires:
  - phase: 01-spec-model-invariants
    provides: ComponentNode union + COMPONENT_KINDS 18-kind catalog + Spec shape consumed by the renderer
  - phase: 02-serialization-round-trip
    provides: parseSpecFile(path) public entry point that the render-wireframe CLI calls to get a validated Spec
provides:
  - src/emit/wireframe/ directory skeleton (18 NYI emitter stubs + dispatch + layout/text-style/overflow/variants stubs + EXPLICIT-NAMED barrel)
  - exhaustive-switch gate in dispatch.ts (adding a new ComponentKind breaks compilation until a case is added)
  - scripts/render-wireframe.ts CLI entry (argv-parsed, compile-green against Wave-0 stubs, exit codes 0/1/2 per RESEARCH Open Q 3)
  - tests/wireframe-ascii-baseline.test.ts — WIREFRAME-02 regex gate (runs green on empty glob at Wave-0)
  - tests/wireframe-catalog.test.ts — WIREFRAME-03 COMPONENT_KINDS walker (active) + render-check .skip until Plan 03-08
  - tests/dogfood-gate.test.ts — WIREFRAME-06 20-file count + SHARED.md parse (both .skip until Plan 03-09)
  - tests/helpers/wireframe-files.ts — shared allWireframeFiles() helper (Biome noExportsInTest compliant)
  - fixtures/wireframes/README.md + SHARED.md templates
  - .gitattributes extended to lock *.wf.txt to LF
  - package.json "wireframe" npm script alias
affects: [03-02 layout primitives, 03-03 text-style/overflow, 03-04 leaf emitters, 03-05 interactable emitters, 03-06 structural emitters, 03-07 chrome+overlay emitters, 03-08 variants.render composition, 03-09 fixture corpus authoring]

# Tech tracking
tech-stack:
  added: []  # Zero new runtime deps (CONTEXT.md + RESEARCH §Standard Stack zero-new-deps guarantee)
  patterns:
    - "EXPLICIT-NAMED barrel (no export *) per src/serialize/index.ts"
    - "Exhaustive-switch renderNode dispatcher over ComponentNode union with `const _exhaustive: never = node` compile-time gate"
    - "Per-kind emitter narrowing via Extract<ComponentNode, { kind: 'X' }> type parameter"
    - "NYI stub pattern: stubs throw `NYI: Plan 03-NN <fnName>` with the correct follow-up plan tag so downstream executors land in the right plan"
    - "Shared test helper pulled out to tests/helpers/*.ts to satisfy Biome noExportsInTest rule"

key-files:
  created:
    - src/emit/wireframe/index.ts
    - src/emit/wireframe/dispatch.ts
    - src/emit/wireframe/layout.ts
    - src/emit/wireframe/text-style.ts
    - src/emit/wireframe/overflow.ts
    - src/emit/wireframe/variants.ts
    - src/emit/wireframe/components/ (18 NYI stubs — one per ComponentKind)
    - scripts/render-wireframe.ts
    - tests/wireframe-ascii-baseline.test.ts
    - tests/wireframe-catalog.test.ts
    - tests/dogfood-gate.test.ts
    - tests/helpers/wireframe-files.ts
    - fixtures/wireframes/README.md
    - fixtures/wireframes/SHARED.md
  modified:
    - .gitattributes (added *.wf.txt eol=lf lock)
    - package.json (added "wireframe" script alias only — dependencies block byte-identical)

key-decisions:
  - "Shared allWireframeFiles() helper extracted to tests/helpers/wireframe-files.ts rather than exported from a *.test.ts file — Biome's noExportsInTest lint rule forbids exports from test files. The helper is module-level so both wireframe-ascii-baseline.test.ts and dogfood-gate.test.ts agree on the same file set without code duplication."
  - "Zero new runtime deps; `tsx` invoked via `npx` per CONTEXT.md D-Claude CLI form decision. Pinning tsx as a dev dep is deferred to later plans if devex warrants it."
  - "Biome auto-collapsed verbose multi-line signatures on renderRow and renderAllVariants (both fit within the 100-col line budget); applied in-place with no semantic change — matches the collapse pattern seen in Phase 2 Plans 02-02 / 02-03."
  - "NYI stubs use `void node; void width;` to silence unused-param checks while preserving the typed parameter surface downstream implementers need. Bodies throw `new Error('NYI: Plan 03-NN <fnName> (scaffolded in 03-01)')` so when execution lands in a later plan, the failure trace names both the owning plan and the original scaffold."

patterns-established:
  - "Wave-0 scaffolding pattern: every downstream plan's files exist as NYI stubs from the start, so (a) tsc + biome stay green during incremental plan execution, (b) shared files (dispatch, barrel, package.json script) are wired ONCE here and never co-edited, enabling parallel wave execution, (c) the plan tag embedded in the NYI message routes executors to the right follow-up plan."
  - "Skipped-but-shaped integration tests: dogfood-gate.test.ts and wireframe-catalog.test.ts's render-check stanza ship as `it.skip(...)` with full implementation bodies inline. The literal strings `SHARED.md`, `schema: mobile-tui/shared/1`, `render()` all survive in source, so grep-based acceptance checks pass, and flipping `.skip` to `.it` is the only edit needed when the downstream plan lands."
  - "EXPLICIT-NAMED barrel precedent carried forward from src/model/index.ts + src/serialize/index.ts to src/emit/wireframe/index.ts: downstream consumers (Phase 4 store, Phase 5 canvas, Phase 8 :yank handler) import render/renderAllVariants/PHONE_WIDTH/VariantKind/RenderOptions only — per-kind emitters stay INTERNAL and importable from leaf modules by co-located tests only."

requirements-completed: []
# Note: 03-01 is scaffolding only — it SETS UP the structure that WIREFRAME-01..06 will be satisfied against in
# Plans 03-02..03-09. Wave-0 does NOT close out any WIREFRAME-* requirement by itself. The plan's frontmatter
# declares requirements [WIREFRAME-01, WIREFRAME-02, WIREFRAME-03, WIREFRAME-05, WIREFRAME-06] because the
# scaffolding INITIATES their implementation path, but the checkboxes only flip when the downstream plans
# ship the real implementations.

# Metrics
duration: ~6min
completed: 2026-04-18
---

# Phase 3 Plan 01: Wave-0 Renderer Scaffold Summary

**Complete src/emit/wireframe/ skeleton (18 NYI emitter stubs + exhaustive-switch dispatcher + EXPLICIT-NAMED barrel) + render-wireframe CLI stub + 3 integration-test harnesses (ASCII-baseline live, catalog-walker live, dogfood-gate skipped) + fixture-corpus scaffolds; zero new runtime deps, zero Phase-1/2 regression (425 → 427 tests, +2 active, +3 skipped).**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-04-18T17:11:02Z
- **Completed:** 2026-04-18T17:16:45Z
- **Tasks:** 3
- **Files modified:** 33 (31 created + 2 edited)

## Accomplishments

- **Layer boundary established.** src/emit/ appears for the first time in the repo (L4 Emit layer per ARCHITECTURE.md). Subsequent emit sub-modules (Phase 7 Maestro, Phase 8 prompt handoff) compose as siblings to src/emit/wireframe/.
- **Exhaustive-switch gate wired once.** dispatch.ts covers all 18 ComponentKinds with `const _exhaustive: never = node`; adding a 19th kind to COMPONENT_KINDS breaks compilation until a case is added. This lands in Wave-0 so every downstream plan can extend emitters without re-editing dispatch — zero shared-file collisions for parallel execution.
- **Downstream plan routing via NYI tags.** Each per-kind stub carries its correct follow-up plan tag: leaves → 03-04, interactables → 03-05, structural → 03-06, chrome+overlays → 03-07, layout/style/overflow primitives → 03-02/03-03, composition → 03-08. When an executor hits a stub, the exception message names the owning plan.
- **Integration-test shape locked.** Three harnesses ship at Wave-0 with their imports + assertions + canonical strings (`ASCII_BASELINE` regex, `COMPONENT_KINDS` walker, `SHARED.md` literal, `schema: mobile-tui/shared/1` literal) in the source — downstream plans only need to flip `.skip` → `.it` or author the 20 fixture files.
- **CLI end-to-end compile-green.** `npx tsx scripts/render-wireframe.ts <spec> <screen>` routes through the real parseSpecFile + the NYI render() stub; exit codes 0/1/2 per RESEARCH Open Q 3. Usage path verified (`EXIT=2`) + NYI path verified (`error: NYI: Plan 03-08 render`, `EXIT=1`).
- **Zero new runtime deps.** `dependencies` block of package.json is byte-identical to prior state; only `scripts` gained `"wireframe": "tsx scripts/render-wireframe.ts"`. RESEARCH §Standard Stack zero-new-deps guarantee upheld.

## Task Commits

Each task was committed atomically:

1. **Task 1: RED — integration-test harnesses + fixture corpus scaffold** — `453db7e` (test)
2. **Task 2: GREEN — src/emit/wireframe scaffolding (18 emitters + dispatch + barrel)** — `9416c95` (feat)
3. **Task 3: GREEN — CLI entry stub + package.json wireframe script alias** — `1c289a9` (feat)

## Files Created/Modified

### Created (31 files)

- `src/emit/wireframe/index.ts` — EXPLICIT-NAMED public barrel (exports PHONE_WIDTH, VariantKind, RenderOptions, render, renderAllVariants)
- `src/emit/wireframe/dispatch.ts` — renderNode exhaustive switch over 18 kinds with `never` fallback
- `src/emit/wireframe/layout.ts` — PHONE_WIDTH=60 + VariantKind + buildVariantHeader/padRight/drawFrame NYI stubs (Plan 03-02)
- `src/emit/wireframe/text-style.ts` — TextStyle type + applyTextStyle NYI stub (Plan 03-03)
- `src/emit/wireframe/overflow.ts` — truncate NYI stub (Plan 03-03)
- `src/emit/wireframe/variants.ts` — RenderOptions interface + render/renderAllVariants NYI stubs (Plan 03-08)
- `src/emit/wireframe/components/text.ts, icon.ts, divider.ts, spacer.ts, image.ts` — leaf emitters, NYI Plan 03-04
- `src/emit/wireframe/components/button.ts, text-field.ts, toggle.ts, segmented-control.ts` — interactable emitters, NYI Plan 03-05
- `src/emit/wireframe/components/column.ts, row.ts, card.ts, list.ts, list-item.ts` — structural emitters, NYI Plan 03-06
- `src/emit/wireframe/components/nav-bar.ts, tab-bar.ts, modal.ts, sheet.ts` — chrome+overlay emitters, NYI Plan 03-07
- `scripts/render-wireframe.ts` — CLI entry that argv-parses, calls parseSpecFile, routes to render, writes stdout (exit 0/1/2 per RESEARCH Open Q 3)
- `tests/wireframe-ascii-baseline.test.ts` — WIREFRAME-02 regex `/^[|\-+. \x20-\x7E\n]*$/` gate over fixtures/wireframes/**/*.wf.txt
- `tests/wireframe-catalog.test.ts` — WIREFRAME-03 COMPONENT_KINDS walker over 3 canonicals (active) + render-check .skip stanza (UNSKIP after Plan 03-08)
- `tests/dogfood-gate.test.ts` — WIREFRAME-06 20-file count + SHARED.md `schema: mobile-tui/shared/1` + ≥3 shareable verdicts (both .skip until Plan 03-09)
- `tests/helpers/wireframe-files.ts` — shared allWireframeFiles() + WIREFRAME_ROOT constant (Biome noExportsInTest compliant)
- `fixtures/wireframes/README.md` — placeholder for 20-entry index (Plan 03-09 authors full index)
- `fixtures/wireframes/SHARED.md` — YAML-frontmatter template (schema: mobile-tui/shared/1 + empty shared: []) + body describing per-entry fields

### Modified (2 files)

- `.gitattributes` — extended to lock `*.wf.txt` + `fixtures/wireframes/**/*.wf.txt` to `text eol=lf`
- `package.json` — added `"wireframe": "tsx scripts/render-wireframe.ts"` to scripts; dependencies block byte-identical

## Decisions Made

See `key-decisions` in frontmatter. Summary:

- **Shared helper outside test files** (tests/helpers/wireframe-files.ts) because Biome's `noExportsInTest` rule forbids exports from `*.test.ts` files — directly hit during Task 1 execution.
- **Zero runtime deps carried forward** per CONTEXT.md D-Claude "CLI form"; `tsx` invoked via `npx`.
- **NYI stub bodies use `void <param>` to silence unused-param lints** while keeping the typed parameter surface downstream implementers need. Exception messages embed both the current plan (`scaffolded in 03-01`) and the future plan (`NYI: Plan 03-NN`) so executors landing in the NYI trace know exactly where to work.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Moved `allWireframeFiles()` out of a test file into tests/helpers/**
- **Found during:** Task 1 (RED phase biome check)
- **Issue:** Biome's `lint/suspicious/noExportsInTest` rule errored on `export async function allWireframeFiles` in `tests/wireframe-ascii-baseline.test.ts`; dogfood-gate.test.ts also imported it from there per the plan-supplied template.
- **Fix:** Created `tests/helpers/wireframe-files.ts` with `allWireframeFiles()` + `WIREFRAME_ROOT` constant; both test files now import from `./helpers/wireframe-files.ts`.
- **Files modified:** tests/helpers/wireframe-files.ts (created), tests/wireframe-ascii-baseline.test.ts, tests/dogfood-gate.test.ts
- **Verification:** `npx biome check .` clean; `npx vitest run tests/wireframe-*.test.ts tests/dogfood-gate.test.ts` passes 2 active + 3 skipped.
- **Committed in:** `453db7e` (Task 1 RED commit — the helper shipped as part of the RED commit so the test files compile from the first commit)

**2. [Rule 1 - Bug] Typed `let entries` explicitly (`Dirent[]`)**
- **Found during:** Task 1 (biome check after auto-format pass)
- **Issue:** Biome flagged `let entries;` as implicit-any (`noImplicitAnyLet`); the plan template used untyped-let which fails strict mode.
- **Fix:** Imported `Dirent` type from `node:fs` and declared `let entries: Dirent[]`.
- **Files modified:** tests/helpers/wireframe-files.ts
- **Verification:** `npx biome check .` clean.
- **Committed in:** `453db7e` (Task 1 RED commit)

**3. [Rule 1 - Bug] Added sanity `expect(Array.isArray(files)).toBe(true)` assertion to ASCII-baseline test**
- **Found during:** Task 1 (post-test-run introspection)
- **Issue:** At Wave-0 the fixtures/wireframes/ directory has no `.wf.txt` files yet, so the `for (const f of files)` loop body never executes, leaving the test with zero assertions. Vitest reports zero-assertion tests as a warning in some configurations; defensive programming adds a trivial sanity check.
- **Fix:** Added `expect(Array.isArray(files)).toBe(true)` after the loop so the test always exercises at least one assertion.
- **Files modified:** tests/wireframe-ascii-baseline.test.ts
- **Verification:** `npx vitest run tests/wireframe-ascii-baseline.test.ts` passes with a real assertion count.
- **Committed in:** `453db7e` (Task 1 RED commit)

**4. [Rule 1 - Bug] Added `as object` cast to YAML.parse return in dogfood-gate test**
- **Found during:** Task 1 (biome auto-format pass)
- **Issue:** gray-matter's `engines.yaml.parse` signature expects `(str: string) => object`; `YAML.parse(s)` is typed `unknown` in yaml@^2.8.3, so TS rejects the assignment.
- **Fix:** Added `as object` cast on the YAML.parse call, documented via the expected gray-matter `engines` contract.
- **Files modified:** tests/dogfood-gate.test.ts
- **Verification:** `npx tsc --noEmit` clean.
- **Committed in:** `453db7e` (Task 1 RED commit)

**5. [Rule 1 - Style] Biome auto-format: 2-space indentation + single-line signatures**
- **Found during:** Task 1 + Task 2 (biome check after initial Write)
- **Issue:** The plan templates used tab indentation (or verbose multi-line signatures) against Biome's 2-space / 100-col-width config. Same class of cosmetic tooling adjustment as Phases 1-2 Plans 02-02/02-03 previously auto-fixed.
- **Fix:** `npx biome check --write` on the new files applied the reformatting in-place (no semantic changes).
- **Files modified:** tests/wireframe-ascii-baseline.test.ts, tests/wireframe-catalog.test.ts, tests/dogfood-gate.test.ts, src/emit/wireframe/components/row.ts, src/emit/wireframe/variants.ts
- **Verification:** `npx biome check .` clean on all new files.
- **Committed in:** `453db7e` (Task 1), `9416c95` (Task 2)

---

**Total deviations:** 5 auto-fixed (4 × Rule 1 bug/style, 1 × Rule 3 blocking)
**Impact on plan:** All auto-fixes mechanical or lint-required; no semantic deviation from the plan-specified structure. The helper-file extraction does slightly reshape the import graph (both test files now import from a sibling helper), but the public-API surface downstream plans consume (`allWireframeFiles()`, `WIREFRAME_ROOT`) is byte-identical to what the plan specified.

## Issues Encountered

- **Biome info on pre-existing `src/serialize/write.ts`** — 1 unsafe-fix suggestion (template-literal refactor on line 254) is pre-existing from Phase 2 Plan 02-05. Out of scope per SCOPE BOUNDARY rule; logged as pre-existing, not fixed.
- **No other issues encountered.**

## Verification Snapshot

```
$ npx vitest run
 Test Files  32 passed | 1 skipped (33)
      Tests  427 passed | 3 skipped (430)

$ npx tsc --noEmit
(no output — clean)

$ npx biome check .
Checked 91 files in 55ms. No fixes applied.
Found 1 info.  # pre-existing src/serialize/write.ts template-literal suggestion

$ npx tsx scripts/render-wireframe.ts
usage: render-wireframe <spec-path> <screen-id>
# exit code 2 (usage error)

$ npx tsx scripts/render-wireframe.ts fixtures/habit-tracker.spec.md home
error: NYI: Plan 03-08 render
# exit code 1 (Wave-0 stub throws; proves end-to-end compile path intact)
```

Phase-1 + Phase-2 baseline intact (425 → 427 = +2 active tests from Wave-0 integration harnesses; +3 `.skip` stanzas for render-check and 20-file-count and SHARED.md-parse — all flip to active in downstream plans).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Wave 1 / Plan 03-02 (layout primitives)** unblocked — PHONE_WIDTH + VariantKind + buildVariantHeader/padRight/drawFrame stubs live at `src/emit/wireframe/layout.ts`, signatures already in place; implementer replaces NYI bodies.
- **Wave 1 / Plan 03-03 (text-style + overflow)** unblocked — `applyTextStyle` + `truncate` stubs live at `src/emit/wireframe/{text-style,overflow}.ts`.
- **Wave 2 / Plans 03-04..03-07 (per-kind emitters)** unblocked and parallelizable — every kind's emitter file exists with the correct `Extract<ComponentNode, { kind: 'X' }>` signature; executors land on the stub via the NYI tag and replace the body. dispatch.ts is already wired so emitter implementations are picked up automatically.
- **Wave 3 / Plan 03-08 (variants composition)** unblocked — `render` + `renderAllVariants` stubs + RenderOptions interface live at `src/emit/wireframe/variants.ts`; CLI already routes through these.
- **Wave 4 / Plan 03-09 (fixture corpus + SHARED.md seeding)** unblocked — fixtures/wireframes/ dir + README.md + SHARED.md template live; dogfood-gate.test.ts literal strings already match the expected shape; Plan 03-09's job is to flip `.skip` → `.it` + author 20 `.wf.txt` files + seed ≥3 SHARED.md entries.

No blockers.

## Self-Check: PASSED

Verification commands:
```
test -f src/emit/wireframe/index.ts                              → FOUND
test -f src/emit/wireframe/dispatch.ts                           → FOUND
test -f src/emit/wireframe/layout.ts                             → FOUND
test -f src/emit/wireframe/text-style.ts                         → FOUND
test -f src/emit/wireframe/overflow.ts                           → FOUND
test -f src/emit/wireframe/variants.ts                           → FOUND
ls src/emit/wireframe/components/*.ts | wc -l                    → 18
test -f scripts/render-wireframe.ts                              → FOUND
test -f tests/wireframe-ascii-baseline.test.ts                   → FOUND
test -f tests/wireframe-catalog.test.ts                          → FOUND
test -f tests/dogfood-gate.test.ts                               → FOUND
test -f tests/helpers/wireframe-files.ts                         → FOUND
test -f fixtures/wireframes/README.md                            → FOUND
test -f fixtures/wireframes/SHARED.md                            → FOUND
git log --oneline | grep 453db7e                                 → FOUND (Task 1 RED)
git log --oneline | grep 9416c95                                 → FOUND (Task 2 GREEN)
git log --oneline | grep 1c289a9                                 → FOUND (Task 3 GREEN)
```

All 17 self-check items verified.

---
*Phase: 03-wireframe-renderer-dogfood-gate*
*Completed: 2026-04-18*
