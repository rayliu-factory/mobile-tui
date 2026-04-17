---
status: partial
phase: 01-spec-model-invariants
source: [01-VERIFICATION.md, 01-VALIDATION.md §Manual-Only Verifications]
started: 2026-04-17T14:35:00Z
updated: 2026-04-17T14:35:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Two-target fidelity gate (success criterion #5)

expected: A competent reviewer translating `fixtures/habit-tracker.spec.md` to SwiftUI and Jetpack Compose would produce code materially identical to `fixtures/targets/habit-tracker.swift` and `fixtures/targets/habit-tracker.kt` — no invented structure, no ambiguity in component→native mapping.

Automated half (`tests/fidelity.test.ts` 3/3 green) confirms: both target files exist, reference every Screen.id from the spec, and embed testID sigils for every interactable. Human judgment is required for "zero ambiguity" — is there any component kind, action, or variant trigger whose intended translation is unclear?

result: [pending]

Instructions:
1. Open `fixtures/habit-tracker.spec.md` and `fixtures/habit-tracker.spec.json`.
2. Open `fixtures/targets/habit-tracker.swift` and `fixtures/targets/habit-tracker.kt`.
3. For each screen, walk the component tree and verify each node has exactly one defensible native representation.
4. For each action (5 total), verify the SwiftUI/Compose code faithfully performs the intent (navigate/submit/mutate/present/dismiss).
5. Check that variant triggers (`when: { collection: ... }` etc.) map unambiguously.
6. Sign off "approved" if another reviewer would produce the same code, or list specific ambiguities.

### 2. Acceptance-prose readability (SPEC-10)

expected: Each fixture's `acceptance:` array (per-screen prose one-liners) reads as a human-testable statement. Maestro test scaffolds in a later phase will consume these; they should already read like natural acceptance criteria without needing structural refactoring.

result: [pending]

Instructions:
1. Open each fixture's `.spec.md` body.
2. Locate the `acceptance:` array on each screen (optional per D-10).
3. Confirm each line reads as a testable behavior statement (not a technical spec, not a vague goal).
4. Sign off "approved" or flag lines that need rewriting.

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
