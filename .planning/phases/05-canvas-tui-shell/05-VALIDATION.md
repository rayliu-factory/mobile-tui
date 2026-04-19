---
phase: 5
slug: canvas-tui-shell
status: final
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-19
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^4.1.4 |
| **Config file** | vitest.config.ts (existing) |
| **Quick run command** | `npx vitest run tests/canvas-focus.test.ts tests/canvas-render.test.ts tests/canvas-chrome.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/canvas-focus.test.ts tests/canvas-render.test.ts tests/canvas-render.test.ts tests/canvas-chrome.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | CANVAS-01..06 | — | All stubs compile with correct exports; no runtime errors | unit (scaffold) | `npx vitest run tests/canvas-focus.test.ts tests/canvas-render.test.ts tests/canvas-chrome.test.ts tests/canvas-integration.test.ts` | ❌ Wave 0 | ✅ green |
| 05-02-01 | 02 | 2 | CANVAS-01, CANVAS-03, CANVAS-04 | T-05-06 | renderHelpLine returns D-84 strings; renderSaveIndicator applies theme.fg; nextFocus cycles correctly | unit (TDD) | `npx vitest run tests/canvas-focus.test.ts tests/canvas-render.test.ts` | ❌ Wave 0 | ✅ green |
| 05-02-02 | 02 | 2 | CANVAS-01 | T-05-04, T-05-05 | calcPaneWidths sums to total; HorizontalLayout lines never exceed width; drawBorderedPane accent/muted per D-79 | unit (TDD) | `npx vitest run tests/canvas-render.test.ts` | ❌ Wave 0 | ✅ green |
| 05-03-01 | 03 | 2 | CANVAS-01 | T-05-07 | ScreensListPane renders all screens with `> name` / `  name` format; ⚠ suffix for error screens | unit (TDD) | `npx vitest run tests/canvas-render.test.ts` | ❌ Wave 0 | ✅ green |
| 05-04-01 | 04 | 2 | CANVAS-01 | T-05-09 | PropertyInspectorPane renders field rows; Enter opens Input; Esc cancels; diagnostics show ⚠ | unit (TDD) | `npx vitest run tests/canvas-render.test.ts` | ❌ Wave 0 | ✅ green |
| 05-05-01 | 05 | 3 | CANVAS-02 | T-05-13 | CommandPalette renders all COMMANDS; fuzzy filter narrows list; arg-prompt fires on Enter | unit (TDD) | `npx vitest run tests/canvas-focus.test.ts` | ❌ Wave 0 | ✅ green |
| 05-05-02 | 05 | 3 | CANVAS-01 | — | WireframePreviewPane renders content variant without alt-buffer escapes | unit (snapshot) | `npx vitest run tests/canvas-render.test.ts tests/canvas-chrome.test.ts` | ❌ Wave 0 | ✅ green |
| 05-06-01 | 06 | 4 | CANVAS-01, CANVAS-02, CANVAS-03, CANVAS-04, CANVAS-06 | T-05-22, T-05-23 | RootCanvas wires all panes; global keys intercepted before pane dispatch; focus borders accent/muted; no raw escape sequences | unit (TDD) | `npx vitest run tests/canvas-focus.test.ts tests/canvas-render.test.ts tests/canvas-chrome.test.ts` | ❌ Wave 0 | ✅ green |
| 05-06-02 | 06 | 4 | CANVAS-05 | T-05-21 | scripts/canvas.ts exits 0 for valid spec, exits 1 for bad spec, exits 2 for no arg | integration + smoke | `npx vitest run tests/canvas-integration.test.ts && npx tsx scripts/canvas.ts fixtures/habit-tracker.spec.md` | ❌ Wave 0 | ✅ green |

*Status: ✅ green · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/canvas-focus.test.ts` — stubs for CANVAS-01, CANVAS-02 (created in Plan 01)
- [x] `tests/canvas-render.test.ts` — stubs for CANVAS-01, CANVAS-03, CANVAS-04 (created in Plan 01)
- [x] `tests/canvas-chrome.test.ts` — stub for CANVAS-06 (created in Plan 01)
- [x] `tests/canvas-integration.test.ts` — stub for CANVAS-05 (created in Plan 01)
- [x] `src/canvas/` directory — all canvas module stubs (created in Plan 01)

*(Wave 0 completes when Plan 01 executes. Existing test infrastructure in `tests/` covers Phases 1–4 fully; canvas tests are net-new.)*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Focus border visually renders correctly in terminal | CANVAS-01 (D-79) | Visual color confirmation requires real terminal | Run `npx tsx scripts/canvas.ts fixtures/habit-tracker.spec.md`; press Tab; confirm focused pane has bright border, others dim |
| Command palette overlays center+right panes cleanly | CANVAS-02 | Overlay z-order requires real terminal | Run canvas CLI; press `:` or `Ctrl+P`; confirm palette overlays without corrupting base layout |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify commands
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (Plan 01 creates all test scaffolds)
- [x] No watch-mode flags (all commands use `vitest run` not `vitest`)
- [x] Feedback latency ~15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ✅ approved 2026-04-19 (Phase 5 shipped — all 6 plans complete, canvas TUI shell functional)
