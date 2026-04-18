---
phase: 04-editor-store-commands-undo
plan: "04"
subsystem: editor/commands
tags: [commands, component-tree, variants, tdd, undo, ast-invert]
dependency_graph:
  requires: [04-01]
  provides: [component-tree-commands, variant-commands]
  affects: [phase-05-canvas]
tech_stack:
  added: []
  patterns:
    - "TDD RED/GREEN per command pair (9 commands across 2 batches)"
    - "D-62: dual-layer invert — spec (pure value) + AST (astHandle.doc) for byte-identical undo"
    - "T-04-14: live YAML node capture via .toJSON() — plain JS copy in inverseArgs, never live reference"
    - "T-04-13: JsonPointer path traversal prevention — _path-utils.ts resolves only within spec.screens[i].variants[kind].tree"
    - "T-04-12: set-component-action validates actionId exists in spec.actions before applying"
    - "setScalarPreserving for scalar AST edits; doc.setIn + doc.createNode for structural edits"
    - "Math.min(toIndex, newTree.length) for splice-then-insert index correctness in move/reorder"
key_files:
  created:
    - src/editor/commands/_path-utils.ts
    - src/editor/commands/add-component.ts
    - src/editor/commands/add-component.test.ts
    - src/editor/commands/remove-component.ts
    - src/editor/commands/remove-component.test.ts
    - src/editor/commands/move-component.ts
    - src/editor/commands/move-component.test.ts
    - src/editor/commands/reorder-component.ts
    - src/editor/commands/reorder-component.test.ts
    - src/editor/commands/set-component-prop.ts
    - src/editor/commands/set-component-prop.test.ts
    - src/editor/commands/set-component-action.ts
    - src/editor/commands/set-component-action.test.ts
    - src/editor/commands/set-variant-null.ts
    - src/editor/commands/set-variant-null.test.ts
    - src/editor/commands/set-variant-tree.ts
    - src/editor/commands/set-variant-tree.test.ts
    - src/editor/commands/set-variant-when.ts
    - src/editor/commands/set-variant-when.test.ts
  modified: []
decisions:
  - "Math.min(toIndex, newTree.length) for splice-then-insert: after splice(fromIndex,1), inserting at toIndex needs no -1 adjustment — the correct formula is min(toIndex, newTree.length) ensuring the final position matches intent"
  - "MVP path resolution: _path-utils.ts supports only root-level tree paths (single numeric segment); nested paths deferred — sufficient for all Phase-5 canvas gestures identified"
  - "set-component-action: invalid actionId returns no-op (spec unchanged) rather than diagnostic to keep command surface simple; caller is responsible for validating IDs"
  - "reorder-component inverseArgs stores swapped indices: { fromIndex: effectiveToIndex, toIndex: fromIndex } so the same apply formula reverses correctly"
metrics:
  duration: "~45 minutes"
  completed: "2026-04-18"
  tasks_completed: 2
  files_created: 19
---

# Phase 04 Plan 04: Component-Tree and Variant Commands Summary

9 component-tree and variant commands implemented with TDD (RED/GREEN commit pairs), full apply→invert→apply idempotence verified per command, with dual-layer AST inversion (D-62) and live-node capture safety (T-04-14).

## What Was Built

### Task 1: Component Tree Commands (RED b43ae62 / GREEN 2f07fff)

Four commands for structural component-tree manipulation:

**`add-component`** — Splices a `ComponentNode` at `parentPath + index` in the variant tree. Rebuilds full AST tree array via `doc.setIn(treeAstPath, doc.createNode(newTree))`. Invert removes by index.

**`remove-component`** — Captures the removed node as `astNode.toJSON()` (plain JS, T-04-14). Removes from spec array and `doc.setIn` to rebuild the tree. Invert re-inserts `removedNodeJSON` at the original index via `doc.createNode`.

**`move-component`** — MVP supports `toParentPath === ""` (root-level moves). Captures `movedNodeJSON` via `.toJSON()`. Key fix: `effectiveToIndex = Math.min(toIndex, newTree.length)` after splice — no `-1` adjustment.

**`reorder-component`** — Same-parent reorder using the same `Math.min` formula. No-op when `fromIndex === toIndex`. InverseArgs swaps indices: `{ fromIndex: effectiveToIndex, toIndex: fromIndex }`.

**`_path-utils.ts`** — Internal helper resolving `JsonPointer` paths within `spec.screens[i].variants[kind].tree` only (T-04-13: no fs.* passthrough).

### Task 2: Prop/Action + Variant Commands (RED 15c7a17 / GREEN 613cc64)

Five commands for prop editing and variant state:

**`set-component-prop`** — Resolves root-level node via single numeric JsonPointer segment. Scalar values use `setScalarPreserving`; structural values use `doc.setIn + doc.createNode`. Invert removes prop if `prevValue === undefined`.

**`set-component-action`** — T-04-12: `if (!(actionId in spec.actions)) return { spec, inverseArgs: null }` no-op. Updates `node.action` and optional `node.testID`. Both fields use `setScalarPreserving`.

**`set-variant-null`** — T-04-14: captures `prevVariantJSON` via `astHandle.doc.getIn(path, true).toJSON()`. Sets variant to `null` in spec and `doc.setIn(variantAstPath, null)`. Invert restores via `doc.createNode(prevVariantJSON)`. `argsSchema` excludes `"content"` (never null by spec invariant).

**`set-variant-tree`** — Replaces `tree` and optionally `when` clause. Uses `doc.setIn + doc.createNode`. PrevTree captured as `[...variant.tree]` spread.

**`set-variant-when`** — Updates `when` clause only on non-content variants. Invert calls `doc.deleteIn(whenAstPath)` if `prevWhen === undefined`.

## TDD Gate Compliance

| Gate | Commit | Description |
|------|--------|-------------|
| RED (task 1) | b43ae62 | `test(04-04a): RED — component tree commands add/remove/move/reorder` |
| GREEN (task 1) | 2f07fff | `feat(04-04a): GREEN — add/remove/move/reorder-component commands` |
| RED (task 2) | 15c7a17 | `test(04-04b): RED — component prop/action + variant commands` |
| GREEN (task 2) | 613cc64 | `feat(04-04b): GREEN — set-component-* + set-variant-* commands` |

## Test Coverage

- 16 test files in `src/editor/commands/`, 48 tests passing
- Each command has ≥3 apply→invert→apply idempotence fixtures
- All 668 project tests pass (no regression)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Wrong splice-then-insert index in move-component and reorder-component**
- **Found during:** Task 1 GREEN — swap tests failed
- **Issue:** Original formula `toIndex > fromIndex ? toIndex - 1 : toIndex` produced wrong final positions for forward moves
- **Fix:** `effectiveToIndex = Math.min(toIndex, newTree.length)` — after removing element at `fromIndex`, `splice(effectiveToIndex, 0, item)` places item at the correct final slot without any adjustment. Applied consistently to both apply and invert paths.
- **Files modified:** `move-component.ts`, `reorder-component.ts`
- **Commit:** 2f07fff (GREEN task 1)

**2. [Rule 2 - Missing critical] TypeScript branded type casts in test files**
- **Found during:** Task 1 RED — TypeScript errors on `screenId: "home"` (string vs ScreenId branded type)
- **Fix:** Added `import type { ScreenId }` and `import type { JsonPointer }` to all test files; cast values at usage sites
- **Files modified:** All 9 test files

**3. [Rule 1 - Bug] Biome check target in worktree**
- **Found during:** Task 2 verification — `npx biome check .` failed with "nested root configuration" error
- **Fix:** Run `./node_modules/.bin/biome check src/editor/commands/` from project root directly (avoids nested biome.json in worktree)
- **Commit:** Fixed inline during GREEN 613cc64

## Known Stubs

None — all commands are fully wired with spec-level and AST-level operations. No hardcoded placeholder values.

## Threat Surface

All threats from the plan's threat register were mitigated:

| Threat | Mitigation | Evidence |
|--------|-----------|---------|
| T-04-12: invalid actionId | `if (!(actionId in spec.actions)) return no-op` | `set-component-action.ts:L67` |
| T-04-13: JsonPointer traversal | `_path-utils.ts` resolves only within `spec.screens[i].variants[kind].tree` | `_path-utils.ts` |
| T-04-14: live YAML node in inverseArgs | `astNode.toJSON()` used in `remove-component.ts`, `set-variant-null.ts`, `move-component.ts` | `grep toJSON()` confirms 3 files |
| T-04-15: enormous tree DoS | Accepted — validateSpec post-apply surfaces structure issues | Plan accepted disposition |

## Self-Check: PASSED

Files verified:
- `src/editor/commands/add-component.ts` — FOUND
- `src/editor/commands/remove-component.ts` — FOUND
- `src/editor/commands/move-component.ts` — FOUND
- `src/editor/commands/reorder-component.ts` — FOUND
- `src/editor/commands/set-component-prop.ts` — FOUND
- `src/editor/commands/set-component-action.ts` — FOUND
- `src/editor/commands/set-variant-null.ts` — FOUND
- `src/editor/commands/set-variant-tree.ts` — FOUND
- `src/editor/commands/set-variant-when.ts` — FOUND
- `src/editor/commands/_path-utils.ts` — FOUND

Commits verified:
- `b43ae62` — FOUND (RED task 1)
- `2f07fff` — FOUND (GREEN task 1)
- `15c7a17` — FOUND (RED task 2)
- `613cc64` — FOUND (GREEN task 2)

Tests: 16/16 test files pass, 48/48 tests pass.
TypeScript: `npx tsc --noEmit` exits 0.
