---
phase: 04-editor-store-commands-undo
plan: "07"
subsystem: editor
tags: [cli, barrel, integration-test, editor, tdd]
dependency_graph:
  requires: [04-06]
  provides: [src/editor/index.ts, scripts/cli-edit.ts, tests/cli-edit.test.ts]
  affects: [Phase-5 canvas, Phase-6 wizard, Phase-9 pi extension]
tech_stack:
  added: []
  patterns:
    - "Explicit-named barrel (src/editor/index.ts) — same pattern as src/serialize/index.ts"
    - "Headless CLI script with process.exitCode (not process.exit) for beforeExit safety (D-66/D-68)"
    - "parseFlagsAgainstSchema with Object.create(null) prototype-pollution guard (T-04-23)"
    - "spawn-based CLI integration test (novel: first subprocess test in repo)"
key_files:
  created:
    - src/editor/index.ts
    - scripts/cli-edit.ts
    - tests/cli-edit.test.ts
  modified:
    - package.json
decisions:
  - "Exit-2 test uses add-screen without back_behavior (not delete nav-root): delete-screen already cascades nav.root to next screen, so no dangling ref. Validated that add-screen without back_behavior reliably triggers validateSpec severity:error → save-gate exit 2."
  - "Stderr format test uses exit-2 scenario (validateSpec diagnostics) rather than arg-parse failure: arg-parse failures use EDITOR_COMMAND_ARG_INVALID code as the prefix, not error|warning|info severity values."
  - "Biome import ordering enforced on src/editor/index.ts: sorted alphabetically by module path per biome organize-imports rule."
metrics:
  duration: "~8 minutes"
  completed: "2026-04-18T11:55:44Z"
  tasks_completed: 2
  files_changed: 4
---

# Phase 04 Plan 07: Editor Barrel + CLI-Edit Script Summary

**One-liner:** Public L5 editor barrel + headless `cli-edit` CLI harness (D-67/D-68) with process.exitCode discipline and spawn-based integration tests — Phase 4 closed.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Public editor barrel + cli-edit script | 85c07d9 | src/editor/index.ts, scripts/cli-edit.ts, package.json |
| 2 | CLI integration test — exit-code matrix + stderr format | fff0b30 | tests/cli-edit.test.ts |

## What Was Built

### src/editor/index.ts
Public L5 barrel for the editor layer following the explicit-named pattern from `src/serialize/index.ts`. Exports: `createStore`, `COMMANDS`, `COMMAND_NAMES`, `CommandName`, `EDITOR_CODES`, `EditorCode`, `subscribeDiagnostics`, `createAutosave`, `Autosave`, `UndoEntry`, `Command`, `Store`, `Snapshot`, `ApplyResult`, `StoreState`. Header lists all 4 consumer layers (cli-edit, Phase-5 canvas, Phase-6 wizard, Phase-9 pi extension).

### scripts/cli-edit.ts
Headless CLI harness for the editor, modeled on `scripts/render-wireframe.ts`. Key design decisions:
- **Exit-code discipline (D-68):** `process.exitCode = 0/2` (allows beforeExit to fire); `process.exit(1)` only for CLI-layer errors (nothing pending)
- **parseFlagsAgainstSchema:** 30-LOC argv parser using `Object.create(null)` for T-04-23 prototype-pollution prevention (same pattern as `src/serialize/unknown.ts`)
- **Explicit flush:** `await store.flush()` called before natural return as primary guarantee (D-66)
- **Diagnostic format (D-68):** `${d.severity} ${d.path}: ${d.message}` per line for Diagnostic objects

### tests/cli-edit.test.ts
First spawn-based CLI integration test in the repo (novel pattern). Uses `node:child_process.spawn` — no new deps. 7 tests covering:
- Exit 0: happy path add-screen with back_behavior
- Exit 1: unknown command, missing file, invalid args (EDITOR_COMMAND_ARG_INVALID)
- Exit 2: save-gate via non-root screen without back_behavior
- Stdout terse: exact match of "applied \<command\> → wrote \<path\>"
- Stderr format D-68: validates error|warning|info \<path\>: \<message\>

### package.json
Added `"cli-edit": "npx tsx scripts/cli-edit.ts"` script entry per D-67.

## Verification

- `npx vitest run tests/cli-edit.test.ts` — 7/7 pass
- `npm test` — 754/754 pass across 96 files (full Phase 1+2+3+4 regression)
- `npx tsc --noEmit` — 0 errors
- `npx biome check src/editor/index.ts scripts/cli-edit.ts` — 0 errors
- Exit-code discipline confirmed: `grep "process.exitCode\|process.exit" scripts/cli-edit.ts` shows exitCode for 0/2, exit(1) for CLI errors only

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Exit-2 test strategy: delete-screen cascades nav.root**

- **Found during:** Task 2 (writing exit-2 test)
- **Issue:** Plan suggested deleting the nav root screen to trigger a dangling nav root. However, `delete-screen` already cascades `navigation.root` to the first remaining screen (per D-58 cascade logic), so no dangling ref is created — the test would exit 0.
- **Fix:** Used `add-screen` without `back_behavior` instead. This reliably triggers `validateSpec` severity:error ("non-root screen must declare back_behavior") → `writeSpecFile` returns `{ written: false }` → exit 2. Validated manually before writing test.
- **Files modified:** tests/cli-edit.test.ts (test strategy only)
- **Commit:** fff0b30

**2. [Rule 1 - Bug] Stderr format test used wrong scenario**

- **Found during:** Task 2 (first test run)
- **Issue:** Initial stderr-format test used arg-parse failure scenario. Arg-parse failures emit `EDITOR_COMMAND_ARG_INVALID <path>: <message>` (diagnostic code as prefix, not severity level), which doesn't match `^(error|warning|info) .+: .+$`.
- **Fix:** Changed stderr format test to use the exit-2 scenario (validateSpec diagnostics), which emits proper severity values via `d.severity`.
- **Files modified:** tests/cli-edit.test.ts
- **Commit:** fff0b30

**3. [Rule 1 - Bug] Biome import ordering in src/editor/index.ts**

- **Found during:** Task 1 biome check
- **Issue:** Initial barrel had exports in logical reading order (types first, then functions by consumer need). Biome organize-imports requires alphabetical-by-module-path ordering.
- **Fix:** Reordered exports: autosave.ts → commands/index.ts → diagnostics.ts → store.ts → types.ts → undo.ts.
- **Files modified:** src/editor/index.ts
- **Commit:** 85c07d9

## Known Stubs

None — all plan artifacts are fully implemented and wired.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes beyond what is covered in the plan's threat model (T-04-22 through T-04-25).

## Self-Check: PASSED

Files exist:
- src/editor/index.ts: FOUND
- scripts/cli-edit.ts: FOUND
- tests/cli-edit.test.ts: FOUND

Commits exist:
- 85c07d9: FOUND (feat(04-07): editor barrel + cli-edit script)
- fff0b30: FOUND (test(04-07): GREEN — cli-edit exit-code matrix)
