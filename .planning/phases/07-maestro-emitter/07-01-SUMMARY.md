---
phase: "07-maestro-emitter"
plan: "01"
subsystem: "test-scaffold"
tags: ["tdd", "wave-0", "maestro", "fixtures", "test-infrastructure"]

dependency_graph:
  requires: []
  provides:
    - "tests/maestro-emitter.test.ts — 14 skipped stubs for MAESTRO-01..05"
    - "fixtures/habit-tracker.spec.md — test_flows with platform-divergence flow"
    - "fixtures/todo.spec.md — test_flows with submit + dismiss + custom"
    - "flows/.gitkeep — output directory tracked in git"
  affects:
    - "src/serialize/unknown.test.ts — updated fixture assertion for test_flows passthrough"

tech_stack:
  added: []
  patterns:
    - "loadFixture helper pattern from variants.test.ts replicated in maestro-emitter.test.ts"
    - "inline stub for not-yet-implemented emitMaestroFlows compiles via typed const"
    - "test_flows as unknown passthrough key until Plan 02 extends SpecSchema"

key_files:
  created:
    - tests/maestro-emitter.test.ts
    - flows/.gitkeep
  modified:
    - fixtures/habit-tracker.spec.md
    - fixtures/todo.spec.md
    - src/serialize/unknown.test.ts

decisions:
  - "test_flows added to fixtures as Wave 0 infrastructure; stays as unknown passthrough key until Plan 02 adds it to SpecSchema"
  - "inline emitMaestroFlows stub (not real import) keeps test file compiling before Plan 03 creates src/emit/maestro/index.ts"

metrics:
  duration: "199 seconds"
  completed: "2026-04-19"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 3
---

# Phase 07 Plan 01: Wave 0 Test Scaffold Summary

Wave 0 test infrastructure for the Maestro emitter — 14 skipped stubs in `tests/maestro-emitter.test.ts` and `test_flows:` blocks in both fixture spec files, enabling the RED→GREEN TDD cycle in subsequent waves.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create tests/maestro-emitter.test.ts with skipped stubs | 3f3bcc8 | tests/maestro-emitter.test.ts |
| 2 | Add test_flows blocks to fixture specs + flows/.gitkeep | d67e470 | fixtures/habit-tracker.spec.md, fixtures/todo.spec.md, flows/.gitkeep, src/serialize/unknown.test.ts |

## Verification

- `npx vitest run tests/maestro-emitter.test.ts` — 14 skipped, 0 failed, exit 0
- `npx vitest run` — 951 passed, 14 skipped, 0 failed, exit 0
- `npx tsc --noEmit` — exit 0
- `grep -c "it.skip" tests/maestro-emitter.test.ts` — 14 (requirement: >= 12)
- `grep -c "test_flows:" fixtures/habit-tracker.spec.md` — 1
- `grep -c "ios_permission_flow" fixtures/habit-tracker.spec.md` — 1
- `grep -c "test_flows:" fixtures/todo.spec.md` — 1
- `ls flows/.gitkeep` — exists

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated unknown.test.ts fixture assertion for test_flows passthrough**
- **Found during:** Task 2
- **Issue:** `src/serialize/unknown.test.ts` test "partitions a real Phase-1 fixture with 5 known + 0 unknown" asserted `unknownKeys` equals `[]`. After adding `test_flows:` to `fixtures/habit-tracker.spec.md`, the `partitionTopLevel` function correctly classified it as an unknown key (since `test_flows` is not in `KNOWN_TOP_LEVEL_KEYS` yet — Plan 02 adds it). The test expectation needed to match the new fixture state.
- **Fix:** Updated test name to "...with 5 known + test_flows as unknown (Phase-7 field pending schema)" and expectation to `expect(unknownKeys).toEqual(["test_flows"])`. Added explanatory comment.
- **Files modified:** `src/serialize/unknown.test.ts`
- **Commit:** d67e470

## Known Stubs

- `tests/maestro-emitter.test.ts` — inline `emitMaestroFlows` stub (always returns `{ ok: true, flows: [] }`). This is intentional Wave 0 infrastructure; Plan 03 replaces it with the real import from `src/emit/maestro/index.ts`.

## Self-Check: PASSED

- tests/maestro-emitter.test.ts — FOUND
- flows/.gitkeep — FOUND
- fixtures/habit-tracker.spec.md has test_flows — FOUND
- fixtures/todo.spec.md has test_flows — FOUND
- Commit 3f3bcc8 — FOUND
- Commit d67e470 — FOUND
