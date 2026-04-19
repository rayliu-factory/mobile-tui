---
phase: 08-llm-handoff-commands
plan: 02
subsystem: emit/handoff
tags: [emit, handoff, prompt-assembly, token-budget, semantic-tokens, pure-function]
dependency_graph:
  requires:
    - src/model/index.ts
    - src/model/spec.ts
    - src/model/screen.ts
    - src/model/component.ts
    - src/model/navigation.ts
    - src/model/data.ts
  provides:
    - src/emit/handoff/assembler.ts
    - src/emit/handoff/semantic-tokens.ts
    - src/emit/handoff/token-budget.ts
    - src/emit/handoff/index.ts
  affects:
    - src/editor/commands/prompt-screen.ts (plan 08-03 consumer)
    - src/editor/commands/extract-screen.ts (plan 08-03 consumer)
tech_stack:
  added:
    - gpt-tokenizer@^3.4.0 (BPE cl100k_base token counting)
  patterns:
    - Pure function assembler following emit/maestro/emitter.ts structural precedent
    - TDD RED/GREEN per-task commit cycle
    - Explicit-named barrel exports (no export *)
    - HTML comment spec-props block for structural prop audit (D-205)
    - Token budget degradation: neighbors/entities degrade; spec+acceptance never truncated (D-201)
key_files:
  created:
    - src/emit/handoff/semantic-tokens.ts
    - src/emit/handoff/token-budget.ts
    - src/emit/handoff/assembler.ts
    - src/emit/handoff/index.ts
    - tests/handoff/semantic-tokens.test.ts
    - tests/handoff/assembler.test.ts
    - tests/handoff/prompt-screen.test.ts
  modified:
    - package.json (added gpt-tokenizer@^3.4.0)
decisions:
  - spec.actions is Record<ActionId, Action> (not array) — buildActionsSection uses Object.entries()
  - walkComponentProps recurses into child/itemTemplate/leading/trailing slots for complete coverage
  - SEMANTIC_TOKENS includes BackBehavior values (pop/dismiss) for completeness
metrics:
  duration: ~8 minutes
  completed: 2026-04-20
  tasks: 2
  files: 7
---

# Phase 08 Plan 02: Handoff Emitter — Semantic Tokens + Prompt Assembler Summary

**One-liner:** Pure-function prompt assembler with gpt-tokenizer BPE budget enforcement, semantic-token allowlist, and deterministic section ordering for LLM handoff commands.

## What Was Built

The `src/emit/handoff/` layer: 4 files implementing HANDOFF-02 and HANDOFF-04.

- **semantic-tokens.ts** — `SEMANTIC_TOKENS` Set covering all ComponentNode prop value unions (Button.variant, Text.style, Column/Row.gap/align, Spacer.size, Screen.kind, NavEdge.transition, BackBehavior). Rejects pixel values by design.

- **token-budget.ts** — Thin wrappers over `gpt-tokenizer@3.4.0`: `countTokens(str)` returns exact BPE count; `isWithinBudget(str, limit)` uses early-exit `isWithinTokenLimit` for efficiency.

- **assembler.ts** — `assemblePrompt(spec, screenId, target)` pure function. Section order: `## Task` → `## Screen Spec` → `## Acceptance Criteria` → `## Navigation Neighbors` → `## Data Entities` → (optional `## Actions & TestIDs` for `tests` target) → `<!-- spec-props: {...} -->`. Degrades nav neighbors and data entities to summary form when the full prompt exceeds 2000 tokens; screen spec and acceptance criteria are never truncated (D-201).

- **index.ts** — Explicit-named barrel re-exporting `assemblePrompt`, `AssembleResult`, `Target`, `SEMANTIC_TOKENS`, `countTokens`, `isWithinBudget`.

## Tests

50 new tests across 3 test files (all pass):
- `tests/handoff/semantic-tokens.test.ts` — 30 tests covering SEMANTIC_TOKENS membership and token-budget API
- `tests/handoff/assembler.test.ts` — 15 tests: section order, target-specific sections, spec-props audit, token budget
- `tests/handoff/prompt-screen.test.ts` — 3 tests: full budget sweep across all screens × all targets on habit-tracker fixture

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] spec.actions is Record<ActionId, Action>, not an array**
- **Found during:** Task 2 implementation
- **Issue:** The plan template for `buildActionsSection` called `spec.actions.filter(a => a.id === ...)` treating it as an array. But `ActionsRegistrySchema = z.record(ActionIdSchema, ActionSchema)` — `spec.actions` is a plain Record.
- **Fix:** Used `Object.entries(spec.actions).filter(([id]) => actionIds.has(id))` and collected testIDs by walking the component tree separately.
- **Files modified:** src/emit/handoff/assembler.ts
- **Impact:** Correctness — the array approach would have thrown at runtime.

**2. [Rule 2 - Enhancement] Extended tree walker to recurse into child/itemTemplate/leading/trailing slots**
- **Found during:** Task 2 implementation
- **Issue:** The plan's template walker only recursed into `children` and `items`. ComponentNode shapes include `Card.child`, `List.itemTemplate`, `NavBar.leading`, `NavBar.trailing` — missing these means entity/action collection is incomplete.
- **Fix:** Added explicit recursion for `child`, `itemTemplate`, `leading`, `trailing` in all 4 tree walkers (collectBindsTo, collectActionIds, walkActionTestIds, walkComponentProps).
- **Files modified:** src/emit/handoff/assembler.ts

## TDD Gate Compliance

- RED gate: `test(08-02): add failing tests for semantic-tokens and token-budget` — commit ada6176
- GREEN gate: `feat(08-02): implement semantic-tokens and token-budget` — commit 2feaa3f
- RED gate: `test(08-02): add failing tests for assembler.ts` — commit df4438c
- GREEN gate: `feat(08-02): implement assembler.ts and barrel index.ts` — commit 499dfa9

Both TDD cycles completed correctly. No RED tests unexpectedly passed before implementation.

## Commits

| Hash | Message |
|------|---------|
| ada6176 | test(08-02): add failing tests for semantic-tokens and token-budget (RED gate) |
| 2feaa3f | feat(08-02): implement semantic-tokens and token-budget (GREEN gate) |
| df4438c | test(08-02): add failing tests for assembler.ts (RED gate) |
| 499dfa9 | feat(08-02): implement assembler.ts and barrel index.ts (GREEN gate) |

## Threat Mitigations Applied

| Threat | Applied |
|--------|---------|
| T-8-02 (DoS — oversized prompt) | `isWithinBudget(full, 2000)` gates final prompt; degradation produces best-effort output |
| T-8-05 (Tampering — YAML injection) | Plain JS objects constructed before YAML.stringify; Zod types never reach YAML layer |
| HANDOFF-04 (semantic token enforcement) | `<!-- spec-props: {...} -->` comment block in all prompts; tests parse + validate every value against SEMANTIC_TOKENS |

## Self-Check: PASSED

All 4 source files exist. All 4 task commits verified.

Files created:
