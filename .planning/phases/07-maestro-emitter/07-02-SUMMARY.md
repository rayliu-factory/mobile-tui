---
phase: "07-maestro-emitter"
plan: "02"
subsystem: "model"
tags: ["tdd", "wave-1", "maestro", "schema", "cross-reference"]

dependency_graph:
  requires:
    - "07-01-SUMMARY.md — Wave 0 test scaffold (fixtures with test_flows, skipped stubs)"
  provides:
    - "src/model/spec.ts — TestFlowStepSchema, TestFlowSchema, TestFlow type, test_flows field in SpecSchema"
    - "src/model/cross-reference.ts — MAESTRO_UNRESOLVED_SCREEN / MAESTRO_UNRESOLVED_ACTION diagnostics"
    - "src/model/index.ts — TestFlow, TestFlowSchema, TestFlowStep, TestFlowStepSchema re-exported"
  affects:
    - "src/emit/maestro/index.ts — emitter (Plan 03) can now import TestFlow type and iterate spec.test_flows"
    - "src/serialize/unknown.test.ts — test_flows now a known key; unknown passthrough assertion is stale (Plan 02 fixes this)"

tech_stack:
  added: []
  patterns:
    - "TestFlowSchema follows WizardMetaSchema naming convention (Phase-6 spread pattern)"
    - "test_flows added as named key to SpecSchema (not spread) so .strict() remains enforced"
    - "crossReferencePass extended with guarded loop (spec.test_flows ?? []) for backward compat"

key_files:
  created: []
  modified:
    - src/model/spec.ts
    - src/model/cross-reference.ts
    - src/model/index.ts

decisions:
  - "ActionIdSchema and ScreenIdSchema imported directly from ../primitives/ids.ts into spec.ts — they are branded types with transform, safe to use in TestFlowStepSchema"
  - "Non-null assertions (!) replaced with optional chaining + continue guards to satisfy biome noNonNullAssertion rule"
  - "Import order in spec.ts sorted per biome organizeImports rule (../primitives before ./model siblings)"

metrics:
  duration: "145 seconds"
  completed: "2026-04-19"
  tasks_completed: 2
  tasks_total: 2
  files_created: 0
  files_modified: 3
---

# Phase 07 Plan 02: Spec Model Extension — TestFlowSchema + crossReferencePass Summary

TestFlowStepSchema and TestFlowSchema added to SpecSchema as an optional named key, with crossReferencePass extended to emit MAESTRO_UNRESOLVED_SCREEN / MAESTRO_UNRESOLVED_ACTION diagnostics for bad test_flows references.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add TestFlowSchema to src/model/spec.ts | 40b699e | src/model/spec.ts, src/model/index.ts |
| 2 | Extend crossReferencePass with test_flows validation | bab0591 | src/model/cross-reference.ts, src/model/spec.ts |

## Verification

- `npx vitest run` — 951 passed, 14 skipped, 0 failed, exit 0
- `npx tsc --noEmit` — exit 0
- `npx biome check src/model/spec.ts src/model/cross-reference.ts src/model/index.ts` — 0 errors
- `grep -c "TestFlowSchema" src/model/spec.ts` — 3 (>= 2 required)
- `grep "export type TestFlow " src/model/spec.ts` — matches
- `grep "TestFlow" src/model/index.ts` — matches
- `grep "\.strict()" src/model/spec.ts` — matches
- `grep "MAESTRO_UNRESOLVED_SCREEN" src/model/cross-reference.ts` — matches

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Lint] Fixed biome import order and non-null assertion violations**
- **Found during:** Task 2 (biome check)
- **Issue:** biome flagged unsorted imports in spec.ts (primitives import after model imports) and two `!` non-null assertions in the test_flows loop in cross-reference.ts (`noNonNullAssertion` rule)
- **Fix:** Moved `ActionIdSchema, ScreenIdSchema` import above `./action.ts` in spec.ts; replaced `spec.test_flows![fi]!` with `spec.test_flows?.[fi]` + `if (!flow) continue` guard; replaced `flow.steps[si]!` with `flow.steps[si]` + `if (!step) continue` guard
- **Files modified:** src/model/spec.ts, src/model/cross-reference.ts
- **Commit:** bab0591 (included in Task 2 commit)

## Known Stubs

None — this plan adds schema and cross-reference infrastructure only. The emitter (`src/emit/maestro/index.ts`) is Plan 03.

## Threat Surface Scan

No new network endpoints, auth paths, or file access patterns introduced. Changes are pure in-memory schema validation. T-7-02-01 and T-7-02-02 mitigations are in place as designed.

## Self-Check: PASSED
