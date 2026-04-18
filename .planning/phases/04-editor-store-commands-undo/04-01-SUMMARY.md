---
phase: 04-editor-store-commands-undo
plan: 01
subsystem: editor-store
tags: [store, undo, diagnostics, reactive, tdd]
dependency_graph:
  requires:
    - 01-spec-model-invariants  # Spec types, validateSpec, ScreenId
    - 02-serialization-round-trip  # AstHandle, parseSpecFile, writeSpecFile
  provides:
    - editor-store-substrate  # createStore, subscribe, apply, undo, redo, flush
    - undo-stack-helpers  # pushUndo, clearRedo, UNDO_STACK_CAP
    - editor-diagnostics-registry  # EDITOR_CODES (3 codes), subscribeDiagnostics
    - command-types  # Command<T>, Snapshot, ApplyResult, StoreState, Store
  affects:
    - 04-02-onwards  # All subsequent Phase 4 plans wire into this substrate
tech_stack:
  added: []
  patterns:
    - hand-rolled-signal  # Set<fn> + snapshot-iterate notify (no EventEmitter)
    - inverse-replay-undo  # UndoEntry { commandName, args, inverseArgs } + 200 cap
    - re-entrancy-guard  # notifying flag + queueMicrotask (Option B)
    - tdd-red-green-pairs  # test(04-01): RED → feat(04-01): GREEN per plan convention
key_files:
  created:
    - src/editor/undo.ts
    - src/editor/undo.test.ts
    - src/editor/diagnostics.ts
    - src/editor/types.ts
    - src/editor/store.ts
    - src/editor/store.test.ts
  modified: []
decisions:
  - "A1 canary PASSED: doc.createNode produces byte-identical output on same JS value at same path; Strategy B fallback NOT needed"
  - "types.ts created alongside Task 1 (not Task 2) because diagnostics.ts needs Store type; no circular dependency"
  - "UNDO_STACK_CAP imported from undo.ts but removed from store.ts import (biome unsafe-unused warning); store references cap via pushUndo behavior"
metrics:
  duration_seconds: 331
  completed_date: "2026-04-18"
  tasks_completed: 2
  files_created: 6
  files_modified: 0
  tests_added: 25
  tests_passing: 620
---

# Phase 4 Plan 01: Editor Store Substrate — Summary

**One-liner:** Hand-rolled signal store with 200-cap inverse-replay undo, subscriber snapshot-iteration, and Zod args validation — A1 canary proves doc.createNode determinism before 34 commands depend on it.

## What Was Built

### Task 1 (RED/GREEN): Undo stack helpers + diagnostics registry

**`src/editor/undo.ts`** — Pure stack helpers, no internal state (D-61/D-64):
- `UndoEntry` interface: `{ commandName, args, inverseArgs }`
- `UNDO_STACK_CAP = 200` — hard cap per D-64
- `pushUndo(stack, entry)` — appends then `shift()` on overflow
- `clearRedo(stack)` — `stack.length = 0` in-place

**`src/editor/diagnostics.ts`** — Phase-4 code registry (augments SERDE_CODES pattern):
- `EDITOR_CODES` with 3 codes: `EDITOR_COMMAND_NOT_FOUND`, `EDITOR_COMMAND_ARG_INVALID`, `EDITOR_REF_CASCADE_INCOMPLETE`
- `EditorCode` keyof-typeof type
- `subscribeDiagnostics(store, fn)` — sugared filter over store.subscribe (only fires when diagnostics.length > 0)
- Re-exports: `Diagnostic`, `error`, `info`, `warning` from `../primitives/diagnostic.ts`

**`src/editor/types.ts`** (created alongside Task 1 as dependency for diagnostics.ts):
- `Command<T extends z.ZodObject<any>>` — per-command interface with `apply(spec, astHandle, args)` and `invert(spec, astHandle, inverseArgs)`
- `Snapshot` — subscriber payload `{ spec, diagnostics, dirty, lastWriteResult? }`
- `ApplyResult` — `{ spec, diagnostics, ok: boolean }`
- `StoreState` — `{ spec, astHandle, diagnostics, dirty }`
- `Store` — public interface with `getState`, `subscribe`, `apply`, `undo`, `redo`, `flush`

### Task 2 (RED/GREEN): createStore implementation + A1 canary

**`src/editor/store.ts`** — Hand-rolled signal store (D-50, ~230 LOC):

Apply pipeline (9 steps per plan):
1. Re-entrancy guard: `notifying` flag + `queueMicrotask` (Option B, T-04-04)
2. Command registry lookup → `EDITOR_COMMAND_NOT_FOUND` on miss
3. `argsSchema.safeParse(args)` → `EDITOR_COMMAND_ARG_INVALID` per ZodIssue (T-04-01)
4. `command.apply(spec, astHandle, parsedArgs)` → `{ spec: newSpec, inverseArgs }` (D-62)
5. `validateSpec(newSpec)` — non-blocking diagnostics (save-gate handled by writeSpecFile)
6. `pushUndo(undoStack, entry); clearRedo(redoStack)` (D-64)
7. State update: `spec = newSpec; diagnostics = newDiag; dirty = true`
8. `notify([...subscribers])` — snapshot iteration (T-04-03)
9. Return `{ ok: true, spec, diagnostics }`

Notify discipline (T-04-03): iterates `[...subscribers]` spread so mid-notification `subscribe`/`unsubscribe` calls don't corrupt the in-flight iteration. Per-subscriber errors are swallowed.

**`src/editor/store.test.ts`** — 16 tests across 5 describe blocks:
- `subscribe / unsubscribe`: 4 tests (returns fn, fires on apply, removes on unsub, idempotent double-unsub)
- `notify snapshot discipline`: 2 tests (late-added not called same tick, error isolation)
- `apply pipeline`: 4 tests (unknown command, invalid args, known command, one-tick publish)
- `undo / redo`: 4 tests (empty stack null, undo→redo sequence, redo cleared on new apply, getState)
- `A1 canary`: 1 test (add-screen + undo → byte-identical write)

## A1 Canary Result — PASSED

Assumption A1 (research §2): `doc.createNode(prevNodeAsJson)` produces byte-identical output when re-inserted at the same path after `deleteIn`.

The A1 canary test adds a screen via `doc.addIn(["screens"], doc.createNode(newScreen))`, then undoes via `doc.deleteIn(["screens", insertedIndex])`, then calls `writeSpecFile` and asserts `Buffer.equals` against the original fixture bytes.

**Result: PASSED on `fixtures/habit-tracker.spec.md`.**

Strategy B fallback (snapshot full YAML source per command) is NOT needed. All 34 commands in subsequent plans can use `doc.createNode` for structural inserts and rely on deterministic re-stringification.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] types.ts created in Task 1 scope**
- **Found during:** Task 1 (writing diagnostics.ts)
- **Issue:** `subscribeDiagnostics` needs `Store` type; types.ts was planned for Task 2. Without it, Task 1 couldn't compile.
- **Fix:** Created `types.ts` alongside `undo.ts` and `diagnostics.ts` in Task 1. The full interface was already designed in the plan so this was not an architectural decision.
- **Files modified:** `src/editor/types.ts` (created earlier than planned)
- **Commits:** `feat(04-01): GREEN — undo.ts + diagnostics.ts + types.ts skeleton`

**2. [Rule 2 - Missing] UNDO_STACK_CAP import removed from store.ts**
- **Found during:** biome check after GREEN commit
- **Issue:** `UNDO_STACK_CAP` was imported but unused in store.ts (pushUndo handles the cap internally).
- **Fix:** biome's safe-fix removed it. Store enforces the cap via `pushUndo()` which already imports from undo.ts.
- **Files modified:** `src/editor/store.ts`

**3. [Rule 1 - Bug] ScreenId cast needed in A1 canary test**
- **Found during:** `npx tsc --noEmit` after GREEN commit
- **Issue:** The stub addScreen command in store.test.ts used `z.string()` for `id`, but `spec.screens` expects `ScreenId` branded type.
- **Fix:** Added `import type { ScreenId }` and cast `args.id as ScreenId` in the stub command.
- **Files modified:** `src/editor/store.test.ts`

## Test Coverage

| Suite | Tests | Status |
|-------|-------|--------|
| `src/editor/undo.test.ts` | 9 | PASS |
| `src/editor/store.test.ts` | 16 | PASS |
| All prior suites (Phase 1-3) | 595 | PASS |
| **Total** | **620** | **ALL PASS** |

## Known Stubs

None. All exports are fully implemented. The `commands` parameter defaults to `{}` to allow testing without a command registry; this is intentional and documented in the store.ts header.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries. All new code is pure in-memory store logic. The `writeSpecFile` call in `flush()` routes through the existing Phase-2 atomic write primitive — no new I/O surface.

## Self-Check

Files exist:
- `src/editor/undo.ts` ✓
- `src/editor/undo.test.ts` ✓
- `src/editor/diagnostics.ts` ✓
- `src/editor/types.ts` ✓
- `src/editor/store.ts` ✓
- `src/editor/store.test.ts` ✓

Commits exist:
- `f931768` — test(04-01): RED — undo stack helpers tests (D-61/D-64) ✓
- `4419e5e` — feat(04-01): GREEN — undo.ts + diagnostics.ts + types.ts skeleton ✓
- `48b1b55` — test(04-01): RED — store substrate + A1 canary tests ✓
- `5ec3f86` — feat(04-01): GREEN — createStore + undo/redo + diagnostics registry ✓

## Self-Check: PASSED
