---
phase: "05-canvas-tui-shell"
plan: "04"
subsystem: "canvas/panes"
tags: ["tui", "property-inspector", "focusable", "in-place-edit", "d-70", "d-71", "d-72"]
dependency_graph:
  requires:
    - "05-01"  # scaffold: root.ts, tui-utils.ts, focus-fsm.ts
    - "05-02"  # chrome utilities: help-line, save-indicator, horizontal-layout
    - "05-03"  # panes: screens-list, wireframe-preview
  provides:
    - "PropertyInspectorPane — fully implemented, Component + Focusable, D-70/D-71/D-72"
  affects:
    - "tests/canvas-render.test.ts"  # 9 new tests added
    - "src/canvas/panes/property-inspector.ts"  # full implementation replacing NYI stub
tech_stack:
  added: []
  patterns:
    - "Inline shim pattern: InlineInput replaces @mariozechner/pi-tui Input for testability"
    - "Focusable interface: focused getter/setter propagates to child InlineInput"
    - "FieldDef registry: declarative field config drives render + edit + commit"
    - "T-05-13 exact segment match: path.split('/').includes(screenId) vs substring"
key_files:
  created: []
  modified:
    - "src/canvas/panes/property-inspector.ts"
    - "tests/canvas-render.test.ts"
decisions:
  - "Use set-screen-title (not rename-screen) for title edits — rename-screen changes the ID, set-screen-title changes display title"
  - "InlineInput shim instead of real @mariozechner/pi-tui Input — pi-tui not installed in devDependencies; Rule 3 deviation, same pattern as screens-list.ts InlineSelectList"
  - "backBehaviorDisplay handles both string and object form of BackBehavior — avoids TS type error from passing the union type directly to string context"
  - "_theme stored as public readonly to satisfy biome noUnusedPrivateClassMembers — theme is passed through for future use"
  - "FieldDef argsBuilder pattern: each field owns its args construction — avoids switch/case dispatch in commitEdit"
metrics:
  duration: "~10 minutes"
  completed: "2026-04-19"
  tasks_completed: 2
  files_modified: 2
---

# Phase 05 Plan 04: PropertyInspectorPane Summary

**One-liner:** Full PropertyInspectorPane with Focusable interface, 5-field D-70 rendering, j/k navigation, in-place Input editing (Enter/Esc), and diagnostic ⚠ markers per D-72.

## What Was Built

`PropertyInspectorPane` is the center pane of the canvas TUI. It displays screen-level metadata in 5 field rows and supports in-place editing via an embedded input widget.

### Field Rows (D-70)

| Row | Field | Editable | Command |
|-----|-------|----------|---------|
| 0 | title | Yes | `set-screen-title` |
| 1 | back_behavior | Yes (non-root only) | `set-back-behavior` |
| 2 | components | No | — |
| 3 | acceptance | Yes | `set-acceptance-prose` |
| 4 | variants | No | — |

### Key Behaviors

- **j/k navigation**: `cursorRow` increments/decrements, clamped to `[0, FIELD_DEFS.length - 1]` (T-05-12)
- **Enter to edit**: Sets `editingField` key, calls `editInput.setValue(currentValue)`, sets `editInput.focused = _focused`
- **Enter while editing**: Calls `commitEdit()` → `store.apply(commandName, args)` → clears `editingField`
- **Esc while editing**: Clears `editingField` without calling `store.apply` (D-71)
- **Read-only guard**: `activateField()` returns early if `FIELD_DEFS[cursorRow].editable === false`
- **Root screen guard**: `activateField()` returns early for `back_behavior` when `screen.back_behavior === undefined`
- **Focusable**: `set focused(v)` sets `_focused = v`; propagates to `editInput.focused` when editing (T-05-15, Pitfall 3)
- **⚠ markers**: Per-field error detection using exact path segment match (T-05-13)
- **Error summary**: `N error(s)` appended as last line when `errorCount > 0` (D-72)

### InlineInput Shim

`@mariozechner/pi-tui` is a peer dependency not installed in devDependencies. To allow vitest to run headlessly, `InlineInput` is implemented inline in the same file — matching the pattern established by `InlineSelectList` in `screens-list.ts` (Rule 3 deviation, already documented in plan 05-03).

The shim supports:
- `setValue(initial)` / `getValue()` — basic value access
- `handleInput(data)` — printable char insertion + backspace
- `render(width)` — returns `[value + "█"]` when focused
- `focused` property — propagated from the Focusable container

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Wrong command name in plan comments**
- **Found during:** Task 1 — reading `src/editor/commands/index.ts`
- **Issue:** Plan's context block said `"rename-screen"` for title edits with args `{ screenId, title }`. Actual `rename-screen` command renames the screen's **ID** (with cascade), not its display title. The correct command is `set-screen-title` with args `{ id, title }`.
- **Fix:** Used `set-screen-title` in FIELD_DEFS. Command args verified against `set-screen-title.ts` (`{ id: ScreenIdSchema, title: z.string().min(1) }`).
- **Files modified:** `src/canvas/panes/property-inspector.ts`

**2. [Rule 2 - Missing type safety] BackBehavior union type required display function**
- **Found during:** Task 1 — `npx tsc --noEmit` error
- **Issue:** `screen.back_behavior` is typed as `"dismiss" | "pop" | "reset-to-root" | { kind: "replace"; screen: ScreenId } | undefined`. The object form cannot be coerced to `string` directly.
- **Fix:** Added `backBehaviorDisplay(screen: Screen): string` helper that handles string literal, object form (JSON.stringify), and undefined (em dash).
- **Files modified:** `src/canvas/panes/property-inspector.ts`

**3. [Rule 2 - Biome] Unused private `theme` field**
- **Found during:** Task 1 — `npx biome check` warning
- **Issue:** `private readonly theme: CanvasTheme` triggered `noUnusedPrivateClassMembers`. Theme is stored for future use (when real pi-tui theming is added for cursor/warning colors).
- **Fix:** Changed to `readonly _theme: CanvasTheme` (public with underscore prefix convention) to suppress the lint rule while retaining the field for future use.
- **Files modified:** `src/canvas/panes/property-inspector.ts`

**4. [Rule 1 - Formatting] Biome format violations**
- **Found during:** Task 1 — `npx biome check` errors
- **Issue:** Multi-line string concatenations and ternary expressions that biome wanted reformatted.
- **Fix:** Reformatted to single-line forms per biome's output.
- **Files modified:** `src/canvas/panes/property-inspector.ts`

## TDD Gate Compliance

| Gate | Commit | Status |
|------|--------|--------|
| RED (test) | `848a2ca` | PASSED — 9 tests failing before implementation |
| GREEN (feat) | `4769303` | PASSED — all 9 tests passing after implementation |
| REFACTOR | N/A | No refactor needed |

## Test Coverage Added

9 new tests in `tests/canvas-render.test.ts`:

**Rendering (D-70):**
- `render(40) with a screen contains 'title:' in output`
- `render(40) with a screen contains 'components:' in output`
- `render(40) with error diagnostic shows ⚠ marker`
- `all render(40) lines have visibleWidth <= 40`
- `render(40) with no active screen returns '(no screen selected)' line`

**Edit flow (D-71):**
- `Enter on title field activates Input in edit mode`
- `Enter while editing commits store.apply with correct command`
- `Esc while editing cancels without store.apply`
- `Read-only field (components count) does not activate on Enter`

## Self-Check: PASSED

- `src/canvas/panes/property-inspector.ts` — exists, 388 lines
- `tests/canvas-render.test.ts` — 9 new tests added (46 passing total in file)
- Commits exist: `848a2ca` (RED), `4769303` (GREEN)
- `npx vitest run tests/canvas-render.test.ts tests/canvas-chrome.test.ts` — 49 passed, 6 todo
- `npx tsc --noEmit` — clean (0 errors)
- `npx biome check src/canvas/panes/property-inspector.ts` — clean (0 errors, 0 warnings)
