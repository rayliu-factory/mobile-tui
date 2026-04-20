---
phase: 260420-gqk
plan: "01"
subsystem: extension
tags: [bug-fix, integration, session, wizard, store]
dependency_graph:
  requires: []
  provides: [WIZARD-01, PI-04, PI-06, WIZARD-05]
  affects: [src/extension.ts]
tech_stack:
  added: []
  patterns: [enoent-seed-pattern, live-step-cursor, mutation-queue-injection]
key_files:
  created: []
  modified:
    - src/extension.ts
decisions:
  - "Seed SPEC.md with static template string (not yaml import) — avoids circular dep and keeps the ENOENT path zero-import-overhead"
  - "onGraduate made async to allow flush+writeSession before done(true) — T-09-03-01 compliance"
  - "sessionState helper removed — all three onQuit/onGraduate paths now inline their SessionState literals for clarity and live-cursor correctness"
metrics:
  duration: "~4m"
  completed: "2026-04-20"
  tasks_completed: 3
  files_modified: 1
---

# Phase 260420-gqk Plan 01: Fix Broken Integration Flows in extension.ts — Summary

ENOENT wizard bootstrap, live stepCursor session persistence, and withFileMutationQueue store injection all wired correctly in src/extension.ts.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fix BROKEN-1 — seed SPEC.md on ENOENT in wizard startMode | 68c4945 | src/extension.ts |
| 2 | Fix BROKEN-2 — persist session on graduation; fix stale wizardStep | 1448345 | src/extension.ts |
| 3 | Fix MISSING-1 — wire withFileMutationQueue into createStore | 093d73d | src/extension.ts |

## What Was Fixed

**BROKEN-1 (WIZARD-01):** The `/spec` command previously crashed with ENOENT on any new project because `parseSpecFile` was called before any SPEC.md existed. The fix wraps the parse in a try/catch that distinguishes ENOENT from other errors. On ENOENT in wizard mode, a minimal valid seed frontmatter is written to disk via `writeFile`, then `parseSpecFile` is called once on the freshly written file. ENOENT in canvas mode and all non-ENOENT errors still show the error notification and return.

**BROKEN-2 (PI-06, WIZARD-05):** The `onGraduate` callback called `done(true)` synchronously without flushing autosave or writing session state. This meant graduating from wizard to canvas lost the current step position and left the session file stale. The callback is now `async`: it reads the live `root.getStepCursor()`, calls `autosave.flush()`, calls `writeSession(mode: "canvas", wizardStep: liveStep)`, then calls `done(true)`. The wizard `onQuit` path was also using the stale `session?.wizardStep` from the startup snapshot rather than the live cursor — fixed to use `root.getStepCursor()`. The dead `sessionState` helper was removed as all three paths are now inlined.

**MISSING-1 (PI-04):** `createStore` was constructed without the `deps.withMutationQueue` injection, so `store.flush()` bypassed the mutation queue entirely. The call now passes `{ withMutationQueue: (absPath, fn) => withFileMutationQueue(absPath, fn) }` as the third argument, matching the autosave write path and providing queue coordination on both write surfaces.

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- `npx tsc --noEmit`: 0 errors (verified after each task)
- `npx vitest run`: 1064 passed / 1 skipped / 0 failed (full suite, no regressions)

## Self-Check: PASSED

- src/extension.ts modified: confirmed
- Commits 68c4945, 1448345, 093d73d: all present in git log
- No unexpected file deletions
- tsc and vitest both green
