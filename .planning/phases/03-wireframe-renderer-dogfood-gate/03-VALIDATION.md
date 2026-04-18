---
phase: 3
slug: wireframe-renderer-dogfood-gate
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-18
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: `.planning/phases/03-wireframe-renderer-dogfood-gate/03-RESEARCH.md` §Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `vitest@^4.1.4` (already configured in `vitest.config.ts`) |
| **Config file** | `vitest.config.ts` (existing — coverage thresholds stmts 80 / fn 80 / br 75; Phase 3 honors) |
| **Quick run command** | `npx vitest run src/emit/wireframe` |
| **Full suite command** | `npx vitest run && npx tsc --noEmit && npx biome check .` |
| **Estimated runtime** | ~6s unit, ~15s full gate |

---

## Sampling Rate

- **After every task commit (RED → GREEN):** `npx vitest run {path-to-new-or-changed-test}` — fast feedback on the single emitter / composite under work.
- **After every plan wave:** `npx vitest run && npx tsc --noEmit && npx biome check .` — full gate green, no regression on Phase-1 / Phase-2 suites (425/425 baseline).
- **Before `/gsd-verify-work`:** Full suite green **AND** `tests/dogfood-gate.test.ts` passes **AND** `fixtures/wireframes/SHARED.md` has ≥3 entries marked `shareable` **AND** author has pasted ≥3 wireframes into a real PR / Slack / issue.
- **Max feedback latency:** < 15s per commit (unit), < 30s per wave merge (full gate).

---

## Per-Requirement Verification Map

| Req ID | Behavior | Test Type | Automated Command | File Exists | Wave |
|--------|----------|-----------|-------------------|-------------|------|
| WIREFRAME-01 | 40-line ≈ 60-col ASCII with explicit `\|` right borders | integration | `npx vitest run tests/wireframe-catalog.test.ts` | ❌ W2 | 2 |
| WIREFRAME-01 | Every line ends in `\|` or block boundary `+` | unit | `npx vitest run tests/wireframe-ascii-baseline.test.ts -t "right border"` | ❌ W2 | 2 |
| WIREFRAME-02 | Only `[\|\-+. ]` + printable ASCII `\x20-\x7E` | regex integration | `npx vitest run tests/wireframe-ascii-baseline.test.ts` | ❌ W2 | 2 |
| WIREFRAME-03 | Every 18 kinds has a snapshot + 5 composites snapshot-locked | snapshot | `npx vitest run tests/wireframe-catalog.test.ts` + `npx vitest run src/emit/wireframe/components` | ❌ W1/W2 | 1 & 2 |
| WIREFRAME-04 | Every screen renders 4 variant blocks; null → `(N/A)` 1-line marker (never omitted) | snapshot | `npx vitest run src/emit/wireframe/variants.test.ts` | ❌ W2 | 2 |
| WIREFRAME-05 | `render(spec, screenId)` is pure; CLI exits 0 on canonical fixture | unit + integration | `npx vitest run src/emit/wireframe/index.test.ts` + `npx tsx scripts/render-wireframe.ts fixtures/habit-tracker.spec.md home` | ❌ W2/W3 | 2 & 3 |
| WIREFRAME-06 | Exactly 20 `.wf.txt` files + `SHARED.md` ≥ 3 shareable entries | integration | `npx vitest run tests/dogfood-gate.test.ts` | ❌ W3 | 3 |

---

## Per-Task Verification Map

Populated by the planner in each `-PLAN.md`'s `files_modified` + task `<acceptance_criteria>`. Each task references at least one command from the per-requirement map above, and every task commit must leave `npx vitest run` green (no red tests left at commit boundaries).

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Phase 3 Wave 0 is minimal — the vitest / biome / tsc toolchain already exists from Phase 1.

- [ ] `src/emit/wireframe/` directory + `index.ts` barrel scaffolding
- [ ] `tests/wireframe-catalog.test.ts` — covers WIREFRAME-03
- [ ] `tests/wireframe-ascii-baseline.test.ts` — covers WIREFRAME-02
- [ ] `tests/dogfood-gate.test.ts` — covers WIREFRAME-06
- [ ] `scripts/render-wireframe.ts` — CLI entry scaffold
- [ ] `fixtures/wireframes/` directory + `README.md` + `SHARED.md` scaffolding

No framework install needed. No shared fixture module beyond `parseSpecFile` (Phase 2 provides).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Author pastes ≥3 wireframes into a real PR / Slack / issue and judges them "shareable" | WIREFRAME-06 | Shareability is subjective; v1 audience is the author per PROJECT.md | For each of 3 selected wireframes: `cat fixtures/wireframes/{fixture}/{screen}-{variant}.wf.txt` → paste into target surface → add entry to `fixtures/wireframes/SHARED.md` with URL, date, verdict (`shareable` or `needs-work` + note). Phase 4 first plan refuses to run until ≥3 entries marked `shareable` exist. |

---

## Validation Sign-Off

- [ ] Every plan's tasks carry `<read_first>` and grep-verifiable `<acceptance_criteria>`
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all infrastructure additions (test files + scripts dir + fixtures dir)
- [ ] Full gate green at every wave boundary
- [ ] Dogfood gate (≥3 shareable entries) completed before Phase 4 first plan runs
- [ ] Feedback latency < 30s per wave merge
- [ ] `nyquist_compliant: true` set in frontmatter when all boxes checked

**Approval:** pending
