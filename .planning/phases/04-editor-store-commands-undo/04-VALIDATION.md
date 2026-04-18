---
phase: 4
slug: editor-store-commands-undo
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-18
audited: 2026-04-19
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Full detail lives in `04-RESEARCH.md` §Validation Architecture. This document is the
> per-task map the plan-checker and executor consume.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.4 (already installed) |
| **Config file** | none (defaults via `package.json` scripts); fake-timer setup is per-test via `vi.useFakeTimers()` |
| **Quick run command** | `npx vitest run src/editor/` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~8–15 seconds for quick; ~30–60 seconds for full |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run <touched test file>` (per-file)
- **After every plan wave:** Run `npx vitest run src/editor/` + any `tests/editor-*` / `tests/cli-edit*` / `tests/autosave-*` updated this wave
- **Before `/gsd-verify-work`:** `npm test` must be green (0 failures, ≤ prior skip count)
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

> Populated by planner from per-plan tasks. Each row below is a requirement × test-type slot the plan MUST fill with a concrete task.

| Req ID | Behavior | Test Type | Automated Command | File Exists | Status |
|--------|----------|-----------|-------------------|-------------|--------|
| EDITOR-01 | Single store, full-value subscription, no per-shell copies | unit + integration | `npx vitest run src/editor/store.test.ts` | ✅ | ✅ green |
| EDITOR-01 | Unsubscribe removes listener (no memory leak) | unit | `npx vitest run src/editor/store.test.ts -t unsubscribe` | ✅ | ✅ green |
| EDITOR-02 | Per-command apply→invert→apply idempotence (≥3 fixtures × 34 commands) | table-driven unit | `npx vitest run src/editor/commands/` | ✅ | ✅ green |
| EDITOR-02 | 200-apply / 200-undo byte-identical round-trip | integration | `npx vitest run tests/editor-store.test.ts -t 200-cycle` | ✅ | ✅ green |
| EDITOR-03 | Undo stack caps at 200, drops oldest on overflow | unit | `npx vitest run src/editor/undo.test.ts` | ✅ | ✅ green |
| EDITOR-03 | Redo stack cleared on new apply | unit | `npx vitest run src/editor/undo.test.ts -t redo-cleared` | ✅ | ✅ green |
| EDITOR-04 | 10 applies in 100ms → ≤1 write (trailing-edge 500ms) | unit w/ fake timers | `npx vitest run tests/autosave-debounce.test.ts -t coalesce` | ✅ | ✅ green |
| EDITOR-04 | `store.flush()` cancels timer + writes immediately | unit w/ fake timers | `npx vitest run tests/autosave-debounce.test.ts -t flush` | ✅ | ✅ green |
| EDITOR-04 | `beforeExit` handler registered + calls `flush()` | unit (spy) | `npx vitest run tests/autosave-debounce.test.ts -t beforeExit` | ✅ | ✅ green |
| EDITOR-05 | Subscribers receive `{ spec, diagnostics }` within one tick | unit | `npx vitest run tests/editor-diagnostics.test.ts` | ✅ | ✅ green |
| EDITOR-05 | validateSpec errors do not block apply; save-gate catches on flush | integration | `npx vitest run tests/editor-diagnostics.test.ts -t validate-does-not-block` | ✅ | ✅ green |
| EDITOR-06 | cli-edit exit 0 on happy path | integration | `npx vitest run tests/cli-edit.test.ts -t "exit 0"` | ✅ | ✅ green |
| EDITOR-06 | cli-edit exit 1 on CLI/IO error | integration | `npx vitest run tests/cli-edit.test.ts -t "exit 1"` | ✅ | ✅ green |
| EDITOR-06 | cli-edit exit 2 on save-gate (severity:error) | integration | `npx vitest run tests/cli-edit.test.ts -t "exit 2"` | ✅ | ✅ green |
| EDITOR-06 | cli-edit stderr format `<severity> <path>: <message>` | integration | `npx vitest run tests/cli-edit.test.ts -t stderr` | ✅ | ✅ green |
| SERDE-06 (debounce half) | Trailing-edge only — leading apply does NOT write | unit w/ fake timers | `npx vitest run tests/autosave-debounce.test.ts -t trailing-edge` | ✅ | ✅ green |
| D-62 canary (RESEARCH A1) | Plan 04-01 minimal add-screen + undo byte-identical | integration | `npx vitest run tests/editor-store.test.ts -t "A1 canary"` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `src/editor/store.test.ts` — store primitive stubs (EDITOR-01)
- [x] `src/editor/undo.test.ts` — stack cap + redo-clear stubs (EDITOR-03)
- [x] `src/editor/commands/<name>.test.ts` — one stub per command (34 files) (EDITOR-02)
- [x] `tests/editor-store.test.ts` — 200-apply / 200-undo integration harness (EDITOR-02 + A1)
- [x] `tests/editor-diagnostics.test.ts` — one-tick subscriber harness (EDITOR-05)
- [x] `tests/autosave-debounce.test.ts` — fake-timers debounce harness (EDITOR-04 + SERDE-06)
- [x] `tests/cli-edit.test.ts` — CLI integration harness via `node:child_process` (EDITOR-06)

*All test files are Wave 0 shells; failing RED commits + passing GREEN commits land per plan.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| ⋯ | ⋯ | ⋯ | ⋯ |

*None — all Phase 4 behaviors have automated verification. Headless by design (success crit #1: "scriptable with no TUI in the loop").*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify command or Wave 0 dependencies declared
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all ❌ rows in the Per-Task Verification Map
- [x] No watch-mode flags in any verify command (`vitest` not `vitest --watch`)
- [x] Feedback latency < 60s on `npx vitest run src/editor/`
- [x] A1 canary (Plan 04-01) authored FIRST — validates D-62 AST-invert discipline before 34 commands depend on it
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** 2026-04-19 — automated audit confirmed 17/17 requirements green (159 tests, 40 files, 11.35s)

---

## Validation Audit 2026-04-19

| Metric | Count |
|--------|-------|
| Requirements audited | 17 |
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
| Test files verified | 40 |
| Tests passing | 159 |
| Suite runtime | 11.35s |
