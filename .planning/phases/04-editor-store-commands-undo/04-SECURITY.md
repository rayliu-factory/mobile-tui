---
phase: 4
slug: editor-store-commands-undo
status: verified
threats_open: 0
asvs_level: 1
created: 2026-04-19
---

# Phase 4 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| `store.apply` args | All args are unknown at call-site; validated by per-command `argsSchema.safeParse` before reaching `command.apply` | Untrusted user/CLI input |
| Commands registry key | `commandName` is a runtime string; store returns `EDITOR_COMMAND_NOT_FOUND` if missing | String key |
| Autosave timer callback | Runs in Node event loop; calls `writeSpecFile` with whatever spec/astHandle are in store at fire time | Internal spec value |
| `beforeExit` handler | Registered globally on `process`; must be removed in `dispose()` to prevent memory leak | None (lifecycle) |
| Cascade writes to spec | `rename-screen`, `delete-entity`, etc. modify multiple spec subtrees atomically in one apply | Internal spec value |
| `JsonPointer` path in args | Untrusted path string; resolves against spec structure only, never touches `fs.*` | JSON Pointer string |
| `ComponentNode` JSON capture for `inverseArgs` | Must be a deep plain-JS clone (`.toJSON()`), never a live YAML node reference | Spec YAML AST node |
| `specPath` from `cli-edit` argv | User-provided filesystem path; passed verbatim to `parseSpecFile` / `writeSpecFile` | Filesystem path |
| `flagArgs` from argv | Raw string tokens; parsed by `parseFlagsAgainstSchema` against per-command `argsSchema`; `Object.create(null)` prevents prototype pollution | CLI argv strings |
| `process.exitCode` vs `process.exit()` | `cli-edit` uses `exitCode` on success/save-gate paths to allow `beforeExit` + flush to run | Process exit code |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-04-01 | Tampering | `store.apply` args | mitigate | `argsSchema.safeParse(args)` before `command.apply`; `EDITOR_COMMAND_ARG_INVALID` per Zod issue — `store.ts:125-134` | closed |
| T-04-02 | DoS | undo stack memory | mitigate | `pushUndo` hard-caps at `UNDO_STACK_CAP=200` via `shift()` — `undo.ts:30-35` | closed |
| T-04-03 | Tampering | subscriber mutation during notify | mitigate | `notify()` iterates `[...subscribers]` snapshot — `store.ts:83-95` | closed |
| T-04-04 | Tampering | re-entrant apply during notify | mitigate | `notifying` flag + `queueMicrotask` queuing — `store.ts:74,211-217` | closed |
| T-04-05 | DoS | concurrent overlapping writes | accept | Atomic rename (D-29) makes second write safe; Phase-9 `withFileMutationQueue` serializes. Documented in `autosave.ts` header. | closed |
| T-04-06 | DoS | `beforeExit` handler not removed on dispose | mitigate | `dispose()` calls `process.off("beforeExit", beforeExitHandler)` — `autosave.ts:127` | closed |
| T-04-07 | Information Disclosure | stale spec after rapid undo | accept | `store.getState()` called at `doWrite()` fire time — always current state. Documented in `autosave.ts`. | closed |
| T-04-08 | Tampering | `rename-screen` id collision | mitigate | `validateSpec(newSpec)` post-apply catches duplicate screen ids; save-gate blocks write — `store.ts:140` | closed |
| T-04-09 | Tampering | `delete-screen` breaks `navigation.root` ref | mitigate | Cascade sets root to first remaining screen; `validateSpec` catches residuals — `delete-screen.ts:77-81` | closed |
| T-04-10 | Tampering | `set-acceptance-prose` block-scalar form | accept | `doc.setIn` re-stringifies; formatting loss documented in command and research §9.6 | closed |
| T-04-11 | Tampering | live YAML node in `inverseArgs` (`set-acceptance-prose`) | mitigate | `[...screen.acceptance]` spread — plain JSON clone — `set-acceptance-prose.ts:45` | closed |
| T-04-12 | Tampering | `set-component-action` with non-existent `actionId` | mitigate | `if (!(actionId in spec.actions))` no-op guard — `set-component-action.ts:66-69` | closed |
| T-04-13 | Tampering | `JsonPointer` path traversal | mitigate | `_path-utils` walks `spec.screens[i].variants[kind].tree` only; no `fs.*`; out-of-bounds → `null` — `_path-utils.ts:51-158` | closed |
| T-04-14 | Tampering | live YAML node in `remove-component` `inverseArgs` | mitigate | `astNode.toJSON()` — plain-JS copy — `remove-component.ts:95-101` | closed |
| T-04-15 | DoS | `set-variant-tree` enormous tree | accept | `validateSpec` post-apply surfaces structure issues; typical spec sizes prevent stack overflow. Documented. | closed |
| T-04-16 | Tampering | `rename-action` id collision | mitigate | `validateSpec(newSpec)` post-apply catches duplicate action ids — `store.ts:140` | closed |
| T-04-17 | Tampering | `add-nav-edge` with non-existent screen ids | mitigate | `validateSpec(newSpec)` catches dangling `NavEdge` refs; save-gate blocks write — `store.ts:140` | closed |
| T-04-18 | Tampering | `delete-entity`/`delete-action` orphan refs | mitigate | `collectOrphanEntityRefs` scans Field.of + Action.submit refs; `collectOrphanActionRefs` walks all component trees; both emit `EDITOR_REF_CASCADE_INCOMPLETE` info diagnostics; `validateSpec` + save-gate block writes — `delete-entity.ts`, `delete-action.ts` | closed |
| T-04-19 | DoS | `rename-action` cascade walk on large spec | accept | O(N-nodes); <1ms for typical specs (<20 screens, <50 nodes). Documented in command header. | closed |
| T-04-20 | Tampering | `COMMANDS` registry missing a command | mitigate | `COMMAND_NAMES = Object.keys(COMMANDS)` reflects catalog at runtime; `length===34` — `commands/index.ts:51-87` | closed |
| T-04-21 | Tampering | 200-cycle drift from non-deterministic `createNode` | mitigate | 200-apply/200-undo byte-identical test — `tests/editor-store.test.ts:273-318` | closed |
| T-04-22 | Tampering | `cli-edit` `specPath` path traversal | accept | User-level risk; Phase-9 pi sandbox restricts fs access. Documented in `cli-edit.ts` header. | closed |
| T-04-23 | Tampering | argv prototype pollution via `--__proto__` | mitigate | `Object.create(null)` for raw args object — `cli-edit.ts:38` | closed |
| T-04-24 | Information Disclosure | stack trace leak in `cli-edit` | mitigate | `.catch` writes only `err.message`; no stack trace — `cli-edit.ts:139-141` | closed |
| T-04-25 | DoS | slow `writeSpecFile` blocks `cli-edit` | accept | Single-file single-user local tool; no timeout needed for v1. Documented. | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-04-01 | T-04-05 | Concurrent overlapping writes: atomic rename (D-29) makes second write safe; Phase-9 `withFileMutationQueue` provides full serialization. Risk is negligible for single-user local tool. | Ray Liu | 2026-04-19 |
| AR-04-02 | T-04-07 | Stale spec after rapid undo: `store.getState()` called at write-fire time; always reflects current state. Cannot produce incorrect output. | Ray Liu | 2026-04-19 |
| AR-04-03 | T-04-10 | `set-acceptance-prose` block-scalar reformat: YAML round-trip may reformat block scalars. Human annotations may lose formatting; acceptable for v1. | Ray Liu | 2026-04-19 |
| AR-04-04 | T-04-15 | `set-variant-tree` deep recursion: no depth guard; typical spec sizes make stack overflow impossible. `validateSpec` surfaces structural issues post-apply. | Ray Liu | 2026-04-19 |
| AR-04-05 | T-04-19 | `rename-action` cascade walk performance: O(N-nodes); negligible for typical spec sizes. Documented in command header. | Ray Liu | 2026-04-19 |
| AR-04-06 | T-04-22 | `cli-edit` path traversal: `specPath` passed verbatim; Phase-9 pi sandbox restricts fs access. Acceptable for developer-local v1 tooling. | Ray Liu | 2026-04-19 |
| AR-04-07 | T-04-25 | Slow `writeSpecFile`: single-file single-user local tool; no timeout needed for v1. | Ray Liu | 2026-04-19 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-04-19 | 25 | 24 | 1 | gsd-security-auditor (initial scan) |
| 2026-04-19 | 25 | 25 | 0 | gsd-security-auditor + manual fix (T-04-18 — emit `EDITOR_REF_CASCADE_INCOMPLETE` from `delete-entity`/`delete-action`) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter
