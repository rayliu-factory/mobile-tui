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
- [x] **Phase 2: Serialization & Round-Trip** — Byte-identical round-trip on no-op save via `eemeli/yaml` Document-AST diff-and-apply, HTML-comment-anchored markdown body, ~20 golden fixtures in CI.
- [x] **Phase 3: Wireframe Renderer & Dogfood Gate** — Pure-function renderer producing ~40-line ASCII wireframes per screen and state variant; 20 reference wireframes pasted into a real PR before TUI work begins.
- [x] **Phase 4: Editor Store, Commands & Undo** — Single reactive store with named undoable commands, 200-step history, write-through debounced autosave, live diagnostics, and a headless `cli-edit` harness. ✓ 2026-04-18
- [x] **Phase 5: Canvas TUI Shell** — 3-pane keyboard-driven canvas with focus FSM, command palette, persistent help line, save indicator, and `ctx.ui.custom()`-scoped rendering. ✓ 2026-04-19
- [x] **Phase 6: Wizard & Graduation** — 8 linear steps layered on the canvas store; re-entry edits in place; mode-flip to canvas with no reset. ✓ 2026-04-19
- [x] **Phase 6.1: Functional Integration Fixes** — Wire runMigrations into parseSpecFile, persist DataStep entities via store.apply, instantiate createAutosave in both entry scripts. ✓ 2026-04-19
- [x] **Phase 6.2: Documentation & Traceability Repair** — Produce Phase 3 VERIFICATION.md (audit blocker), update stale REQUIREMENTS.md checkboxes for Phases 4–6, finalize draft VALIDATION files. ✓ 2026-04-19
- [x] **Phase 7: Maestro Emitter** — Pure emitter from `TestFlow` + nav graph to `<flow>.ios.yaml` / `<flow>.android.yaml`, sigil-gated with no coordinate fallbacks, wired to `:emit maestro`. ✓ 2026-04-19
- [x] **Phase 7.1: Maestro Emitter Hardening & Traceability** — Fix execFileSync timeout risk, testID unsafe cast, MAESTRO_UNRESOLVED_ACTION diagnostic naming, and update REQUIREMENTS.md MAESTRO-01..05 checkboxes. ✓ 2026-04-20
- [ ] **Phase 7.2: Nyquist Validation for Gap-Closure Phases** — Produce VALIDATION.md for Phases 6.1 and 6.2 (gap-closure phases that shipped without formal Nyquist compliance records).
- [ ] **Phase 7.3: Spec Model Diagnostic Completeness** — Add missing diagnostics from Phase 1 advisory review: duplicate screen-id, duplicate entity-name, RFC-6901 escape handling in resolveJsonPointerPrefix, migration runner contract alignment.
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

**Plans**: 5 plans (5/5 complete — Phase 2 CLOSED)

- [x] 02-01-PLAN.md — Wave 0 substrate: install yaml + gray-matter deps, ban js-yaml, scaffold src/serialize/ stubs, migrate Phase-1 tests to parseSpecFile stub
- [x] 02-02-PLAN.md — Wave 1 L1 primitives: splitFrontmatter (gray-matter + eemeli/yaml engine) + body-bytes extractor + partitionTopLevel (AST-native unknown preservation with proto-pollution defense)
- [x] 02-03-PLAN.md — Wave 2 transform primitives: sigil.ts (SIGIL_REGEX + INTERACTABLE_KINDS + WeakMap origin tracking) + schema-inject.ts (idempotent schema: mobile-tui/1 injection + blank line)
- [x] 02-04-PLAN.md — Wave 3 write path: atomic.ts (.tmp + rename primitive with simulated-crash coverage — D-30/D-32) + write.ts (9-step pipeline: adversarial AST pre-gate → save-gate → schema inject → CST diff-apply → sigil re-emit → SERDE-07 auto-quote → doc.toString → closing-delimiter splice → atomic rename)
- [x] 02-05-PLAN.md — Wave 4 close: real parseSpecFile orchestrator (Wave-0 .spec.json stub retired) + 20-fixture Buffer.equals round-trip matrix (3 triple + 3 sigil + 3 comments + 4 reorders + 2 unknown-keys + 2 YAML-1.1 + empty-body + comment-only-body + nested-block-scalar) + prototype-pollution 3-layer defense integration test + .spec.json sibling retirement. Full suite 425/425; coverage 95.06% stmts on src/serialize/.

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

**Plans**: 9 plans

- [x] 03-01-PLAN.md — Wave 0 scaffold: src/emit/wireframe/ dir tree (18 emitter stubs + layout/text-style/overflow/variants stubs + dispatch exhaustive switch + barrel) + scripts/render-wireframe.ts CLI stub + fixtures/wireframes/ dir + SHARED.md/README.md templates + 3 integration test harnesses + .gitattributes LF lock + package.json wireframe script
- [x] 03-02-PLAN.md — Wave 1 layout primitives: PHONE_WIDTH=60 + buildVariantHeader (3-stage overflow cascade per RESEARCH Pitfall 5) + padRight + drawFrame per D-38/D-40/D-41
- [x] 03-03-PLAN.md — Wave 1 text transforms (parallel with 03-02): overflow.ts truncate per D-44 + text-style.ts applyTextStyle per D-43 (heading-1 UPPERCASE, heading-2 identity, body identity, caption parens, undefined=body)
- [x] 03-04-PLAN.md — Wave 2 leaf emitters: Text + Icon + Divider + Spacer + Image (5 kinds) with snapshot + rectangular-contract tests
- [x] 03-05-PLAN.md — Wave 2 interactable emitters (parallel): Button (3 variants) + Toggle ([ ]/[x]) + TextField (underscore fill) + SegmentedControl (< opts >) per D-34; D-42 metadata-hidden enforced per test
- [x] 03-06-PLAN.md — Wave 2 structural emitters (parallel): Column + Row + Card + List (single-item + bindsTo footer per RESEARCH Pitfall 9) + ListItem with recursion via dispatch.renderNode; nested-Card test proves width-drift discipline
- [x] 03-07-PLAN.md — Wave 2 chrome + overlay emitters (parallel): NavBar + TabBar (per D-37 — no device chrome) + Modal + Sheet (shared renderOverlayBox helper per D-36); closes 18-of-18 kinds
- [x] 03-08-PLAN.md — Wave 3 variant composition: render(spec, screenId) + 4-variant stacking (D-39) + header-in-border (D-40) + when-trigger placement (D-41) + null (N/A) markers + acceptance footer under content (D-45) + NavBar root-trim (D-37); UNSKIP catalog+ASCII-baseline integration tests
- [x] 03-09-PLAN.md — Wave 4 dogfood gate: renderSingleVariant + 3-arg CLI + 5 composite .spec.md sources + 20 .wf.txt golden files (5+5+5+5 locked enumeration) + fixtures/wireframes/README.md index + SHARED.md author-ready template + unskipped dogfood-gate test + HUMAN GATE (≥3 shareable entries — author-certified inline 2026-04-18) + ROADMAP Phase 3 close
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

**Plans**: 7 plans

Plans:
- [ ] 04-01-PLAN.md — Store substrate: hand-rolled signal, undo stack helpers, diagnostic registry, A1 canary (D-62 validation)
- [ ] 04-02-PLAN.md — Autosave: 500ms trailing-edge debounce + beforeExit flush hook (SERDE-06 debounce half)
- [ ] 04-03-PLAN.md — Screen commands: add/rename/delete-screen (MVP), set-screen-kind/title/back-behavior, set-acceptance-prose (7 commands)
- [ ] 04-04-PLAN.md — Component + variant commands: add/remove/move/reorder-component, set-component-prop/action, set-variant-null/tree/when (9 commands)
- [ ] 04-05-PLAN.md — Data model + action + nav + TabBar commands: entities, fields, relationships, actions, nav edges, tabbar-items (18 commands — completes 34-command exhaustive catalog)
- [ ] 04-06-PLAN.md — Commands registry barrel + 200-apply/200-undo byte-identical integration + diagnostics one-tick subscriber test
- [ ] 04-07-PLAN.md — cli-edit script + CLI integration test + editor/index.ts barrel + package.json script

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

**Plans**: 6 plans

Plans:
- [x] 05-01-PLAN.md — Wave 0 scaffold: src/canvas/ directory tree stubs + 4 test file skeletons
- [x] 05-02-PLAN.md — Wave 2 utilities: focus-fsm, help-line, save-indicator, HorizontalLayout compositor
- [x] 05-03-PLAN.md — Wave 2 panes: ScreensListPane (SelectList) + WireframePreviewPane (read-only)
- [x] 05-04-PLAN.md — Wave 3 pane: PropertyInspectorPane (Focusable, Input, field editing, D-70/71/72)
- [x] 05-05-PLAN.md — Wave 3 palette: CommandPalette overlay (filter mode + arg-prompt FSM, D-74/75/76)
- [x] 05-06-PLAN.md — Wave 4 assembly: RootCanvas wiring + scripts/canvas.ts CLI entry + full integration test

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

**Plans**: 6 plans
**UI hint**: yes

Plans:
- [ ] 06-01-PLAN.md — Schema extension: SpecSchema + wizard fields + DataModelSchema .min(0) + 7 wizard commands + seed spec factory
- [ ] 06-02-PLAN.md — Test scaffold: 7 wizard test files (all skipped), Wave 0 test contract
- [ ] 06-03-PLAN.md — Pure utilities: renderStepIndicator + renderWizardHelpLine + STEP_DEFINITIONS + firstUnansweredStep + StepAction type
- [ ] 06-04-PLAN.md — FormPane + ScreensStep + DataStep: step form orchestrator and stateful list components
- [ ] 06-05-PLAN.md — SpecPreviewPane (YAML display pane) + calcWizardPaneWidths (50/50 horizontal split)
- [ ] 06-06-PLAN.md — WizardRoot assembly + scripts/wizard.ts CLI entry + graduation + 4 test files unskipped

### Phase 6.1: Functional Integration Fixes

**Goal**: Close the three functional integration gaps identified in the v1 milestone audit — migration pipeline, DataStep persistence, and autosave wiring — so no user-visible data is silently discarded.

**Depends on**: Phases 1–6 (fixes integration between existing phases).

**Requirements**: SERDE-08 (migration wire-up), WIZARD-02, WIZARD-03 (DataStep persistence), SERDE-06 / EDITOR-04 / EDITOR-05 (autosave wiring)

**Gap Closure:** Closes gaps from v1 milestone audit (2026-04-19)

**Success Criteria** (what must be TRUE):
  1. `parseSpecFile` calls `runMigrations` before `validateSpec` — a spec with `schema: mobile-tui/0` migrates successfully instead of failing validation.
  2. Advancing past the DataStep in wizard mode calls `store.apply("add-entity", ...)` for each named entity; canvas sees non-empty `spec.data.entities` after graduation.
  3. `createAutosave(store, resolvedPath)` is instantiated in both `scripts/canvas.ts` and `scripts/wizard.ts`; `autosave.dispose()` is called before `store.flush()` on quit.
  4. The `autosave-on-edit` and `wizard-data-persistence` E2E flows are verified in tests.

**Plans**: 2 plans

Plans:
- [x] 06.1-01-PLAN.md — Wire runMigrations into parseSpecFile + instantiate createAutosave in canvas.ts and wizard.ts
- [x] 06.1-02-PLAN.md — Persist DataStep entity names via store.apply("add-entity") on advance

### Phase 6.2: Documentation & Traceability Repair

**Goal**: Resolve the Phase 3 unverified-phase blocker and bring all documentation artifacts into sync with the verified implementation state of Phases 4–6.

**Depends on**: Phases 3–6 (read-only; no code changes).

**Requirements**: WIREFRAME-01..06 (Phase 3 VERIFICATION.md), EDITOR-01..06 (stale traceability), CANVAS-01..06 (stale traceability), WIZARD-01..05 (stale traceability)

**Gap Closure:** Closes Phase 3 unverified-phase blocker; resolves stale REQUIREMENTS.md traceability for Phases 4–6

**Success Criteria** (what must be TRUE):
  1. `03-VERIFICATION.md` exists and all WIREFRAME-01..06 requirements are marked SATISFIED.
  2. REQUIREMENTS.md checkboxes for EDITOR-01..06, CANVAS-01..06, WIZARD-01..05 are checked (`[x]`).
  3. Traceability table Status column shows Complete for all Phase 4, 5, 6 requirements.
  4. `02-VALIDATION.md` has `nyquist_compliant: true` and `status: final`.
  5. `05-VALIDATION.md` has `status: final`.

**Plans**: 2 plans

Plans:
- [x] 06.2-01-PLAN.md — Create 03-VERIFICATION.md synthesizing Phase 3 UAT + VALIDATION evidence for WIREFRAME-01..06
- [x] 06.2-02-PLAN.md — Update REQUIREMENTS.md checkboxes (EDITOR-04, EDITOR-05, WIZARD-02, WIZARD-03) and finalize 02-VALIDATION.md + 05-VALIDATION.md

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

**Plans**: 5 plans

Plans:
- [x] 07-01-PLAN.md — Wave 0: test scaffold + fixture test_flows blocks + flows/.gitkeep
- [x] 07-02-PLAN.md — Wave 1: TestFlowSchema + SpecSchema extension + crossReferencePass validation
- [x] 07-03-PLAN.md — Wave 2: pure emitter core (platform-filter, step-mapper, emitter, barrel)
- [x] 07-04-PLAN.md — Wave 3: canvas wiring (StoreState.filePath, emit-maestro.ts, RootCanvas)
- [x] 07-05-PLAN.md — Wave 4: golden flow files + CI gate + VALIDATION.md finalization

### Phase 7.1: Maestro Emitter Hardening & Traceability

**Goal**: Eliminate the two code-quality warnings from Phase 7's review and bring REQUIREMENTS.md into sync with the verified implementation state.

**Depends on**: Phase 7 (fixes within the maestro emitter subsystem).

**Gap Closure**: Closes WR-02, WR-03 from 07-REVIEW.md; resolves MAESTRO_UNRESOLVED_ACTION diagnostic naming gap; updates stale REQUIREMENTS.md checkboxes.

**Success Criteria** (what must be TRUE):
  1. `execFileSync` in `emit-maestro.ts` has a `timeout` option (≥10s) — event loop cannot block indefinitely if maestro JVM hangs.
  2. `step-mapper.ts` replaces `node.testID as string` with an explicit `undefined` guard that returns `MAESTRO_MISSING_TESTID` before the cast.
  3. Either `step-mapper.ts` emits `MAESTRO_UNRESOLVED_ACTION` for unresolved action refs (aligning with `crossReferencePass` naming), or `crossReferencePass` is updated to match; no orphaned diagnostic codes.
  4. REQUIREMENTS.md shows `[x]` for MAESTRO-01..05 and "Complete" in the traceability table; full test suite still passes.

**Plans**: 1 plan

Plans:
- [x] 07.1-01-PLAN.md — Confirm WR-02/WR-03 fixes, audit diagnostic naming, update REQUIREMENTS.md MAESTRO-01..05 to [x] + Complete, full test suite gate

### Phase 7.2: Nyquist Validation for Gap-Closure Phases

**Goal**: Produce formal Nyquist VALIDATION.md records for Phases 6.1 and 6.2, which shipped without them.

**Depends on**: Phases 6.1 and 6.2 (validates their test coverage).

**Gap Closure**: Closes Nyquist compliance gaps for 06.1 and 06.2.

**Success Criteria** (what must be TRUE):
  1. `.planning/phases/06.1-functional-integration-fixes/06.1-VALIDATION.md` exists with `nyquist_compliant: true` and `status: final`.
  2. `.planning/phases/06.2-documentation-traceability-repair/06.2-VALIDATION.md` exists with `nyquist_compliant: true` and `status: final`.

**Plans**: 1 plan

Plans:
- [ ] 07.2-01-PLAN.md — Write 06.1-VALIDATION.md and 06.2-VALIDATION.md retroactive Nyquist compliance records

### Phase 7.3: Spec Model Diagnostic Completeness

**Goal**: Fill the diagnostic gaps flagged as advisory in Phase 1's code review — duplicate IDs, JSON-Pointer escape handling, migration contract alignment.

**Depends on**: Phase 1 (extends `crossReferencePass` and `runMigrations`).

**Gap Closure**: Closes Phase 1 advisory items from 01-REVIEW.md (WR-01, WR-02, WR-03, IN-01..IN-06).

**Success Criteria** (what must be TRUE):
  1. `crossReferencePass` emits `SPEC_DUPLICATE_SCREEN_ID` when two screens share the same id, and `SPEC_DUPLICATE_ENTITY_NAME` when two entities share the same name — tested by a new malformed fixture.
  2. `resolveJsonPointerPrefix` correctly handles RFC-6901 escaped tokens (`~0` → `~`, `~1` → `/`) — tested with a fixture containing escaped path segments.
  3. `runMigrations` never throws on valid input; on unknown version it returns a diagnostic rather than throwing — migration runner contract matches `validateSpec()` never-throw guarantee.
  4. Full test suite still passes (no regressions).

**Plans**: 2 plans

Plans:
- [ ] 07.3-01-PLAN.md — cross-reference.ts WR-01/WR-02/WR-03/IN-01/IN-02/IN-03/IN-04/IN-06: duplicate-ID diagnostics, RFC 6901 decode, nav-code rename, zod mapping, comments
- [ ] 07.3-02-PLAN.md — migrations/index.ts IN-05: never-throw runMigrations return type + parse.ts call-site update + full suite gate

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
| 1. Spec Model & Invariants | 8/8 | Complete | 2026-04-17 |
| 2. Serialization & Round-Trip | 5/5 | Complete | 2026-04-17 |
| 3. Wireframe Renderer & Dogfood Gate | 9/9 | Complete | 2026-04-18 |
| 4. Editor Store, Commands & Undo | 7/7 | Complete | 2026-04-18 |
| 5. Canvas TUI Shell | 6/6 | Complete | 2026-04-19 |
| 6. Wizard & Graduation | 6/6 | Complete | 2026-04-19 |
| 6.1. Functional Integration Fixes | 2/2 | Complete | 2026-04-19 |
| 6.2. Documentation & Traceability Repair | 2/2 | Complete | 2026-04-19 |
| 7. Maestro Emitter | 5/5 | Complete | 2026-04-19 |
| 7.1. Maestro Emitter Hardening & Traceability | 1/1 | Complete | 2026-04-20 |
| 7.2. Nyquist Validation for Gap-Closure Phases | 0/? | Not started | — |
| 7.3. Spec Model Diagnostic Completeness | 0/2 | Not started | — |
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

*Last updated: 2026-04-19 after gap closure phases 6.1 and 6.2 added.*
