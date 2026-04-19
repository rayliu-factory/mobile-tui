---
phase: 6
slug: wizard-graduation
status: verified
threats_open: 0
asvs_level: 1
created: 2026-04-19
---

# Phase 6 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| wizard input → store.apply | User-typed text crosses into spec mutation | Plain strings (app idea, screen names, enum values) |
| scripts/wizard.ts specPath (argv) → fs.access + parseSpecFile | User-controlled file path enters fs operations | File path string |
| spec type cast via Record<string, unknown> | Wizard fields not typed on Spec directly; accessed via cast | Spec object fields (read-only) |
| YAML.stringify(spec) → display output | Spec object rendered to string for display only | Full spec object (display-only, not written to file) |
| WizardRoot.handleInput → store.apply → spec mutations | Keyboard input reaches spec via store command pipeline | Raw key sequences → validated args → spec values |
| test files → src modules | Tests import from src/ — no production code written in tests | N/A (test isolation) |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-06-01 | Tampering | set-wizard-* apply() args | mitigate | `argsSchema.safeParse()` validates all wizard command args before `apply()` reaches spec | closed |
| T-06-02 | Tampering | set-wizard-screens names array | mitigate | `z.string().min(1)` per name; `z.array().min(1)` overall; `nameToId()` slug strips non-alnum chars | closed |
| T-06-03 | Tampering | SpecSchema strict() extension | mitigate | `.strict()` retained on SpecSchema — unknown keys still rejected; only declared wizard fields pass | closed |
| T-06-04 | Information Disclosure | Command invert() with null prevValue | accept | Optional wizard fields: null prevValue means "delete key" — no sensitive data in field names | closed |
| T-06-05 | Tampering | test tmp dir cleanup | accept | `afterEach` deletes tmp files; test isolation prevents cross-test contamination | closed |
| T-06-06 | Information Disclosure | test file path resolution | accept | All paths use `resolve(process.cwd(), ...)` — no user-controlled input in test paths | closed |
| T-06-07 | Tampering | isAnswered spec field access | accept | All reads are read-only; no mutation in pure functions; casts do not allow writes | closed |
| T-06-08 | Tampering | firstUnansweredStep with malformed spec | accept | Called only after `parseSpecFile` succeeds; Zod validated before store creation | closed |
| T-06-09 | Tampering | FormPane inputValue → store.apply | mitigate | `tryAdvance()` validates non-empty `inputValue` before `store.apply`; command validates via `argsSchema.safeParse` | closed |
| T-06-10 | Tampering | ScreensStep/DataStep item list injection | mitigate | Names are plain strings; `set-wizard-screens.ts` argsSchema validates each name as `z.string().min(1)` | closed |
| T-06-11 | Tampering | Ctrl+G raw byte (\x07) in FormPane | mitigate | `WizardRoot.handleInput` checks `\x07` BEFORE delegating to FormPane — FormPane only sees delegated keys | closed |
| T-06-12 | Information Disclosure | YAML.stringify spec preview | accept | Preview is display-only in the TUI; not written to file; no sensitive data beyond what user entered | closed |
| T-06-13 | Tampering | SpecPreviewPane handleInput | accept | `handleInput` is a no-op — read-only pane cannot be edited via keyboard; all writes go through FormPane → store.apply | closed |
| T-06-14 | Tampering | scripts/wizard.ts specPath | mitigate | `path.resolve(specPath)` normalizes path traversal; Phase 9 pi sandbox restricts fs access (T-05-21 pattern) | closed |
| T-06-15 | Tampering | WizardRoot.handleInput before store.apply | mitigate | All commands validated via `argsSchema.safeParse` in `store.apply` before reaching `command.apply` | closed |
| T-06-16 | Tampering | createSeedSpec write to disk | mitigate | Seed spec written via `fs.writeFile` — no user content in seed; `resolvedPath` is normalized | closed |
| T-06-17 | Tampering | Ctrl+G raw byte in Input field | mitigate | `WizardRoot.handleInput` checks `\x07` FIRST before delegating to FormPane (RESEARCH Pitfall 1 / D-101) | closed |
| T-06-18 | Information Disclosure | CLI error messages | mitigate | `main().catch` writes only `err.message` (not stack trace) — T-04-24 pattern from scripts/canvas.ts | closed |
| T-06-19 | Tampering | Palette orphan on graduation | mitigate | `graduate()` calls `paletteHandle.hide()` before `onGraduate` — RESEARCH Pitfall 6 | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-06-01 | T-06-04 | null prevValue in invert() signals key deletion — field names are spec schema identifiers, not sensitive data | Ray Liu | 2026-04-19 |
| AR-06-02 | T-06-05 | Test tmp cleanup via afterEach is standard isolation pattern; no production surface area | Ray Liu | 2026-04-19 |
| AR-06-03 | T-06-06 | Test path resolution uses `process.cwd()` constants only — no user-controlled input reaches test fs paths | Ray Liu | 2026-04-19 |
| AR-06-04 | T-06-07 | isAnswered performs read-only field access via cast; no mutation path exists in pure functions | Ray Liu | 2026-04-19 |
| AR-06-05 | T-06-08 | firstUnansweredStep is called exclusively post-Zod-validation; malformed specs are rejected before store creation | Ray Liu | 2026-04-19 |
| AR-06-06 | T-06-12 | SpecPreviewPane renders display-only YAML; never written to disk; contains only user-entered spec data | Ray Liu | 2026-04-19 |
| AR-06-07 | T-06-13 | SpecPreviewPane.handleInput is a no-op by design; keyboard cannot trigger writes through this pane | Ray Liu | 2026-04-19 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-04-19 | 19 | 19 | 0 | gsd-secure-phase (automated) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-04-19
