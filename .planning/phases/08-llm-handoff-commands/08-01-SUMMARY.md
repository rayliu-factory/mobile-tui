---
phase: 08-llm-handoff-commands
plan: "01"
subsystem: handoff/deps
tags: [deps, tdd, scaffolding, test-stubs]
dependency_graph:
  requires: []
  provides:
    - gpt-tokenizer runtime dep
    - clipboardy runtime dep
    - tests/handoff/ test scaffold (Nyquist gate for Plans 08-02, 08-03)
  affects:
    - package.json
    - tests/handoff/
tech_stack:
  added:
    - gpt-tokenizer@^3.4.0 (BPE cl100k_base token counting, pure JS)
    - clipboardy@^5.3.1 (OS clipboard write/read, ESM-only, Node 20+)
  patterns:
    - Nyquist rule: test files before implementation
    - it.todo stubs: commented-out imports, present but not yet executing
key_files:
  created:
    - tests/handoff/yank-wireframe.test.ts
    - tests/handoff/prompt-screen.test.ts
    - tests/handoff/extract-screen.test.ts
    - tests/handoff/semantic-tokens.test.ts
    - tests/handoff/assembler.test.ts
  modified:
    - package.json
    - package-lock.json
decisions:
  - "Import paths in tests/handoff/ use ../../src/ (two levels up) not ../src/ — corrected during execution after vitest ERR_MODULE_NOT_FOUND"
metrics:
  duration: "~2.5 minutes"
  completed: "2026-04-20"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 7
requirements_satisfied:
  - HANDOFF-01
  - HANDOFF-02
  - HANDOFF-03
  - HANDOFF-04
---

# Phase 08 Plan 01: Dependency Install + Test Scaffold Summary

Install gpt-tokenizer@^3.4.0 and clipboardy@^5.3.1 as runtime deps and scaffold five it.todo test stubs in tests/handoff/ that gate all Phase 8 handoff implementation work under the Nyquist rule.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install gpt-tokenizer and clipboardy | b8592fb | package.json, package-lock.json |
| 2 | Create five test scaffold files | a1c338a | tests/handoff/*.test.ts (5 files) |

## Verification Results

- `npx vitest run tests/handoff/` exits 0: 20 todo tests across 5 files
- Full suite: 984 passed, 20 todo, 0 failures (no regressions)
- `npx tsc --noEmit` produces 0 errors in tests/handoff/
- `node -e` confirms both deps in package.json "dependencies": gpt-tokenizer@^3.4.0, clipboardy@^5.3.1

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed import depth in test scaffold files**
- **Found during:** Task 2 verification (`npx vitest run tests/handoff/`)
- **Issue:** All five test files initially used `../src/` import paths, but `tests/handoff/` is two directories deep from the project root, requiring `../../src/` paths
- **Fix:** Updated all five files from `../src/` to `../../src/` for the `parseSpecFile` and `Spec` imports
- **Files modified:** All five tests/handoff/*.test.ts files
- **Commit:** a1c338a (corrected before commit, included in final scaffold commit)

## Known Stubs

All 20 test cases are intentional `it.todo` stubs per the Nyquist rule. These are not unintentional stubs — they are the explicit output of this plan and will be implemented in Plans 08-02 and 08-03:

| File | Stub reason |
|------|-------------|
| yank-wireframe.test.ts | Implementation lands in Plan 08-03 |
| prompt-screen.test.ts | Implementation lands in Plans 08-02 + 08-03 |
| extract-screen.test.ts | Implementation lands in Plans 08-02 + 08-03 |
| semantic-tokens.test.ts | Implementation lands in Plan 08-02 |
| assembler.test.ts | Implementation lands in Plan 08-02 |

## Threat Flags

None — no new network endpoints, auth paths, or trust-boundary schema changes introduced. The two new npm packages (gpt-tokenizer, clipboardy) were accepted per T-8-01/T-8-02 in the plan threat register.

## Self-Check: PASSED

All created files exist on disk:
- tests/handoff/yank-wireframe.test.ts: FOUND
- tests/handoff/prompt-screen.test.ts: FOUND
- tests/handoff/extract-screen.test.ts: FOUND
- tests/handoff/semantic-tokens.test.ts: FOUND
- tests/handoff/assembler.test.ts: FOUND

All commits exist in git log:
- b8592fb (Task 1: install deps): FOUND
- a1c338a (Task 2: scaffold stubs): FOUND
