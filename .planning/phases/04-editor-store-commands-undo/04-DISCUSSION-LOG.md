# Phase 4: Editor Store, Commands & Undo — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in 04-CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-18
**Phase:** 04-editor-store-commands-undo
**Areas discussed:** Store model & subscription, Command catalog for v1, Undo strategy (200 steps), Autosave + cli-edit shape

---

## Store model & subscription

### Q1: Reactive primitive for src/editor/store.ts

| Option | Description | Selected |
|--------|-------------|----------|
| Hand-rolled signal | ~50 LOC; subscribers registered via store.subscribe(fn); matches "no hidden behavior" pattern from Phases 1–3 and CLAUDE.md "no local database" constraint | ✓ |
| Zustand vanilla | Add `zustand` runtime dep; `createStore` vanilla API; battle-tested selector machinery | |
| Node EventEmitter | Stdlib EventEmitter; `change` events carry spec + diagnostics; zero extra dep | |

**User's choice:** Hand-rolled signal (recommended)

### Q2: Subscriber update shape

| Option | Description | Selected |
|--------|-------------|----------|
| Full new Spec + diagnostics | subscribe(fn) → fn({ spec, diagnostics }); full-value replacement; simplest correctness story for undo | ✓ |
| Patch + new Spec | Small json-pointer delta alongside new spec; smarter subscribers, more surface | |
| Change event with op-name | fn({ commandName, spec, diagnostics }); subscribers diff themselves | |

**User's choice:** Full new Spec + diagnostics (recommended)

### Q3: AST handle flow

| Option | Description | Selected |
|--------|-------------|----------|
| Opaque, store-owned | Store holds { spec, astHandle } pair; shells never see astHandle; writeSpecFile gets it on save | ✓ |
| Re-parse after every write | Refresh astHandle via parseSpecFile after each save; doubles I/O; breaks comment-preservation invariant | |

**User's choice:** Opaque, store-owned (recommended)

### Q4: Store scope

| Option | Description | Selected |
|--------|-------------|----------|
| Spec-only scope | { spec, astHandle, diagnostics, dirty, undoStack }; focus/cursor/mode live in Phase 5/6 shells | ✓ |
| Full EditorState per ARCHITECTURE | Includes mode, wizardStep, focus; locks shape early but Phase 4 has no shell to exercise them | |

**User's choice:** Spec-only scope (recommended)

---

## Command catalog for v1

### Q1: Catalog width

| Option | Description | Selected |
|--------|-------------|----------|
| Narrow MVP (~8-10 commands) | Minimum set unblocking Phase 5 canvas; wizard-specific commands land Phase 6 | |
| Full catalog (~20+ commands) | Every mutation either shell needs; completeness now | ✓ |
| 3 reference + extension hook | Pattern-setters plus registerCommand() hook; pushes command work into shell phases | |

**User's choice:** Full catalog (~20+)

### Q2: MVP must-ship subsets (multiSelect)

| Option | Description | Selected |
|--------|-------------|----------|
| Screen CRUD (add/rename/delete) | add-screen, rename-screen, delete-screen with transitive ref handling | ✓ |
| Component tree edits (add/remove/set-prop) | The workhorse triple for every visual edit | ✓ |
| Nav graph + data model | add-nav-edge, add-entity, add-field — canvas graph/data pane prerequisites | ✓ |
| Acceptance prose + variant null-toggle | set-acceptance-prose, set-variant-null — SPEC-10 + D-39 support | ✓ |

**User's choice:** All four subsets

### Q3: Argument typing

| Option | Description | Selected |
|--------|-------------|----------|
| Zod schema per command | Each command exports { name, argsSchema: z.object, apply, invert }; typed CLI input | ✓ |
| Hand-written TS types + runtime assert | Manual `assertIsString(...)` calls; lighter layer | |
| JSON-Schema files | Sibling .schema.json; wider surface area | |

**User's choice:** Zod schema per command (recommended)

### Q4: Ref integrity on rename/delete

| Option | Description | Selected |
|--------|-------------|----------|
| Cascade updates via ref walker | apply() walks spec, updates all refs; invert() restores; validateSpec surfaces residual errors | ✓ |
| Leave refs broken; rely on save-gate | Commands edit local target only; validateSpec picks up unresolved refs | |
| Refuse command if refs exist | rename-screen fails if any ref exists; safe but awkward | |

**User's choice:** Cascade updates via ref walker (recommended)

### Q5 (follow-up): Exhaustive catalog scope

| Option | Description | Selected |
|--------|-------------|----------|
| Exhaustive: every Spec field editable | Planner enumerates from Zod schema; target ~25-35 commands | ✓ |
| Structural + presentational only | Skip meta/schema fields; ~15-20 commands | |
| Canvas-driven (cover every canvas gesture) | Couples Phase 4 scope to Phase 5 UI | |

**User's choice:** Exhaustive (recommended)

### Q6 (follow-up): Command naming convention

| Option | Description | Selected |
|--------|-------------|----------|
| verb-noun kebab matching file | add-screen → commands/add-screen.ts; CLI: `cli-edit ... add-screen` | ✓ |
| camelCase JS-style | addScreen, setComponentProp; less CLI-natural | |
| Dot-namespaced | screen.add, component.set-prop; groups nicely but more chars | |

**User's choice:** verb-noun kebab (recommended)

### Q7 (follow-up): Interactions surface

| Option | Description | Selected |
|--------|-------------|----------|
| add-action / rename-action + set-component-action | Split registry from binding; rename-action cascades | ✓ |
| Combined add-interaction | Create + bind in one step; less reuse | |

**User's choice:** Split (recommended)

### Q8 (follow-up): Command versioning

| Option | Description | Selected |
|--------|-------------|----------|
| Required-args-stable, optional-args-additive | Zod encodes naturally; no version field needed | ✓ |
| Command-version field in schema | Explicit versioning; surface for problem that may not materialize | |

**User's choice:** Required-stable, optional-additive (recommended)

---

## Undo strategy (200 steps)

### Q1: Undo representation

| Option | Description | Selected |
|--------|-------------|----------|
| Command inverse-replay | Stack holds { commandName, args, inverseArgs }; undo calls invert; matches EDITOR-02 literally | ✓ |
| Snapshot stack | Stack holds full spec snapshots; MBs of memory; redundant given invert() test requirement | |
| Hybrid: inverse + periodic snapshot | Resync snapshots against invert bugs; over-engineered for v1 | |

**User's choice:** Command inverse-replay (recommended)

### Q2: AST coherence through undo

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — AST edits also inverted | Every command inverts AST edit too; load-bearing for byte-identical round-trip after 200 undos | ✓ |
| Capture astHandle snapshot at load; restore on empty undo | Partial undos desync bytes until save | |
| Periodic re-parse to resync | Hidden re-parses drop comments on unsaved edits | |

**User's choice:** AST edits also inverted (recommended)

### Q3: Undo unit

| Option | Description | Selected |
|--------|-------------|----------|
| One command = one undo step | Predictable; matches EDITOR-03 "200 steps" literally; success crit #2 exercises directly | ✓ |
| Time-grouped (coalesce rapid commands) | Nicer UX but breaks success crit #2 test shape | |
| Explicit transaction API (beginGroup/endGroup) | Most flexible; adds API surface Phase 5 may not need | |

**User's choice:** One command = one undo step (recommended)

### Q4: Stack cap enforcement

| Option | Description | Selected |
|--------|-------------|----------|
| Hard cap at 200, drop oldest | Shift on overflow; redo cleared on new apply; bounded memory | ✓ |
| Configurable via flag, default 200 | Tuning knob; minor surface cost | |
| Unbounded in v1 | Violates EDITOR-03 "at least 200" cap implication | |

**User's choice:** Hard cap at 200 (recommended)

---

## Autosave + cli-edit shape

### Q1: Debounce timing

| Option | Description | Selected |
|--------|-------------|----------|
| 500ms trailing-edge only | PITFALLS/SUMMARY convention; success crit #4 passes cleanly | ✓ |
| 250ms trailing-edge | Faster sync; more writes under typing | |
| Leading + trailing (500ms) | Snappier first edit; violates coalescing intent | |

**User's choice:** 500ms trailing-edge only (recommended)

### Q2: Flush hooks

| Option | Description | Selected |
|--------|-------------|----------|
| store.flush() API + beforeExit handler | Callers can flush explicitly; auto-flush on process exit; closes SERDE-06 | ✓ |
| Manual flush only | Authors must remember; cli-edit exit-0 criterion fails on forgotten flush | |
| Auto-flush on every apply | Violates EDITOR-04 debounce requirement | |

**User's choice:** store.flush() + beforeExit (recommended)

### Q3: cli-edit invocation form

| Option | Description | Selected |
|--------|-------------|----------|
| cli-edit <spec> <command> --arg value | Zod argsSchema drives minimist-ish parser; human-friendly; scriptable | ✓ |
| cli-edit <spec> <command> '<json-args>' | Zero ambiguity; awkward for humans | |
| cli-edit <spec> <batch-file> | Replay-friendly; more complex than v1 needs | |

**User's choice:** Flag-based (recommended)

### Q4: Diagnostic output + exit codes

| Option | Description | Selected |
|--------|-------------|----------|
| Stderr lines + exit 0/1/2 | 0 success, 1 CLI/IO error, 2 save-gated; warnings/info print but don't change exit | ✓ |
| JSON on stdout, exit encodes intent | Machine-friendly; awkward interactive | |
| Silent on success, verbose on failure | Minimal ambient noise; loses echo for pipelines | |

**User's choice:** Stderr + exit 0/1/2 (recommended)

---

## Claude's Discretion

- New code layout under `src/editor/` — `store.ts`, `commands/<verb-noun>.ts` (one per command), `commands/index.ts` (registry barrel), `undo.ts`, `autosave.ts`, `diagnostics.ts`, `index.ts`
- `scripts/cli-edit.ts` mirrors Phase-3 `scripts/render-wireframe.ts` pattern; `npm run cli-edit -- ...`; no `bin` entry in v1
- Test harness: co-located `.test.ts` per command (apply→invert→apply idempotence); integration tests under `tests/` for 200-apply-byte-identical, debounce-coalescing, cli-edit-exit-matrix
- New diagnostic codes: `EDITOR_COMMAND_NOT_FOUND`, `EDITOR_COMMAND_ARG_INVALID`, `EDITOR_REF_CASCADE_INCOMPLETE`
- Reuse `walkComponentTree` + `crossReferencePass` for ref-cascade; add `walkScreenRefs` helper if existing walkers don't cover nav/interaction/testflow edges
- AST-edit discipline per command: `setScalarPreserving` for scalars; `doc.setIn`/`deleteIn`/`addIn` for structural; capture pre-apply state in `inverseArgs` rather than full doc snapshots where feasible
- Commit discipline: `test(04-XX): RED` → `feat(04-XX): GREEN` pairs per plan wave

## Deferred Ideas

- Transaction API (`store.transaction(fn)`) for Phase 5 gesture grouping
- `cli-edit --batch <file>` for scripted replay
- `cli-edit --list` / `--help <command>` registry browser
- Per-screen body-anchor splicing (D-19 carryover) — Phase 5 when canvas needs it
- Structural diff between commits for changelog generation
- Hybrid snapshot + inverse undo stack (invert-bug resync points)
- Multi-file spec / monorepo support
- `--dry-run` command preview mode
- WebSocket replication for pair editing (out of scope — PROJECT.md)
- Zod-derived JSON Schema for Phase 5 command-palette autocomplete (Phase 5 consumes directly)
