---
phase: 7
slug: maestro-emitter
status: final
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-19
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.4 |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npx vitest run tests/maestro-emitter.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/maestro-emitter.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 7-W0-01 | W0 | 0 | MAESTRO-01 | — | N/A | unit stub | `npx vitest run tests/maestro-emitter.test.ts` | ✅ | ✅ green |
| 7-01-01 | 01 | 1 | MAESTRO-01 | — | pure function, no IO | unit | `npx vitest run tests/maestro-emitter.test.ts -t "pure function"` | ✅ | ✅ green |
| 7-01-02 | 01 | 1 | MAESTRO-02 | — | N/A | unit | `npx vitest run tests/maestro-emitter.test.ts -t "platform branching"` | ✅ | ✅ green |
| 7-01-03 | 01 | 1 | MAESTRO-03 | — | missing testID fails loud, no files written | unit | `npx vitest run tests/maestro-emitter.test.ts -t "missing testID"` | ✅ | ✅ green |
| 7-02-01 | 02 | 2 | MAESTRO-04 | T-7-shell-inject | execFileSync not exec | integration | `MAESTRO_CLI=1 npx vitest run tests/maestro-emitter.test.ts -t "check-syntax"` | ✅ | ✅ green |
| 7-03-01 | 03 | 3 | MAESTRO-05 | T-7-path-traversal | sanitize flow name → snake_case | integration | `npx vitest run tests/canvas-integration.test.ts -t "emit maestro"` | ✅ | ✅ green |
| 7-04-01 | 04 | 4 | MAESTRO-01 | — | byte-identical golden output | snapshot | `npx vitest run tests/maestro-emitter.test.ts -t "golden"` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/maestro-emitter.test.ts` — stubs for MAESTRO-01 through MAESTRO-04 (pure function, platform branching, missing testID, check-syntax)
- [x] `fixtures/habit-tracker.spec.md` — with `test_flows:` block (navigate + submit + custom actions)
- [x] `fixtures/todo.spec.md` — with `test_flows:` block (mutate + present + dismiss actions)
- [x] `flows/.gitkeep` — output directory tracked in git

*Existing vitest infrastructure covers all phase requirements — no new framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Author certifies ≥1 generated flow file is human-readable | MAESTRO-01 | Subjective readability judgment | Open a generated `.ios.yaml` or `.android.yaml`, confirm YAML is clean, appId is prominent, steps are self-explanatory |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** complete — 2026-04-19
