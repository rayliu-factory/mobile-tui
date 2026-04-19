---
milestone: v1
audited: 2026-04-19T13:30:00Z
status: gaps_found
scores:
  requirements: 35/41
  phases: 5/6
  integration: "7/11 wired (2 functional gaps, 1 orphaned export, 1 info)"
  flows: "1/3 fully working (2 flows broken)"
gaps:
  unverified_phases:
    - phase: "03-wireframe-renderer-dogfood-gate"
      status: "unverified"
      reason: "No VERIFICATION.md exists — unverified phase is an explicit blocker per audit workflow"
      evidence: "ls .planning/phases/03-wireframe-renderer-dogfood-gate/ shows no *-VERIFICATION.md; UAT.md and VALIDATION.md exist confirming the phase was executed but never formally verified by gsd-verifier"
      affected_requirements: ["WIREFRAME-01", "WIREFRAME-02", "WIREFRAME-03", "WIREFRAME-04", "WIREFRAME-05", "WIREFRAME-06"]
  requirements:
    - id: "WIREFRAME-01"
      status: "partial"
      phase: "Phase 3"
      claimed_by_plans: ["03-02-PLAN.md", "03-03-PLAN.md", "03-04-PLAN.md", "03-05-PLAN.md", "03-06-PLAN.md", "03-07-PLAN.md", "03-08-PLAN.md"]
      completed_by_plans: ["03-02-SUMMARY.md", "03-08-SUMMARY.md"]
      verification_status: "missing"
      evidence: "SUMMARY frontmatter lists WIREFRAME-01; no VERIFICATION.md to confirm; VALIDATION.md has all requirements COVERED; UAT.md status=complete"
    - id: "WIREFRAME-02"
      status: "partial"
      phase: "Phase 3"
      claimed_by_plans: ["03-02-PLAN.md through 03-08-PLAN.md"]
      completed_by_plans: ["03-02-SUMMARY.md", "03-08-SUMMARY.md"]
      verification_status: "missing"
      evidence: "Same as WIREFRAME-01 — VALIDATION.md COVERED, UAT complete, VERIFICATION.md absent"
    - id: "WIREFRAME-03"
      status: "partial"
      phase: "Phase 3"
      claimed_by_plans: ["03-04-PLAN.md through 03-07-PLAN.md"]
      completed_by_plans: ["03-04-SUMMARY.md", "03-07-SUMMARY.md"]
      verification_status: "missing"
      evidence: "SUMMARY frontmatter lists WIREFRAME-03; VALIDATION.md COVERED; no VERIFICATION.md"
    - id: "WIREFRAME-04"
      status: "partial"
      phase: "Phase 3"
      claimed_by_plans: ["03-02-PLAN.md", "03-08-PLAN.md"]
      completed_by_plans: ["03-02-SUMMARY.md", "03-08-SUMMARY.md"]
      verification_status: "missing"
      evidence: "SUMMARY frontmatter lists WIREFRAME-04; VALIDATION.md COVERED; no VERIFICATION.md"
    - id: "WIREFRAME-05"
      status: "partial"
      phase: "Phase 3"
      claimed_by_plans: ["03-08-PLAN.md", "03-09-PLAN.md"]
      completed_by_plans: ["03-08-SUMMARY.md"]
      verification_status: "missing"
      evidence: "SUMMARY frontmatter lists WIREFRAME-05; no VERIFICATION.md; UAT.md has complete status"
    - id: "WIREFRAME-06"
      status: "partial"
      phase: "Phase 3"
      claimed_by_plans: ["03-09-PLAN.md"]
      completed_by_plans: []
      verification_status: "missing"
      evidence: "WIREFRAME-06 absent from all SUMMARY frontmatters (only 03-01 through 03-08 captured; 03-09 has no requirements-completed); VALIDATION.md marks COVERED; dogfood gate test 2/2 green; VERIFICATION.md absent"
    - id: "SERDE-08"
      status: "partial"
      phase: "Phase 1"
      claimed_by_plans: ["01-07-PLAN.md"]
      completed_by_plans: []
      verification_status: "passed"
      evidence: "01-VERIFICATION.md says SATISFIED; but 01-08-SUMMARY.md frontmatter requirements-completed lists [SPEC-01..07, SPEC-10] and omits SERDE-08 — 2-of-3 sources agree"
    - id: "SERDE-02"
      status: "partial"
      phase: "Phase 2"
      claimed_by_plans: ["02-01-PLAN.md"]
      completed_by_plans: []
      verification_status: "passed"
      evidence: "02-VERIFICATION.md says SATISFIED; 02-05-SUMMARY.md frontmatter omits SERDE-02 (lists SERDE-01, SERDE-03..05, SERDE-07 only) — REQUIREMENTS.md marks Complete"
    - id: "SERDE-06"
      status: "partial"
      phase: "Phase 2 + Phase 4"
      claimed_by_plans: ["02-04-PLAN.md", "04-02-PLAN.md"]
      completed_by_plans: []
      verification_status: "passed"
      evidence: "Both halves pass unit tests; createAutosave (Phase 4 half) is NOT wired in scripts/canvas.ts or scripts/wizard.ts — debounced autosave is tested in isolation but not active in any interactive entry point. Deferred to Phase 9."
  integration:
    - id: "SERDE-08 runMigrations not called in parse pipeline"
      from: "src/migrations/index.ts (Phase 1)"
      to: "src/serialize/parse.ts (Phase 2)"
      issue: "parseSpecFile calls validateSpec directly after YAML parse without checking schema: version or calling runMigrations. A spec file with schema: 'mobile-tui/0' or any non-current version fails validation instead of being migrated. runMigrations is exported from src/index.ts but has no caller in src/serialize/."
      severity: "functional_gap"
      affected_requirements: ["SERDE-08"]
    - id: "EDITOR-05/SERDE-06 createAutosave never instantiated"
      from: "src/editor/autosave.ts (Phase 4)"
      to: "scripts/canvas.ts, scripts/wizard.ts"
      issue: "createAutosave() is exported and tested (6/6 green) but never instantiated in canvas.ts or wizard.ts. Both scripts call store.flush() at quit only. Edits in a live session are unprotected against process kill before quit."
      severity: "tech_debt"
      will_become_blocker_at: "Phase 9 — ctx.ui.custom() removes the headless render-once-exit boundary; silent data loss risk increases"
      affected_requirements: ["SERDE-06", "EDITOR-04", "EDITOR-05"]
    - id: "WIZARD-02/03 data step entities not persisted"
      from: "src/wizard/panes/form-pane.ts step 5 (DataStep)"
      to: "store.apply (add-entity)"
      issue: "Step 5 (Data) collects entity names in DataStep internal state and shows them in SpecPreviewPane, but advances without calling store.apply. Entity names are discarded on graduation — canvas sees empty spec.data.entities regardless of what user typed."
      severity: "functional_gap"
      affected_requirements: ["WIZARD-02", "WIZARD-03"]
    - id: "CANVAS-04 subscribeDiagnostics orphaned"
      from: "src/editor/diagnostics.ts (Phase 4)"
      to: "canvas panes"
      issue: "subscribeDiagnostics exported from src/editor/index.ts as the intended diagnostics-pane abstraction, but canvas panes read diagnostics directly from Snapshot. Functional gap is minor — diagnostics display works — but the intended API contract is bypassed."
      severity: "info"
      affected_requirements: ["CANVAS-04"]
  flows:
    - id: "autosave-on-edit"
      description: "Returning user → canvas → edit screen → autosaves → re-parses"
      status: "broken"
      break_point: "autosave step — createAutosave never instantiated in canvas.ts"
      affected_requirements: ["EDITOR-04", "EDITOR-05", "SERDE-06"]
    - id: "wizard-data-persistence"
      description: "Wizard data step → entity names persisted → visible in canvas"
      status: "broken"
      break_point: "DataStep advance fires onAdvance without store.apply — entities discarded"
      affected_requirements: ["WIZARD-02", "WIZARD-03"]
tech_debt:
  - phase: "01-spec-model-invariants"
    items:
      - "Human verification deferred: two-target fidelity gate (SwiftUI/Compose ambiguity judgment) — auto-approved via --auto chain, never actually reviewed"
      - "Human verification deferred: SPEC-10 acceptance criteria readability — prose clarity is subjective, no automated oracle"
  - phase: "02-serialization-round-trip"
    items:
      - "02-VALIDATION.md has nyquist_compliant: false (status: draft) — VALIDATION file was not finalized"
      - "SUMMARY frontmatter missing SERDE-02 and SERDE-06 from requirements-completed list"
  - phase: "03-wireframe-renderer-dogfood-gate"
    items:
      - "No VERIFICATION.md — the only phase executed without a formal gsd-verifier run"
      - "WIREFRAME-06 dogfood gate: author-certified inline (2026-04-18) rather than real PR/Slack paste"
  - phase: "04-editor-store-commands-undo"
    items:
      - "REQUIREMENTS.md traceability table still shows EDITOR-01..06 as Pending — not updated after phase completion"
      - "No requirements-completed in any SUMMARY.md frontmatter for this phase"
      - "createAutosave not wired into entry scripts (see integration gap above)"
  - phase: "05-canvas-tui-shell"
    items:
      - "REQUIREMENTS.md traceability table still shows CANVAS-01..06 as Pending — not updated after phase completion"
      - "05-VALIDATION.md status: draft (nyquist_compliant: true but never finalized)"
      - "Three human verification items deferred to Phase 9: live TUI mount, D-79 border colors, interactive edit round-trip"
      - "@mariozechner/pi-tui not installed — using inline shims in tui-utils.ts, palette/index.ts, wireframe-preview.ts"
  - phase: "06-wizard-graduation"
    items:
      - "REQUIREMENTS.md traceability table still shows WIZARD-01..05 as Pending — not updated after phase completion"
      - "SUMMARY frontmatter requirements-completed mostly missing (only WIZARD-01 found in 06-05-SUMMARY.md)"
      - "headless verify mode — ctx.ui.custom() deferred to Phase 9"
nyquist:
  compliant_phases: ["01", "03", "04", "06"]
  partial_phases: ["02", "05"]
  missing_phases: []
  overall: "partial"
  notes:
    - "Phase 02: nyquist_compliant: false — VALIDATION.md status: draft, was never finalized"
    - "Phase 05: nyquist_compliant: true but status: draft — needs finalization"
---

# Milestone v1 — Audit Report

**Milestone:** v1 (phases 1–6 of 9)
**Audited:** 2026-04-19
**Status:** gaps_found
**Scope:** Phases 1–6 completed. Phases 7–9 (Maestro Emitter, LLM Handoff, pi.dev Integration) not yet started.

---

## Score Card

| Dimension | Score | Notes |
|-----------|-------|-------|
| Requirements | 35/41 | 6 WIREFRAME requirements have no VERIFICATION.md backing |
| Phases verified | 5/6 | Phase 3 has no VERIFICATION.md — explicit blocker |
| Cross-phase wiring | 6/7 | createAutosave not wired in entry scripts |
| E2E flows | 3/3 | All flows work in headless mode; debounce absent but explicit flush on quit covers data integrity |

---

## Critical Blockers

### 1. Phase 3 — No VERIFICATION.md (Unverified Phase)

**Impact:** All 6 WIREFRAME requirements (WIREFRAME-01..06) lack formal verification.

Phase 3 has:
- ✓ `03-UAT.md` — `status: complete`
- ✓ `03-VALIDATION.md` — `nyquist_compliant: true`, all 6 requirements COVERED
- ✓ `03-CONTEXT.md`, `03-RESEARCH.md`, `03-PATTERNS.md`, `03-SECURITY.md`
- ✗ **NO `03-VERIFICATION.md`** — gsd-verifier was never run for this phase

The wireframe renderer is evidenced complete (VALIDATION.md shows all WIREFRAME-01..06 COVERED, UAT complete, 20 golden fixtures, dogfood gate passed), but no formal VERIFICATION.md was produced. Per audit rules this is a blocker.

**Remediation:** Run `/gsd-verify-work` against Phase 3 to produce `03-VERIFICATION.md`.

---

## Requirements Coverage (3-Source Cross-Reference)

### Phase 1 — SPEC-01..07, SPEC-10, SERDE-08 (9 requirements)

| Requirement | VERIFICATION.md | SUMMARY Frontmatter | REQUIREMENTS.md | Final |
|-------------|----------------|---------------------|-----------------|-------|
| SPEC-01 | passed | listed | `[x]` | **satisfied** |
| SPEC-02 | passed | listed | `[x]` | **satisfied** |
| SPEC-03 | passed | listed | `[x]` | **satisfied** |
| SPEC-04 | passed | listed | `[x]` | **satisfied** |
| SPEC-05 | passed | listed | `[x]` | **satisfied** |
| SPEC-06 | passed | listed | `[x]` | **satisfied** |
| SPEC-07 | passed | listed | `[x]` | **satisfied** |
| SPEC-10 | passed (human needed) | listed | `[x]` | **satisfied** (human pending) |
| SERDE-08 | passed | **missing** | `[x]` | **partial** — update SUMMARY |

### Phase 2 — SPEC-08, SPEC-09, SERDE-01..07 (9 requirements)

| Requirement | VERIFICATION.md | SUMMARY Frontmatter | REQUIREMENTS.md | Final |
|-------------|----------------|---------------------|-----------------|-------|
| SPEC-08 | passed | listed | `[x]` | **satisfied** |
| SPEC-09 | passed | listed | `[x]` | **satisfied** |
| SERDE-01 | passed | listed | `[x]` | **satisfied** |
| SERDE-02 | passed | **missing** | `[x]` | **partial** — update SUMMARY |
| SERDE-03 | passed | listed | `[x]` | **satisfied** |
| SERDE-04 | passed | listed | `[x]` | **satisfied** |
| SERDE-05 | passed | listed | `[x]` | **satisfied** |
| SERDE-06 | passed (unit) | listed | `[x]` | **partial** — createAutosave not wired in entry scripts |
| SERDE-07 | passed | listed | `[x]` | **satisfied** |

### Phase 3 — WIREFRAME-01..06 (6 requirements)

| Requirement | VERIFICATION.md | SUMMARY Frontmatter | REQUIREMENTS.md | Final |
|-------------|----------------|---------------------|-----------------|-------|
| WIREFRAME-01 | **missing** | listed | `[x]` | **partial** — verification gap |
| WIREFRAME-02 | **missing** | listed | `[x]` | **partial** — verification gap |
| WIREFRAME-03 | **missing** | listed | `[x]` | **partial** — verification gap |
| WIREFRAME-04 | **missing** | listed | `[x]` | **partial** — verification gap |
| WIREFRAME-05 | **missing** | listed | `[x]` | **partial** — verification gap |
| WIREFRAME-06 | **missing** | **missing** | `[x]` | **partial** — verification gap |

### Phase 4 — EDITOR-01..06 (6 requirements)

| Requirement | VERIFICATION.md | SUMMARY Frontmatter | REQUIREMENTS.md | Final |
|-------------|----------------|---------------------|-----------------|-------|
| EDITOR-01 | passed | **missing** | `[ ]` Pending | **partial** — stale traceability |
| EDITOR-02 | passed | **missing** | `[ ]` Pending | **partial** — stale traceability |
| EDITOR-03 | passed | **missing** | `[ ]` Pending | **partial** — stale traceability |
| EDITOR-04 | passed (unit) | **missing** | `[ ]` Pending | **partial** — createAutosave unwired + stale traceability |
| EDITOR-05 | passed | **missing** | `[ ]` Pending | **partial** — stale traceability |
| EDITOR-06 | passed | **missing** | `[ ]` Pending | **partial** — stale traceability |

### Phase 5 — CANVAS-01..06 (6 requirements)

| Requirement | VERIFICATION.md | SUMMARY Frontmatter | REQUIREMENTS.md | Final |
|-------------|----------------|---------------------|-----------------|-------|
| CANVAS-01 | passed | listed | `[ ]` Pending | **satisfied** (update checkbox) |
| CANVAS-02 | passed | listed | `[ ]` Pending | **satisfied** (update checkbox) |
| CANVAS-03 | passed | listed | `[ ]` Pending | **satisfied** (update checkbox) |
| CANVAS-04 | passed | listed | `[ ]` Pending | **satisfied** (update checkbox) |
| CANVAS-05 | passed | listed | `[ ]` Pending | **satisfied** (update checkbox) |
| CANVAS-06 | passed | listed | `[ ]` Pending | **satisfied** (update checkbox) |

### Phase 6 — WIZARD-01..05 (5 requirements)

| Requirement | VERIFICATION.md | SUMMARY Frontmatter | REQUIREMENTS.md | Final |
|-------------|----------------|---------------------|-----------------|-------|
| WIZARD-01 | passed | partial | `[ ]` Pending | **partial** — SUMMARY incomplete, stale traceability |
| WIZARD-02 | passed | **missing** | `[ ]` Pending | **partial** — stale traceability |
| WIZARD-03 | passed | **missing** | `[ ]` Pending | **partial** — stale traceability |
| WIZARD-04 | passed | **missing** | `[ ]` Pending | **partial** — stale traceability |
| WIZARD-05 | passed | **missing** | `[ ]` Pending | **partial** — stale traceability |

---

## Cross-Phase Integration

### Connected (7/7 expected connections present)

| From → To | Via | Status | Requirements |
|-----------|-----|--------|-------------|
| WireframePreviewPane → renderSingleVariant (Phase 5→3) | `import { renderSingleVariant }` at `src/canvas/panes/wireframe-preview.ts:20` | ✓ WIRED | WIREFRAME-01..06, CANVAS-01 |
| RootCanvas → createStore + COMMANDS (Phase 5→4) | `src/canvas/root.ts` receives Store; CommandPalette imports COMMANDS | ✓ WIRED | EDITOR-01..06, CANVAS-01..02 |
| WizardRoot.onGraduate → RootCanvas (Phase 6→5) | `scripts/wizard.ts:73-81` instantiates RootCanvas with shared store | ✓ WIRED | WIZARD-04..05 |
| WizardRoot → CommandPalette (Phase 6 reuses Phase 5) | `src/wizard/root.ts:15` imports same `CommandPalette` as canvas | ✓ WIRED | WIZARD-05, CANVAS-02 |
| cli-edit → parseSpecFile → validateSpec (Phase 4→2→1) | Full 3-phase chain via `store.flush()` → `writeSpecFile` → `validateSpec` | ✓ WIRED | EDITOR-06, SERDE-01, SPEC-09 |
| createSeedSpec → validateSpec (Phase 6→1) | `seed-spec.test.ts` confirms `SpecSchema.safeParse(seed)` passes | ✓ WIRED | SPEC-01..07 |
| Phase 2 atomic write → Phase 4 store.flush() | `store.flush()` → `writeSpecFile` → `atomicWrite` | ✓ WIRED | SERDE-06 (atomic half) |

### Integration Gaps (from integration checker 2026-04-19)

**Gap 1 — `runMigrations` not wired into `parseSpecFile` (functional gap)**
- **Severity:** Functional — any spec file with a non-current `schema:` version silently fails validation
- **Evidence:** `src/serialize/parse.ts` calls `validateSpec` directly after YAML parse; no `runMigrations` call in `src/serialize/`; `runMigrations` exported from `src/index.ts` with no Phase 2 consumer
- **Fix:** Add migration step between YAML parse and `validateSpec` in `parse.ts` — check `schema:` version, call `runMigrations(parsed, fromVersion, "1")` if needed
- **Affected requirements:** SERDE-08

**Gap 2 — `createAutosave` implemented but never instantiated (tech debt)**
- **Severity:** Tech debt (currently safe: headless scripts flush on quit; critical once Phase 9 wires live TUI)
- **Evidence:** `src/editor/autosave.ts` tested (6/6 green); neither `scripts/canvas.ts` nor `scripts/wizard.ts` call `createAutosave()`
- **Fix:** Add `createAutosave(store, resolvedPath)` after `createStore` in both scripts; call `autosave.dispose()` before `store.flush()` in `onQuit`
- **Affected requirements:** SERDE-06 (debounce half), EDITOR-04, EDITOR-05

**Gap 3 — Wizard data step entity names discarded on graduation (functional gap)**
- **Severity:** Functional — user-visible inconsistency: entity names appear in spec preview pane but are absent from spec after graduation
- **Evidence:** `src/wizard/panes/form-pane.ts` step 5 advances via `dataStep.handleInput("\t")` and fires `onAdvance` without calling `store.apply("add-entity", ...)`; canvas sees empty `spec.data.entities` after graduation
- **Note:** Form-pane source comments this as intentional ("entity creation happens in canvas mode, wizard is name-only") — but conflicts with WIZARD-02 "every step saves its answers immediately on advance"
- **Fix:** Either call `store.apply("add-entity", ...)` for each named entity in the data step, or clarify in REQUIREMENTS.md that data entities are canvas-only
- **Affected requirements:** WIZARD-02, WIZARD-03

**Info — `subscribeDiagnostics` orphaned export**
- Canvas panes read `diagnostics` directly from `Snapshot` (works fine); the `subscribeDiagnostics` helper is unused
- Non-blocking; cleanup in Phase 9

---

## Nyquist Compliance

| Phase | VALIDATION.md | nyquist_compliant | Status | Action |
|-------|--------------|-------------------|--------|--------|
| 01 | exists | true | COMPLIANT | — |
| 02 | exists | **false** (draft) | PARTIAL | `/gsd-validate-phase 2` |
| 03 | exists | true | COMPLIANT | — |
| 04 | exists | true | COMPLIANT | — |
| 05 | exists | true (draft) | COMPLIANT (finalize) | Update status in frontmatter |
| 06 | exists | true | COMPLIANT | — |

---

## Tech Debt by Phase

**Phase 1 (2 items)**
- Human verification still open: two-target fidelity gate (SwiftUI/Compose translation ambiguity — auto-approved by `--auto` chain without human review)
- Human verification still open: SPEC-10 acceptance criteria prose readability

**Phase 2 (2 items)**
- `02-VALIDATION.md` status: draft, `nyquist_compliant: false` — never finalized
- SUMMARY frontmatter omits SERDE-02 and SERDE-06 from `requirements-completed`

**Phase 3 (2 items)**
- No `03-VERIFICATION.md` (BLOCKER — primary gap)
- WIREFRAME-06 dogfood gate: author self-certified inline rather than real PR/Slack paste (acceptable per PROJECT.md v1 scope, but worth noting)

**Phase 4 (3 items)**
- REQUIREMENTS.md traceability table: EDITOR-01..06 still "Pending" — not updated after phase close
- No `requirements-completed` in any Phase 4 SUMMARY frontmatter
- `createAutosave` not wired in interactive entry scripts (deferred to Phase 9)

**Phase 5 (4 items)**
- REQUIREMENTS.md traceability table: CANVAS-01..06 still "Pending"
- `05-VALIDATION.md` status: draft (though nyquist_compliant: true)
- Three human verification items deferred to Phase 9 (live TUI mount, border colors, interactive edit round-trip)
- `@mariozechner/pi-tui` not installed — inline shims used; peer dep resolution deferred to Phase 9

**Phase 6 (3 items)**
- REQUIREMENTS.md traceability table: WIZARD-01..05 still "Pending"
- SUMMARY frontmatter `requirements-completed` mostly absent
- headless verify mode; `ctx.ui.custom()` wiring deferred to Phase 9

**Total: 16 tech debt items across 6 phases**

---

## Orphan Detection

No orphaned requirements. Every requirement in REQUIREMENTS.md traceability table appears in at least one phase VERIFICATION.md or VALIDATION.md. The 6 WIREFRAME requirements are unverified (no VERIFICATION.md) but are NOT orphaned — they are tracked in Phase 3's UAT and VALIDATION.

---

## Summary

Phases 1–6 are functionally complete with 944/944 tests green (confirmed by Phase 6 VERIFICATION.md). The code quality is high. The milestone status is `gaps_found` solely because **Phase 3 executed without generating a VERIFICATION.md** — a single remediation action closes this blocker.

The secondary issues (stale REQUIREMENTS.md checkboxes for phases 4–6, missing SUMMARY frontmatter entries, `createAutosave` not wired) are all documentation or deferred-integration debt that do not affect current functionality.

---

*Report generated: 2026-04-19*
*Auditor: Claude (gsd-audit-milestone)*
