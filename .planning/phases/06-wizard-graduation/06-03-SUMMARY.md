---
phase: 06-wizard-graduation
plan: "03"
subsystem: wizard-pure-functions
tags: [wizard, tdd, step-indicator, reentry, pure-functions]
dependency_graph:
  requires:
    - 06-01 (SpecSchema with wizard fields, createSeedSpec)
    - 06-02 (test scaffold — wizard-step-indicator.test.ts, wizard-reentry.test.ts)
  provides:
    - renderStepIndicator pure function (D-91 step indicator)
    - renderWizardHelpLine pure function (D-102 help line)
    - STEP_DEFINITIONS array (8 ordered wizard steps)
    - firstUnansweredStep pure function (D-96 re-entry logic)
    - StepAction discriminated union
  affects:
    - 06-04 (FormPane imports STEP_DEFINITIONS, StepAction)
    - 06-06 (WizardRoot imports firstUnansweredStep, renderStepIndicator, renderWizardHelpLine)
tech_stack:
  added: []
  patterns:
    - Pure function modules with zero side effects
    - MinimalTheme interface for test-safe theme injection
    - Record<string, unknown> cast pattern for optional wizard fields on Spec
    - TDD RED/GREEN pairs per plan convention
key_files:
  created:
    - src/wizard/step-indicator.ts
    - src/wizard/help-line.ts
    - src/wizard/steps/index.ts
  modified:
    - tests/wizard-step-indicator.test.ts (unskipped, 5 live assertions)
    - tests/wizard-reentry.test.ts (unskipped, 5 live assertions)
decisions:
  - "renderStepIndicator accepts MinimalTheme interface (not full pi-tui theme) for headless testability"
  - "firstUnansweredStep uses null-safe def !== undefined guard instead of non-null assertion (biome lint/style/noNonNullAssertion)"
  - "Data step (index 5) isAnswered = entities.length > 0 OR offline_sync defined — avoids wizard metadata flag complexity"
metrics:
  duration: "4m 22s"
  completed: "2026-04-19"
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 2
  tests_before: 865
  tests_after: 875
---

# Phase 06 Plan 03: Wizard Pure-Function Modules Summary

One-liner: Three pure-function modules — renderStepIndicator (D-91), renderWizardHelpLine (D-102), STEP_DEFINITIONS + firstUnansweredStep (D-96/D-97) — with 10 new tests all green (875 total).

## What Was Built

### Task 1: renderStepIndicator + renderWizardHelpLine

**`src/wizard/step-indicator.ts`**

Exports `renderStepIndicator(stepIndex, answered, theme): string[]` — a pure function returning exactly 2 lines per D-91:
- Row 0: `Step N/8: [Step name]` (bolded via `theme.bold` if available)
- Row 1: dot row using `◉` (current, `theme.fg("accent")`), `●` (answered, `theme.fg("success")`), `○` (unanswered, `theme.fg("muted")`)

Also exports `MinimalTheme` interface (subset of pi-tui theme) and `STEP_NAMES` const so downstream consumers don't hardcode step names.

**`src/wizard/help-line.ts`**

Exports `renderWizardHelpLine(stepIndex, width): string` per D-102:
- Step 0: `[tab] next  [ctrl+g] canvas  [ctrl+z] undo  [ctrl+q] quit` (no `[esc] back`)
- Steps 1–7: `[tab] next  [esc] back  [ctrl+g] canvas  [ctrl+z] undo  [ctrl+q] quit`

Imports `truncateToWidth` from `../canvas/tui-utils.ts` — same pattern as `src/canvas/help-line.ts`.

### Task 2: STEP_DEFINITIONS + firstUnansweredStep + StepAction

**`src/wizard/steps/index.ts`**

Exports `STEP_DEFINITIONS: StepDefinition[]` — 8 ordered entries in canonical wizard order:

| Index | Name | specField | commandName |
|-------|------|-----------|-------------|
| 0 | App Idea | app_idea | set-wizard-app-idea |
| 1 | Primary User | primary_user | set-wizard-primary-user |
| 2 | Navigation Pattern | nav_pattern | set-wizard-nav-pattern |
| 3 | Screens | screens | set-wizard-screens |
| 4 | Auth | auth | set-wizard-auth |
| 5 | Data | data | add-entity |
| 6 | Offline/Sync | offline_sync | set-wizard-offline-sync |
| 7 | Target Platforms | target_platforms | set-wizard-target-platforms |

Each `StepDefinition` includes:
- `isAnswered(spec)` — used by `firstUnansweredStep` for D-96 re-entry
- `getPrePopulate(spec)` — returns current spec value for D-97 edit-in-place
- `commandName` — store command name for FormPane to call on advance

Exports `firstUnansweredStep(spec): number` — scans STEP_DEFINITIONS for first unanswered step; returns 7 if all answered (D-96: land on last step).

Exports `StepAction` discriminated union for FormPane/step-handler communication:
```
| { kind: "consumed" }
| { kind: "advance"; args: unknown }
| { kind: "passthrough" }
```

## Verification

- `npx vitest run tests/wizard-step-indicator.test.ts` — 5/5 pass
- `npx vitest run tests/wizard-reentry.test.ts` — 5/5 pass
- `npx vitest run` — 875 pass, 25 skipped, 0 failures
- `npx tsc --noEmit` — exits 0
- `npx biome check src/wizard/step-indicator.ts src/wizard/help-line.ts src/wizard/steps/index.ts` — 0 errors

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Replaced non-null assertion with null-safe guard in firstUnansweredStep**
- **Found during:** Task 2, biome check after implementation
- **Issue:** `STEP_DEFINITIONS[i]!` triggers `lint/style/noNonNullAssertion` in biome
- **Fix:** Changed to `const def = STEP_DEFINITIONS[i]; if (def !== undefined && !def.isAnswered(spec)) return i;`
- **Files modified:** `src/wizard/steps/index.ts`
- **Commit:** 77566f1

## TDD Gate Compliance

| Gate | Commit | Status |
|------|--------|--------|
| RED (step-indicator) | 92ba708 | PASSED — tests fail before implementation |
| GREEN (step-indicator) | 7a05746 | PASSED — all 5 tests pass |
| RED (reentry) | f43f0df | PASSED — tests fail before implementation |
| GREEN (reentry) | 77566f1 | PASSED — all 5 tests pass |

## Known Stubs

None — all three modules are pure functions with no stubs. The `getPrePopulate` returns `""` for the Screens and Data steps by design (those steps manage internal list state, not a single pre-populated string value).

## Threat Flags

None — all new code is pure functions with read-only access to `Spec`. No network endpoints, auth paths, file access, or schema mutations introduced.

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| src/wizard/step-indicator.ts exists | FOUND |
| src/wizard/help-line.ts exists | FOUND |
| src/wizard/steps/index.ts exists | FOUND |
| tests/wizard-step-indicator.test.ts updated | FOUND |
| tests/wizard-reentry.test.ts updated | FOUND |
| commit 92ba708 (RED step-indicator) | FOUND |
| commit 7a05746 (GREEN step-indicator) | FOUND |
| commit f43f0df (RED reentry) | FOUND |
| commit 77566f1 (GREEN reentry) | FOUND |
| 875 tests pass, 0 failures | VERIFIED |
