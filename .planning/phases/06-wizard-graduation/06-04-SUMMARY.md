---
phase: 06-wizard-graduation
plan: "04"
subsystem: wizard-form-pane
tags: [wizard, tdd, form-pane, screens-step, data-step, step-navigation]
dependency_graph:
  requires:
    - 06-01 (SpecSchema with wizard fields, set-wizard-screens command)
    - 06-03 (STEP_DEFINITIONS, StepAction, renderStepIndicator, MinimalTheme)
  provides:
    - ScreensStep stateful list component (step 3 — add-one-by-one, min-1 required)
    - DataStep stateful list component (step 5 — add-one-by-one, no min-1)
    - FormPane orchestrator (Tab/Esc navigation, step indicator, sub-component delegation)
  affects:
    - 06-05 (SpecPreviewPane imports Store pattern, same store subscription)
    - 06-06 (WizardRoot instantiates FormPane, calls setStep, passes callbacks)
tech_stack:
  added: []
  patterns:
    - StepAction discriminated union (consumed/advance/passthrough) for Pitfall 5 mitigation
    - Stateful sub-component with loadFrom() for D-98 re-entry pre-population
    - MinimalTheme interface injected into sub-components (headless testable)
    - store.apply skipped for step 5 (data): wizard is name-only, fields defined in canvas
    - tryAdvance() async: non-empty validation before store.apply (T-06-09 mitigation)
key_files:
  created:
    - src/wizard/steps/screens.ts
    - src/wizard/steps/data.ts
    - src/wizard/panes/form-pane.ts
    - tests/wizard-step-components.test.ts
    - tests/wizard-form-pane.test.ts
  modified: []
decisions:
  - "Step 5 (data) skips store.apply in tryAdvance: add-entity requires fields (min 1), but wizard is name-only per CONTEXT.md D-94; entity creation with field definitions deferred to canvas mode"
  - "DataStep.handleInput(Tab) always returns advance args even for empty list (no min-1 unlike ScreensStep)"
  - "FormPane.render() includes 2-row step indicator as first 2 lines via renderStepIndicator() (D-91)"
  - "ScreensStep error text is exact copy from plan: 'At least one screen is required.' (D-94)"
metrics:
  duration: "6m 18s"
  completed: "2026-04-19"
  tasks_completed: 2
  tasks_total: 2
  files_created: 5
  files_modified: 0
  tests_before: 875
  tests_after: 904
---

# Phase 06 Plan 04: FormPane + ScreensStep + DataStep Summary

One-liner: FormPane orchestrates all 8 wizard steps via Tab/Esc navigation with step indicator at top; ScreensStep and DataStep provide stateful add-one-by-one list UX resolving Pitfall 5 — 904 tests green (29 new).

## What Was Built

### Task 1: ScreensStep + DataStep Stateful Step Components

**`src/wizard/steps/screens.ts`**

`ScreensStep` implements the add-one-by-one interaction for wizard step 3 (Screens):
- `handleInput("\r")`: appends trimmed inputValue to items list, clears input, returns `{ kind: "consumed" }`. Empty Enter is a no-op.
- `handleInput("\t")`: if items list is empty, sets `error = "At least one screen is required."` and returns `{ kind: "consumed" }` (D-94). With 1+ items, returns `{ kind: "advance", args: items }`.
- `handleInput("\x7f")`: Backspace on empty input removes last item from list. On non-empty input, removes last char.
- `handleInput(printable)`: appends char to inputValue, returns `{ kind: "consumed" }`.
- `loadFrom(screenNames)`: pre-populates items list for D-98 re-entry.
- `getItems()`: returns a copy of the items array.
- `render(width)`: `> input` line (or placeholder), then each item on its own line, then optional error line — all truncated to width.

**`src/wizard/steps/data.ts`**

`DataStep` mirrors ScreensStep exactly except:
- No min-1 validation — `handleInput("\t")` always returns `{ kind: "advance", args: items }`, even for empty list. This matches the plan spec: data entities are optional in the wizard.
- Input placeholder: `"Entity name..."` vs `"Screen name..."`.
- Method name: `loadFrom(entityNames)`.

Both classes inject `MinimalTheme` (same interface exported by `step-indicator.ts`) for headless testability.

### Task 2: FormPane Orchestrator Component

**`src/wizard/panes/form-pane.ts`**

`FormPane` orchestrates all 8 wizard step forms:

**Constructor:** `(store, theme, onAdvance, onRetreat)` — constructs one `ScreensStep` and one `DataStep` instance (reused across step visits).

**`setStep(stepIndex, spec)`:**
- Clears error, sets stepIndex.
- Step 3: calls `screensStep.loadFrom(spec.screens.filter(s => s.id !== "placeholder").map(s => s.title))` (D-98).
- Step 5: calls `dataStep.loadFrom(spec.data.entities.map(e => e.name))`.
- Other steps: sets `inputValue = STEP_DEFINITIONS[stepIndex].getPrePopulate(spec)` (D-97).
- Recomputes `answeredMask[8]` from `STEP_DEFINITIONS[i].isAnswered(spec)` for step indicator.

**`handleInput(data)`:**
- `\x1b` (Esc): if stepIndex > 0, calls `onRetreat(stepIndex)`; no-op on step 0 (D-95).
- `\t` (Tab): calls `tryAdvance()` (async, void-cast).
- stepIndex 3: delegates to `screensStep.handleInput(data)`.
- stepIndex 5: delegates to `dataStep.handleInput(data)`.
- Other steps: accumulates printable chars in `inputValue`; backspace removes last char.

**`tryAdvance()` (private async):**
- Step 3: calls `screensStep.handleInput("\t")`. If `advance`: calls `store.apply("set-wizard-screens", { names: args })`, then `onAdvance(stepIndex, null)`. If `consumed` (empty list error): returns (ScreensStep handles its own error display).
- Step 5: calls `dataStep.handleInput("\t")`. Always `advance`: calls `onAdvance(stepIndex, null)` directly (no store.apply — see Deviations).
- Steps 0,1,2,4,6,7: validates non-empty inputValue (T-06-09), calls `store.apply(def.commandName, { value })`. Step 7 (platforms) handles `"both"` → `["ios","android"]` and comma-separated values with `{ values }` args.

**`render(width)`:**
1. 2-row step indicator from `renderStepIndicator(stepIndex, answeredMask, theme)` (D-91).
2. Blank separator line.
3. Question text from `STEP_DEFINITIONS[stepIndex].question`, truncated to `width-4`.
4. Blank line.
5. For step 3: `screensStep.render(width-2)`. For step 5: `dataStep.render(width-2)`. Others: `> inputValue` or muted `> (not yet answered)` if empty.
6. Error line (if set) via `theme.fg("error", this.error)`.

All lines truncated to `width`.

## Verification

- `npx vitest run`: **904 tests pass** (875 pre-existing + 29 new), 0 failures
- `npx tsc --noEmit`: exits 0
- `npx biome check src/wizard/steps/screens.ts src/wizard/steps/data.ts src/wizard/panes/form-pane.ts`: no errors
- `ScreensStep.handleInput("\t")` with 0 items → `{ kind: "consumed" }`, render shows error
- `ScreensStep.handleInput("\t")` with 1 item → `{ kind: "advance", args: ["Home"] }`
- `DataStep.handleInput("\t")` with 0 items → `{ kind: "advance", args: [] }` (no min-1)
- `FormPane.render(40)` lines[0] contains "Step 1/8", lines[1] contains "◉" (step indicator)
- `FormPane.handleInput("\x1b")` on step 0: onRetreat NOT called; on step 1: onRetreat called with 1
- Pitfall 5: `FormPane.handleInput("\r")` on step 3 → onAdvance NOT called (ScreensStep consumed)
- Step 5 Tab with empty list: onAdvance IS called (DataStep no min-1)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Step 5 (Data) skips store.apply — add-entity requires fields**
- **Found during:** Task 2 implementation, detected by `npx tsc --noEmit`
- **Issue:** Plan specified calling `store.apply("add-entity", { name })` for each entity name collected by DataStep. However, `add-entity` command's `argsSchema` requires `{ name: EntityNameSchema, fields: FieldSchema[] }` with `fields` having `.min(1)`. The wizard's data step is name-only per CONTEXT.md (D-94: "Name-only; no fields or relationships in the wizard") — there are no fields to provide.
- **Fix:** Step 5 tryAdvance calls `onAdvance(stepIndex, null)` directly without any `store.apply`. Entity names shown in spec preview pane only; actual entity creation with field definitions deferred to canvas mode. This preserves correctness and matches the wizard's design intent.
- **Files modified:** `src/wizard/panes/form-pane.ts`
- **Commit:** 61ce0e1

**2. [Rule 3 - Format] Import ordering and indentation fixes in all three files**
- **Found during:** `npx biome check` after implementation
- **Issue:** Biome required specific import ordering (value imports before type imports within same module) and spaces-not-tabs indentation.
- **Fix:** Applied `npx biome check --write` on form-pane.ts; manually reordered imports in screens.ts and data.ts.
- **Files modified:** All three new files.

## Known Stubs

None — all components are fully implemented and wired. The `(not yet answered)` placeholder in FormPane.render() is intentional UI copy per D-99, not a code stub.

## Threat Flags

No new security surface beyond the plan's threat model:
- T-06-09: `tryAdvance()` validates non-empty inputValue before `store.apply` — implemented.
- T-06-10: `set-wizard-screens` validates each screen name via `argsSchema` — delegated to existing command.
- T-06-11: `\x07` (Ctrl+G) not handled in FormPane — FormPane only sees delegated keys from WizardRoot.

## TDD Gate Compliance

| Gate | Commit | Status |
|------|--------|--------|
| RED (ScreensStep + DataStep) | 73fb65e | PASSED — tests fail before implementation |
| GREEN (ScreensStep + DataStep) | 6053569 | PASSED — all 15 tests pass |
| RED (FormPane) | b8980d7 | PASSED — tests fail before implementation |
| GREEN (FormPane) | 61ce0e1 | PASSED — all 14 tests pass |

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| src/wizard/steps/screens.ts exists | FOUND |
| src/wizard/steps/data.ts exists | FOUND |
| src/wizard/panes/form-pane.ts exists | FOUND |
| tests/wizard-step-components.test.ts exists | FOUND |
| tests/wizard-form-pane.test.ts exists | FOUND |
| commit 73fb65e (RED step components) | FOUND |
| commit 6053569 (GREEN step components) | FOUND |
| commit b8980d7 (RED FormPane) | FOUND |
| commit 61ce0e1 (GREEN FormPane) | FOUND |
| 904 tests pass, 0 failures | VERIFIED |
