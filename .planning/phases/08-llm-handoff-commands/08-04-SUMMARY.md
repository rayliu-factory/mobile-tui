---
phase: 08-llm-handoff-commands
plan: "04"
subsystem: canvas-commands
tags:
  - handoff
  - palette
  - keybinding
  - commands-registry
dependency_graph:
  requires:
    - 08-03
  provides:
    - palette-discoverable handoff commands (yank-wireframe, prompt-screen, extract-screen)
    - Ctrl+W key binding for yank-wireframe
    - emitStatus bridge for side-effect command results
  affects:
    - src/canvas/root.ts
    - src/editor/commands/index.ts
    - src/editor/commands/yank-wireframe.ts
    - src/editor/commands/prompt-screen.ts
    - src/editor/commands/extract-screen.ts
tech_stack:
  added: []
  patterns:
    - Command<T> side-effect wrapper (apply returns unchanged spec, invert is no-op)
    - Module-level _onResult callback slot wired by RootCanvas constructor
    - _specFilePath module-level slot for path injection without apply() args expansion
key_files:
  created: []
  modified:
    - src/canvas/root.ts
    - src/editor/commands/index.ts
    - src/editor/commands/yank-wireframe.ts
    - src/editor/commands/prompt-screen.ts
    - src/editor/commands/extract-screen.ts
decisions:
  - "Side-effect commands use module-level _onResult slots (set once in constructor) rather than passing RootCanvas reference through COMMANDS — avoids circular import between canvas/ and editor/commands/"
  - "extractScreenCommand._specFilePath set from store.getState().filePath in constructor — spec path is not user-provided at runtime, safe per T-8-09"
  - "Ctrl+W bound to \x17 — confirmed free (existing bindings: \x05=Ctrl+E, \x10=Ctrl+P, \x11=Ctrl+Q, \x19=Ctrl+Y, \x1a=Ctrl+Z)"
metrics:
  duration: "~10 minutes"
  completed: "2026-04-20"
  tasks_completed: 2
  files_changed: 5
requirements:
  - HANDOFF-01
  - HANDOFF-02
  - HANDOFF-03
---

# Phase 08 Plan 04: Registry Wiring and Ctrl+W Binding Summary

Three handoff command runners registered in COMMANDS for palette discoverability and wired into RootCanvas with Ctrl+W key binding and emitStatus feedback — closing the gap between "runners implemented" and "user can invoke."

## What Was Built

**Task 1 — RootCanvas wiring (src/canvas/root.ts):**
- Added `notifySideEffectResult(result)` public method — the bridge between `store.apply()` COMMANDS callbacks and the 3s auto-clear `emitStatus` pattern
- Added `triggerYankWireframe()`, `triggerPromptScreen()`, `triggerExtractScreen()` private methods following the exact same pattern as the existing `triggerEmitMaestro()`
- Added Ctrl+W (`\x17`) key binding in `handleInput` — triggers `triggerYankWireframe` for active screen, or shows "No screen selected" status if no screen is active
- Wired `_onResult` and `_specFilePath` module-level slots on all three command objects in the constructor after the store subscription

**Task 2 — COMMANDS entries (runner files + index.ts):**
- Added `yankWireframeCommand` export to `yank-wireframe.ts` — `Command<T>` wrapper with `apply()` that fires `runYankWireframe` as side-effect and returns unchanged spec
- Added `promptScreenCommand` export to `prompt-screen.ts` — same pattern with `screenId` + `target` args
- Added `extractScreenCommand` export to `extract-screen.ts` — same pattern, plus `_specFilePath` module-level slot for path injection
- Registered all three in `src/editor/commands/index.ts` as `"extract-screen"`, `"prompt-screen"`, `"yank-wireframe"`

## Key Design Decision: Module-level Callback Slots

The COMMANDS `apply()` method receives only `(spec, astHandle, args)` — no reference to RootCanvas. Rather than passing a RootCanvas reference through COMMANDS (which would create a circular import `canvas/ → editor/commands/ → canvas/`), each command object carries a `_onResult` slot that RootCanvas sets in its constructor. This is intentional module-level mutable state, set once at construction time and stable for the session lifetime.

## Verification

- `npx tsc --noEmit` — clean (0 errors)
- `npx vitest run` — 122 test files, 1050 tests pass, 1 skipped

## Deviations from Plan

None — plan executed exactly as written. The `root.ts` imports were added in a single edit combining both the direct trigger method imports (`runYankWireframe` etc.) and the Command object imports (`yankWireframeCommand` etc.) since both are needed in the same file.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. `extractScreenCommand._specFilePath` uses the same path already loaded from filesystem at startup (T-8-09: accepted in threat register).

## Self-Check: PASSED

- src/canvas/root.ts — FOUND
- src/editor/commands/index.ts — FOUND
- src/editor/commands/yank-wireframe.ts — FOUND
- src/editor/commands/prompt-screen.ts — FOUND
- src/editor/commands/extract-screen.ts — FOUND
- Commit aaa2539 (COMMANDS entries) — FOUND
- Commit aa92e6c (root.ts wiring) — FOUND
