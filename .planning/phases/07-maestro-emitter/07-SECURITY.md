---
phase: 7
slug: maestro-emitter
status: verified
threats_open: 0
asvs_level: 1
created: 2026-04-19
---

# Phase 7 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| fixture YAML → SpecSchema | test_flows fields must conform to schema; Zod + crossReferencePass validate before emitter runs | Developer-authored spec YAML |
| User-authored YAML → SpecSchema | test_flows field is parsed by Zod; invalid shapes rejected before emitter code runs | Spec file content (local) |
| Spec.test_flows → emitter | Input already validated by Zod + crossReferencePass; emitter receives parsed Spec object | Parsed in-memory Spec object |
| emitter → YAML output | Output is plain string — no user-controlled template injection; appId is hardcoded placeholder | Generated YAML string |
| flow.name → filesystem path | User-authored flow name used as part of filename; sanitized before disk write | Flow name string → filepath |
| maestro check-syntax stderr → status line | External process output displayed in canvas; ANSI stripped before display | External process stderr |
| flows/*.yaml → CI diff | Committed golden files are the authoritative baseline; CI compares fresh output byte-for-byte | Committed YAML files |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-7-W0-01 | Tampering | fixture test_flows fields | mitigate | `crossReferencePass` iterates test_flows, validates each step's screen + action IDs against declared sets before emitter runs (`src/model/cross-reference.ts:409-432`) | closed |
| T-7-02-01 | Tampering | SpecSchema.strict() enforcement | mitigate | `test_flows` added as named key in SpecSchema object body; `.strict()` preserved at line 110 — unknown keys still rejected (`src/model/spec.ts:102,110`) | closed |
| T-7-02-02 | Tampering | MAESTRO_UNRESOLVED_SCREEN / ACTION diagnostic codes | mitigate | `crossReferencePass` emits `MAESTRO_UNRESOLVED_SCREEN` and `MAESTRO_UNRESOLVED_ACTION` with `severity: "error"` for bad refs (`src/model/cross-reference.ts:417-429`) | closed |
| T-7-03-01 | Information Disclosure | custom action name in YAML comment | accept | Dev-authored spec only; no external input path. See Accepted Risks Log. | closed |
| T-7-03-02 | Denial of Service | large test_flows array | accept | Spec size capped at 5MB via `MAX_INPUT_BYTES` in `src/model/invariants.ts:30,38`. See Accepted Risks Log. | closed |
| T-7-03-03 | Tampering | YAML.stringify on Zod objects | mitigate | `yamlListItem` and `assembleYaml` receive plain JS objects; Zod-typed objects never passed to `YAML.stringify` (`src/emit/maestro/emitter.ts:42-46,58-63`) | closed |
| T-7-path-traversal | Tampering | flow name → filename | mitigate | `basename(flow.name.replace(/[^a-z0-9_]/g, "_"))` applied in `emit-maestro.ts:86` — both sanitization stages present | closed |
| T-7-shell-inject | Tampering | maestro check-syntax subprocess | mitigate | `execFileSync("maestro", ["check-syntax", filePath], ...)` — no shell interpolation; `exec()` with string args never used (`src/editor/commands/emit-maestro.ts:33`) | closed |
| T-7-04-ansi | Information Disclosure | maestro stderr ANSI codes in status line | mitigate | `ANSI_SGR` regex strips escape codes from stderr; `.split("\n")[0]` takes first line only; `.slice(0, 200)` caps at 200 chars (`emit-maestro.ts:29,40-41`; `root.ts:378`) | closed |
| T-7-05-01 | Tampering | golden file drift in CI | mitigate | Golden tests read committed `flows/*.yaml` files and compare byte-for-byte to fresh emitter output (`tests/maestro-emitter.test.ts:303-314`) | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-7-01 | T-7-03-01 | Custom action names appear in YAML comments only. Source is developer-authored spec; no external or user-supplied input reaches this code path. No PII or secrets exposed. | Ray Liu | 2026-04-19 |
| AR-7-02 | T-7-03-02 | Spec size is bounded at 5MB by `MAX_INPUT_BYTES` before parsing; test_flows array is parsed from the same input and therefore cannot exceed the overall cap. DoS risk is low for a local TUI tool with no network surface. | Ray Liu | 2026-04-19 |

*Accepted risks do not resurface in future audit runs.*

---

## Notes

**Stale file path in threat register:** T-7-03-02 originally cited `src/parser/index.ts` for `MAX_INPUT_BYTES`. The constant actually lives at `src/model/invariants.ts` and is re-exported from `src/model/index.ts`. Mitigation is fully in place — this was a documentation inaccuracy in the PLAN, not an implementation gap.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-04-19 | 10 | 10 | 0 | gsd-security-auditor (Claude) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-04-19
