---
phase: 04-editor-store-commands-undo
plan: 03
subsystem: editor-commands-screen
tags: [commands, screen-crud, tdd, cascade, undo, idempotence]
dependency_graph:
  requires:
    - 04-01  # Command<T> interface, AstHandle, Store types
    - 01-spec-model-invariants  # Screen, NavEdge, Action, Spec types, ScreenIdSchema
    - 02-serialization-round-trip  # setScalarPreserving, parseSpecFile
  provides:
    - screen-crud-commands  # add-screen, rename-screen, delete-screen
    - screen-metadata-commands  # set-screen-kind, set-screen-title, set-back-behavior, set-acceptance-prose
  affects:
    - 04-04-onwards  # Canvas kickoff commands now available
    - phase-05-canvas  # MVP screen CRUD gate cleared
tech_stack:
  added: []
  patterns:
    - tdd-red-green-pairs  # test(04-03a/b): RED → feat(04-03a/b): GREEN
    - per-command-file  # D-56 one-file-per-command with co-located test
    - cascade-rename  # D-58: nav.root + NavEdge.from/to + navigate/present action refs
    - ast-dual-mutation  # D-62: spec pure value + astHandle.doc mutations in parallel
    - eemeli-yaml-safety  # doc.hasIn before deleteIn (eemeli/yaml #345)
    - t04-11-json-clone  # prevLines captured as [...screen.acceptance], never live YAML node
key_files:
  created:
    - src/editor/commands/add-screen.ts
    - src/editor/commands/add-screen.test.ts
    - src/editor/commands/rename-screen.ts
    - src/editor/commands/rename-screen.test.ts
    - src/editor/commands/delete-screen.ts
    - src/editor/commands/delete-screen.test.ts
    - src/editor/commands/set-screen-kind.ts
    - src/editor/commands/set-screen-kind.test.ts
    - src/editor/commands/set-screen-title.ts
    - src/editor/commands/set-screen-title.test.ts
    - src/editor/commands/set-back-behavior.ts
    - src/editor/commands/set-back-behavior.test.ts
    - src/editor/commands/set-acceptance-prose.ts
    - src/editor/commands/set-acceptance-prose.test.ts
  modified: []
decisions:
  - "rename-screen invert re-uses the same renameInSpec helper (rename 'to' back to 'from') — avoids duplicating cascade logic"
  - "delete-screen invert uses doc.setIn for full sequence rebuild (no eemeli/yaml insertIn); simplest correct approach"
  - "set-back-behavior null branch guards with doc.hasIn before deleteIn to satisfy eemeli/yaml #345 safety requirement"
  - "let newScreens typed as typeof spec.screens to satisfy biome noImplicitAnyLet"
metrics:
  duration_seconds: 446
  completed_date: "2026-04-18"
  tasks_completed: 2
  files_created: 14
  files_modified: 0
  tests_added: 21
  tests_passing: 653
---

# Phase 4 Plan 03: Screen CRUD + Metadata Commands — Summary

**One-liner:** 7 screen commands (add/rename/delete + set-kind/title/back-behavior/acceptance-prose) with D-58 cascade, D-62 dual AST+spec mutation, and >=3 apply→invert→apply idempotence fixtures each — MVP canvas gate cleared.

## What Was Built

### Task 1 (RED/GREEN): Screen CRUD commands

**`src/editor/commands/add-screen.ts`** — Appends new Screen to spec.screens (D-55 MVP):
- `argsSchema`: `{ id: ScreenIdSchema, title: z.string().min(1), kind: z.enum(SCREEN_KINDS), back_behavior?: BackBehaviorSchema }`
- `apply`: spreads new Screen onto screens[], calls `doc.addIn(["screens"], doc.createNode(newScreen))`; inverseArgs = `{ insertedIndex: spec.screens.length }`
- `invert`: `slice(0, insertedIndex)` on spec + `doc.deleteIn(["screens", insertedIndex])`
- Tests: 3 fixtures (regular, overlay, with back_behavior)

**`src/editor/commands/rename-screen.ts`** — D-58 cascade rename:
- `apply` cascade: screens[i].id → navigation.root (if matches) → NavEdge.from/to → navigate action.screen → present action.overlay; all via `setScalarPreserving`
- `invert`: re-uses `renameInSpec` helper with from/to swapped — no duplicate cascade logic
- Tests: 3 fixtures (non-root rename, root rename with nav.root cascade, nav-edge cascade)

**`src/editor/commands/delete-screen.ts`** — D-58 cascade delete:
- `apply`: removes screen + filters NavEdges (from/to matches) + reassigns nav.root to first remaining if deleted; doc.deleteIn for screen + edges (reverse order); doc.setIn if root changes
- `invert`: restores screen via `doc.setIn(["screens"], doc.createNode(newScreens))` (full rebuild, no insertIn); restores edges via splice + doc.setIn; restores root if changed
- Tests: 3 fixtures (non-root, with nav edges, root screen reassignment)

### Task 2 (RED/GREEN): Screen metadata commands

**`src/editor/commands/set-screen-kind.ts`** — Scalar edit on screen.kind:
- `setScalarPreserving` for both apply + invert; inverseArgs = `{ screenIndex, prevKind }`
- Tests: 3 fixtures (regular→overlay, overlay→regular, regular→regular no-op)

**`src/editor/commands/set-screen-title.ts`** — Scalar edit on screen.title:
- `setScalarPreserving` for apply + invert; inverseArgs = `{ screenIndex, prevTitle }`
- Tests: 3 fixtures (short title, long title, special chars)

**`src/editor/commands/set-back-behavior.ts`** — Nullable scalar/structural edit:
- null arg removes field; string values use `setScalarPreserving`; object `{ kind: "replace", screen }` uses `doc.setIn`
- eemeli/yaml #345 safety: `doc.hasIn` check before any `deleteIn`
- Tests: 3 fixtures (set dismiss on existing, set dismiss on field-absent, null removes field)

**`src/editor/commands/set-acceptance-prose.ts`** — Full array replace (D-55 MVP):
- `doc.setIn(["screens", i, "acceptance"], doc.createNode(lines))` for structural replace
- T-04-11: `prevLines = screen.acceptance ? [...screen.acceptance] : undefined` — plain JSON clone, never live YAML node reference
- `invert`: if prevLines undefined → `doc.deleteIn`; else `doc.setIn` with clone
- Tests: 3 fixtures (1 line, 3 lines, replace existing with empty [])

## Test Results

| Suite | Tests | Status |
|-------|-------|--------|
| `src/editor/commands/add-screen.test.ts` | 3 | PASS |
| `src/editor/commands/rename-screen.test.ts` | 3 | PASS |
| `src/editor/commands/delete-screen.test.ts` | 3 | PASS |
| `src/editor/commands/set-screen-kind.test.ts` | 3 | PASS |
| `src/editor/commands/set-screen-title.test.ts` | 3 | PASS |
| `src/editor/commands/set-back-behavior.test.ts` | 3 | PASS |
| `src/editor/commands/set-acceptance-prose.test.ts` | 3 | PASS |
| All prior suites (Phase 1-3 + 04-01 + 04-02) | 620 | PASS |
| **Total** | **653** | **ALL PASS** |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] Biome noImplicitAnyLet on `let newScreens`**
- **Found during:** Task 2, biome check after GREEN commit
- **Issue:** `let newScreens;` without type annotation triggers biome's `noImplicitAnyLet` rule
- **Fix:** Added `let newScreens: typeof spec.screens;` explicit type annotation in set-back-behavior.ts and set-acceptance-prose.ts
- **Files modified:** `src/editor/commands/set-back-behavior.ts`, `src/editor/commands/set-acceptance-prose.ts`

**2. [Rule 2 - Missing] Biome import sort order in set-screen-kind.ts and set-back-behavior.ts**
- **Found during:** Task 2, biome check
- **Issue:** `import type` placed after regular `import` from same module
- **Fix:** `npx biome check --write` auto-sorted imports
- **Files modified:** `src/editor/commands/set-screen-kind.ts`, `src/editor/commands/set-back-behavior.ts`

## Cascade Verification

`rename-screen` cascade sites (D-58):
- `navigation.root` — updated if matches `from`
- `NavEdge.from` — updated for each edge where from === from
- `NavEdge.to` — updated for each edge where to === from
- `navigate action.screen` — updated for all navigate actions where screen === from
- `present action.overlay` — updated for all present actions where overlay === from

All 4 cascade site categories confirmed present in `src/editor/commands/rename-screen.ts`.

## Known Stubs

None. All commands are fully implemented with both apply and invert. The `variants` field in add-screen uses empty variants (`{ content: { kind: "content", tree: [] }, empty: null, loading: null, error: null }`) which is intentional — the canvas (Phase 5) populates components via separate commands.

## Threat Surface Scan

No new network endpoints, auth paths, or file access patterns introduced. All commands are pure in-memory transforms passed to the existing Phase-2 atomic write path. The `doc.setIn`/`doc.deleteIn`/`doc.addIn` mutations operate on eemeli/yaml Document nodes — no filesystem access.

## TDD Gate Compliance

| Gate | Task 1a | Task 1b |
|------|---------|---------|
| RED commit (test) | `8fdf9f0` — test(04-03a) | `599276d` — test(04-03b) |
| GREEN commit (feat) | `f961524` — feat(04-03a) | `868bfd8` — feat(04-03b) |

Both RED and GREEN gates confirmed in git log.

## Self-Check

Files exist:
- `src/editor/commands/add-screen.ts` - FOUND
- `src/editor/commands/rename-screen.ts` - FOUND
- `src/editor/commands/delete-screen.ts` - FOUND
- `src/editor/commands/set-screen-kind.ts` - FOUND
- `src/editor/commands/set-screen-title.ts` - FOUND
- `src/editor/commands/set-back-behavior.ts` - FOUND
- `src/editor/commands/set-acceptance-prose.ts` - FOUND

Commits exist:
- `8fdf9f0` — test(04-03a): RED — add/rename/delete-screen
- `f961524` — feat(04-03a): GREEN — screen CRUD commands
- `599276d` — test(04-03b): RED — screen metadata command tests
- `868bfd8` — feat(04-03b): GREEN — set-screen-* metadata commands

## Self-Check: PASSED
