---
phase: 06-wizard-graduation
plan: "05"
subsystem: wizard-display-utilities
tags: [wizard, tdd, spec-preview, layout, yaml, horizontal-layout]
dependency_graph:
  requires:
    - 06-01 (SpecSchema with wizard fields, createSeedSpec)
    - 06-03 (pure functions — truncateToWidth via tui-utils, established patterns)
  provides:
    - SpecPreviewPane read-only YAML display pane (D-88, D-90)
    - calcWizardPaneWidths() 50/50 split with D-89 collapse
  affects:
    - 06-06 (WizardRoot imports both — SpecPreviewPane for right pane, calcWizardPaneWidths for layout)
tech_stack:
  added: []
  patterns:
    - Read-only pane with line cache invalidated on update() (mirrors WireframePreviewPane)
    - calcWizardPaneWidths appended to existing horizontal-layout.ts without modifying existing functions
    - Local Component interface declaration (pi-tui peer dep pattern)
    - truncateToWidth with pad=true for loading placeholder; width-2 for YAML lines (border)
key_files:
  created:
    - src/wizard/panes/spec-preview.ts
    - src/wizard/panes/spec-preview.test.ts
    - src/canvas/horizontal-layout.calcWizardPaneWidths.test.ts
  modified:
    - src/canvas/horizontal-layout.ts (calcWizardPaneWidths appended)
key_decisions:
  - "Loading placeholder uses pad=true to fill full width; YAML lines use width-2 for border"
  - "calcWizardPaneWidths appended at end of horizontal-layout.ts — no existing functions modified"
  - "TDD RED/GREEN pairs with per-phase commits per established convention"

patterns-established:
  - "SpecPreviewPane: lineCache cleared on update() and invalidate(); computed lazily on first render() after invalidation"
  - "calcWizardPaneWidths(total < 80) = [total, 0] — collapse; >= 80 = [floor(total/2), total-floor(total/2)]"

requirements-completed:
  - WIZARD-01

duration: 5min
completed: "2026-04-19"
---

# Phase 06 Plan 05: SpecPreviewPane + calcWizardPaneWidths Summary

**SpecPreviewPane (YAML.stringify-based read-only display pane) and calcWizardPaneWidths (50/50 collapse-below-80 layout function) — both display utilities for the wizard right-side pane, 19 new tests, 894 total green.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-19T00:05:00Z
- **Completed:** 2026-04-19T00:09:39Z
- **Tasks:** 2
- **Files modified:** 4 (1 modified, 3 created)

## Accomplishments

- `SpecPreviewPane` implemented: update(snapshot) invalidates cache, render(width) returns YAML.stringify lines truncated to width-2, handleInput is no-op, invalidate() clears cache
- `calcWizardPaneWidths` exported from horizontal-layout.ts: 50/50 split with right pane absorbing Math.floor rounding, collapses to [total, 0] when total < 80 (D-89)
- 19 new tests (12 for SpecPreviewPane + 7 for calcWizardPaneWidths), all green; 894 total, 0 failures

## Task Commits

Each task was committed atomically:

1. **Task 1: SpecPreviewPane — RED** - `042663e` (test)
2. **Task 1: SpecPreviewPane — GREEN** - `04c6ada` (feat)
3. **Task 2: calcWizardPaneWidths — RED** - `748fd3f` (test)
4. **Task 2: calcWizardPaneWidths — GREEN** - `ede477d` (feat)

_Note: TDD tasks have multiple commits (test RED → feat GREEN)_

## Files Created/Modified

- `src/wizard/panes/spec-preview.ts` — SpecPreviewPane implementing Component; YAML.stringify-based read-only pane with line cache
- `src/wizard/panes/spec-preview.test.ts` — 12 tests covering all behavior: loading placeholder, YAML content keys, width-2 truncation, cache hit/miss, handleInput no-op, invalidate
- `src/canvas/horizontal-layout.ts` — `calcWizardPaneWidths` appended (no existing code modified)
- `src/canvas/horizontal-layout.calcWizardPaneWidths.test.ts` — 7 tests covering D-88/D-89 behavior: 50/50 split, collapse below 80, rounding, sum invariant

## Decisions Made

- Loading placeholder uses `truncateToWidth(str, width, "", true)` (pad=true) to fill the full pane width, while YAML content lines use `width-2` for border padding — both correct per plan spec.
- `calcWizardPaneWidths` appended at end of `horizontal-layout.ts` without modifying any existing functions (calcPaneWidths, drawBorderedPane, HorizontalLayout all unchanged).
- Tests placed alongside source files (`src/wizard/panes/spec-preview.test.ts`, `src/canvas/horizontal-layout.calcWizardPaneWidths.test.ts`) following established project convention.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Loading placeholder required pad=true for width-exact output**
- **Found during:** Task 1 GREEN (test failure revealed 12 vs 40 length)
- **Issue:** `truncateToWidth` shim in tui-utils.ts does not pad by default; loading placeholder came back as 12 chars instead of 40
- **Fix:** Changed `truncateToWidth("(loading...)", width)` to `truncateToWidth("(loading...)", width, "", true)` in the `!this.snapshot` branch
- **Files modified:** `src/wizard/panes/spec-preview.ts`
- **Verification:** Test "loading placeholder is padded to the requested width" passed (length === 40)
- **Committed in:** 04c6ada (Task 1 GREEN commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Single-line fix required for correct placeholder padding. No scope creep.

## Issues Encountered

- Biome `npx biome check .` reports errors due to pre-existing nested biome.json files in other worktree directories (`.claude/worktrees/*/biome.json`). This is a pre-existing environment issue unrelated to this plan's changes. Per-file biome checks on all new/modified files pass cleanly.

## Known Stubs

None — both SpecPreviewPane and calcWizardPaneWidths are fully implemented. SpecPreviewPane renders live YAML from the actual snapshot.spec; no hardcoded placeholders in the rendering path.

## Threat Flags

None — SpecPreviewPane is display-only (T-06-12: no sensitive surface, not written to file). handleInput is a no-op (T-06-13). calcWizardPaneWidths is a pure arithmetic function with no I/O.

## Next Phase Readiness

- Plan 06-06 (WizardRoot) can now import both `SpecPreviewPane` from `src/wizard/panes/spec-preview.ts` and `calcWizardPaneWidths` from `src/canvas/horizontal-layout.ts`
- Both utilities are fully tested and correct
- No blockers for 06-06 from this plan

---
*Phase: 06-wizard-graduation*
*Completed: 2026-04-19*
