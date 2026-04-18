---
phase: 3
slug: wireframe-renderer-dogfood-gate
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-18
audited: 2026-04-18
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
| **Estimated runtime** | ~2.4s unit, ~6s full gate (observed 2026-04-18: 595 tests in 2.34s) |

---

## Sampling Rate

- **After every task commit (RED → GREEN):** `npx vitest run {path-to-new-or-changed-test}` — fast feedback on the single emitter / composite under work.
- **After every plan wave:** `npx vitest run && npx tsc --noEmit && npx biome check .` — full gate green, no regression on Phase-1 / Phase-2 suites (425/425 baseline).
- **Before `/gsd-verify-work`:** Full suite green **AND** `tests/dogfood-gate.test.ts` passes **AND** `fixtures/wireframes/SHARED.md` has ≥3 entries marked `shareable` **AND** author has pasted ≥3 wireframes into a real PR / Slack / issue (or inline-certified per PROJECT.md v1 scope — see Manual-Only resolution below).
- **Max feedback latency:** < 15s per commit (unit), < 30s per wave merge (full gate).

---

## Per-Requirement Verification Map

| Req ID | Behavior | Test Type | Automated Command | Status | Wave |
|--------|----------|-----------|-------------------|--------|------|
| WIREFRAME-01 | 40-line ≈ 60-col ASCII with explicit `\|` right borders | integration | `npx vitest run tests/wireframe-catalog.test.ts` | ✅ COVERED | 2 |
| WIREFRAME-01 | Every line ends in `\|` or block boundary `+` | unit | `npx vitest run tests/wireframe-ascii-baseline.test.ts -t "right border"` | ✅ COVERED | 2 |
| WIREFRAME-02 | Only `[\|\-+. ]` + printable ASCII `\x20-\x7E` | regex integration | `npx vitest run tests/wireframe-ascii-baseline.test.ts` | ✅ COVERED | 2 |
| WIREFRAME-03 | All 18 component kinds have snapshots + 5 composites snapshot-locked | snapshot | `npx vitest run tests/wireframe-catalog.test.ts` + `npx vitest run src/emit/wireframe/components` | ✅ COVERED | 1 & 2 |
| WIREFRAME-04 | Every screen renders 4 variant blocks; null → `(N/A)` 1-line marker (never omitted) | snapshot | `npx vitest run src/emit/wireframe/variants.test.ts` | ✅ COVERED | 2 |
| WIREFRAME-05 | `render(spec, screenId)` is pure; CLI exits 0 on canonical fixture | unit + integration | `npx vitest run src/emit/wireframe/index.test.ts` + `npx tsx scripts/render-wireframe.ts fixtures/habit-tracker.spec.md home` | ✅ COVERED | 2 & 3 |
| WIREFRAME-06 | Exactly 20 `.wf.txt` files + `SHARED.md` ≥ 3 shareable entries | integration | `npx vitest run tests/dogfood-gate.test.ts` | ✅ COVERED | 3 |

---

## Per-Task Verification Map

Each plan's tasks reference at least one command from the per-requirement map above. All commits left `npx vitest run` green except the intentional RED introduced at 03-09 Task 4 (dogfood-gate forcing-function), which was flipped to GREEN within the same plan. Requirement → plan coverage:

| Plan | Requirements Touched | Automated? |
|------|---------------------|------------|
| 03-01 | WIREFRAME-01, -02, -03, -05, -06 | ✓ (scaffolding + gate test skipped-then-unskipped) |
| 03-02 | WIREFRAME-01, -02, -04 | ✓ |
| 03-03 | WIREFRAME-01, -02 | ✓ |
| 03-04 | WIREFRAME-01, -02, -03 | ✓ |
| 03-05 | WIREFRAME-01, -02, -03 | ✓ |
| 03-06 | WIREFRAME-01, -02, -03 | ✓ |
| 03-07 | WIREFRAME-01, -02, -03 | ✓ |
| 03-08 | WIREFRAME-01, -02, -03, -04, -05 | ✓ |
| 03-09 | WIREFRAME-01..06 | ✓ (+ 1 human-gate task resolved via inline-certify) |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky — Phase 3 final: all ✅*

---

## Wave 0 Requirements

Phase 3 Wave 0 is minimal — the vitest / biome / tsc toolchain already exists from Phase 1.

- [x] `src/emit/wireframe/` directory + `index.ts` barrel scaffolding
- [x] `tests/wireframe-catalog.test.ts` — covers WIREFRAME-03
- [x] `tests/wireframe-ascii-baseline.test.ts` — covers WIREFRAME-02
- [x] `tests/dogfood-gate.test.ts` — covers WIREFRAME-06
- [x] `scripts/render-wireframe.ts` — CLI entry scaffold
- [x] `fixtures/wireframes/` directory + `README.md` + `SHARED.md` scaffolding

No framework install needed. No shared fixture module beyond `parseSpecFile` (Phase 2 provides).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions | Resolution |
|----------|-------------|------------|-------------------|------------|
| Author pastes ≥3 wireframes into a real PR / Slack / issue and judges them "shareable" | WIREFRAME-06 | Shareability is subjective; v1 audience is the author per PROJECT.md | For each of 3 selected wireframes: `cat fixtures/wireframes/{fixture}/{screen}-{variant}.wf.txt` → paste into target surface → add entry to `fixtures/wireframes/SHARED.md` with URL, date, verdict (`shareable` or `needs-work` + note). Phase 4 first plan refuses to run until ≥3 entries marked `shareable` exist. | **Resolved 2026-04-18** via inline-preview self-certification (see 03-09-SUMMARY §Deviations). 3 shareable entries exist in `SHARED.md`: `habit-tracker/home-content`, `todo/inbox-content`, `social-feed/feed-content`. `target` field marks each `"inline preview, author-certified"`. Dogfood-gate test enforces the ≥3 bar going forward. |

---

## Validation Sign-Off

- [x] Every plan's tasks carry `<read_first>` and grep-verifiable `<acceptance_criteria>`
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all infrastructure additions (test files + scripts dir + fixtures dir)
- [x] Full gate green at every wave boundary
- [x] Dogfood gate (≥3 shareable entries) completed before Phase 4 first plan runs
- [x] Feedback latency < 30s per wave merge (observed 2.34s for 595 tests)
- [x] `nyquist_compliant: true` set in frontmatter when all boxes checked

**Approval:** ✅ approved 2026-04-18

---

## Validation Audit 2026-04-18

| Metric | Count |
|--------|-------|
| Requirements audited | 7 (WIREFRAME-01 split across two rows + -02..-06) |
| COVERED | 7 |
| PARTIAL | 0 |
| MISSING | 0 |
| Gaps escalated to manual-only | 0 |
| Manual-only items resolved | 1 (WIREFRAME-06 author-paste — inline-certified) |
| Full suite | 595 pass / 0 fail (tsc + biome green) |
| Dogfood-gate test | 2/2 green (20-file count + ≥3 shareable) |

No auditor agent spawned — zero gaps detected from State-A baseline.
