# Phase 4: Editor Store, Commands & Undo — Context

**Gathered:** 2026-04-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Ship the L5 substrate both shells (wizard, canvas) will sit on: a reactive Spec store with named undoable commands, write-through debounced autosave, live invariant diagnostics published to subscribers, and a headless `cli-edit` harness that exercises every command with no TUI in the loop. Phase 4 is the last pure-Node phase — Phase 5 is where `ctx.ui.custom()` and pi-tui finally enter the picture.

**In scope (this phase):** `src/editor/` (store + command registry + per-command files + undo/redo stack + debounced autosave + diagnostics subscriber API), `scripts/cli-edit.ts` (CLI entry mirroring `scripts/render-wireframe.ts`), the full command catalog (exhaustive over Spec's mutable surface — target ~25–35 commands), table-driven apply-invert-apply idempotence tests, 200-apply/200-undo byte-identical integration test, debounce-coalescing test with fake timers, and the `store.flush()` API + `beforeExit` handler that closes SERDE-06 (Phase 2 shipped atomic primitive; Phase 4 closes debounce half).

**Explicitly NOT in scope:** TUI (Phase 5 canvas, Phase 6 wizard), `ctx.ui.custom()` integration (Phase 5), focus FSM / keybindings (Phase 5), wizard step flow (Phase 6), Maestro emission (Phase 7), `:yank wireframe` / `:prompt screen` handoff commands (Phase 8), `withFileMutationQueue` coordination (Phase 9), `session_start`/`session_shutdown` lifecycle hooks (Phase 9), per-screen body-anchor splicing (deferred per D-19 carryover — see D-68 below).

**Requirements covered:** EDITOR-01, EDITOR-02, EDITOR-03, EDITOR-04, EDITOR-05, EDITOR-06. Also closes the debounce half of SERDE-06 (Phase 2 shipped the atomic-write primitive; Phase 4 wires the 500ms debounce loop + flush).

</domain>

<decisions>
## Implementation Decisions

### Store Shape & Subscription API

- **D-50:** **Store is a hand-rolled signal (~50 LOC, no new runtime dep).** `src/editor/store.ts` exports `createStore(initial): Store` with `store.getState()`, `store.subscribe(fn): unsubscribe`, `store.apply(command, args): Promise<Result>`. No Zustand, no EventEmitter, no Immer. Rationale: matches the "no local database, no config stores" constraint in CLAUDE.md and the one-file-per-concern pattern from Phases 1–3. Testable as pure functions; subscribers are few (autosave + diagnostics + eventually canvas preview).
- **D-51:** **Subscribers receive the full new Spec + diagnostics on every commit.** `subscribe(fn)` → `fn({ spec, diagnostics })`. Full-value replacement; subscribers that only care about one slice memoize/compare themselves. No patch/delta surface — simplest correctness story for undo (prior snapshot = prior spec) and matches the "Spec is an immutable value type" convention from Phase 1. Structural sharing comes from the `apply()` implementation spreading only changed subtrees.
- **D-52:** **`AstHandle` is store-owned and opaque to shells.** The store holds `{ spec, astHandle }` as a pair; downstream consumers (canvas preview, wizard, diagnostics panes, Maestro emitter) see only `spec` via `store.subscribe`. `astHandle` is passed to `writeSpecFile` on save and nowhere else. Matches Phase 2 D-23 ("downstream consumers get the Spec only; AstHandle passes through editor store → writeSpecFile as an opaque token").
- **D-53:** **Store scope is spec-only: `{ spec, astHandle, diagnostics, dirty, undoStack, redoStack }`.** No `mode` (wizard/canvas), no `wizardStep`, no `focus/cursor`. Those fields ship with the shells that need them in Phase 5 (canvas) and Phase 6 (wizard). Rationale: keeps Phase 4 headless and CLI-testable per success crit #1 ("cli-edit ... with no TUI in the loop"). ARCHITECTURE §6's `EditorState` proposal is the Phase 5/6 target; Phase 4 delivers the inner `spec + undo` core of it.

### Command Catalog & Authoring Shape

- **D-54:** **Catalog is exhaustive over mutable Spec surface — every field a user would edit has a named command.** Target ~25–35 commands. EDITOR-01's "every state mutation is a named command" taken literally — no shell may reach into `spec` directly. Planner enumerates from the Zod schema tree. Rationale: Phase 5/6 have zero command gaps to fill; Phase 4 pays the cost once with the right abstraction in hand.
- **D-55:** **MVP must-ship subsets (blocking Phase 5 canvas kickoff):**
  - **Screen CRUD:** `add-screen`, `rename-screen`, `delete-screen`
  - **Component tree:** `add-component`, `remove-component`, `set-component-prop`
  - **Nav graph + data model:** `add-nav-edge`, `add-entity`, `add-field`
  - **Acceptance + variant:** `set-acceptance-prose`, `set-variant-null`
  - Planner fills the remainder of the exhaustive catalog (~15–25 more commands covering delete-entity, delete-field, reorder-component, move-component, set-variant-trigger, update-nav-edge-kind, set-back-behavior, set-meta-field, etc.) per D-54.
- **D-56:** **Per-command file shape:** `src/editor/commands/<verb-noun>.ts` exports `{ name, argsSchema, apply, invert }`. Kebab-case naming matches filename AND CLI invocation: `add-screen` → `commands/add-screen.ts` → `cli-edit foo.spec.md add-screen --id ...`. One concern per file per the Phase 1–3 precedent. Co-located `<command>.test.ts` runs apply→invert→apply idempotence table over ≥3 fixture inputs each.
- **D-57:** **Argument typing uses Zod per-command `argsSchema`.** Each command's `argsSchema` is a `z.object({...})` co-located in the command file. cli-edit runs `argsSchema.safeParse(flags)` before `apply`; parse errors surface as `EDITOR_COMMAND_ARG_INVALID` diagnostics with field paths. TypeScript `apply`/`invert` signatures are `z.infer<typeof argsSchema>`. Zod is already in the bundle (model layer) — no new dep.
- **D-58:** **Ref-integrity on rename/delete uses cascade via walker.** `rename-screen { from, to }` walks the spec, updates every `NavEdge.from/to`, every `Interaction.trigger.componentId` context, every `TestFlow` target that references `from` — all inside `apply()`. `invert()` restores the cascade. `delete-screen { id }` drops the screen AND removes dependent nav edges / marks orphaned interactions as diagnostic-broken. `validateSpec()` post-apply surfaces any residual unresolved refs as `severity: error` and the save-gate (D-31) blocks write. Rationale: "every edit flows through a command" means ref integrity is part of the edit, not an afterthought.
- **D-59:** **Interactions model uses two-command split.** `add-action { id, effect }` creates the action-registry entry; `set-component-action { screenId, variantKind, componentPath, actionId, testID? }` binds an interactable to an existing action (+ optional sigil triple). `rename-action { from, to }` cascades through every component binding referencing it. Matches Phase 1 D-04 (renderer consumes the triple; action-registry is the single source of truth). Wiring `testID` as a binding-time argument (not an `add-action` argument) lets multiple components share one action with different testIDs.
- **D-60:** **Command versioning = required args are frozen post-ship; additions must be optional with a safe default.** Zod schemas encode this naturally (`.optional().default(...)`). No version field on `argsSchema`, no runner dispatch. Rationale: commands are invoked fresh each session — they are not persisted across time like the spec schema is. The only persisted surface is the Spec (`schema: mobile-tui/1`), which has its own migration runner.

### Undo/Redo Stack

- **D-61:** **Undo stack is command inverse-replay, not snapshot storage.** Each stack entry is `{ commandName, args, inverseArgs }`. Undo = look up `commands[commandName].invert`, call `invert(spec, astHandle, inverseArgs)`, push entry to redo stack. Redo = replay with original args. Matches EDITOR-02's `invert(state) → inverse` contract literally and reuses the same inverse functions that table-driven apply-invert-apply tests exercise (success crit #5). 200 entries is a few KB of JSON, not MB of snapshots.
- **D-62:** **Commands MUST invert the AST edit in addition to the Spec edit.** `apply()` mutates both `spec` (structural, pure-value) AND `astHandle.doc` (via `setScalarPreserving` for scalar edits or `doc.setIn`/`doc.deleteIn` for structural edits). `invert()` reverses both. Rationale: success criterion #2 requires that 200 applies + 200 undos returns to the initial state **byte-identically**, which means `writeSpecFile(spec, astHandle)` after empty-stack must produce the same bytes as parse-time. If only spec inverts and the AST stays forward-mutated, round-trip bytes drift after the first save. This is load-bearing for Phase 4's "no hidden state" contract.
- **D-63:** **One command = one undo step.** No time-coalescing. EDITOR-03 "at least 200 steps" is taken literally: apply 200 → undo 200 → initial state. Rapid-fire coalescing is a debounce/autosave concern (D-64), not an undo concern. Explicit multi-step transactions are a deferred idea (Phase 5 canvas may add `store.transaction(() => {...})` if gesture UX demands it — see Deferred).
- **D-64:** **Hard cap at 200, drop oldest on overflow.** When the undo stack length exceeds 200, `shift()` the oldest entry. Redo stack is cleared on every new `apply` (standard UX convention — forking history). Bounded memory; meets EDITOR-03 minimum literally.

### Debounced Autosave

- **D-65:** **500ms trailing-edge debounce.** After the last `apply()`, the store waits for 500ms of quiet before calling `writeSpecFile`. No leading-edge write. Matches PITFALLS §4 + research SUMMARY convention. Success crit #4 (10 applies in 100ms → ≤2 writes in 1s) passes cleanly: 10 rapid applies coalesce to 1 write 500ms after the last one.
- **D-66:** **`store.flush(): Promise<WriteResult>` + automatic `beforeExit` handler.** `flush()` cancels any pending debounce timer and writes immediately. `src/editor/autosave.ts` registers `process.on("beforeExit", () => store.flush())` on store creation so single-shot scripts (cli-edit, test harnesses) don't exit with a pending write. Phase 9 will call `flush()` from `session_shutdown` inside `withFileMutationQueue`. Closes the Phase 2 D-32 cross-reference: atomic primitive (Phase 2) + debounce loop + flush hook (Phase 4) together satisfy SERDE-06 end-to-end.

### `cli-edit` Harness

- **D-67:** **Invocation form: `cli-edit <spec-path> <command-name> --arg value ...`.** Each command's `argsSchema` drives a minimist-style flag parser (`--id settings --name "Settings"`). Positional argument 1 is always the `.spec.md` path; positional argument 2 is the command name. Remaining tokens are flags. Human-friendly at the prompt, scriptable from bash. A `--batch <file>` flag for batch execution is deferred to v2 (see Deferred). No `bin` entry in `package.json` for v1 — invoked via `npm run cli-edit -- <args>` / `npx tsx scripts/cli-edit.ts <args>`, mirroring Phase 3 D-Claude (`scripts/render-wireframe.ts` pattern).
- **D-68:** **Exit code + diagnostic policy:**
  - **Exit 0:** Apply succeeded, save succeeded, zero `severity: error` diagnostics.
  - **Exit 1:** CLI-layer failure — unknown command, arg-parse failure (`EDITOR_COMMAND_ARG_INVALID`), missing file, permission denied, YAML parse error.
  - **Exit 2:** Save was gated by `validateSpec()` returning `severity: error` diagnostics (`writeSpecFile` returned `{ written: false }`). Command-produced diagnostics are in this category too.
  - Diagnostics print to stderr as `<severity> <path>: <message>` (one per line). `warning` and `info` always print but never change exit code. Success-path stdout stays terse ("applied add-screen → wrote foo.spec.md" or similar) so scripts can pipe through.

### Body-Opaque Carry-Forward (D-19 resolution)

- **D-69:** **Body remains fully opaque in Phase 4.** Commands edit frontmatter Spec only; body bytes pass through unchanged via `astHandle.bodyBytes` → `writeSpecFile` splice (Phase 2 D-18). Per-screen body-anchor splicing (`<!-- screen:ID --> ... <!-- /screen:ID -->`) is deferred to Phase 5 when canvas has a concrete user gesture ("edit this screen's prose in place") that requires it. D-21 stays locked: when anchors do land, new-screen blocks append at end of body. No Phase 4 command touches body bytes; anyone wanting to edit prose edits the `.spec.md` file by hand outside the tool, and Phase 4 round-trips those edits verbatim.

### Claude's Discretion (planner/executor defaults unless flagged)

- **New code layout:**
  - `src/editor/store.ts` — hand-rolled signal, `createStore`, `apply`, `subscribe`, `flush`, `undo`, `redo`, `getState`
  - `src/editor/commands/<verb-noun>.ts` — one file per command; exports `{ name, argsSchema, apply, invert }`
  - `src/editor/commands/index.ts` — registry barrel aggregating every command file (used by cli-edit for dispatch and by Phase 5/6 for command-palette enumeration)
  - `src/editor/undo.ts` — 200-cap stack, push/pop/clear-redo discipline; type-only helpers, no state of its own
  - `src/editor/autosave.ts` — debounce timer + `beforeExit` handler; wraps `writeSpecFile`
  - `src/editor/diagnostics.ts` — subscriber helper (`subscribeDiagnostics(fn)` as a sugared filter over `subscribe`) + new codes: `EDITOR_COMMAND_NOT_FOUND`, `EDITOR_COMMAND_ARG_INVALID`, `EDITOR_REF_CASCADE_INCOMPLETE`
  - `src/editor/index.ts` — public barrel
  - `scripts/cli-edit.ts` — CLI entry; argv parsing; registry lookup; Zod arg parsing; apply; flush; exit
- **Test harness:**
  - Co-located `src/editor/commands/<command>.test.ts` — table-driven apply→invert→apply idempotence over ≥3 fixture inputs per command (success crit #5)
  - `tests/editor-store.test.ts` — 200-apply/200-undo byte-identical integration (success crit #2); exercises every MVP command in the sequence
  - `tests/editor-diagnostics.test.ts` — diagnostics publish within one tick of apply (success crit #3)
  - `tests/autosave-debounce.test.ts` — vitest fake-timers: 10 applies in 100ms → ≤2 writes in 1s (success crit #4)
  - `tests/cli-edit.test.ts` — arg parsing, exit code matrix, diagnostic stderr format, success-path smoke (success crit #1)
- **Reusable from Phases 1–2:** `parseSpecFile` (load), `writeSpecFile` (save, single-shot atomic), `validateSpec` (post-apply re-check), `Diagnostic` factory + codes, the `Spec`/`Screen`/`ComponentNode`/`Variant` types.
- **Ref walker:** Reuse `walkComponentTree` from `src/model/cross-reference.ts` for the cascade logic in D-58. Add a screen-ref walker if not present; co-locate in `src/model/cross-reference.ts` to keep model-layer ref-aware utilities together.
- **AST edit discipline for commands (D-62 implementation guide):**
  - Scalar prop changes → `setScalarPreserving(doc, path, newValue)` (Phase 2)
  - Structural changes (add/remove component) → `doc.setIn(path, ...)` / `doc.deleteIn(path)` which re-stringify the subtree but localize damage
  - New screen inserts → append to `screens:` sequence via `doc.addIn([...])`
  - Every command captures the *pre-apply* AST state needed to invert — either via `before: YAML.parseDocument(doc.toString())` snapshot (expensive but safe) or via targeted "remember what was at this node" in `inverseArgs`. Planner picks per-command; most commands can capture a field-local before-value in `inverseArgs` without full AST snapshots.
- **`npm run cli-edit`:** Add to `package.json` scripts alongside `wireframe`. Invocation: `npm run cli-edit -- foo.spec.md add-screen --id settings --name "Settings"`.
- **Commit discipline:** continue Phase 1–3 TDD convention — `test(04-XX): RED` → `feat(04-XX): GREEN` commit pairs, one per plan wave.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents (researcher, planner, executor) MUST read these before planning or implementing.**

### Project-level contract
- `.planning/PROJECT.md` — core value, "spec IS state" constraint, out-of-scope (no hidden stores), Constraints (git-backed; no extension-local database)
- `.planning/REQUIREMENTS.md` §Editor store — EDITOR-01..06 full text + traceability; §Serialization — SERDE-06 (debounce half closes here)
- `.planning/ROADMAP.md` §Phase 4 — goal, 5 success criteria (cli-edit exit 0, 200-apply/200-undo byte-identical, diagnostics within one tick, 10-in-100ms coalescing, per-command apply+invert+test)
- `CLAUDE.md` §Technology Stack ("no local database, no config stores", "no HTTP server, no file watcher library"); §What NOT to Use (dotenv, chokidar, SQLite)

### Phase 1 contract (MUST read — Spec shape + invariants commands must preserve)
- `.planning/phases/01-spec-model-invariants/01-CONTEXT.md` §decisions — D-01..D-17 (action-registry as single source of truth, closed-catalog components, variant shape, diagnostic severity scale)
- `src/model/spec.ts` + `src/model/screen.ts` + `src/model/component.ts` + `src/model/variant.ts` + `src/model/action.ts` + `src/model/navigation.ts` + `src/model/data.ts` — authoritative Zod schemas (the enumeration source for D-54's exhaustive catalog)
- `src/model/invariants.ts` — `validateSpec(spec): { spec, diagnostics }` — called post-apply by the store for EDITOR-05
- `src/model/cross-reference.ts` — `crossReferencePass` + `walkComponentTree` — reuse for D-58 ref-cascade
- `src/primitives/diagnostic.ts` — `error`/`warning`/`info` factories; `DiagnosticSeveritySchema`; Phase 4 adds new codes but does not change the shape

### Phase 2 contract (MUST read — Phase 4 wraps writeSpecFile + honors save-gate)
- `.planning/phases/02-serialization-round-trip/02-CONTEXT.md` §decisions — D-18 (body opaque), D-19/D-20/D-21 (anchors deferred; new screens append), D-23 (`_sigilOrigin` on AST not Spec), D-29/D-30 (atomic `.tmp`+rename), D-31 (save-gate: `severity: error` → `{ written: false }` without disk I/O), D-32 (debounce half deferred to Phase 4)
- `src/serialize/parse.ts` — `parseSpecFile(path): { spec, astHandle, diagnostics, body }` — Phase 4 entry point on store initialization
- `src/serialize/write.ts` — `writeSpecFile(path, spec, astHandle): Promise<{ written, diagnostics }>` — Phase 4 wraps in debounce; Step 3's "Phase-4's editor store will wire real diffs before calling writeSpecFile" materializes here via D-62
- `src/serialize/ast-handle.ts` — `AstHandle` type (opaque to shells per D-52); fields `doc`, `bodyBytes`, `sigilOrigins`, `lineEndingStyle`, `orphanTemp`, `frontmatterStart`, `frontmatterEnd`, `closingDelimiterTerminator`
- `src/serialize/diagnostics.ts` — existing `SERDE_*` codes; Phase 4 adds `EDITOR_*` codes alongside

### Phase 3 contract (MUST read — wireframe renderer is the primary store subscriber in Phase 5 canvas preview)
- `.planning/phases/03-wireframe-renderer-dogfood-gate/03-CONTEXT.md` §decisions — D-42 (sigil metadata hidden in persisted wireframes; renderer consumes triple), D-45 (acceptance footer under content variant)
- `src/emit/wireframe/index.ts` — `render(spec, screenId): string` — Phase 5 canvas will call this per subscribe tick; Phase 4 does not invoke it but store API must not preclude it

### Research corpus (synthesised 2026-04-17)
- `.planning/research/ARCHITECTURE.md` §L5 (editor store layer), §6 (wizard/canvas state sharing pattern: single store, two presentations), §7 (edit/load/save data flow diagrams — Phase 4 implements every arrow)
- `.planning/research/PITFALLS.md` §9.1 (wizard/canvas co-design — Phase 4 ships the store both will share), §9.4 (write-through with debounce; no "unsaved" state), §4.1 (YAML round-trip via AST diff — D-62 enforces)
- `.planning/research/SUMMARY.md` §Build Order §Phase 4 — rationale for shipping editor store before shells
- `.planning/research/STACK.md` — confirms "no local database"; no new deps needed for Phase 4 (Zod + yaml already installed)
- `.planning/research/FEATURES.md` §MVP Table Stakes — "Undo/redo + write-through autosave"

### External standards + library docs
- `yaml` (eemeli) `Document.setIn` / `deleteIn` / `addIn` — AST structural mutation surface used by commands. https://eemeli.org/yaml/
- Zod v4 `.object(...).optional().default(...)` — encodes D-60's required-frozen, optional-additive versioning rule. https://zod.dev/v4
- Node `process.on("beforeExit", ...)` — D-66 flush hook surface. https://nodejs.org/api/process.html

### Session artefacts (read-only context)
- `.planning/STATE.md` — current progress; Phase 3 closed (9/9 plans, dogfood gate passed 2026-04-18)
- `.planning/phases/03-wireframe-renderer-dogfood-gate/03-VERIFICATION.md` — Phase 3 sign-off
- `fixtures/habit-tracker.spec.md`, `fixtures/todo.spec.md`, `fixtures/social-feed.spec.md` — 200-apply integration test inputs

### User-referenced docs during this discussion
None — all decisions are derived from the prior CONTEXT chain (01/02/03), the research corpus, and the fixed EDITOR-01..06 requirement text. No new external refs surfaced in Q&A.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets (from Phases 1, 2, 3)

- **`parseSpecFile(path)`** (`src/serialize/parse.ts`) — Phase 4 store initialization calls this once on `createStore(filePath)`. Returns `{ spec, astHandle, diagnostics, body }`. Store retains `spec` + `astHandle`; body is part of `astHandle.bodyBytes`.
- **`writeSpecFile(path, spec, astHandle)`** (`src/serialize/write.ts`) — Phase 4 autosave wraps this in a 500ms trailing-edge debounce (D-65). Phase 2 write.ts Step 3's "Phase-4's editor store will wire real diffs before calling writeSpecFile" materializes via D-62 (per-command AST-edit discipline) — commands have already mutated `astHandle.doc` by the time `flush` fires, so writeSpecFile's diff-apply step is still the existing no-op.
- **`validateSpec(spec)`** (`src/model/invariants.ts`) — called by store after every successful apply (EDITOR-05). `severity: error` diagnostics trigger a diagnostics event but DO NOT block the apply — save-gate (D-31) catches the blocked write later. Intentional: user sees the problem inline; the save stays deterred until they fix it.
- **`crossReferencePass` + `walkComponentTree`** (`src/model/cross-reference.ts`) — D-58 cascade uses these to find every ref site for rename/delete. Add a `walkScreenRefs` helper alongside them if the existing walkers don't cover nav/interaction/testflow edges.
- **`Diagnostic` factory** (`src/primitives/diagnostic.ts`) — `error`, `warning`, `info` helpers already exist; Phase 4 adds new `EDITOR_*` codes but does not change the shape.
- **Phase-3 `render(spec, screenId)`** (`src/emit/wireframe/index.ts`) — Phase 4 does NOT invoke it; but the store API must not preclude Phase 5 canvas calling it on every subscribe tick. `store.subscribe(({ spec }) => render(spec, focusedScreenId))` is the Phase 5 pattern; Phase 4 just ships the subscribe hook.
- **Fixture `.spec.md` files** — `fixtures/habit-tracker.spec.md`, `todo.spec.md`, `social-feed.spec.md` are the 200-apply integration test inputs. Each already has screens + variants + data + nav for the full exhaustive-catalog command sweep.

### Established Patterns (from Phases 1–3; follow, don't invent)

- **Pure functions + Result types; never throws at the boundary.** `validateSpec` returns diagnostics rather than throwing; Phase 4 commands' `apply` and `invert` return new state rather than throwing on invariant violation — the post-apply `validateSpec` call surfaces the problem as a diagnostic. Exceptions reserved for unrecoverable bugs (command registry miss = thrown, not diagnostic).
- **One file per concern.** Phase 1: `src/model/{action,variant,component,screen,navigation,spec}.ts`. Phase 2: `src/serialize/{parse,write,body,sigil,unknown,atomic,...}.ts`. Phase 3: `src/emit/wireframe/{layout, components/*, variants, cli}.ts`. Phase 4 continues: `src/editor/{store, commands/*, undo, autosave, diagnostics, index}.ts`. Each command gets its own file under `commands/`.
- **Closed vocabularies + exhaustive switches.** `COMPONENT_KINDS` (Phase 1), `SERDE_*` codes (Phase 2), 18-kind emitter dispatch (Phase 3). Phase 4's command registry is the next closed vocabulary: `COMMAND_NAMES` as a `const` tuple, TypeScript's exhaustiveness checker catches missing commands in cli-edit's dispatch.
- **TDD per-task commit pairs.** `test(04-XX): RED` → `feat(04-XX): GREEN` — reconstructable via `git log --oneline | grep '04-'`.
- **Co-located `.test.ts` per source file + integration tests in `tests/`.** Phase 4 adds `tests/editor-store.test.ts`, `tests/autosave-debounce.test.ts`, `tests/cli-edit.test.ts` for the integration gate; per-command tests live next to the command.
- **Biome + vitest + tsc green line.** Zero lint errors, zero tsc errors, every suite green. Phase 3 carried one pre-existing biome info warning from Phase 2 `write.ts:254`; Phase 4 inherits that exception unless resolved inline.

### Integration Points

- **Phase 4 → Phase 5 (canvas TUI):** Canvas's preview pane subscribes to `store` and re-renders on every tick via `render(spec, focusedScreenId)`. Canvas's screens-list pane subscribes and shows `spec.screens[].name`. Commands the canvas exposes are the same registry entries cli-edit dispatches — one registry, two presentations.
- **Phase 4 → Phase 6 (wizard):** Wizard's "answer step N" gestures translate to command invocations (e.g. step 4 "name your screens" → one `add-screen` per entered name). Wizard is a thin shell over the store; graduation to canvas is a mode flip with no store reset. D-53 keeps `mode` out of Phase 4 explicitly so wizard can add it without conflict.
- **Phase 4 → Phase 7 (Maestro emitter):** `:emit maestro` reads `store.getState().spec` and calls the pure emitter. No writes, no commands involved.
- **Phase 4 → Phase 8 (handoff commands):** `:yank wireframe <id>` and `:prompt screen <id> <target>` both read from `store.getState()`. Phase 8 may register new commands under `commands/` (e.g. `copy-wireframe-to-clipboard` as a side-effect-only command), but v1 keeps clipboard/prompt logic inline in their shell handlers.
- **Phase 4 → Phase 9 (pi integration):** Phase 9 wraps `store.flush()` in `withFileMutationQueue(absPath, fn)` and hooks `session_shutdown` to call `flush()` before releasing `ctx.ui.custom()`. `session_start` reads the spec path from pi's project-local state and constructs the store. Phase 4's autosave `beforeExit` handler (D-66) is the single-shot-script safety net; Phase 9's session hook is the in-pi safety net.

### New Code Layout

- `src/editor/` (new directory — L5 per ARCHITECTURE):
  - `store.ts` — `createStore(initial: { spec, astHandle }): Store`; `apply`, `subscribe`, `flush`, `undo`, `redo`, `getState`
  - `commands/<verb-noun>.ts` — one file per command (target ~25–35 files); exports `{ name, argsSchema, apply, invert }` — co-located `<command>.test.ts`
  - `commands/index.ts` — registry barrel; aggregates command exports into a `const COMMANDS = { [name]: command } as const` for dispatch
  - `undo.ts` — stack helpers (push, popUndo, popRedo, clearRedo, enforce 200 cap); no internal state
  - `autosave.ts` — 500ms debounce loop + `beforeExit` handler; takes a `Store` + `path` on init
  - `diagnostics.ts` — subscriber sugar + new codes (`EDITOR_COMMAND_NOT_FOUND`, `EDITOR_COMMAND_ARG_INVALID`, `EDITOR_REF_CASCADE_INCOMPLETE`)
  - `index.ts` — public barrel: `createStore`, `COMMANDS`, types
- `scripts/cli-edit.ts` — CLI entry; positional `<spec> <command>` + Zod-schema-driven flag parser; apply; flush; stderr diagnostics; exit 0/1/2
- `tests/editor-store.test.ts` — 200-apply/200-undo byte-identical integration (success crit #2)
- `tests/editor-diagnostics.test.ts` — subscriber-receives-diagnostics-within-one-tick (success crit #3)
- `tests/autosave-debounce.test.ts` — fake-timers, 10 applies in 100ms → ≤2 writes in 1s (success crit #4)
- `tests/cli-edit.test.ts` — CLI arg parsing + exit code matrix + diagnostic stderr (success crit #1)
- `package.json` — new script `"cli-edit": "npx tsx scripts/cli-edit.ts"` mirroring the Phase-3 `wireframe` entry

</code_context>

<specifics>
## Specific Ideas

- **"Single source of truth, no per-shell copies" (EDITOR-01) is the architectural spine.** Shells subscribe — they never `Object.assign`/clone the spec into local state. Any deviation from this collapses wizard↔canvas into "two different tools that share a file format." D-50/D-51/D-53 together enforce it: one store, one `getState`, one subscription stream, one scope boundary.
- **AST inversion (D-62) is the non-negotiable correctness bar.** Every command author must treat `astHandle.doc` edits as part of `apply`, and reversing those edits as part of `invert`. The 200-apply/200-undo byte-identical test (success crit #2) is a load-bearing canary — if a command forgets AST invert, that test fails on its first offending command. Plan this into the command-authoring template, don't rely on post-hoc catch.
- **Command catalog exhaustiveness (D-54) is what lets Phase 5/6 stay thin.** Every mutable Spec leaf has a command. If canvas wants to edit `meta.platform`, there's `set-meta-platform`; if wizard wants to set `acceptance[]`, there's `set-acceptance-prose` (already MVP). The payoff is zero command gaps in Phase 5/6 — shells render the command palette from the registry and dispatch. The cost is Phase 4 carrying ~25–35 command files; that cost is lower than re-designing command shape under UI pressure later.
- **Zod per-command args (D-57) gives cli-edit typed ergonomics for free.** A user typing `cli-edit foo.spec.md add-screen --id settigns` (typo) gets back `ERROR /id: invalid (did you mean 'settings'? no such field)` rather than a silent no-op or a crash. Planner wires the minimist-ish flag parser against `argsSchema.shape` so optional args, defaults, and enums all work as the Zod author declared them.
- **500ms debounce + beforeExit hook (D-65/D-66) is the minimum surface that closes SERDE-06.** Phase 2 deliberately split the contract: ship the atomic-write primitive with byte-level safety (D-29/D-32), defer debounce + flush to Phase 4. Phase 4 completes the half without re-opening Phase 2's primitive. cli-edit's `beforeExit` handler is the scripted-client safety net; Phase 9's `session_shutdown` is the pi-runtime safety net; both call the same `store.flush()`.
- **Ref-integrity cascade (D-58) as first-class command responsibility** rejects the "edit and hope" mode. rename-screen rewrites every dependent ref in the same atomic apply step — there's no intermediate state where the spec is "half renamed." Authors experience the rename as a single logical operation; validateSpec runs once at the end; save proceeds or is gated as one decision.
- **Body-opaque carry-forward (D-69)** preserves the Phase 2 invariant: the markdown body round-trips byte-identically through any Phase 4 edit. Authors can write free-form prose between frontmatter and wireframes; every cli-edit command leaves that prose untouched. Phase 5 is the first phase that opens body anchoring, and only because canvas will have a concrete "edit this screen's notes in place" gesture to justify it.

</specifics>

<deferred>
## Deferred Ideas

- **Transaction API (`store.transaction(fn)`)** — Phase 5 canvas may add an explicit grouping API if gesture UX requires it (e.g. drag-and-drop a component = reorder-sibling + update-parent-layout as one undo unit). D-63 keeps Phase 4 at 1:1 apply↔undo; transaction API is additive and doesn't break the existing contract.
- **`cli-edit --batch <file>` for scripted replay** — YAML/JSON array of `{command, args}` entries applied in sequence. Useful for fixture setup / regression repros / test scaffolding. Not required by success crit #1; defer to v2 unless an early user asks.
- **Command discovery surface (`cli-edit --list` / `--help <command>`)** — human-friendly registry browser. Nice-to-have; cli-edit can ship without it in v1. If canvas command palette (Phase 5) needs the same registry enumeration, both features can share the `COMMANDS` barrel.
- **Per-screen body-anchor splicing (D-19 carryover)** — `<!-- screen:ID --> ... <!-- /screen:ID -->` HTML-comment pairs. Lands in Phase 5 when canvas needs per-screen prose editing. D-21 already locks the "new screens append at end" behavior.
- **Structural diff between commits for changelog / git-commit-message generation** — "user did 12 edits between last save and this save; commit title could be 'rename 3 screens + add 2 nav edges'." Nice future polish; deferred.
- **Hybrid snapshot + inverse undo stack** — periodic full snapshots as resync points to guard against invert() bugs compounding over long stacks. Rejected for v1 per D-61 simplicity; revisit only if a real invert bug demonstrates the risk.
- **Multi-file spec support (monorepo-style)** — one store per file; cross-file refs would need a multi-doc registry. PROJECT.md scopes v1 to single-file specs; defer to post-v1.
- **Command "preview" / dry-run mode (`--dry-run`)** — apply without writing; show diagnostics + projected diff. Useful for scripting; cli-edit v1 writes eagerly. Defer.
- **WebSocket-style store replication for pair editing** — completely out of scope; PROJECT.md explicitly rejects multi-user collaboration. Noted only to close the question definitively.
- **Zod-derived JSON Schema for command-palette autocomplete in Phase 5** — Phase 4's argsSchemas are already Zod; `.toJSONSchema()` is a Zod v4 built-in. Phase 5 can consume directly without any Phase 4 plumbing. Defer to Phase 5.

</deferred>

---

*Phase: 04-editor-store-commands-undo*
*Context gathered: 2026-04-18*
