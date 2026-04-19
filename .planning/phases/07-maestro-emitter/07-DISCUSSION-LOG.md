# Phase 7: Maestro Emitter — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-19
**Phase:** 07-maestro-emitter
**Areas discussed:** TestFlow schema, Action-to-Maestro mapping, Platform branching design, :emit maestro command wiring

---

## TestFlow Schema

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit flow blocks in spec YAML | Developer writes `test_flows:` blocks; emitter walks declared steps | ✓ |
| Derive flows from nav graph edges | Auto-synthesize flows by walking NavigationGraph edges | |
| Hybrid: explicit flows + nav-graph fill-in | Developer writes screen sequences; emitter fills in interactions | |

**User's choice:** Explicit flow blocks in spec YAML

---

| Option | Description | Selected |
|--------|-------------|----------|
| screenId + actionId | Each step: `{ screen, action }` — emitter finds testID via actionId lookup | ✓ |
| testID directly | Steps reference testIDs directly: `{ testID, command }` | |
| screenId + actionId + assertions | Each step also carries an optional `assert:` list | |

**User's choice:** screenId + actionId (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Top-level test_flows: field | `test_flows: TestFlowSchema[]` at SpecSchema root | ✓ |
| Nested under existing field | e.g. `navigation.test_flows` | |
| Separate sidecar file | `<spec>.flows.yaml` alongside the spec | |

**User's choice:** Top-level test_flows: field (Recommended)

---

## Action-to-Maestro Mapping

| Option | Description | Selected |
|--------|-------------|----------|
| Codified defaults per action kind | Fixed mapping table; all 6 kinds → tapOn testID | ✓ |
| Explicit Maestro command override per step | Optional `maestro_cmd:` field on each step | |
| Two tiers: tap vs input inferred from component kind | TextField → inputText; everything else → tapOn | |

**User's choice:** Codified defaults per action kind (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| tapOn: { id: testID } | Always select by accessibility ID; fail loudly if missing | ✓ |
| tapOn: "label" | Select by visible label text | |
| tapOn: { text: label } with id fallback | Mixed selection strategy | |

**User's choice:** tapOn: { id: testID } (Recommended)

---

## Platform Branching Design

| Option | Description | Selected |
|--------|-------------|----------|
| platform field on step | Each step carries `platform: ios \| android \| both` (default: both) | ✓ |
| Separate ios_steps / android_steps blocks in the flow | Shared `steps:` + `ios_steps:` / `android_steps:` overrides | |
| No explicit branching — files always identical | Emit same steps to both files | |

**User's choice:** platform field on step (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Inline in each file — filter steps by platform | Emitter writes both files, filtering by platform; clean YAML output | ✓ |
| Maestro runFlow include directive | Shared steps in a `.shared.yaml` referenced via `runFlow` | |

**User's choice:** Inline in each file — filter steps by platform (Recommended)

---

## :emit maestro Command Wiring

| Option | Description | Selected |
|--------|-------------|----------|
| Canvas command palette entry | `emit-maestro` in COMMANDS registry; palette-accessible | ✓ |
| Separate CLI script (scripts/emit.ts) | Standalone terminal entry only | |
| Both: CLI script + canvas command | Pure emitter + two entry points | |

**User's choice:** Canvas command palette entry (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Show emit result in status line | Success: `Emitted N flow(s) → ./flows/` clearing after 3s; Error: first diagnostic | ✓ |
| Display diagnostics in a modal overlay | Success flash + error modal with full diagnostic list | |

**User's choice:** Show emit result in status line (Recommended)

---

## Claude's Discretion

- Maestro flow file header format (appId placeholder, minimal header)
- `maestro check-flow-syntax` invocation mechanism
- Emitter internal directory structure under `src/emit/maestro/`
- TestFlow cross-reference validation pass

## Deferred Ideas

- Detox emitter — v2 scope per ROADMAP
- Per-step `assert:` lists — deferred from Phase 7 scope
- CLI script for emit (`scripts/emit.ts`) — deferred, canvas command satisfies MAESTRO-05
- TextField → inputText inference — deferred in favor of uniform tapOn
