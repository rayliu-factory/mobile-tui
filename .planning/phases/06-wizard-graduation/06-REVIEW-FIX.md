---
phase: 06-wizard-graduation
fixed_at: 2026-04-19T00:00:00Z
review_path: .planning/phases/06-wizard-graduation/06-REVIEW.md
iteration: 1
fix_scope: critical_warning
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 06: Code Review Fix Report

**Fixed at:** 2026-04-19T00:00:00Z
**Source review:** .planning/phases/06-wizard-graduation/06-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 5 (WR-01 through WR-05; no Critical findings)
- Fixed: 5
- Skipped: 0

Post-fix verification: 944 tests GREEN, `tsc --noEmit` clean.

## Fixed Issues

### WR-01: Wrong args key sent to `store.apply` for step 7 (target_platforms)

**Files modified:** `src/wizard/panes/form-pane.ts`
**Commit:** 4d73ed5
**Applied fix:** Changed `applyArgs = { values: platforms }` to `applyArgs = { value: platforms }` at line 179, matching the `setWizardTargetPlatformsArgs` schema which expects the singular key `value`.

---

### WR-02: Private field bypass for `HorizontalLayout.panes` mutated on every render

**Files modified:** `src/canvas/horizontal-layout.ts`, `src/wizard/root.ts`
**Commit:** b5fa455
**Applied fix:** Added a public `setPanes(panes: PaneSpec[]): void` method to `HorizontalLayout` (also changed the field from `readonly` to mutable to support it). Updated `WizardRoot.render()` to call `this.layout.setPanes(paneSpecs)` instead of the `as unknown as` private-field cast.

---

### WR-03: Seed YAML written without gray-matter — round-trip inconsistency

**Files modified:** `scripts/wizard.ts`
**Commit:** 6bd44c8
**Applied fix:** Added trailing `\n` after the closing `---` delimiter in the seed YAML template string, matching the format gray-matter produces on first save and preventing unnecessary git churn.

---

### WR-04: `nameToId` can produce an empty string for all-symbol screen names

**Files modified:** `src/editor/commands/set-wizard-screens.ts`
**Commit:** 70eadb8
**Applied fix:** Refactored `nameToId` to compute a `slug` variable with an additional `.replace(/^-+|-+$/g, "")` step to trim leading/trailing dashes, then added a guard that falls back to a deterministic hash-based id (`screen-NNNN`) when the slug is empty (e.g. input `"!!!"` or `"@#$"`).

---

### WR-05: `onSnapshot` resets step cursor via `setStep` on every store update

**Files modified:** `src/wizard/root.ts`
**Commit:** 32e0faa
**Applied fix:** Updated `onSnapshot` to capture `prevSpec` before overwriting `this.snapshot`, then compare `STEP_DEFINITIONS[this.stepCursor].getPrePopulate(prevSpec)` against the new value. `setStep` is only called when the spec value for the current step actually changed, preventing in-progress user input from being silently discarded on unrelated store updates (e.g. undo). Also added `STEP_DEFINITIONS` to the import from `./steps/index.ts`.

---

_Fixed: 2026-04-19T00:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
