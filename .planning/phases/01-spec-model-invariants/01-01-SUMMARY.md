---
phase: 01-spec-model-invariants
plan: 01
subsystem: infra
tags: [typescript, vitest, biome, zod, jsonpointer, pi-dev, toolchain]

# Dependency graph
requires:
  - phase: 00-bootstrap
    provides: PROJECT.md, ROADMAP.md, REQUIREMENTS.md, CLAUDE.md stack selection
provides:
  - Installed toolchain (zod@4.3.6, jsonpointer@5.0.1, typescript@5.9.3, vitest@4.1.4, @biomejs/biome@2.4.12)
  - Strict TS config (bundler resolution, ES2022, noUncheckedIndexedAccess)
  - Biome lint+format config (noExplicitAny=error, noNonNullAssertion=error, lineWidth=100)
  - Vitest config (src/** + tests/** discovery, v8 coverage, passWithNoTests for Wave 0)
  - Three-directory src skeleton (primitives/, model/, migrations/) per CONTEXT.md D-14
  - fixtures/ + fixtures/targets/ ready for Plan 08 authoring + D-16 two-target fidelity gate
  - tests/helpers/parse-fixture.ts — Phase-1-only .spec.json / .spec.ts sibling reader
  - src/index.ts empty re-export placeholder (Waves 1-5 populate)
affects:
  - 01-02 (L1 primitives): imports parse-fixture helper for fixture round-trip tests
  - 01-03..01-07 (model, recursion, root, validator, migrations): type-check under this tsconfig
  - 01-08 (fixtures): writes .spec.md + .spec.json siblings for parse-fixture to resolve
  - Phase 2 (serialization): adds eemeli/yaml + gray-matter; drops .spec.json siblings
  - Phase 9 (pi packaging): swaps @mariozechner/pi-* into peerDependencies, adds tsup

# Tech tracking
tech-stack:
  added:
    - zod@^4.3.6 (internal spec validator; Zod v4 stable, 14× faster string parse than v3)
    - jsonpointer@^5.0.1 (RFC 6901 — binding / when-path / diagnostic-path DSL)
    - typescript@^5.6 (resolved to 5.9.3; matches pi-mono ecosystem compat per CLAUDE.md)
    - vitest@^4.1.4 + @vitest/coverage-v8@^4.1.4 (unit tests, v8 coverage)
    - "@biomejs/biome@^2.4.12 (single-binary lint+format; matches pi-mono house style)"
    - "@types/jsonpointer@^4.0.2 (runtime has no bundled types)"
    - "@types/node@^20.11.0 (Node 20+ ambient types)"
  patterns:
    - "Three-directory layer model: src/primitives/ (pure), src/model/ (Zod), src/migrations/ (versioned)"
    - "Closed stack: banned deps (js-yaml, chalk-as-primary, ink, blessed, TypeBox for internal validation, chokidar, dotenv, sqlite) never reach package.json"
    - "tsc owns `any` detection via strict; Biome owns style — no rule overlap (RESEARCH Pitfall #8)"
    - "passWithNoTests=true bootstrap pattern for Wave 0 — avoids chicken-and-egg on the first test file"
    - "Fixture reader uses .spec.json / .spec.ts sibling strategy to defer YAML parsing to Phase 2"

key-files:
  created:
    - package.json
    - package-lock.json
    - tsconfig.json
    - biome.json
    - vitest.config.ts
    - .gitignore (rewrote)
    - src/index.ts
    - src/primitives/.gitkeep
    - src/model/.gitkeep
    - src/migrations/.gitkeep
    - fixtures/.gitkeep
    - fixtures/targets/.gitkeep
    - tests/helpers/parse-fixture.ts
  modified:
    - .gitignore (replaced `.planning/` entry with standard Node-build exclusions + `.planning/.mobile-tui/` for PI-03 Phase-9 session state)

key-decisions:
  - "TypeScript pinned to ^5.6 (not ^6.0): matches pi-mono ecosystem compat per CLAUDE.md; RESEARCH Open Q#1 resolved — registry-current 6.0.3 is acceptable but unnecessary risk in Phase 1"
  - "Fixture reader uses .spec.json / .spec.ts sibling strategy (not a regex YAML reader): avoids adopting Phase-2 YAML-parser dep (gray-matter + eemeli/yaml) in Wave 0; Plan 08 ships both .md + .spec.json pairs, Phase 2 drops the JSON siblings. RESEARCH Open Q#2 resolved"
  - "Biome and tsc divide responsibilities: tsc-strict owns `any` detection (via noImplicitAny + strict); Biome owns `noExplicitAny=error` at lint time + formatting. No overlap, no conflict (RESEARCH Pitfall #8)"
  - "vitest.config.ts sets passWithNoTests=true to avoid vitest@^4 exiting 1 on Wave-0 bootstrap; downstream plans will author the first test files and the flag becomes a no-op in practice"
  - "Three-directory src skeleton locked: src/primitives/ (no cross-layer deps), src/model/ (Zod schemas), src/migrations/ (versioned runners). No src/validator/, no src/schemas/ — CONTEXT.md D-14 is authoritative"
  - "package.json declares no @mariozechner/pi-* deps in Phase 1; Phase 9 adds them as peerDependencies. This keeps Phases 1-8 runnable as pure Node headless tests without a pi host"

patterns-established:
  - "Scripted verification per task: every file acceptance criterion is a one-line grep + test -f check, so downstream plan authors can append checks instead of inventing them"
  - "Atomic per-task commits with `{type}(01-01): {desc}` conventional-commit format; deviations documented in commit body under `[Rule N - Category]` brackets"
  - "Banned-dep enforcement via `! grep -Ei '\"(js-yaml|chalk|...)\"' package.json` — catches regression if a future plan blindly `npm install`s something on the banned list"

requirements-completed: []  # Plan 01-01 is toolchain scaffolding; no SPEC/SERDE requirement IDs attach to this wave.

# Metrics
duration: 3m 23s
completed: 2026-04-17
---

# Phase 01 Plan 01: Toolchain Scaffolding Summary

**Wave 0 toolchain fully operational: `npm install && npx tsc --noEmit && npx vitest run && npx biome check .` all exit 0 against a three-dir src skeleton, with zod@4 + jsonpointer@5 installed and every banned dep absent from `package.json`.**

## Performance

- **Duration:** 3m 23s
- **Started:** 2026-04-17T12:47:51Z
- **Completed:** 2026-04-17T12:51:14Z
- **Tasks:** 3 / 3
- **Files modified:** 13 (12 created + 1 rewritten)
- **Commits:** 3 per-task + 1 plan-metadata

## Accomplishments

- Installed and pinned the full Wave-0 toolchain — 71 npm packages, 0 vulnerabilities, no peer-dep warnings.
- Locked strict TypeScript config (`strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `isolatedModules`) so future model code cannot rely on loose `any`-propagation or hidden runtime coercion.
- Wired Biome to enforce `noExplicitAny: "error"` + `noNonNullAssertion: "error"` at lint time — aligns with RESEARCH Pitfall #8 "tsc owns type-safety, Biome owns style" without duplicate rules.
- Established the three-directory src layer model (primitives / model / migrations) and the fixture-home convention (`fixtures/` at repo root, not under `.planning/`, per D-17).
- Shipped `tests/helpers/parse-fixture.ts` — a Phase-1-only fixture reader that sidesteps adopting a YAML parser one plan too early; the `.spec.json` / `.spec.ts` sibling convention lets Plan 08 author fixtures now and Phase 2 drop the JSON siblings once gray-matter + eemeli/yaml land.

## Task Commits

Each task was committed atomically against `main`:

1. **Task 1: package.json with pinned runtime + dev deps** — `89f7806` (chore)
2. **Task 2: tsconfig.json, biome.json, vitest.config.ts, .gitignore** — `b690204` (chore)
3. **Task 3: src skeleton + fixture parse helper** — `f81dae3` (feat)

**Plan metadata commit:** pending (includes this SUMMARY, STATE.md, ROADMAP.md)

## Files Created/Modified

- `package.json` — Dependency manifest (zod@^4.3.6, jsonpointer@^5.0.1 runtime; typescript@^5.6, vitest@^4.1.4, @biomejs/biome@^2.4.12 dev); `type: "module"`; `engines.node: ">=20"`
- `package-lock.json` — Resolution lockfile committed (T-01-03 supply-chain mitigation)
- `tsconfig.json` — Strict + bundler resolution + ES2022 target + `noUncheckedIndexedAccess`
- `biome.json` — `noExplicitAny: "error"`, `noNonNullAssertion: "error"`, 100-col lineWidth, 2-space indent
- `vitest.config.ts` — Discovers `src/**/*.test.ts` + `tests/**/*.test.ts`; `passWithNoTests: true` for Wave-0 bootstrap; v8 coverage with 80/80/75/80 thresholds
- `.gitignore` — Replaced the single `.planning/` entry with standard Node-build exclusions (`node_modules/`, `dist/`, `coverage/`, `.DS_Store`, `*.log`) + `.planning/.mobile-tui/` reserved for PI-03 Phase-9 session state
- `src/index.ts` — Empty re-export placeholder (`export {};`); commented stubs point at future exports (`validateSpec`, `SCHEMA_VERSION`, `Spec`, `Diagnostic`, `runMigrations`)
- `src/primitives/.gitkeep`, `src/model/.gitkeep`, `src/migrations/.gitkeep` — Directory placeholders so the three-layer skeleton is tracked from commit 1
- `fixtures/.gitkeep`, `fixtures/targets/.gitkeep` — Fixture directories under repo root (D-17 — ships with package)
- `tests/helpers/parse-fixture.ts` — Async `readFixture(fixturePath)` resolving `.spec.json` → `JSON.parse`, then `.spec.ts` → dynamic-import default export, else throws with Phase-2-handoff message

## Decisions Made

- **TypeScript pin: `^5.6` (not `^6.0`)** — matches pi-mono ecosystem compat per CLAUDE.md; RESEARCH Open Q#1 resolved. Semver resolved to `5.9.3` at install, still inside `^5.6`.
- **Fixture reader uses sibling strategy, not regex YAML** — RESEARCH Open Q#2 resolved. Avoids adopting gray-matter + eemeli/yaml in Wave 0; Plan 08 ships both `.md` and `.spec.json` for each fixture; Phase 2 replaces the helper and drops the JSON siblings.
- **`passWithNoTests: true` in vitest config** — Vitest 4 exits 1 by default when no tests match; this flag lets `vitest run` exit 0 during Wave 0 so the toolchain gate holds before a single test file exists.
- **No `@mariozechner/pi-*` deps in Phase 1 `package.json`** — Phases 1-8 are runnable as pure-Node headless tests; Phase 9 adds them as `peerDependencies` (never `dependencies`) when the pi extension shell is wired up.
- **`.gitignore` rewrite (not amend)** — the single-line `.planning/` entry was replaced because (a) `.planning/` artifacts have been force-committed since initialization, (b) the plan's literal `.gitignore` content is the authoritative spec, and (c) keeping `.planning/` ignored while all its contents are tracked is surprising. The rewrite preserves `.planning/.mobile-tui/` for Phase 9 PI-03 (ephemeral per-project session state, never under `~/.pi/`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocker] Vitest 4 exits 1 on "no tests found"**
- **Found during:** Task 3 (directory skeleton + fixture helper, running `npx vitest run --reporter=dot` for verification)
- **Issue:** Plan acceptance criterion is `npx vitest run --reporter=dot exits 0`, but Vitest 4.x defaults to exit code 1 when `include` globs match no files. Wave 0 deliberately ships no tests — the runner must still bootstrap cleanly as the toolchain gate.
- **Fix:** Added `passWithNoTests: true` to `vitest.config.ts`. This flag is idempotent once downstream plans add real tests; it simply stops Wave 0 from blocking on an empty fixture tree.
- **Files modified:** `vitest.config.ts`
- **Verification:** `npx vitest run --reporter=dot` exits 0; output reads "No test files found, exiting with code 0".
- **Committed in:** `f81dae3` (Task 3 commit)

**2. [Rule 1 - Bug] Biome formatter hints on `parse-fixture.ts` + `vitest.config.ts`**
- **Found during:** Task 3 (post-write `npx biome check .` ran as part of plan's overall verification block)
- **Issue:** Two auto-fixable formatter findings: (a) imports in `parse-fixture.ts` not alphabetically sorted (`organizeImports` rule), and (b) missing trailing commas on the coverage thresholds object in `vitest.config.ts`. Biome exited 1 — plan verification note says "may print formatter hints; no parse errors", but the plan's explicit criterion is `biome check . exit 0`.
- **Fix:** Ran `npx biome check --write .` to apply the two safe formatter fixes. Rechecked: exit 0, "No fixes applied".
- **Files modified:** `tests/helpers/parse-fixture.ts` (import ordering), `vitest.config.ts` (trailing commas)
- **Verification:** `npx biome check .` exits 0 with "Checked 4 files in 3ms. No fixes applied."
- **Committed in:** `f81dae3` (Task 3 commit — both auto-fixes landed before the commit)

---

**Total deviations:** 2 auto-fixed (1 blocking tool behavior, 1 formatter hygiene)
**Impact on plan:** Both fixes are correctness-preserving. The `passWithNoTests` flag is a Wave-0-specific concession that becomes a no-op in Wave 1 once `01-02-PLAN.md` adds the first test files. The Biome formatter fixes are cosmetic and re-converge to the style Biome would produce on any subsequent `biome check --write`. No scope creep; no architectural change.

## Issues Encountered

- **`.gitignore` collision with committed `.planning/` tree.** Before this plan, `.gitignore` ignored the entire `.planning/` directory while its contents (STATE.md, ROADMAP.md, etc.) were already force-committed — a soft inconsistency. The plan's literal `.gitignore` content resolved this by replacing the entry with `.planning/.mobile-tui/` (Phase-9 scope). After the rewrite, `git status` now shows `.planning/` contents as untracked (which they are, relative to the new `.gitignore`). They're tracked in history and will surface naturally during the plan metadata commit. No data loss; no history rewrite.

## Verification Evidence

All plan-level success criteria satisfied:

| Criterion | Result |
|-----------|--------|
| `npm install` exits 0, no peer-dep warnings | PASS (71 pkgs, 0 vulns) |
| `npx tsc --noEmit` exits 0 | PASS |
| `npx vitest run --reporter=dot` exits 0 | PASS (no tests found, exit 0 via `passWithNoTests`) |
| `npx biome check .` exits 0 | PASS (post-autofix) |
| `npm ls zod` → `zod@4.x` | PASS (`zod@4.3.6`) |
| `npm ls jsonpointer` → `jsonpointer@5.x` | PASS (`jsonpointer@5.0.1`) |
| `npm ls vitest` → `vitest@4.1.x` | PASS (`vitest@4.1.4`) |
| `npm ls typescript` → `typescript@^5.6` | PASS (`typescript@5.9.3`, within `^5.6` range) |
| Directory skeleton present | PASS (`src/primitives`, `src/model`, `src/migrations`, `fixtures/targets`, `tests/helpers` all exist) |
| No banned deps in `package.json` | PASS (grep inverted match clean) |

## User Setup Required

None — Wave 0 is entirely local toolchain scaffolding. No external services, no credentials, no environment variables.

## Next Phase Readiness

**Wave 0: COMPLETE — Wave 1 can begin.**

Ready-to-consume artifacts for downstream plans:
- `tsconfig.json` strict surface ⇒ `01-02-PLAN.md` (L1 primitives) can declare branded types without fighting type-check config.
- `vitest.config.ts` discovers both `src/**/*.test.ts` and `tests/**/*.test.ts` ⇒ `01-02-PLAN.md` onward can colocate unit tests next to source OR put round-trip tests under `tests/`.
- `tests/helpers/parse-fixture.ts` ⇒ `01-06-PLAN.md` (validator) and `01-08-PLAN.md` (fixtures) can read `.md`-authored fixtures via their `.spec.json` siblings without pulling in gray-matter early.
- Three-directory src skeleton ⇒ all remaining Phase-1 plans land files under `src/primitives/`, `src/model/`, or `src/migrations/` without ambiguity.

**No blockers for `01-02-PLAN.md`.** The Phase-2 dependency (YAML parser) stays out of Phase 1 by the fixture-reader's sibling-resolution strategy.

## Self-Check: PASSED

All 14 claimed files present on disk (package.json, package-lock.json, tsconfig.json, biome.json, vitest.config.ts, .gitignore, src/index.ts, 5× .gitkeep placeholders, tests/helpers/parse-fixture.ts, 01-01-SUMMARY.md). All 3 task commit hashes (`89f7806`, `b690204`, `f81dae3`) verified in `git log --oneline --all`.

---
*Phase: 01-spec-model-invariants*
*Plan: 01*
*Completed: 2026-04-17*
