---
phase: 06-wizard-graduation
plan: 01
subsystem: model-schema-commands
tags: [schema, zod, wizard, commands, tdd]
dependency_graph:
  requires: []
  provides:
    - WizardMetaSchema (optional wizard fields on SpecSchema)
    - DataModelSchema relaxed to .min(0)
    - 7 wizard set-* commands in COMMANDS registry
    - createSeedSpec() factory
  affects:
    - src/model/spec.ts (SpecSchema extended)
    - src/model/data.ts (DataModelSchema relaxed)
    - src/editor/commands/index.ts (7 new entries)
    - src/wizard/ (new directory)
tech_stack:
  added: []
  patterns:
    - WizardMetaSchema.shape spread into SpecSchema (preserves .strict())
    - set-wizard-* command pattern mirrors set-screen-title.ts exactly
    - createSeedSpec() returns fresh object each call (no shared state)
key_files:
  created:
    - src/editor/commands/set-wizard-app-idea.ts
    - src/editor/commands/set-wizard-app-idea.test.ts
    - src/editor/commands/set-wizard-primary-user.ts
    - src/editor/commands/set-wizard-nav-pattern.ts
    - src/editor/commands/set-wizard-auth.ts
    - src/editor/commands/set-wizard-offline-sync.ts
    - src/editor/commands/set-wizard-target-platforms.ts
    - src/editor/commands/set-wizard-screens.ts
    - src/editor/commands/set-wizard-screens.test.ts
    - src/wizard/seed-spec.ts
    - src/wizard/seed-spec.test.ts
  modified:
    - src/model/spec.ts (WizardMetaSchema + WizardMeta type export)
    - src/model/data.ts (entities .min(1) → .min(0))
    - src/model/spec.test.ts (8 wizard field tests added)
    - src/model/data.test.ts (empty entities test updated)
    - src/editor/commands/index.ts (7 new imports + COMMANDS entries)
decisions:
  - "WizardMetaSchema.shape spread into SpecSchema keeps .strict() active — T-06-03 mitigation retained"
  - "DataModelSchema relaxed to .min(0) — graduation gate (Plan 05) enforces entity presence, not schema"
  - "set-wizard-screens uses back_behavior:'pop' for non-root screens (plan said 'stack' which is invalid)"
metrics:
  duration: "6m 9s"
  completed: "2026-04-19"
  tasks_completed: 2
  tasks_total: 2
  files_created: 11
  files_modified: 5
  tests_before: 838
  tests_after: 865
---

# Phase 06 Plan 01: Schema + Command Registry for Wizard Intake Fields

One-liner: Extended SpecSchema with 6 optional wizard fields via WizardMetaSchema spread, relaxed DataModelSchema entities to .min(0), added 7 set-wizard-* commands and createSeedSpec() factory — all 865 tests green.

## What Was Built

### Task 1: SpecSchema + DataModelSchema Changes

Extended `src/model/spec.ts` to accept 6 optional wizard intake fields without breaking existing specs:

- `app_idea: string?` — free-text app description
- `primary_user: string?` — target user persona
- `nav_pattern: "tab_bar" | "side_drawer" | "stack" | "modal_first" | undefined`
- `auth: "none" | "email_password" | "oauth" | "biometric" | "magic_link" | undefined`
- `offline_sync: "none" | "read_only" | "full" | undefined`
- `target_platforms: ("ios" | "android")[] | undefined`

Pattern: `WizardMetaSchema` defined separately, then `...WizardMetaSchema.shape` spread into `SpecSchema`'s object. This adds fields to the known-key set so `.strict()` remains enforced — unknown keys are still rejected (T-06-03 mitigation).

Also exported `WizardMeta` type for use in command arg typing (Plans 02+).

In `src/model/data.ts`: relaxed `DataModelSchema.entities` from `.min(1)` to `.min(0)`. New wizard specs have no entities until step 6; the graduation gate (Plan 05) enforces entity presence at promotion time.

### Task 2: 7 Wizard Commands + Seed Spec Factory

Created 6 scalar/enum wizard commands following the exact `set-screen-title.ts` pattern:
- `set-wizard-app-idea` — string field
- `set-wizard-primary-user` — string field
- `set-wizard-nav-pattern` — nav_pattern enum
- `set-wizard-auth` — auth enum
- `set-wizard-offline-sync` — offline_sync enum
- `set-wizard-target-platforms` — platform array (uses `doc.set()` for array replacement)

Created `set-wizard-screens` for wizard step 4 bulk-replace: converts user-provided screen names to `Screen` objects via `nameToId()` slug (T-06-02), replaces `spec.screens` entirely, updates `navigation.root` to first screen's id. First screen has no `back_behavior`; subsequent screens get `"pop"`.

All 7 commands registered in `COMMANDS` in alphabetical order. `COMMAND_NAMES` array automatically includes them.

Created `src/wizard/seed-spec.ts` with `createSeedSpec()` factory returning a fresh, valid `Spec` with one placeholder screen and empty entities array. Passes `SpecSchema.safeParse` with 0 errors.

## Verification

- `npx vitest run`: **865 tests pass** (838 pre-existing + 27 new)
- `npx tsc --noEmit`: exits 0
- `npx biome check` on all new/modified files: no errors
- `SpecSchema.safeParse({ ...spec, app_idea: "test idea" }).success === true`
- `DataModelSchema.safeParse({ entities: [] }).success === true`
- `Object.keys(COMMANDS).filter(k => k.startsWith("set-wizard-")).length === 7`
- `SpecSchema.safeParse(createSeedSpec()).success === true`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed invalid back_behavior value in set-wizard-screens**
- **Found during:** Task 2 implementation, detected by `npx tsc --noEmit`
- **Issue:** Plan specified `back_behavior: "stack"` for non-root wizard screens, but `"stack"` is not a valid `BackBehavior` value. Valid values are `"pop" | "dismiss" | "reset-to-root" | { kind: "replace", screen: ScreenId }`.
- **Fix:** Changed to `back_behavior: "pop"` — the correct choice for standard stack navigation back behavior.
- **Files modified:** `src/editor/commands/set-wizard-screens.ts`, `src/editor/commands/set-wizard-screens.test.ts`
- **Commit:** 4dc5497

## Known Stubs

None — all wizard commands are fully wired to spec mutations and AST updates. The `createSeedSpec()` placeholder screen is intentional (not a stub) — it is the designed starting state for new wizard files before the user fills in data.

## Threat Flags

No new security surface beyond what the plan's threat model covers. All wizard commands validate args via Zod `argsSchema.safeParse` before `apply()` reaches the spec (T-06-01). The `nameToId()` slug in `set-wizard-screens` strips non-alnum characters (T-06-02). `.strict()` retained on `SpecSchema` (T-06-03).

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| src/model/spec.ts exists | FOUND |
| src/model/data.ts exists | FOUND |
| src/editor/commands/set-wizard-app-idea.ts exists | FOUND |
| src/wizard/seed-spec.ts exists | FOUND |
| commit 4bb1343 exists (Task 1) | FOUND |
| commit 4dc5497 exists (Task 2) | FOUND |
