# mobile-tui — Roadmap

Derived from `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, and `.planning/research/SUMMARY.md` (2026-04-17).
Granularity: **fine** (8–12 phases). Parallelization: **on**. Mode: **yolo**.

## Core Value (anchor)

> The ASCII wireframes are good enough that a developer would share them — the wireframe artifact is the centerpiece; everything else (nav, data, state, tests) is structure around it.

Phase 3 carries the dogfood gate that encodes this core value.

## Dependency Graph (research-driven)

```
Phase 1 (Model L1/L2)
    │
    ├── Phase 2 (Serialize L3) ─────┐
    │                               │
    └── Phase 3 (Wireframe L4) ─────┤ dogfood gate
                                    │
                                    ▼
                          Phase 4 (Editor Store L5)
                                    │
                                    ▼
                          Phase 5 (Canvas L6a)
                                    │
                                    ▼
                          Phase 6 (Wizard L6b)
                                    │
                                    ├── Phase 7 (Maestro Emitter L4)
                                    │
                                    └── Phase 8 (Handoff commands)
                                                │
                                                ▼
                                         Phase 9 (pi Integration L7)
```

## Phases

- [ ] **Phase 1: Spec Model & Invariants** — Lock the framework-agnostic Spec shape, Zod schemas, closed component catalog, and `validateSpec()` contract. Headless fixtures prove the model.
- [ ] **Phase 2: Serialization & Round-Trip** — Byte-identical round-trip on no-op save via `eemeli/yaml` Document-AST diff-and-apply, HTML-comment-anchored markdown body, ~20 golden fixtures in CI.
- [ ] **Phase 3: Wireframe Renderer & Dogfood Gate** — Pure-function renderer producing ~40-line ASCII wireframes per screen and state variant; 20 reference wireframes pasted into a real PR before TUI work begins.
- [ ] **Phase 4: Editor Store, Commands & Undo** — Single reactive store with named undoable commands, 200-step history, write-through debounced autosave, live diagnostics, and a headless `cli-edit` harness.
- [ ] **Phase 5: Canvas TUI Shell** — 3-pane keyboard-driven canvas with focus FSM, command palette, persistent help line, save indicator, and `ctx.ui.custom()`-scoped rendering.
- [ ] **Phase 6: Wizard & Graduation** — 8 linear steps layered on the canvas store; re-entry edits in place; mode-flip to canvas with no reset.
- [ ] **Phase 7: Maestro Emitter** — Pure emitter from `TestFlow` + nav graph to `<flow>.ios.yaml` / `<flow>.android.yaml`, sigil-gated with no coordinate fallbacks, wired to `:emit maestro`.
- [ ] **Phase 8: LLM Handoff Commands** — `:yank wireframe`, `:prompt screen …`, `:extract --screen`, with semantic-token-based prompt scaffolds under 2k tokens.
- [ ] **Phase 9: pi.dev Integration & Packaging** — Thin L7 glue: `/spec` command, shortcuts, session lifecycle, file-mutation queue, `tsup` ESM+dts build, README, `pi install npm:mobile-tui` verified on two pi versions.

## Phase Details

### Phase 1: Spec Model & Invariants

**Goal**: A developer (or any downstream layer) can describe a mobile app as a framework-agnostic component tree plus nav, data, and state, with invariants that catch malformed specs before any file hits disk.

**Depends on**: Nothing (foundation).

**Requirements**: SPEC-01, SPEC-02, SPEC-03, SPEC-04, SPEC-05, SPEC-06, SPEC-07, SPEC-10, SERDE-08

**Success Criteria** (what must be TRUE):
  1. Three hand-authored fixture specs (3 screens + 2 entities + 5 interactions each) exist in `fixtures/` and pass `validateSpec()` with zero errors.
  2. A deliberately malformed fixture (missing `back_behavior` on a non-root screen, unknown component kind, dangling sigil reference, JSON-Pointer that resolves to nothing) returns a `Diagnostic[]` with the expected `{code, severity, path, message}` shape — `validateSpec()` never throws.
  3. The closed component catalog (Column, Row, Text, Button, TextField, List, ListItem, Card, Image, Icon, Divider, Toggle, SegmentedControl, TabBar, NavBar, Modal, Sheet, Spacer) is the only accepted vocabulary — any other `kind` is rejected by the schema.
  4. `migrations/v1_to_v2.ts` exists (empty list of transforms is fine) and a no-op migration harness round-trips one fixture through it.
  5. One fixture's spec can be hand-translated to both SwiftUI and Jetpack Compose with no ambiguity — the "two-target fidelity" gate.

**Plans**: 8 plans

- [x] 01-01-PLAN.md — Toolchain scaffolding: package.json, tsconfig, biome, vitest, directory skeleton, fixture-parse helper
- [x] 01-02-PLAN.md — L1 primitives: branded ID types (Screen/Action/Test/Entity), JsonPointer (RFC 6901), Diagnostic shape + factories
- [x] 01-03-PLAN.md — Leaf model schemas: version, back-behavior, action (6-kind discriminated union), data model, variants factory
- [x] 01-04-PLAN.md — Recursive component tree: 18-kind closed catalog via z.union + z.lazy + z.ZodType<ComponentNode> annotation
- [x] 01-05-PLAN.md — Screen, Navigation, Spec root composition; wires ScreenVariantsSchema to real ComponentNodeSchema
- [x] 01-06-PLAN.md — validateSpec() two-stage pipeline: Zod safeParse adapter + crossReferencePass + public src/index.ts barrel
- [x] 01-07-PLAN.md — Migration scaffold: v1_to_v2 empty-op migrate + runMigrations chain runner + round-trip test
- [x] 01-08-PLAN.md — Fixtures: 3 canonical (habit-tracker, todo, social-feed) + 1 malformed + SwiftUI/Compose hand-translations for D-16 fidelity gate

### Phase 2: Serialization & Round-Trip

**Goal**: The spec file on disk is the single source of truth, and a no-op load→save round-trips byte-identically — comments, key order, blank lines, anchors all survive.

**Depends on**: Phase 1 (needs the Spec type + `validateSpec()`).

**Requirements**: SPEC-08, SPEC-09, SERDE-01, SERDE-02, SERDE-03, SERDE-04, SERDE-05, SERDE-06, SERDE-07

**Success Criteria** (what must be TRUE):
  1. At least 20 golden fixtures (including hand-edited-with-comments, reordered keys, unknown fields, nested comments, empty files, YAML-1.1-gotcha values) round-trip byte-identically through parse→serialize; CI fails on any drift.
  2. An unknown top-level frontmatter key written by a future version lands in `_unknown:` on parse and re-emits in its original position on save.
  3. The first save of a fixture without `schema:` injects `schema: mobile-tui/1` and leaves the remainder of the document byte-identical.
  4. `validateSpec()` returning any `severity: "error"` diagnostic blocks the write-through save; warnings do not.
  5. Triggering a save mid-debounce followed by a `session_shutdown` event flushes atomically (visible as `.SPEC.md.tmp` → `rename`) with no partial writes.

**Plans**: TBD

### Phase 3: Wireframe Renderer & Dogfood Gate

**Goal**: Given a screen, the renderer produces an ASCII wireframe a developer would actually paste into a PR, Slack, or email — the core-value gate the rest of the product leans on.

**Depends on**: Phase 1 (reads the Spec). Intentionally built before Phase 2 usage to keep focus, but can proceed in parallel with Phase 2 once the model is frozen.

**Requirements**: WIREFRAME-01, WIREFRAME-02, WIREFRAME-03, WIREFRAME-04, WIREFRAME-05, WIREFRAME-06

**Success Criteria** (what must be TRUE):
  1. Running `render-wireframe <spec> <screen-id>` produces a ~40-line, ~60-col-wide ASCII block with explicit `|` right borders that survives paste into a GitHub PR description without mangling.
  2. For every component in the closed v1 catalog there is a snapshot test, and at least 5 composite-layout fixtures (nested Column/Row, Card-in-List, NavBar+TabBar, Modal-over-content, Sheet) have green snapshots.
  3. Every screen with defined variants produces four stacked wireframe blocks (`content`, `empty`, `loading`, `error`), each clearly labeled — no single-block overlays.
  4. The persisted wireframe output contains only `|`, `-`, `+`, `.`, and printable ASCII (regex-enforced in tests); the in-TUI preview path is the only caller allowed to request Unicode glyphs.
  5. **Dogfood gate**: 20 reference wireframes are committed under `fixtures/wireframes/` and the author has pasted at least 3 of them into a real PR / Slack thread and judged them "shareable". This gate blocks the Phase 4 kickoff.

**Plans**: TBD
**UI hint**: yes

### Phase 4: Editor Store, Commands & Undo

**Goal**: Both shells (wizard, canvas) sit on one reactive Spec store with named undoable commands and write-through autosave — a "no unsaved state" editing model.

**Depends on**: Phases 1, 2, 3 (needs model, serializer, and renderer — diagnostics subscribers depend on the renderer for inline previews downstream).

**Requirements**: EDITOR-01, EDITOR-02, EDITOR-03, EDITOR-04, EDITOR-05, EDITOR-06

**Success Criteria** (what must be TRUE):
  1. Running `cli-edit <spec> <command> [args...]` applies any registered command against a spec file on disk, writes through via the serializer, and exits 0 — scriptable with no TUI in the loop.
  2. Applying ≥200 commands in sequence and then pressing undo 200 times returns the store to its initial state byte-identically; redo replays the sequence.
  3. After every successful apply, diagnostics published to a test subscriber reflect the new spec within one tick (measured in a subscriber mock).
  4. Simulated rapid-fire commands (10 applies within 100ms) coalesce into at most 2 disk writes within 1s via the debounced autosave — verified by a spy on the serializer.
  5. Each command lives in its own file under `src/editor/commands/` with `apply` and `invert` exports, and `vitest` runs an exhaustive table of apply-invert-apply idempotence assertions.

**Plans**: TBD

### Phase 5: Canvas TUI Shell

**Goal**: A developer can open an existing spec file and edit screens, nav, data, and state variants from a keyboard-driven 3-pane canvas — with live wireframe preview and obvious save state.

**Depends on**: Phase 4 (store + commands).

**Requirements**: CANVAS-01, CANVAS-02, CANVAS-03, CANVAS-04, CANVAS-05, CANVAS-06

**Success Criteria** (what must be TRUE):
  1. Opening canvas against any fixture spec renders three panes (screens list / editor / wireframe preview); Tab and Shift-Tab cycle focus deterministically according to a documented focus FSM.
  2. Pressing `:` or `Ctrl+P` opens a command palette listing every command the editor exposes with its current keybinding; selecting a command executes it against the focused pane.
  3. The bottom status line shows 4–6 focus-relevant keybindings at all times, changing when focus changes; the save indicator flips `●` → `✓` within 1s of the last edit settling.
  4. Canvas runs without ever writing outside the region returned by `ctx.ui.custom()` — a chrome-hygiene test asserts no raw alt-buffer escape sequences are emitted.
  5. Launching canvas against a spec file that has never been through the wizard still works end-to-end — edit a screen, see the wireframe update, quit, re-open and find the edit on disk.

**Plans**: TBD
**UI hint**: yes

### Phase 6: Wizard & Graduation

**Goal**: A developer with an idea but no spec reaches a saved skeleton in 8 linear steps, and graduation to canvas is a mode flip — not a restart.

**Depends on**: Phase 5 (canvas store, focus FSM, palette, keybindings all reused).

**Requirements**: WIZARD-01, WIZARD-02, WIZARD-03, WIZARD-04, WIZARD-05

**Success Criteria** (what must be TRUE):
  1. The wizard walks through exactly 8 fixed linear steps (app idea → primary user → navigation pattern → screens → auth → data → offline/sync → target platforms) with a visible step indicator; no branching.
  2. Quitting the wizard at any step leaves a saved, parseable spec file on disk reflecting every answered step; re-opening resumes at the first unanswered step.
  3. When the wizard is re-entered against a fully-populated spec, finished steps display their saved answers inline and edit in place; unfinished steps show `TODO` markers — no prompts that overwrite existing data.
  4. From any step, pressing the documented skip-to-canvas key flips into canvas with the current spec loaded — no save prompt, no reset, identical keybindings and help-line conventions.
  5. A fixture-driven test confirms the wizard and canvas share the same keybinding table and command palette entries (one registry, two presentations).

**Plans**: TBD
**UI hint**: yes

### Phase 7: Maestro Emitter

**Goal**: Every user journey in the spec becomes two executable Maestro flow files (iOS + Android), each selecting via `test:` sigils — runnable against a real device without edits.

**Depends on**: Phase 6 (full product is usable; emitter can consume real user-authored specs). Emitter itself depends only on Phase 1 + Phase 2, so Phase 7 and Phase 8 can run in parallel.

**Requirements**: MAESTRO-01, MAESTRO-02, MAESTRO-03, MAESTRO-04, MAESTRO-05

**Success Criteria** (what must be TRUE):
  1. `:emit maestro` against a fixture writes `<flow>.ios.yaml` and `<flow>.android.yaml` under `./flows/` next to the spec; both files parse under `maestro check-flow-syntax` when `MAESTRO_CLI=1` is set.
  2. A fixture with a sigil referenced in a flow but missing from the screen fails emission loudly with a diagnostic naming the missing sigil — no silent fallback to coordinates or nth-child.
  3. A fixture with an iOS-only step (permission dialog) produces diverging `.ios.yaml` / `.android.yaml` while keeping the shared steps byte-identical between files.
  4. The emitter is a pure function — passing the same `TestFlow` + nav graph twice produces byte-identical output; no hidden IO, no timestamps, no randomness.
  5. Running the emitter against all fixture flows and diffing the output directory against the committed golden `flows/` tree shows zero drift in CI.

**Plans**: TBD

### Phase 8: LLM Handoff Commands

**Goal**: A developer can extract a screen, its wireframe, or a framework-targeted prompt from any spec and paste it straight into an LLM of their choice — the handoff the product exists to enable.

**Depends on**: Phase 6 (commands wired into canvas). Parallelizable with Phase 7.

**Requirements**: HANDOFF-01, HANDOFF-02, HANDOFF-03, HANDOFF-04

**Success Criteria** (what must be TRUE):
  1. `:yank wireframe <screen-id>` copies the ASCII-baseline wireframe to the OS clipboard; pasting into a plain-text editor produces the exact bytes from the persisted wireframe (no Unicode glyphs, no trailing control chars).
  2. `:prompt screen <id> <target>` where target ∈ {swiftui, compose, tests} emits a self-contained prompt under 2k tokens (measured) containing the screen spec, navigation neighbors, referenced entities, and acceptance criteria.
  3. `:extract --screen <id>` writes the same prompt fragment to a file under `./prompts/`; the file is valid Markdown and re-openable by the tool.
  4. The emitted prompts reference styling and layout via semantic tokens (`variant: primary`, `gap: md`) and never pixel values or framework-specific idioms — verified by a tokenizer test that rejects `#FF…`, `dp`, `pt`, `px`, etc.
  5. A prompt emitted for a fixture screen round-trips through the author's own LLM to produce a SwiftUI or Compose snippet that renders without structural edits — dogfood spot-check on at least 2 screens.

**Plans**: TBD

### Phase 9: pi.dev Integration & Packaging

**Goal**: `pi install npm:mobile-tui` followed by `/spec` opens the wizard-or-canvas against the current project's spec file on two distinct pi versions.

**Depends on**: Phases 5, 6, 7, 8 (everything pi wraps must already work in plain Node).

**Requirements**: PI-01, PI-02, PI-03, PI-04, PI-05, PI-06, PI-07, PI-08

**Success Criteria** (what must be TRUE):
  1. `pi install npm:mobile-tui && /spec` against a fresh project opens the wizard; against a project with an existing `SPEC.md` it opens canvas — verified end-to-end on two pi versions.
  2. `session_start` rehydrates the in-flight spec (cursor position, focused pane, pending debounced save) from `.planning/.mobile-tui/` (which is gitignored and entirely project-local — never under `~/.pi/`); `session_shutdown` flushes pending writes before releasing the `ctx.ui.custom()` region.
  3. A simulated concurrent write from a pi tool and the extension against the same spec file serializes cleanly through `withFileMutationQueue` — neither write is lost, no interleaved partial state on disk.
  4. `package.json` declares `@mariozechner/pi-coding-agent` and `@mariozechner/pi-tui` as `peerDependencies` (never `dependencies`), exports ESM + dts via `tsup`, and the default export is a function receiving `ExtensionAPI` per pi-mono conventions.
  5. The published README documents install, `/spec` usage, every command surface, and the spec schema — a reader with no prior context can produce a working spec from README instructions alone.

**Plans**: TBD

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Spec Model & Invariants | 4/8 | In Progress | — |
| 2. Serialization & Round-Trip | 0/? | Not started | — |
| 3. Wireframe Renderer & Dogfood Gate | 0/? | Not started | — |
| 4. Editor Store, Commands & Undo | 0/? | Not started | — |
| 5. Canvas TUI Shell | 0/? | Not started | — |
| 6. Wizard & Graduation | 0/? | Not started | — |
| 7. Maestro Emitter | 0/? | Not started | — |
| 8. LLM Handoff Commands | 0/? | Not started | — |
| 9. pi.dev Integration & Packaging | 0/? | Not started | — |

## Out of Scope for this Roadmap

- **Detox emitter** — deferred to v2 per REQUIREMENTS §v2; not included in Phase 7 or any v1 phase.
- **Per-screen state machines, flow-sheet exports, assertion inference, a11y fields, design-token pipeline** — v2 scope.
- **Web / graphical wireframing UI, mouse support, alt-buffer takeover, multi-user collab** — PROJECT Out of Scope; no phase may introduce these.

## Coverage

**Requirements mapped**: 58 / 58 (100%).

| Category | Count | Phase |
|----------|-------|-------|
| SPEC-01..07, SPEC-10 | 8 | Phase 1 |
| SPEC-08, SPEC-09 | 2 | Phase 2 |
| SERDE-01..07 | 7 | Phase 2 |
| SERDE-08 | 1 | Phase 1 |
| WIREFRAME-01..06 | 6 | Phase 3 |
| EDITOR-01..06 | 6 | Phase 4 |
| CANVAS-01..06 | 6 | Phase 5 |
| WIZARD-01..05 | 5 | Phase 6 |
| MAESTRO-01..05 | 5 | Phase 7 |
| HANDOFF-01..04 | 4 | Phase 8 |
| PI-01..08 | 8 | Phase 9 |

No orphaned requirements. No duplicated mappings.

### Placement Notes

- **SERDE-08 (migration runner scaffold) → Phase 1**, not Phase 2. The runner is a schema-versioning invariant that must ship with the model, not the serializer — the file must exist from commit 1 even if its list of transforms is empty. Its delivery is independent of the round-trip work.
- **SPEC-08 (`schema: mobile-tui/1` frontmatter) + SPEC-09 (`validateSpec()` diagnostics gate save) → Phase 2**, not Phase 1. SPEC-08 is observable only at first-serialized-output; SPEC-09's write-through-save gating is a serializer-layer contract even though the `validateSpec()` function itself is authored in Phase 1. Flagged because both bridge the model↔serializer boundary.

---

*Last updated: 2026-04-17 after initial roadmap creation.*
