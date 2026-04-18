---
phase: 05-canvas-tui-shell
verified: 2026-04-19T10:55:00Z
status: human_needed
score: 6/6 must-haves verified
overrides_applied: 0
deferred:
  - truth: "canvas.ts CLI entry mounts canvas via ctx.ui.custom() for real TUI interaction"
    addressed_in: "Phase 9"
    evidence: "Phase 9 goal: '/spec command ... ctx.ui.custom() wiring'; plans/05-06-PLAN.md explicitly documents 'TODO Phase 9: replace with ctx.ui.custom(rootCanvas)'"
human_verification:
  - test: "Run npm run canvas -- fixtures/habit-tracker.spec.md and interact with the TUI"
    expected: "3-pane layout renders: screens list on left, property inspector center, wireframe preview right. Tab cycles focus. : opens palette. Ctrl+Z undoes."
    why_human: "Phase 5 canvas.ts operates in headless-verify mode (renders once, exits 0). Real TUI mounting deferred to Phase 9. Visual pane layout, focus border colors, and keyboard UX cannot be verified without a live pi runtime."
  - test: "Verify D-79 accent/muted border colors visually distinguish focused vs unfocused panes"
    expected: "Focused pane border uses accent color (distinct from other panes). Unfocused panes use muted color."
    why_human: "Tests verify that the drawBorderedPane function passes accent/muted tokens correctly, but visual rendering in a real terminal with a real theme requires human inspection."
  - test: "Open canvas against a real spec file, navigate to a screen, edit title via Enter, and verify the write shows on disk"
    expected: "Edit committed via store.apply, debounced write goes through, spec file on disk shows new title after quit."
    why_human: "CANVAS-05 integration test (canvas-integration.test.ts) covers the headless render+flush path. The real edit flow (Enter activates Input, user types, Enter commits) requires interactive keyboard input in a real terminal."
---

# Phase 5: Canvas TUI Shell Verification Report

**Phase Goal:** Deliver a working canvas TUI shell — a pi.dev Component that mounts fullscreen, renders 3 panes (screens list, property inspector, wireframe preview), provides a command palette, and round-trips spec edits to disk. All CANVAS-01..CANVAS-06 requirements verified.
**Verified:** 2026-04-19T10:55:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Tab cycles focus through 3 panes deterministically | ✓ VERIFIED | `canvas-focus.test.ts` — 3 passing tests: Tab cycles screens→inspector→preview→screens; Shift-Tab reverses; `nextFocus` pure function 9 tests GREEN |
| 2 | Command palette reachable via `:` and `Ctrl+P`, lists all COMMANDS | ✓ VERIFIED | `canvas-focus.test.ts` — palette-open tests GREEN for both keys; CommandPalette filter tests confirm COMMANDS listed; `COMMANDS` imported from editor registry |
| 3 | Help line shows context-sensitive keybindings for current focus state | ✓ VERIFIED | `canvas-render.test.ts` — 9 tests for renderHelpLine verify exact D-84 strings per focus state; root render tests confirm help line in output |
| 4 | Save indicator shows ● (dirty) or ✓ (clean) from snapshot.dirty | ✓ VERIFIED | `canvas-render.test.ts` — 4 renderSaveIndicator tests GREEN; 2 root render tests confirm dirty/clean indicators in render output |
| 5 | Canvas useful standalone against existing spec file (not wizard-gated) | ✓ VERIFIED | `canvas-integration.test.ts` — 5 tests GREEN: parseSpecFile→createStore→RootCanvas→render(80)→flush all pass; `npx tsx scripts/canvas.ts fixtures/habit-tracker.spec.md` exits 0 |
| 6 | Canvas renders only in granted region — no raw alt-buffer escape sequences | ✓ VERIFIED | `canvas-chrome.test.ts` — 3 tests GREEN at widths 40/80/120; no `\x1b[?1049h`, `\x1b[2J`, `\x1b[?` patterns in render output |

**Score:** 6/6 truths verified

### Deferred Items

Items not yet met but explicitly addressed in later milestone phases.

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | Full TUI mounting via `ctx.ui.custom()` for live interactive canvas | Phase 9 | Phase 9 goal: "pi.dev Integration & Packaging — `/spec` command, ctx.ui.custom() wiring"; 05-06-PLAN.md: "TODO Phase 9: replace with ctx.ui.custom(rootCanvas)" |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|---------|--------|---------|
| `src/canvas/focus-fsm.ts` | FocusState type + nextFocus pure function | ✓ VERIFIED | Exists, substantive (37 lines), imported by root.ts |
| `src/canvas/help-line.ts` | renderHelpLine pure function | ✓ VERIFIED | Exists, substantive, imported by root.ts |
| `src/canvas/save-indicator.ts` | renderSaveIndicator with theme tokens | ✓ VERIFIED | Exists, substantive, imported by root.ts |
| `src/canvas/horizontal-layout.ts` | HorizontalLayout + calcPaneWidths + drawBorderedPane | ✓ VERIFIED | Exists, substantive, all 3 exports imported by root.ts |
| `src/canvas/tui-utils.ts` | truncateToWidth/visibleWidth shims | ✓ VERIFIED | Exists (created in 05-02 to handle pi-tui peer-dep absence), used throughout |
| `src/canvas/panes/screens-list.ts` | ScreensListPane Component | ✓ VERIFIED | Exists, substantive, imported by root.ts, uses onSelectionChange for D-80 |
| `src/canvas/panes/property-inspector.ts` | PropertyInspectorPane Component + Focusable | ✓ VERIFIED | Exists, substantive, imported by root.ts |
| `src/canvas/panes/wireframe-preview.ts` | WireframePreviewPane read-only renderer | ✓ VERIFIED | Exists, substantive, calls renderSingleVariant from Phase 3 |
| `src/canvas/palette/index.ts` | CommandPalette filter + arg-prompt FSM | ✓ VERIFIED | Exists, 435 lines, imports COMMANDS, implements PalettePhase FSM |
| `src/canvas/root.ts` | RootCanvas Component wiring all panes | ✓ VERIFIED | Exists, 356 lines, wires all 3 panes + focus FSM + store subscription + palette |
| `scripts/canvas.ts` | CLI entry: parseSpecFile → createStore → RootCanvas | ✓ VERIFIED | Exists, 72 lines, all three imports present, headless mode documented for Phase 9 replacement |
| `tests/canvas-focus.test.ts` | Focus FSM + palette tests | ✓ VERIFIED | Exists, 27 passing tests covering CANVAS-01, CANVAS-02 |
| `tests/canvas-render.test.ts` | Render output tests | ✓ VERIFIED | Exists, 54 passing tests covering CANVAS-01, CANVAS-03, CANVAS-04 |
| `tests/canvas-chrome.test.ts` | CANVAS-06 hygiene gate | ✓ VERIFIED | Exists, 3 passing tests, all GREEN |
| `tests/canvas-integration.test.ts` | Integration smoke tests | ✓ VERIFIED | Exists, 5 passing tests covering CANVAS-05 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/canvas/root.ts` | `src/canvas/focus-fsm.ts` | `import { nextFocus }` | ✓ WIRED | Lines 8-9: imports FocusState + nextFocus; used in handleInput lines 253, 259 |
| `src/canvas/root.ts` | `src/canvas/horizontal-layout.ts` | `import { HorizontalLayout, calcPaneWidths }` | ✓ WIRED | Line 10: imports both; HorizontalLayout at line 79, calcPaneWidths at line 293 |
| `src/canvas/root.ts` | `src/canvas/palette/index.ts` | `import { CommandPalette }` | ✓ WIRED | Line 11: import; `new CommandPalette(...)` at line 182 (fresh instance on each open) |
| `src/canvas/root.ts` | `src/editor/types.ts` | `store.subscribe(snap => ...)` | ✓ WIRED | Line 124: subscription wired; triggers onSnapshot → propagates to all panes |
| `scripts/canvas.ts` | `src/canvas/root.ts` | `import { RootCanvas }` | ✓ WIRED | Line 19: import; `new RootCanvas(store, { theme: mockTheme })` at line 52 |
| `src/canvas/panes/wireframe-preview.ts` | `src/emit/wireframe/index.ts` | `import { renderSingleVariant }` | ✓ WIRED | Line 20: import; called in render() at line 120 with "content" variant (D-73) |
| `src/canvas/panes/screens-list.ts` | `@mariozechner/pi-tui` SelectList | inline shim | ✓ WIRED | Uses inline ScreensListPane with onSelectionChange pattern; peer dep not installed, shim used |
| `src/canvas/palette/index.ts` | `src/editor/commands/index.ts` | `import { COMMANDS }` | ✓ WIRED | Line 19: import; used in constructor to build sortedCommands list |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|-------------|--------|---------------------|--------|
| `WireframePreviewPane` | `this.snapshot.spec` + `this.activeScreenId` | `update(snapshot, screenId)` called from root.ts `selectScreen()` and `onSnapshot()` | Yes — calls `renderSingleVariant(spec, screenId, "content")` from Phase 3 renderer against real spec data | ✓ FLOWING |
| `ScreensListPane` | `snapshot.spec.screens` | `update(snapshot)` called from root.ts `onSnapshot()` | Yes — items built from `snapshot.spec.screens` with real screen titles and diagnostic markers | ✓ FLOWING |
| `PropertyInspectorPane` | `snapshot.spec.screens` + `getActiveScreenId()` | `update(snapshot)` from root.ts; `getActiveScreenId` closure returns `this.activeScreenId` | Yes — reads Screen fields from spec via store subscription chain | ✓ FLOWING |
| `RootCanvas` header | `snapshot.dirty` | `store.subscribe(snap => this.onSnapshot(snap))` | Yes — store emits real dirty flag on every apply/flush | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All 84 canvas tests pass | `npx vitest run tests/canvas-*.test.ts` | 4 files, 84 tests, 0 failures | ✓ PASS |
| Full suite regression-clean | `npx vitest run` | 100 files, 838 tests, 0 failures | ✓ PASS |
| CLI exits 0 for valid spec | `npx tsx scripts/canvas.ts fixtures/habit-tracker.spec.md` | exit 0 | ✓ PASS |
| CLI exits 2 for no arg | `npx tsx scripts/canvas.ts` | exit 2, usage message | ✓ PASS |
| CLI exits 1 for missing file | `npx tsx scripts/canvas.ts nonexistent.spec.md` | exit 1, ENOENT error | ✓ PASS |
| TypeScript type check | `npx tsc --noEmit` | exit 0 | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| CANVAS-01 | 05-01..05-06 | 3-pane layout with explicit focus FSM, keyboard-only navigation | ✓ SATISFIED | `nextFocus` pure function tested 9 ways; RootCanvas Tab/Shift-Tab cycle 3 tests; calcPaneWidths 11 tests; HorizontalLayout compositor; drawBorderedPane D-79 borders 4 tests |
| CANVAS-02 | 05-05..05-06 | Command palette via `:` or `Ctrl+P`, lists all commands | ✓ SATISFIED | CommandPalette imports COMMANDS, filter mode, arg-prompt FSM; 6 palette tests GREEN; palette opens from root on `:` and Ctrl+P keys |
| CANVAS-03 | 05-02..05-06 | Persistent help line showing current context keybindings | ✓ SATISFIED | renderHelpLine 9 tests verify exact D-84 strings per focus state; root render includes help line as footer |
| CANVAS-04 | 05-02..05-06 | Save indicator ● dirty → ✓ clean | ✓ SATISFIED | renderSaveIndicator 4 tests; root render dirty/clean tests GREEN; indicator appears in buildHeader() from snapshot.dirty |
| CANVAS-05 | 05-03..05-06 | Canvas useful standalone against existing spec file | ✓ SATISFIED | 5 integration tests: parseSpecFile→createStore→RootCanvas→render→flush; `scripts/canvas.ts` CLI exits 0 against 3 fixtures |
| CANVAS-06 | 05-01..05-06 | No raw alt-buffer escape sequences, renders in granted region only | ✓ SATISFIED | 3 chrome tests at widths 40/80/120 GREEN; all canvas modules use truncateToWidth, no process.stdout.write in src/canvas/ |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `scripts/canvas.ts` | 49 | Phase 5 headless mode: renders once, flushes, exits; no live TUI | ℹ Info | Intentional design decision documented in plan and SUMMARY; Phase 9 replaces with `ctx.ui.custom(rootCanvas)` |

No blockers. No stub anti-patterns in the main canvas source tree. The `tui-utils.ts` shim for `truncateToWidth`/`visibleWidth` is a deliberate workaround for `@mariozechner/pi-tui` being a peer dependency not installed in devDependencies — documented in 05-02-SUMMARY.md. Inline shims also appear in `palette/index.ts` and `panes/wireframe-preview.ts` for the same reason.

### Human Verification Required

#### 1. Live TUI Canvas Mount

**Test:** Run `npm run canvas -- fixtures/habit-tracker.spec.md` (once Phase 9 wires `ctx.ui.custom()`) or open the pi.dev extension and run `/spec` against a spec file. Interact with the 3-pane layout.
**Expected:** Screens list renders on left, property inspector in center, wireframe preview on right. Tab key cycles through panes with visible accent border highlight. `:` key opens command palette overlay with filterable list of all Phase 4 commands.
**Why human:** `scripts/canvas.ts` Phase 5 operates in headless-verify mode by design (renders once, exits). The actual TUI mount (`ctx.ui.custom()`) is deferred to Phase 9. Automated tests verify all component contracts in isolation — visual layout correctness requires a real terminal session.

#### 2. D-79 Focus Border Visual Inspection

**Test:** In live TUI mode (Phase 9), Tab through the 3 panes and observe border colors.
**Expected:** Focused pane renders `┌─...┐` / `└─...┘` borders in accent color (theme-dependent). Other panes render the same border in muted color. Tab key changes which pane has the accent border.
**Why human:** Tests verify that `drawBorderedPane` passes `theme.fg("accent", ...)` vs `theme.fg("muted", ...)` correctly (4 tests GREEN). The mockTheme in tests returns bare strings, so visual color distinction requires a real theme in a live terminal.

#### 3. End-to-End Edit Round-Trip

**Test:** Open canvas against `fixtures/habit-tracker.spec.md` in live mode. Navigate to a screen (j/k). Tab to inspector. Press Enter on title field. Type a new title. Press Enter to commit. Press Ctrl+Q to quit. Re-open canvas and verify the new title persists.
**Expected:** Edit committed via `store.apply("rename-screen", ...)`, debounced write-through saves to disk, spec file shows updated title on re-parse.
**Why human:** The headless integration test (`canvas-integration.test.ts`) covers the mechanical path (parseSpecFile → createStore → render → flush → re-parse). The interactive flow (Enter activates Input, user types in Input, Enter commits) requires interactive keyboard in a live pi terminal.

### Gaps Summary

No gaps. All 6 CANVAS requirements are satisfied with passing tests.

The only deviation from the literal phase goal language is that `scripts/canvas.ts` mounts the canvas in headless-verify mode rather than as a live TUI mount — this is an explicitly accepted design decision per the 05-06 plan ("Phase 5 note: canvas.ts operates in headless mode ... Phase 9 replaces the headless block with: ctx.ui.custom(rootCanvas)"). The deferred item is tracked above and mapped to Phase 9 in the roadmap.

---

_Verified: 2026-04-19T10:55:00Z_
_Verifier: Claude (gsd-verifier)_
