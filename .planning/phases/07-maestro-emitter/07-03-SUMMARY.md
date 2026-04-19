---
phase: "07-maestro-emitter"
plan: "03"
subsystem: "emit"
tags: ["tdd", "wave-2", "maestro", "emitter", "pure-function", "platform-filter"]

dependency_graph:
  requires:
    - "07-02-SUMMARY.md — TestFlowSchema in SpecSchema + crossReferencePass test_flows validation"
  provides:
    - "src/emit/maestro/platform-filter.ts — filterStepsByPlatform(steps, platform)"
    - "src/emit/maestro/step-mapper.ts — mapStep(), findTestIDForAction() with TabBar special case"
    - "src/emit/maestro/emitter.ts — emitMaestroFlows(spec): EmitResult pure function"
    - "src/emit/maestro/index.ts — public barrel (explicit named exports)"
  affects:
    - "tests/maestro-emitter.test.ts — MAESTRO-01/02/03 stubs unskipped; 11 tests now active"
    - "src/serialize/unknown.ts — test_flows added to KNOWN_TOP_LEVEL_KEYS"
    - "src/serialize/unknown.test.ts — assertions updated to reflect test_flows as known"

tech_stack:
  added: []
  patterns:
    - "Pure emitter function pattern (mirrors src/emit/wireframe/variants.ts)"
    - "Two-document YAML construction: header + --- + steps (RESEARCH Pitfall 3)"
    - "yamlListItem() helper: prefix first line with '- ', indent subsequent with '  '"
    - "walkForTestID recursive walker with TabBar.items special-case (D-106)"
    - "All-or-nothing EmitResult: ok:false returns zero flows when any step fails"
    - "EXPLICIT-NAMED barrel: no export * (matches wireframe/index.ts pattern)"

key_files:
  created:
    - src/emit/maestro/platform-filter.ts
    - src/emit/maestro/step-mapper.ts
    - src/emit/maestro/emitter.ts
    - src/emit/maestro/index.ts
  modified:
    - tests/maestro-emitter.test.ts
    - src/serialize/unknown.ts
    - src/serialize/unknown.test.ts

decisions:
  - "All 6 action kinds (navigate/submit/mutate/present/dismiss/custom) produce identical tapOn: { id: testID } — D-109/D-110"
  - "Custom action emits # custom action: <name> comment line before tapOn step via string joining (YAML.stringify cannot produce comments)"
  - "test_flows added to KNOWN_TOP_LEVEL_KEYS in unknown.ts (Rule 1 fix) — without this the serializer classified it as unknown and emitter received no data"
  - "launchApp unconditionally prepended as first step per idiomatic Maestro pattern (RESEARCH Open Question 2 resolved)"
  - "Content variant only walked for testID resolution (D-106) — empty/loading/error are non-interactive"

metrics:
  duration: "426 seconds"
  completed: "2026-04-19"
  tasks_completed: 2
  tasks_total: 2
  files_created: 4
  files_modified: 3
---

# Phase 07 Plan 03: Maestro Emitter Core Summary

Pure Maestro emitter: `emitMaestroFlows(spec)` converts `test_flows[]` to per-platform YAML strings with testID resolution, platform filtering, and all-or-nothing error semantics. MAESTRO-01, MAESTRO-02, MAESTRO-03 tests unskipped and passing.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create platform-filter.ts and step-mapper.ts | 53e21a7 | src/emit/maestro/platform-filter.ts, src/emit/maestro/step-mapper.ts |
| 2 | Create emitter.ts + index.ts + unskip MAESTRO-01/02/03 | 04962e3 | src/emit/maestro/emitter.ts, src/emit/maestro/index.ts, tests/maestro-emitter.test.ts, src/serialize/unknown.ts, src/serialize/unknown.test.ts |

## Verification

- `grep "emitMaestroFlows" src/emit/maestro/index.ts` — matches
- `grep -v "^//" src/emit/maestro/emitter.ts | grep -E "process\.env|new Date|Math\.random"` — no matches (pure function)
- `grep "launchApp" src/emit/maestro/emitter.ts` — matches
- `grep "TabBar" src/emit/maestro/step-mapper.ts` — matches
- `grep "MAESTRO_MISSING_TESTID" src/emit/maestro/step-mapper.ts` — matches
- `npx vitest run tests/maestro-emitter.test.ts` — 11 passed, 4 skipped, 0 failed
- `npx vitest run` — 962 passed, 4 skipped, 0 failed
- `npx tsc --noEmit` — exit 0
- `npx biome check src/emit/maestro/ tests/maestro-emitter.test.ts src/serialize/unknown.ts src/serialize/unknown.test.ts` — 0 errors

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added test_flows to KNOWN_TOP_LEVEL_KEYS in unknown.ts**
- **Found during:** Task 2 (emitter returned empty flows for fixture with test_flows)
- **Issue:** `src/serialize/unknown.ts` partitions top-level keys into known (passed to `validateSpec`) and unknown (stashed for diagnostics). `test_flows` was not in `KNOWN_TOP_LEVEL_KEYS`, so it was silently classified as unknown. The emitter received a `Spec` object with `test_flows: undefined`, returned `{ ok: true, flows: [] }` for every spec, and all MAESTRO-02 platform-branching tests failed with "undefined is not defined".
- **Fix:** Added `"test_flows"` to `KNOWN_TOP_LEVEL_KEYS` array in `unknown.ts` with explanatory comment. Updated two affected tests in `unknown.test.ts` (registry snapshot test and partition test).
- **Files modified:** `src/serialize/unknown.ts`, `src/serialize/unknown.test.ts`
- **Commit:** 04962e3

**2. [Rule 1 - Bug] Fixed test filter matching `---` separator as a step line**
- **Found during:** Task 2 (launchApp-first test)
- **Issue:** The test used `l.trim().startsWith("-")` to find YAML list items, but the `---` document separator also starts with `-`. The test incorrectly identified `---` as the first step and failed `expect(stepLines[0]).toContain("launchApp")`.
- **Fix:** Changed filter to `/^- \S/.test(l.trim()) || l.trim() === "- launchApp"` to match only valid YAML list items.
- **Files modified:** `tests/maestro-emitter.test.ts`
- **Commit:** 04962e3

## Known Stubs

None — all Plan 03 emitter functionality is fully wired. Remaining skipped tests:
- `maestro check-syntax gate (MAESTRO-04)` — stays skipped until Plan 04 (canvas command wiring adds CLI gate)
- `golden fixtures (MAESTRO-05 SC5)` — stays skipped until Plan 05

## Threat Surface Scan

No new network endpoints, auth paths, or file access patterns introduced. `emitMaestroFlows` is a pure function with no side effects. T-7-03-03 mitigation verified: plain JS objects passed to `YAML.stringify`, never Zod-typed objects.

## Self-Check: PASSED

- src/emit/maestro/platform-filter.ts — FOUND
- src/emit/maestro/step-mapper.ts — FOUND
- src/emit/maestro/emitter.ts — FOUND
- src/emit/maestro/index.ts — FOUND
- Commit 53e21a7 — FOUND
- Commit 04962e3 — FOUND
