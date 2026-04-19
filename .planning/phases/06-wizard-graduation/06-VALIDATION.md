---
phase: 6
slug: wizard-graduation
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-19
audited: 2026-04-19
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^4.1.4 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/wizard-* src/wizard/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/wizard-* src/wizard/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 6-01-01 | 01 | 1 | WIZARD-01 | T-06-01 | z.safeParse validates wizard command args | unit | `npx vitest run src/wizard/seed-spec.test.ts` | ✅ | ✅ green |
| 6-01-02 | 01 | 1 | WIZARD-01,02,05 | T-06-03 | SpecSchema `.strict()` retained | unit | `npx vitest run tests/wizard-canvas-parity.test.ts` | ✅ | ✅ green |
| 6-02-01 | 02 | 1 | WIZARD-01..05 | — | N/A | unit stubs | `npx vitest run tests/wizard-*.test.ts` | ✅ | ✅ green |
| 6-03-01 | 03 | 2 | WIZARD-01,04 | — | N/A | unit | `npx vitest run tests/wizard-step-indicator.test.ts tests/wizard-reentry.test.ts` | ✅ | ✅ green |
| 6-04-01 | 04 | 2 | WIZARD-02,03 | T-06-01 | Arg injection guarded by z.safeParse | unit | `npx vitest run tests/wizard-form-pane.test.ts tests/wizard-step-components.test.ts` | ✅ | ✅ green |
| 6-05-01 | 05 | 3 | WIZARD-03 | — | Read-only pane, no input handling | unit | `npx vitest run src/wizard/panes/spec-preview.test.ts` | ✅ | ✅ green |
| 6-06-01 | 06 | 3 | WIZARD-04,05 | — | N/A | integration | `npx vitest run tests/wizard-chrome.test.ts tests/wizard-navigation.test.ts tests/wizard-save-advance.test.ts tests/wizard-integration.test.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

All Wave 0 stubs have been implemented and tests are passing:

- [x] `tests/wizard-chrome.test.ts` — WizardRoot chrome hygiene (WIZARD-01)
- [x] `tests/wizard-step-indicator.test.ts` — renderStepIndicator pure function (WIZARD-01)
- [x] `tests/wizard-reentry.test.ts` — firstUnansweredStep + re-entry (WIZARD-04)
- [x] `tests/wizard-navigation.test.ts` — Tab/Esc/Ctrl+G navigation (WIZARD-01,03)
- [x] `tests/wizard-save-advance.test.ts` — save-on-advance and undo (WIZARD-02)
- [x] `tests/wizard-integration.test.ts` — end-to-end integration (WIZARD-02,03,04)
- [x] `tests/wizard-canvas-parity.test.ts` — WIZARD-05 keybinding/command parity
- [x] `tests/wizard-form-pane.test.ts` — FormPane construction, render, keyboard (WIZARD-02,03)
- [x] `tests/wizard-step-components.test.ts` — ScreensStep + DataStep (WIZARD-02)
- [x] `src/wizard/panes/spec-preview.test.ts` — SpecPreviewPane (WIZARD-03)
- [x] `src/wizard/seed-spec.test.ts` — createSeedSpec factory (WIZARD-01)

---

## Test Coverage Summary

| Requirement | Test Files | Tests | Status |
|-------------|-----------|-------|--------|
| WIZARD-01 (linear navigation, step indicator) | wizard-chrome, wizard-step-indicator, wizard-navigation, wizard-canvas-parity | 18 | ✅ |
| WIZARD-02 (save-on-advance, store integration) | wizard-save-advance, wizard-form-pane, wizard-step-components | 22 | ✅ |
| WIZARD-03 (spec preview, Ctrl+G graduation) | wizard-navigation, wizard-form-pane, spec-preview | 15 | ✅ |
| WIZARD-04 (re-entry at first TODO step) | wizard-reentry, wizard-integration, wizard-navigation | 12 | ✅ |
| WIZARD-05 (command/keybinding parity) | wizard-canvas-parity | 4 | ✅ |

**Total wizard tests: 60 passing** (full suite: 944 tests, 114 files, 0 failures)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Skip-to-canvas from step 3 mid-fill | WIZARD-03 | Requires TUI interaction | Run `npx tsx scripts/wizard.ts test.spec.md`, reach step 3, press Ctrl+G, verify canvas opens with partial spec loaded |
| Re-entry lands on first TODO step | WIZARD-04 | File state + TUI flow | Create partial spec (steps 1-3 answered), re-run `npx tsx scripts/wizard.ts test.spec.md`, verify wizard opens at step 4 |

*Both behaviors are covered by automated tests for their logic units; the manual test verifies the full TUI rendering path.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify commands
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all WIZARD-* requirements
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** complete

---

## Validation Audit 2026-04-19

| Metric | Count |
|--------|-------|
| Test files found | 11 (9 in tests/, 2 in src/wizard/) |
| Gaps found | 0 |
| Resolved | 0 (all already covered) |
| Escalated | 0 |
| Total tests | 60 wizard + 884 other = 944 |
