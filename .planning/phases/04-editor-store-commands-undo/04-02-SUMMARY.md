---
phase: 04-editor-store-commands-undo
plan: 02
subsystem: editor-autosave
tags: [autosave, debounce, fake-timers, tdd, serde-06, editor-04]
dependency_graph:
  requires:
    - 04-01  # Store interface (Store, Snapshot, StoreState, WriteResult)
    - 02-serialization-round-trip  # writeSpecFile (atomic write primitive)
  provides:
    - autosave-module  # createAutosave, Autosave interface
  affects:
    - 04-onwards  # cli-edit (explicit flush), Phase 9 (session_shutdown flush)
tech_stack:
  added: []
  patterns:
    - trailing-edge-debounce  # setTimeout reset on every subscribe notification
    - dep-injection-write  # deps.write replaces writeSpecFile for testing (no vi.mock)
    - vi-fake-timers  # NOVEL: first vi.useFakeTimers() usage in repo
    - beforeexit-safety-net  # process.on("beforeExit") registered on create, removed on dispose
key_files:
  created:
    - src/editor/autosave.ts
    - tests/autosave-debounce.test.ts
  modified: []
decisions:
  - "deps.write injection chosen over vi.mock() for writeSpecFile — simpler, no module-mock complexity, aligns with plan spec"
  - "Store stub in tests uses _trigger() helper to manually fire subscriber notifications without requiring a full real store"
  - "Import ordering fixed post-write to satisfy biome organizeImports rule"
metrics:
  duration_seconds: 148
  completed_date: "2026-04-18"
  tasks_completed: 1
  files_created: 2
  files_modified: 0
  tests_added: 6
  tests_passing: 626
---

# Phase 4 Plan 02: Autosave Debounce Module — Summary

**One-liner:** 500ms trailing-edge debounce autosave with deps-injected write spy, beforeExit safety net, and dispose cleanup — closes SERDE-06 debounce half using vi.useFakeTimers() (first in repo).

## What Was Built

### Task 1 (RED/GREEN): Autosave module

**`src/editor/autosave.ts`** — Debounced write service (D-65, D-66, ~120 LOC):

- `Autosave` interface: `{ flush(): Promise<WriteResult>; dispose(): void }`
- `AutosaveDeps` interface: `{ write?: (path, spec, astHandle) => Promise<WriteResult> }`
- `createAutosave(store, path, delayMs=500, deps={})` — factory function:
  - Subscribes to store via `store.subscribe(() => schedule())`
  - `schedule()` — replaces any pending timer with a new `setTimeout(doWrite, delayMs)`
  - `doWrite()` — calls `doWriteFn(path, store.getState().spec, store.getState().astHandle)` at fire time (T-04-07: always current state)
  - `flush()` — `clearTimeout(timer); timer = null; return doWrite()`
  - `beforeExitHandler` registered via `process.on("beforeExit", ...)` on creation
  - `dispose()` — `clearTimeout + unsubscribe() + process.off("beforeExit", handler)`

SCOPE/CONTRACT/FAILURE MODES header follows `atomic.ts` pattern per plan spec.

**`tests/autosave-debounce.test.ts`** — 6 tests using `vi.useFakeTimers()`:

| Test | Covers |
|------|--------|
| trailing-edge only | no write at 100ms, exactly 1 write at 600ms |
| coalescing (10 applies in 100ms) | exactly 1 write after 500ms quiet (SERDE-06 + EDITOR-04) |
| flush() cancels timer | 1 immediate write, no additional write after timer window |
| dispose() clears timer | timer cancelled, no write fires |
| dispose() unsubscribes | post-dispose triggers do not schedule writes |
| beforeExit registration/removal | process.on and process.off called with "beforeExit" |

## TDD Gate Compliance

- RED commit: `98885ed` — `test(04-02): RED — autosave debounce + beforeExit`
- GREEN commit: `bbb4130` — `feat(04-02): GREEN — createAutosave 500ms trailing-edge debounce`

Both gates met in order.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] apply stub type error in test**
- **Found during:** `npx tsc --noEmit` after GREEN commit
- **Issue:** Stub `apply` return type was `Promise<ReturnType<Store["apply"]>>` which double-wraps to `Promise<Promise<ApplyResult>>`. TypeScript rejected the assignment.
- **Fix:** Changed stub signature to `(_: string, __: unknown): Promise<ApplyResult>` and added `ApplyResult` to the import list.
- **Files modified:** `tests/autosave-debounce.test.ts`

**2. [Rule 2 - Missing] Biome import ordering**
- **Found during:** `npx biome check .` after GREEN commit
- **Issue:** Biome `organizeImports` requires `import type` before `import` from same module. Both `autosave.ts` and `autosave-debounce.test.ts` had the order reversed.
- **Fix:** Swapped import order: `import type { WriteResult }` before `import { writeSpecFile }` in autosave.ts; `import type { Autosave }` before `import { createAutosave }` in test.
- **Files modified:** `src/editor/autosave.ts`, `tests/autosave-debounce.test.ts`

## Test Coverage

| Suite | Tests | Status |
|-------|-------|--------|
| `tests/autosave-debounce.test.ts` | 6 | PASS |
| All prior suites (Phase 1-3 + 04-01) | 620 | PASS |
| **Total** | **626** | **ALL PASS** |

## Known Stubs

None. `createAutosave` is fully implemented. The `deps.write` injection is intentional test infrastructure, not a stub — production callers pass no `deps` and get `writeSpecFile`.

## Threat Surface Scan

No new network endpoints or auth paths. The `process.on("beforeExit", ...)` handler is the only new process-lifecycle surface — it is documented in the header and tested (T-04-06 mitigated by `dispose()` calling `process.off`). All writes route through the existing Phase-2 `writeSpecFile` atomic primitive — no new I/O surface.

## Self-Check

Files exist:
- `src/editor/autosave.ts` FOUND
- `tests/autosave-debounce.test.ts` FOUND

Commits exist:
- `98885ed` — test(04-02): RED — autosave debounce + beforeExit FOUND
- `bbb4130` — feat(04-02): GREEN — createAutosave 500ms trailing-edge debounce FOUND

## Self-Check: PASSED
