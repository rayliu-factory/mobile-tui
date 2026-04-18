---
phase: "04"
plan: "05"
subsystem: editor-commands
tags: [tdd, commands, data-model, actions, navigation, tabbar, D-54, D-56, D-62]
dependency-graph:
  requires: [04-03, 04-04]
  provides: [complete-34-command-catalog]
  affects: [editor-store, undo-history]
tech-stack:
  added: []
  patterns:
    - Command<T> apply/invert with dual spec+AST mutation (D-62)
    - setScalarPreserving for scalar AST edits preserving YAML style
    - doc.addIn/deleteIn/setIn + doc.createNode() for structural AST edits
    - biome-ignore noExplicitAny for branded Record<ActionId,Action> key indexing
    - walkAndRenameAction() recursive tree walker for cascade through 18 component kinds
    - apply→invert→apply idempotence verified by 3 fixtures per command
key-files:
  created:
    - src/editor/commands/add-entity.ts
    - src/editor/commands/rename-entity.ts
    - src/editor/commands/delete-entity.ts
    - src/editor/commands/add-field.ts
    - src/editor/commands/rename-field.ts
    - src/editor/commands/delete-field.ts
    - src/editor/commands/set-field-type.ts
    - src/editor/commands/add-relationship.ts
    - src/editor/commands/delete-relationship.ts
    - src/editor/commands/add-action.ts
    - src/editor/commands/rename-action.ts
    - src/editor/commands/delete-action.ts
    - src/editor/commands/set-action-effect.ts
    - src/editor/commands/set-nav-root.ts
    - src/editor/commands/add-nav-edge.ts
    - src/editor/commands/update-nav-edge.ts
    - src/editor/commands/delete-nav-edge.ts
    - src/editor/commands/set-tabbar-items.ts
    - src/editor/commands/add-entity.test.ts
    - src/editor/commands/rename-entity.test.ts
    - src/editor/commands/delete-entity.test.ts
    - src/editor/commands/add-field.test.ts
    - src/editor/commands/rename-field.test.ts
    - src/editor/commands/delete-field.test.ts
    - src/editor/commands/set-field-type.test.ts
    - src/editor/commands/add-relationship.test.ts
    - src/editor/commands/delete-relationship.test.ts
    - src/editor/commands/add-action.test.ts
    - src/editor/commands/rename-action.test.ts
    - src/editor/commands/delete-action.test.ts
    - src/editor/commands/set-action-effect.test.ts
    - src/editor/commands/set-nav-root.test.ts
    - src/editor/commands/add-nav-edge.test.ts
    - src/editor/commands/update-nav-edge.test.ts
    - src/editor/commands/delete-nav-edge.test.ts
    - src/editor/commands/set-tabbar-items.test.ts
  modified:
    - src/editor/commands/add-relationship.ts (biome format pass)
    - src/editor/commands/delete-entity.ts (biome format pass)
    - src/editor/commands/delete-field.ts (biome format pass)
    - src/editor/commands/delete-relationship.ts (biome format pass)
    - src/editor/commands/rename-field.ts (biome format pass)
    - src/editor/commands/set-field-type.ts (biome format pass)
decisions:
  - "spec.data.entities (not spec.dataModel.entities) — the Spec model uses data: DataModelSchema"
  - "FIELD_TYPES does not include 'enum' — used the actual constant from model/data.ts"
  - "Branded Record<ActionId,Action> requires (as any) cast with biome-ignore for key indexing"
  - "set-tabbar-items test programmatically appends TabBar node since fixture has none"
  - "rename-action cascade implemented via walkAndRenameAction() recursive helper covering all 18 component kinds"
  - "delete-entity captures removedRelationships from ALL entities for full invert fidelity"
metrics:
  duration: "~3 hours (across two sessions due to context limit)"
  completed: "2026-04-18T11:04:21Z"
  tasks-completed: 2
  files-created: 36
  files-modified: 6
  tests-added: 102
---

# Phase 04 Plan 05: Data Model + Action/Nav/TabBar Commands Summary

Implements the 18 remaining commands to complete the exhaustive 34-command catalog (D-54): 9 data model commands and 9 action/nav/tabbar commands. All 34 command test files (102 tests) pass with dual spec+AST mutation (D-62), apply→invert→apply idempotence, and zero TypeScript errors.

## What Was Built

### Task 1: Data Model Commands (RED 87171a4, GREEN 43df687)

9 commands covering full entity/field/relationship CRUD:

| Command | D-54 req | Key behavior |
|---------|----------|-------------|
| add-entity | D-54 | doc.addIn(["data","entities"], newNode); invert doc.deleteIn |
| rename-entity | D-54 | Cascade: Field.of + Action.submit.entity + Relationship.from/to via setScalarPreserving |
| delete-entity | D-54 | Captures all removedRelationships from every entity for full invert restore |
| add-field | D-54 | doc.addIn(["data","entities",ei,"fields"], fieldNode) |
| rename-field | D-54 | setScalarPreserving on field name scalar |
| delete-field | D-54 | Captures field JSON copy via {...field}; invert rebuilds via doc.setIn |
| set-field-type | D-54 | Handles 'of' removal when switching away from reference type |
| add-relationship | D-54 | doc.hasIn check before addIn for missing relationships array |
| delete-relationship | D-54 | Captures relationship copy; invert rebuilds full array |

### Task 2: Action/Nav/TabBar Commands (RED 8305569, GREEN ca18ff8)

9 commands covering action registry, navigation graph, and TabBar component:

| Command | D-54 req | Key behavior |
|---------|----------|-------------|
| add-action | D-54 | (newActions as any)[id] = effect; doc.setIn(["actions",id]); invert doc.deleteIn |
| rename-action | D-54 | walkAndRenameAction() traverses all 18 component kinds + NavEdge.trigger cascade |
| delete-action | D-54 | Captures action copy; invert restores via (newActions as any)[id] = actionJSON |
| set-action-effect | D-54 | Swaps effect in place; invert restores prevEffect |
| set-nav-root | D-55 | setScalarPreserving(doc, ["navigation","root"], screenId) |
| add-nav-edge | D-55 | doc.addIn(["navigation","edges"], edgeNode) |
| update-nav-edge | D-55 | Per-field setScalarPreserving patch; handles transition presence/absence |
| delete-nav-edge | D-55 | Captures edge copy; invert rebuilds full edges array via doc.setIn |
| set-tabbar-items | D-54 | resolvePathOnSpec() finds TabBar; doc.setIn([...astPath,"items"]) |

## Verification

```
Test Files  34 passed (34)
      Tests  102 passed (102)
   Duration  3.01s
```

TypeScript: `npx tsc --noEmit` exits 0.

Command files: 35 total = 34 commands + _path-utils.ts helper.

## TDD Gate Compliance

Plan type is `tdd`. Gate sequence in git log:

1. RED (test) commits: `87171a4 test(04-05a)`, `8305569 test(04-05b)`
2. GREEN (feat) commits: `43df687 feat(04-05a)`, `ca18ff8 feat(04-05b)`

Both RED gates precede their GREEN gates. TDD compliance: PASSED.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] spec.data vs spec.dataModel path**
- **Found during:** Task 1 implementation
- **Issue:** Plan referenced `spec.dataModel.entities` but actual Spec schema uses `spec.data.entities` (field is named `data: DataModelSchema`)
- **Fix:** All 9 data model commands use `spec.data.entities` after verifying src/model/spec.ts
- **Files modified:** All 9 Task 1 source files

**2. [Rule 1 - Bug] FIELD_TYPES enum mismatch**
- **Found during:** Task 1 (set-field-type)
- **Issue:** Plan mentioned `"enum"` as a field type but actual `FIELD_TYPES` constant in model/data.ts is `["string","number","boolean","date","reference"]` — no "enum"
- **Fix:** Used `z.enum(FIELD_TYPES)` which imports the actual constant
- **Files modified:** src/editor/commands/set-field-type.ts

**3. [Rule 1 - Bug] Branded Record<ActionId,Action> key indexing**
- **Found during:** Task 2 TypeScript check (npx tsc --noEmit)
- **Issue:** `spec.actions[args.id]` fails TS type check because `ActionId` is a branded type; `Record<ActionId, Action>` cannot be indexed with a plain `string`
- **Fix:** Source files use `(spec.actions as any)[id]` with `// biome-ignore lint/suspicious/noExplicitAny: branded key indexing`; test files use a `getAction()` helper pattern
- **Files modified:** add-action.ts, rename-action.ts, delete-action.ts, set-action-effect.ts + 4 test files

**4. [Rule 1 - Bug] ScreenId vs ActionId cast for navigate.screen**
- **Found during:** Task 2 TypeScript check
- **Issue:** `{ kind: "navigate", screen: "home" as ActionId }` fails because NavigateAction requires `screen: ScreenId`
- **Fix:** Changed to `"home" as ScreenId` with `import type { ScreenId }` in affected test files
- **Files modified:** add-action.test.ts, set-action-effect.test.ts

**5. [Rule 2 - Missing] TabBar missing from habit-tracker fixture**
- **Found during:** Task 2 test design (set-tabbar-items)
- **Issue:** habit-tracker.spec.md has no TabBar component; set-tabbar-items needs one to test against
- **Fix:** Test programmatically appends a TabBar node to the home screen content variant tree before running assertions — no fixture file modification needed
- **Files modified:** src/editor/commands/set-tabbar-items.test.ts

## Known Stubs

None — all 18 commands are fully implemented with apply/invert logic and dual spec+AST mutation.

## Threat Flags

None — no new network endpoints, auth paths, or trust-boundary surface introduced. All inputs validated via Zod schemas with ScreenIdSchema, EntityNameSchema, ActionIdSchema, JsonPointerSchema.

## Self-Check

Files exist check:
- src/editor/commands/add-action.ts: FOUND
- src/editor/commands/rename-action.ts: FOUND
- src/editor/commands/set-tabbar-items.ts: FOUND
- src/editor/commands/add-nav-edge.ts: FOUND
- src/editor/commands/update-nav-edge.ts: FOUND
- src/editor/commands/delete-nav-edge.ts: FOUND

Commits exist check:
- 87171a4 (RED task 1): FOUND
- 43df687 (GREEN task 1): FOUND
- 8305569 (RED task 2): FOUND
- ca18ff8 (GREEN task 2): FOUND

## Self-Check: PASSED
