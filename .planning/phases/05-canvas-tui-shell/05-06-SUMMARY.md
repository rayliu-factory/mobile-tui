---
phase: 05-canvas-tui-shell
plan: "06"
subsystem: ui
tags: [pi-tui, component, canvas, tui, focus-fsm, store-subscription, cli]

# Dependency graph
requires:
  - phase: 05-02
    provides: focus-fsm, help-line, save-indicator, horizontal-layout, calcPaneWidths
  - phase: 05-03
    provides: ScreensListPane, WireframePreviewPane
  - phase: 05-04
    provides: PropertyInspectorPane
  - phase: 05-05
    provides: CommandPalette
provides:
  - RootCanvas: fully wired Component connecting all 3 panes, store subscription, focus FSM, palette overlay
  - scripts/canvas.ts: headless CLI entry (parseSpecFile → createStore → RootCanvas.render verification)
  - canvas-integration test: round-trip open fixture → headless render → flush → re-parse
  - CANVAS-01..CANVAS-06 requirements all GREEN via 4 test files
affects: [05-07, 05-08, 05-09, phase-09-pi-extension-wiring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "RootCanvas as pi-tui Component: render(width) → string[], handleInput(data), invalidate()"
    - "Global key interception before pane dispatch (D-78 order: redo, undo, quit, palette, tab, shift-tab)"
    - "store.subscribe pattern for snapshot propagation to all child panes"
    - "Headless CLI stub: render(80) once, flush, exit 0 — pi ctx.ui.custom() deferred to Phase 9"
    - "Phase 5 TuiAPI structural type alias avoids @mariozechner/pi-coding-agent import in stub phase"

key-files:
  created:
    - src/canvas/root.ts
    - scripts/canvas.ts
    - tests/canvas-integration.test.ts
  modified:
    - tests/canvas-focus.test.ts
    - tests/canvas-render.test.ts
    - tests/canvas-chrome.test.ts
    - package.json

key-decisions:
  - "TuiAPI typed as structural alias in Phase 5 to avoid import coupling with pi host runtime; Phase 9 replaces with real type"
  - "scripts/canvas.ts Phase 5 headless mode: render(80) once + flush + exit 0; TODO comment marks Phase 9 replacement point"
  - "openPalette() always creates new CommandPalette() per call (Pitfall 5 guard — stale SelectList state)"
  - "focusedIndex derived from FocusState enum passed to layout.render() so HorizontalLayout applies D-79 accent/muted borders"

patterns-established:
  - "RootCanvas: global key guards always execute before delegating to focused pane (D-78 priority order)"
  - "Headless CLI entry: parse → createStore → new Component(store, { theme: mockTheme }) → render(N) → flush → exit"

requirements-completed: [CANVAS-01, CANVAS-02, CANVAS-03, CANVAS-04, CANVAS-05, CANVAS-06]

# Metrics
duration: 90min
completed: 2026-04-19
---

# Phase 05 Plan 06: Canvas TUI Shell Integration Summary

**RootCanvas fully wired to all 3 panes with store subscription, focus FSM, global keybindings, and palette overlay; scripts/canvas.ts headless CLI entry exits 0 against real fixture; all CANVAS-01..06 requirements GREEN across 4 test files**

## Performance

- **Duration:** ~90 min
- **Started:** 2026-04-19
- **Completed:** 2026-04-19
- **Tasks:** 2 auto tasks + 1 human-verify checkpoint (approved)
- **Files modified:** 7

## Accomplishments
- RootCanvas implements the full Component interface: 3-pane layout with HorizontalLayout, accent/muted focus borders (D-79), header + save indicator + help line chrome
- Global key dispatch in D-78 priority order: Ctrl+Y/Ctrl+Shift+Z redo, Ctrl+Z undo, Ctrl+Q quit, : / Ctrl+P palette, Tab/Shift-Tab focus cycle, then pane delegate
- store.subscribe wires snapshot propagation to all child panes on every state change; `activeScreenId` auto-selects first screen when deleted (T-05-10 mitigation)
- scripts/canvas.ts headless CLI entry: exits 2 on no arg, exits 1 on parse failure, exits 0 on successful headless verify + flush
- All 4 canvas test files GREEN: canvas-focus, canvas-render, canvas-chrome (CANVAS-06), canvas-integration

## Task Commits

Each task was committed atomically:

1. **Task 1: RootCanvas full assembly (RED + GREEN)** - `22d06d6` (test) + `f88c462` (feat)
2. **Task 2: scripts/canvas.ts CLI entry + integration tests** - `ce410f1` (feat)

## Files Created/Modified
- `src/canvas/root.ts` — RootCanvas: wires all panes, store subscription, focus FSM, global keys, header/body/footer render
- `scripts/canvas.ts` — Headless CLI entry; Phase 9 replaces body with ctx.ui.custom(rootCanvas)
- `tests/canvas-focus.test.ts` — Focus cycle, Shift-Tab reverse, global key routing, palette open tests (unskipped)
- `tests/canvas-render.test.ts` — Header, save indicator, help line, D-79 accent/muted border tests (unskipped)
- `tests/canvas-chrome.test.ts` — CANVAS-06 no alt-buffer escape sequences gate (GREEN)
- `tests/canvas-integration.test.ts` — Round-trip: open fixture → headless render → flush → re-parse
- `package.json` — Added `"canvas": "npx tsx scripts/canvas.ts"` script entry

## Decisions Made
- TuiAPI typed as a structural alias (`{ showOverlay(...): { hide(): void }; requestRender(): void }`) in Phase 5 to avoid import coupling with the pi host runtime — Phase 9 wires the real type when `ctx.ui.custom()` is introduced
- scripts/canvas.ts Phase 5 headless mode renders once and flushes rather than mounting a terminal; a `// TODO Phase 9` comment marks the replacement point
- `openPalette()` always constructs a fresh `new CommandPalette()` per call (Pitfall 5 guard against stale SelectList state from reuse)
- `focusedIndex` is derived from `FocusState` and passed to `layout.render()` so HorizontalLayout applies accent color to focused pane border and muted color to others (D-79)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None - all acceptance criteria met on first attempt per the human-verify checkpoint approval.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All CANVAS-01..06 requirements verified GREEN; canvas TUI shell is complete and testable in headless mode
- Phase 9 pi extension wiring will replace the headless stub in scripts/canvas.ts with `ctx.ui.custom(rootCanvas)`; the RootCanvas constructor signature (`store, { tui, theme }`) is already the correct shape for that transition
- No blockers

---
*Phase: 05-canvas-tui-shell*
*Completed: 2026-04-19*
