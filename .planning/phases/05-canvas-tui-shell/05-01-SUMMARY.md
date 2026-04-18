---
phase: 05-canvas-tui-shell
plan: "01"
subsystem: canvas
tags: [scaffold, nyquist, wave-0, tdd, stubs]
dependency_graph:
  requires:
    - "src/editor/types.ts (Store, Snapshot, StoreState)"
    - "src/editor/index.ts (createStore, barrel)"
    - "src/serialize/index.ts (parseSpecFile)"
    - "src/emit/wireframe/index.ts (renderSingleVariant)"
  provides:
    - "src/canvas/focus-fsm.ts (FocusState, FOCUS_CYCLE, nextFocus stub)"
    - "src/canvas/help-line.ts (renderHelpLine stub)"
    - "src/canvas/save-indicator.ts (renderSaveIndicator stub)"
    - "src/canvas/horizontal-layout.ts (HorizontalLayout stub, calcPaneWidths stub)"
    - "src/canvas/panes/screens-list.ts (ScreensListPane stub)"
    - "src/canvas/panes/property-inspector.ts (PropertyInspectorPane stub)"
    - "src/canvas/panes/wireframe-preview.ts (WireframePreviewPane stub)"
    - "src/canvas/palette/index.ts (CommandPalette stub)"
    - "src/canvas/root.ts (RootCanvas stub with getFocus() test hook)"
  affects:
    - "tests/canvas-focus.test.ts (CANVAS-01, CANVAS-02)"
    - "tests/canvas-render.test.ts (CANVAS-01, CANVAS-03, CANVAS-04)"
    - "tests/canvas-chrome.test.ts (CANVAS-06)"
    - "tests/canvas-integration.test.ts (CANVAS-05)"
tech_stack:
  added: []
  patterns:
    - "Wave 0 Nyquist scaffold: 9 source stubs + 4 test files"
    - "Local Component/Focusable type alias (no pi-tui import at stub stage)"
    - "it.todo() for NYI test bodies (T-05-03 mitigation)"
    - "makeStubStore() + mockTheme + minimalSpec() shared test helpers"
    - "minimalSpec cast via 'as unknown as Spec' to avoid full Zod construction"
key_files:
  created:
    - src/canvas/focus-fsm.ts
    - src/canvas/help-line.ts
    - src/canvas/save-indicator.ts
    - src/canvas/horizontal-layout.ts
    - src/canvas/panes/screens-list.ts
    - src/canvas/panes/property-inspector.ts
    - src/canvas/panes/wireframe-preview.ts
    - src/canvas/palette/index.ts
    - src/canvas/root.ts
    - tests/canvas-focus.test.ts
    - tests/canvas-render.test.ts
    - tests/canvas-chrome.test.ts
    - tests/canvas-integration.test.ts
  modified: []
decisions:
  - "D-stub-01: Component and Focusable interfaces declared locally in each stub file (not imported from pi-tui) so stubs compile without the runtime dependency. Resolved at implementation time in plans 02-05."
  - "D-stub-02: minimalSpec() uses 'as unknown as Spec' cast to avoid constructing a full Zod-validated Spec in test helpers — acceptable at scaffold stage, replaced with real fixture data when tests go GREEN."
  - "D-stub-03: RootCanvas.render() returns ['NYI'] (not []) so chrome tests can assert on a non-empty string with zero escape codes — green from day 1."
metrics:
  duration: "~2 minutes"
  completed: "2026-04-19"
  tasks_completed: 2
  tasks_total: 2
  files_created: 13
  files_modified: 0
---

# Phase 5 Plan 01: Canvas TUI Shell Wave 0 Scaffold Summary

**One-liner:** Wave 0 Nyquist scaffold — 9 typed canvas component stubs + 4 test files establishing the full file surface and test structure for the canvas TUI shell.

## What Was Built

Created the complete `src/canvas/` directory tree with 9 component stubs and 4 test files covering all 6 CANVAS requirements (CANVAS-01 through CANVAS-06). Every subsequent plan implements against these stubs; tests are in structured RED state (it.todo) and will go GREEN as implementation lands in plans 02-05.

### Source Stubs (9 files)

| File | Exports | Status |
|------|---------|--------|
| `src/canvas/focus-fsm.ts` | `FocusState`, `FOCUS_CYCLE`, `nextFocus` | Stub: nextFocus throws NYI |
| `src/canvas/help-line.ts` | `renderHelpLine` | Stub: returns "" |
| `src/canvas/save-indicator.ts` | `renderSaveIndicator` | Stub: returns "" |
| `src/canvas/horizontal-layout.ts` | `HorizontalLayout`, `calcPaneWidths`, `PaneSpec` | Stub: render returns [], calcPaneWidths throws NYI |
| `src/canvas/panes/screens-list.ts` | `ScreensListPane` | Stub: render returns [] |
| `src/canvas/panes/property-inspector.ts` | `PropertyInspectorPane` | Stub: render returns [], implements Focusable |
| `src/canvas/panes/wireframe-preview.ts` | `WireframePreviewPane` | Stub: render returns [], has update() method |
| `src/canvas/palette/index.ts` | `CommandPalette` | Stub: render returns [] |
| `src/canvas/root.ts` | `RootCanvas` | Stub: render returns ["NYI"], getFocus() test hook |

### Test Files (4 files)

| File | Requirements | Live Tests | Todo Tests |
|------|-------------|-----------|-----------|
| `tests/canvas-focus.test.ts` | CANVAS-01, CANVAS-02 | 1 | 6 |
| `tests/canvas-render.test.ts` | CANVAS-01, CANVAS-03, CANVAS-04 | 1 | 6 |
| `tests/canvas-chrome.test.ts` | CANVAS-06 | 3 (GREEN) | 0 |
| `tests/canvas-integration.test.ts` | CANVAS-05 | 2 | 3 |

## Verification Results

```
npx tsc --noEmit          — exit 0 (clean)
npx vitest run tests/canvas-chrome.test.ts — 3/3 passed (GREEN)
npx vitest run tests/canvas-*.test.ts      — 7 passed, 15 todo
npx vitest run (full suite)                — 100 files passed, 0 regressions
```

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | `038056a` | feat(05-01): create src/canvas/ directory tree with typed component stubs |
| Task 2 | `20fe4aa` | test(05-01): create four canvas test files with RED placeholder tests |

## Deviations from Plan

None — plan executed exactly as written.

The plan's scope note (13 files exceeding the 2-5 file per-plan guideline) was pre-accepted as a Wave 0 scaffold exception. All 13 files are mechanical stubs with zero implementation logic, consistent with the established Wave 0 pattern from Phases 1-4.

## Known Stubs

All 9 source files are intentional stubs. Implementation lands in:
- `nextFocus` + `handleInput` routing → Plan 02 (focus FSM + keyboard dispatch)
- `renderHelpLine` + `renderSaveIndicator` → Plan 02 (chrome rendering)
- `calcPaneWidths` + `HorizontalLayout.render` → Plan 03 (layout compositor)
- `ScreensListPane` + `PropertyInspectorPane` → Plan 03 (pane implementations)
- `WireframePreviewPane` → Plan 04 (wireframe preview)
- `CommandPalette` → Plan 05 (command palette)

Stubs do NOT prevent the plan's goal (Nyquist compliance) from being achieved — the goal is the file surface and test structure, not implementation.

## Threat Flags

None — all files are internal TypeScript stubs with no new network endpoints, auth paths, or trust boundary surface.

## Self-Check: PASSED

Files verified:
- FOUND: src/canvas/focus-fsm.ts
- FOUND: src/canvas/help-line.ts
- FOUND: src/canvas/save-indicator.ts
- FOUND: src/canvas/horizontal-layout.ts
- FOUND: src/canvas/panes/screens-list.ts
- FOUND: src/canvas/panes/property-inspector.ts
- FOUND: src/canvas/panes/wireframe-preview.ts
- FOUND: src/canvas/palette/index.ts
- FOUND: src/canvas/root.ts
- FOUND: tests/canvas-focus.test.ts
- FOUND: tests/canvas-render.test.ts
- FOUND: tests/canvas-chrome.test.ts
- FOUND: tests/canvas-integration.test.ts

Commits verified:
- FOUND: 038056a (feat(05-01): canvas source stubs)
- FOUND: 20fe4aa (test(05-01): canvas test files)
