---
phase: "06-wizard-graduation"
plan: "06"
subsystem: "wizard"
tags: ["wizard", "root-component", "graduation", "cli-entry", "tests"]
dependency_graph:
  requires:
    - "06-04"  # FormPane + step navigation
    - "06-05"  # SpecPreviewPane
  provides:
    - "WizardRoot — orchestrator component for all wizard panes"
    - "wizard barrel (src/wizard/index.ts)"
    - "scripts/wizard.ts CLI entry point"
    - "4 wizard test files unskipped and passing"
  affects:
    - "src/serialize/unknown.ts — wizard meta fields added to KNOWN_TOP_LEVEL_KEYS"
tech_stack:
  added: []
  patterns:
    - "WizardRoot mirrors RootCanvas architecture (store subscribe, palette overlay, 2-pane layout)"
    - "Ctrl+G checked FIRST in handleInput per RESEARCH Pitfall 1 (D-101)"
    - "graduate() closes palette before onGraduate call (RESEARCH Pitfall 6)"
    - "calcWizardPaneWidths: 50/50 split, preview collapses at width < 80 (D-89)"
    - "KNOWN_TOP_LEVEL_KEYS extended with Phase-6 wizard meta fields for round-trip correctness"
key_files:
  created:
    - "src/wizard/root.ts"
    - "src/wizard/index.ts"
    - "scripts/wizard.ts"
  modified:
    - "tests/wizard-chrome.test.ts"
    - "tests/wizard-navigation.test.ts"
    - "tests/wizard-save-advance.test.ts"
    - "tests/wizard-integration.test.ts"
    - "src/serialize/unknown.ts"
    - "src/serialize/unknown.test.ts"
decisions:
  - "WizardRoot.handleInput checks Ctrl+G (\\x07) BEFORE palette guard — RESEARCH Pitfall 1 says BEL byte must be intercepted globally or input field swallows it"
  - "graduate() hides paletteHandle before calling onGraduate — RESEARCH Pitfall 6 prevents orphan overlay on graduation"
  - "KNOWN_TOP_LEVEL_KEYS in unknown.ts extended with 6 wizard meta fields — parseSpecFile was silently dropping app_idea etc., breaking D-96 re-entry (Rule 1 bug fix)"
metrics:
  duration: "~20 minutes"
  completed: "2026-04-19"
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 6
---

# Phase 06 Plan 06: WizardRoot + CLI Entry + Test Unskip Summary

**One-liner:** WizardRoot orchestrator component with 2-pane layout, Ctrl+G graduation, palette reuse, and scripts/wizard.ts CLI entry that creates seed specs for new files.

## Tasks Completed

| Task | Description | Commit | Key Files |
|------|-------------|--------|-----------|
| 1 | WizardRoot component + wizard barrel | c8817dd | src/wizard/root.ts, src/wizard/index.ts |
| 2 | scripts/wizard.ts + 4 test files unskipped | 008f01e | scripts/wizard.ts, 4 test files, src/serialize/unknown.ts |

## What Was Built

### Task 1: WizardRoot + wizard barrel

`src/wizard/root.ts` mirrors `src/canvas/root.ts` exactly with these key differences:

- **2-pane layout** (FormPane + SpecPreviewPane) instead of 3 panes
- **stepCursor: number** (0–7) initialized from `firstUnansweredStep(state.spec)` for re-entry (D-96/WIZARD-04)
- **handleInput key order:** Ctrl+G checked FIRST before all other guards (RESEARCH Pitfall 1 / D-101) — BEL byte would be swallowed by input fields if not intercepted at root
- **graduate()** hides paletteHandle before calling `onGraduate` (RESEARCH Pitfall 6 — prevents orphan palette overlay)
- **onAdvance callback:** increments stepCursor; auto-graduates on step 7 (D-100)
- **onRetreat callback:** decrements stepCursor, min 0
- **onSnapshot:** pushes to specPreview + formPane on every store notification (Pitfall 4)
- **getStepCursor() / getFocus()** exposed as test hooks

`src/wizard/index.ts` — public barrel exporting WizardRoot, createSeedSpec, firstUnansweredStep, STEP_DEFINITIONS, StepDefinition, StepAction.

### Task 2: scripts/wizard.ts + 4 test files

`scripts/wizard.ts` mirrors `scripts/canvas.ts` exactly with:
- D-104: creates seed spec file if specPath does not exist
- D-100/D-101: `wizardRoot.onGraduate` callback swaps WizardRoot with RootCanvas (store unchanged)
- Phase 6 headless verify: render(80) once, exits 0 if non-empty
- T-06-14: path.resolve() normalizes traversal; T-04-24: writes only err.message (not stack)

**4 test files unskipped:**

- `tests/wizard-chrome.test.ts`: 3 tests — no alt-buffer/clear-screen sequences in render output
- `tests/wizard-navigation.test.ts`: 7 tests — Tab advances, Esc retreats, Ctrl+G graduates, step 8 Tab auto-graduates
- `tests/wizard-save-advance.test.ts`: 5 tests — store.apply called on Tab, not on Esc; Ctrl+Z calls undo; Ctrl+Q calls onQuit
- `tests/wizard-integration.test.ts`: 2 tests — new file seed spec renders; partial spec resumes at firstUnansweredStep

## Test Results

- **Before:** 923 passing, 25 skipped
- **After:** 940 passing, 4 skipped
- **New tests:** 17 new passing tests
- `npx tsc --noEmit`: exits 0
- `npx tsx scripts/wizard.ts /tmp/smoke-wizard-test.spec.md`: exits 0

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] KNOWN_TOP_LEVEL_KEYS missing wizard meta fields in src/serialize/unknown.ts**

- **Found during:** Task 2 — wizard-integration.test.ts re-entry test failing
- **Issue:** `partitionTopLevel()` in `src/serialize/unknown.ts` only knew 5 keys (`schema`, `screens`, `actions`, `data`, `navigation`). The 6 Phase-6 wizard meta fields (`app_idea`, `primary_user`, `nav_pattern`, `auth`, `offline_sync`, `target_platforms`) were classified as "unknown" and filtered out of `knownSubset` — meaning `parseSpecFile` silently dropped them. When a partially-completed spec was written and re-read, `firstUnansweredStep` returned 0 instead of the correct non-zero step, breaking D-96 re-entry.
- **Fix:** Added 6 wizard meta field keys to `KNOWN_TOP_LEVEL_KEYS` array in `src/serialize/unknown.ts`. Updated the snapshot test in `src/serialize/unknown.test.ts` to expect 11 keys.
- **Files modified:** `src/serialize/unknown.ts`, `src/serialize/unknown.test.ts`
- **Commit:** 008f01e

## Known Stubs

None — all functionality is wired. `scripts/wizard.ts` is in Phase 6 "headless verify" mode (renders once and exits) pending Phase 9 `ctx.ui.custom(wizardRoot)` integration, but this is documented as intentional in the script comments.

## Threat Surface Scan

No new network endpoints, auth paths, or trust boundary violations introduced. Mitigations from plan threat model applied:
- T-06-14: `path.resolve(specPath)` in scripts/wizard.ts normalizes traversal
- T-06-15: All commands validated via argsSchema.safeParse before reaching command.apply
- T-06-16: Seed spec written without user content; resolvedPath normalized
- T-06-17: Ctrl+G checked FIRST in handleInput (RESEARCH Pitfall 1)
- T-06-18: main().catch writes only err.message (T-04-24 pattern)
- T-06-19: graduate() calls paletteHandle.hide() before onGraduate (RESEARCH Pitfall 6)

## Self-Check: PASSED

- src/wizard/root.ts: FOUND
- src/wizard/index.ts: FOUND
- scripts/wizard.ts: FOUND
- Commit c8817dd: FOUND
- Commit 008f01e: FOUND
- npx tsc --noEmit: exits 0
- All 940 tests passing
