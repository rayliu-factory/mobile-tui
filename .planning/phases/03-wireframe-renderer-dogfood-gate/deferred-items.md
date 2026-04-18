# Phase 03 — Deferred Items

Out-of-scope issues surfaced during plan execution. Do NOT fix inside this phase.

## From Plan 03-04 (2026-04-18)

- **biome info `lint/style/useTemplate` at `src/serialize/write.ts:254`** — pre-existing
  Phase-2 code (introduced in 02-04 / 02-05). Biome treats this as `info` (not an error;
  exit 0), so the gate stays green. Suggested fix: collapse the concatenation into a
  template literal. Defer to a Phase-2-touch cleanup plan or a future chore commit —
  not a Plan-03-04-caused regression.
