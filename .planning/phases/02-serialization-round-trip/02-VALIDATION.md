---
phase: 02
slug: serialization-round-trip
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-18
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `vitest@^4.1.4` (already installed Phase 1) |
| **Config file** | `vitest.config.ts` (exists; Wave 0 widens `include` to pick up `src/serialize/*.test.ts` + `tests/round-trip.test.ts` + `tests/no-js-yaml.test.ts`) |
| **Quick run command** | `npx vitest run src/serialize` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5s quick / ~15s full (includes 20-fixture round-trip) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/serialize` (≈1–5s; unit tests only, no fixture I/O)
- **After every plan wave:** Run `npx vitest run` (full suite; includes 20-fixture round-trip + Phase-1 regression)
- **Before `/gsd-verify-work`:** `npx vitest run` + `npx tsc --noEmit` + `npx biome check .` + `npx vitest run --coverage` (target ≥ 95% stmts on `src/serialize/`)
- **Max feedback latency:** ~15s

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 0 | SERDE-02 | — | `yaml`+`gray-matter` deps added, js-yaml banned | unit | `npx vitest run tests/no-js-yaml.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 0 | SPEC-09 | T-02-Input | Phase-1 `parse-fixture.ts` migrated; Phase-1 tests switch to `parseSpecFile` | integration | `npx vitest run tests/fixtures.test.ts tests/malformed.test.ts tests/catalog-coverage.test.ts tests/fidelity.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 1 | SERDE-01, SERDE-02, SERDE-04 | T-02-ProtoPollution | Parser produces `{spec, astHandle, diagnostics, body}`; opaque body verbatim | unit | `npx vitest run src/serialize/parse.test.ts src/serialize/frontmatter.test.ts src/serialize/body.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 1 | SPEC-08 | T-02-ProtoPollution | Unknown top-level keys preserved AST-natively (no literal `_unknown:`) | unit | `npx vitest run src/serialize/unknown.test.ts` | ❌ W0 | ⬜ pending |
| 02-03-01 | 03 | 2 | SERDE-03, SERDE-07 | — | Diff-and-apply via CST; no `YAML.stringify(spec)`; YAML 1.1 gotchas auto-quoted | unit + grep-gate | `npx vitest run src/serialize/write.test.ts` + `! grep -rE "YAML\\.stringify\\s*\\(|stringify\\(spec" src/serialize/` | ❌ W0 | ⬜ pending |
| 02-03-02 | 03 | 2 | SPEC-08 | — | First-save `schema: mobile-tui/1` injection at TOP of frontmatter | unit | `npx vitest run src/serialize/schema-inject.test.ts` | ❌ W0 | ⬜ pending |
| 02-04-01 | 04 | 2 | SPEC-07 (Phase-1), SERDE-03 | — | Sigil form `[Label →action test:id]` ↔ triple form; `_sigilOrigin` WeakMap | unit | `npx vitest run src/serialize/sigil.test.ts` | ❌ W0 | ⬜ pending |
| 02-05-01 | 05 | 3 | SERDE-06 | T-02-PartialWrite | Atomic `.tmp` + `rename`; never produces partial writes on simulated crash | unit | `npx vitest run src/serialize/atomic.test.ts` | ❌ W0 | ⬜ pending |
| 02-05-02 | 05 | 3 | SPEC-09 | T-02-SaveGate | `writeSpecFile` returns `{written: false, diagnostics}` on severity=error; never throws | unit | `npx vitest run src/serialize/write.test.ts -t "save-gate"` | ❌ W0 | ⬜ pending |
| 02-06-01 | 06 | 4 | SERDE-05 | — | 20 golden fixtures round-trip byte-identical via `Buffer.equals` | golden | `npx vitest run tests/round-trip.test.ts` | ❌ W0 | ⬜ pending |
| 02-06-02 | 06 | 4 | SERDE-05 | — | Fixture matrix covers sigil/comments/reorder/unknowns/nested-comments/YAML-1.1-gotcha/empty-body/comment-only | golden | `npx vitest run tests/round-trip.test.ts -t "matrix"` | ❌ W0 | ⬜ pending |
| 02-06-03 | 06 | 4 | — | T-02-ProtoPollution | Fixture with `__proto__:` top-level → save blocked via Phase-1 `.strict()` + D-31 gate | integration | `npx vitest run tests/round-trip.test.ts -t "prototype-pollution"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Task IDs above are indicative — the planner will fix final numbering during PLAN.md generation. Rows map each Phase-2 requirement (SPEC-08, SPEC-09, SERDE-01..07) to at least one automated verification.*

---

## Wave 0 Requirements

Every Phase-2 test is net-new. Wave 0 installs the substrate:

- [ ] `package.json` — add `yaml@^2.8.3` + `gray-matter@^4.0.3` to `dependencies`.
- [ ] `tests/no-js-yaml.test.ts` — audit test asserting no `js-yaml` in `dependencies` / `devDependencies` / transitive `node_modules/` tree.
- [ ] `src/serialize/` directory + leaf stubs: `parse.ts`, `write.ts`, `body.ts`, `sigil.ts`, `unknown.ts`, `schema-inject.ts`, `frontmatter.ts`, `atomic.ts`, `ast-handle.ts`, `diagnostics.ts`, `index.ts` (all empty, per-file implementations in Waves 1–3).
- [ ] `src/serialize/diagnostics.ts` — new codes: `SPEC_ORPHAN_TEMP_FILE`, `SPEC_SIGIL_PARTIAL_DROPPED`, `SERDE_YAML11_GOTCHA`, `SERDE_BYTE_DRIFT_DETECTED`, `SERDE_MISSING_DELIMITER`, `SPEC_UNKNOWN_TOP_LEVEL_KEY` (passthrough for prototype-pollution test); re-export Phase-1 `diagnostic()` factory.
- [ ] `tests/round-trip.test.ts` — 20-fixture driver scaffold (implementation in Wave 4).
- [ ] `fixtures/round-trip/` directory + 16 new fixture files (see RESEARCH.md §Recommended Project Structure for full list; defers sigil-form subset to `fixtures/sigil/`).
- [ ] `fixtures/sigil/` directory + ≥3 sigil-form fixtures (D-25).
- [ ] Delete `tests/helpers/parse-fixture.ts` AND `fixtures/*.spec.json` (4 files) AFTER migrating Phase-1 tests to `parseSpecFile`.
- [ ] Migrate Phase-1 tests using `parse-fixture.ts` → `parseSpecFile`: `tests/fixtures.test.ts`, `tests/malformed.test.ts`, `tests/catalog-coverage.test.ts`, `tests/fidelity.test.ts`.
- [ ] Regenerate `tests/__snapshots__/malformed.test.ts.snap` via `npx vitest run tests/malformed.test.ts --update` after migration lands.
- [ ] `.gitattributes` — add `*.spec.md text eol=lf` so fixture bytes are stable across platforms (RESEARCH Open Q#3).
- [ ] `tests/tmp/` added to `.gitignore` (RESEARCH Open Q#2).

*No framework install needed — vitest, biome, TypeScript already present from Phase 1.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| — | — | — | All Phase-2 behaviors have automated verification. |

*All phase behaviors have automated verification. The debounce-mid-save + `session_shutdown` portion of success criterion #5 intentionally moves to Phase 4 (editor store) per D-32; Phase 2's verifiable version is the atomic-primitive no-partial-write invariant tested via simulated-crash spy on `fs.rename`.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (fixtures, no-js-yaml audit, `src/serialize/` stubs)
- [ ] No watch-mode flags (CI uses `vitest run`, not `vitest`)
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
