# Project Research Summary

**Project:** mobile-tui
**Domain:** pi.dev TypeScript extension — terminal-native wizard+canvas TUI for authoring LLM-consumable mobile app specs (Markdown + YAML frontmatter + ASCII wireframes + Maestro/Detox flows)
**Researched:** 2026-04-17
**Confidence:** HIGH on stack, architecture shape, and pitfall catalog; MEDIUM on feature prioritization details (adjacent-domain inference); MEDIUM-HIGH on spec-model schema specifics (validates during Phase 1).

---

## Executive Summary

mobile-tui is a **pi.dev-hosted TS extension**, not a standalone CLI — that single constraint collapses ~80% of the decision space (no Ink, no Blessed, no compile step, no local database). The core loop is: wizard gets a developer from "idea in head" to skeleton spec in 8 questions; canvas takes the spec the long haul via a keyboard-driven multi-pane TUI; the spec file (Markdown body + YAML frontmatter) IS the state, git-backed, hand-editable, round-trip-safe. The centerpiece is the **~40-line ASCII wireframe per screen** — good enough that a dev would paste it into a PR. Everything else (navigation graph, data models, state variants, Maestro flows) is structure around that wireframe, and everything downstream of the spec (LLM-generated SwiftUI/Compose, Maestro test runs) depends on that structure being precise without being over-engineered.

The research converges with unusual consistency. **STACK** picks `@mariozechner/pi-tui` + `zod@4` + `eemeli/yaml` + `gray-matter` + Maestro (Detox deferred). **FEATURES** locks core value as wireframes-with-state-variants authored via component tree, spec-as-state as the strategic moat, and explicitly refuses 25+ anti-features (WYSIWYG, cloud collab, freeform ASCII, mouse, PDFs). **ARCHITECTURE** proposes seven strictly-layered packages (primitives → model → serialize → emit → editor → tui → pi-surface) with an A2UI-inspired flat-catalog component model, bound to targets via JSON Pointers, with round-trip fidelity via a diff-and-apply strategy on `eemeli/yaml`'s Document AST. **PITFALLS** is a loud warning that four things are non-negotiable: (1) round-trip YAML via AST-diff, not stringify-from-scratch — `js-yaml` would destroy this project on the first save; (2) schema versioning (`schema: mobile-tui/1`) from the first commit, with a migration runner; (3) `test:` sigils that bind wireframe → spec → Maestro selectors through a single source of truth; (4) write-through save with no "unsaved" state, and wizard/canvas co-designed so they don't feel like two different tools.

Principal risks are well-scoped: round-trip edge cases (mitigated by fixture-driven golden tests from Phase 2), wireframe "shareable good" being subjective (mitigated by dogfooding ~20 reference wireframes before TUI work), pi-API churn pre-1.0 (mitigated by isolating pi imports to L7 only), and cross-platform flow divergence in Maestro (mitigated by two-file output `.ios.yaml`/`.android.yaml`). Nothing in the research is blocking; Phase 1 can start immediately.

---

## Key Findings

### The Stack (prescriptive, pinned)

Authoritative source: STACK.md. Every row below is HIGH-confidence unless noted.

| Role | Package | Version | Why |
|---|---|---|---|
| Extension host (peer) | `@mariozechner/pi-coding-agent` | `^0.67.6` | This is pi. Peer-dep'd; never bundled. |
| TUI toolkit (peer) | `@mariozechner/pi-tui` | `^0.67.6` | Pull-based diff renderer; composes via `Component` / `Box` / `Container`; no competing render loop allowed. |
| Schema + validation | `zod` | `^4.3.6` | Single SOT for spec DSL; v4 is 14× faster string parsing / 10× faster `tsc` than v3. |
| YAML round-trip | `yaml` (eemeli) | `^2.8.3` | **Non-negotiable.** Only mainstream lib that preserves comments, key order, blank lines. `js-yaml` is a project-breaker. |
| Frontmatter split | `gray-matter` | `^4.0.3` | Industry standard; wire its `engines.yaml` to `eemeli/yaml` so round-trip is consistent end-to-end. |
| TypeBox (narrow) | `@sinclair/typebox` | `^0.34.49` | **Only** for `pi.registerTool.parameters`. Internal validation stays on Zod. |
| E2E output (v1) | Maestro CLI | `2.4.0` | YAML authoring matches "LLM-consumable artifact"; native SwiftUI/Compose support. |
| Build | `tsup` | `^8.5.1` | ESM+dts; externalize pi packages. |
| Lint/format | `@biomejs/biome` | `^2.4.12` | Matches pi-mono repo style. |
| Test | `vitest` | `^4.1.4` | Snapshot-friendly for Component render output. |
| Node | Node | `>=20` | pi requirement. |

Deferred: **Detox** (v2 stretch — TS codegen, not YAML, and assumes user already has Detox wired to a native build). **Wireframe library** (none fits; build ~200 LOC layout engine on top of pi-tui `Component`).

### Table Stakes (must have for v1 to be a product at all)

Authoritative source: FEATURES.md §MVP.

- **Spec read/write** — parse + serialize Markdown+YAML, round-trip byte-identical on no-op
- **Spec schema v1** — screens, navigation graph, data models, per-screen state, interactions, APIs, permissions, `schema: mobile-tui/1` version field
- **Wizard mode** — 8 fixed linear questions (idea → primary user → nav pattern → screens → auth → data → offline → platforms); save-and-quit at every step
- **Canvas mode** — 3-pane layout (screens list / editor / wireframe preview); keyboard-only nav; command palette; persistent help line
- **ASCII component library** — 12–15 primitives (TabBar, NavBar, Button, TextInput, List, ListItem, Card, Image, Icon, Divider, Toggle, SegmentedControl, Modal, Sheet, Spacer)
- **ASCII wireframe renderer** — ~40 lines/screen, ASCII baseline in persisted file, BMP box-drawing allowed in in-TUI preview only
- **State variants per screen** — content / empty / loading / error, each with its own wireframe (first-class, not variants of the happy path)
- **Maestro YAML flow generation** — happy path per user journey from nav + interactions; two-file output (`.ios.yaml` / `.android.yaml`)
- **Undo/redo + write-through autosave** — every command is reversible; no "unsaved" state
- **Wireframe plaintext export + prompt scaffolds** — `:yank wireframe`, `:prompt screen X swiftui|compose|tests`
- **Packaged as pi.dev TS extension** — `pi install npm:mobile-tui`, `/spec` command, `session_start` rehydration

### Differentiators (our angle)

What we uniquely deliver at the intersection no competitor occupies (terminal-native × structured-spec × native-mobile-aware × test-generation):

- **Wireframes are authored outputs of a component tree** — deterministic, LLM-parseable, git-diff-meaningful. Not freeform ASCII.
- **State variants as first-class entities** — empty/loading/error rendered as their own wireframes, not afterthoughts. This is where tests earn their keep.
- **Spec-as-state, single file, git-backed** — no hidden store; the file a dev shares is the file the tool reads. Round-trip-safe via AST diff-and-apply. Strategic moat against every cloud competitor.
- **Framework-agnostic A2UI-shaped component model** — `Column`/`Row`/`Text`/`Button`/`TextField`/`List` with JSON-Pointer bindings. Maps 1:1 to SwiftUI and Compose idioms at the target's rendering layer.
- **testID sigils bind wireframe ↔ spec ↔ Maestro selectors** — `[Save →save_habit test:btn_save]` emits both `.accessibilityIdentifier`/`.testTag` for the app codegen and the Maestro `id:` selector, from one source.
- **Prompt scaffold commands** — per-screen spec slices packed for a "build this one screen" LLM task, honoring 2026 context-engineering norms (don't dump the whole spec).
- **Wizard as overlay on canvas, not a separate tool** — single Editor store, two presentations; graduation is a mode flip, not a reset.
- **Detailed wireframes, not sketches** — ~40 lines/screen with device-frame chrome optional. "Shareable good" is the explicit bar.

### Watch Out For (top 5 pitfalls; each must be addressed before or during v1)

Authoritative source: PITFALLS.md. These are the non-negotiables — getting any wrong is a project-breaker.

1. **YAML round-trip destruction (Pitfall 4.1) — Phase 2 (Serialization).** The moment a save strips comments, reorders keys, or re-indents, user trust collapses. Prevention: `eemeli/yaml` in Document-AST mode with diff-and-apply on save (never `YAML.stringify(spec)`); markdown body treated as opaque string spliced on HTML-comment anchors; golden-file byte-equality tests across ~20 fixtures including hand-edited-with-comments cases. This is Phase 2's entire deliverable.

2. **Schema versioning and migration (Pitfall 2.4) — Phase 1 (Model).** `schema: mobile-tui/1` in the frontmatter from the first serialized output, never retrofitted. Unknown fields round-trip through `_unknown:` rather than being silently dropped. CI runs every historical fixture through the current tool. Prevention is code — `migrations/v1_to_v2.ts` — not policy.

3. **testID sigils linking wireframe → spec → Maestro (Pitfalls 3.3, 7.1, 7.2) — Phases 1, 3, 7.** Sigil convention (`[Label →action test:id]`) baked into the schema in Phase 1; validated by serializer; consumed by Maestro emitter. **Ban coordinate taps and nth-child selectors outright** in the generator — fail generation if a required sigil is missing rather than falling back to coordinates. Without this, Maestro flows silently fail in production and the whole "LLM-executable artifact" value prop evaporates.

4. **Write-through save + wizard/canvas co-design (Pitfalls 9.1, 9.4) — Phases 4, 5, 6.** Single Editor store owns the Spec; both wizard and canvas are subscribers. Every edit writes to disk debounced ~500ms; no "unsaved" state, no save button, no save-vs-autosave confusion. Wizard/canvas share keybindings (`?` help, `q` exit, `:` palette), color palette, and help-line convention. Wizard re-entry is a live overlay, not a restart. Design these together in Phase 5; do not sequence canvas → wizard as disconnected work.

5. **pi event-loop and chrome hygiene (Pitfalls 1.2, 8.1, 8.3) — Phase 9 (pi integration).** All I/O async; no `readFileSync` on spec load; long parses yielded via worker or async generator. All mutations through `withFileMutationQueue(absPath, fn)`. Draw only within the region `ctx.ui.custom()` grants; never raw alt-buffer. Register cleanup hook on `session_shutdown`; rehydrate on `session_start`. State keyed by absolute-path + git-hash; all transient state under `.planning/.mobile-tui/` in the project (gitignored), never in `~/.pi/`.

Honorable mentions that are still critical but phase-scoped:
- **Unicode in persisted wireframes (Pitfall 1.1)** — ASCII baseline in file; BMP box-drawing only in in-TUI preview. Phase 3.
- **Platform nav idiom leakage (Pitfall 6.1)** — `back_behavior:` required on every non-root screen. Phase 1.
- **Context-window blow-out (Pitfall 5.2)** — `extract --screen X` tool produces <2k-token fragments. Phase 4 or later.

---

## Build Order Implications

Synthesizes STACK §phases + ARCHITECTURE §8 + PITFALLS §phase-mapping into one coherent order. The dependency graph dictates it: everything downstream reads/writes specs, so the file format and model must be locked first; the wireframe is the core value, so it must be provably "shareable good" before any TUI work; canvas is a superset of wizard, so build canvas first; pi integration wraps a working library last.

### Phase 1 — Model + primitives + invariants (L1/L2)

**Rationale:** Everything downstream depends on the Spec shape. Lock the schema boundaries and invariants before touching the serializer, or schema changes cascade into round-trip regressions.
**Delivers:** `src/primitives/`, `src/model/`, `validateSpec()` producing `Diagnostic[]`, `schema: mobile-tui/1` constant, three hand-authored fixture specs (3 screens, 2 entities, 5 interactions each) that invariants pass/fail correctly on.
**Addresses features:** Spec schema v1 (screens, nav graph, data model, state variants, interactions, testID sigils, back_behavior, capabilities block, acceptance criteria).
**Avoids pitfalls:** 2.1 over-engineering (~30 YAML lines per screen budget), 2.2 under-engineering (closed vocabulary enforced), 2.3 framework idiom leakage (hand-write SwiftUI + Compose from one fixture as gate), 2.4 schema versioning, 5.1 screen-local colocation, 5.3 acceptance required, 6.1 back_behavior required, 6.2 capabilities block, 6.3 three-layer data model.
**Ships:** Nothing user-facing.

### Phase 2 — Serialization + round-trip (L3)

**Rationale:** The hardest problem in the system. Must be solved before any UI reads or writes the file, or UI work turns into migration work.
**Delivers:** `src/serialize/`, `SpecParser` returning `{ spec, astHandle, diagnostics }`, `SpecSerializer` with diff-and-apply over `YAML.Document`, markdown-body line-range splicing on HTML-comment anchors, round-trip test suite with ~20 golden fixtures (hand-edited-with-comments, reordered keys, unknown fields, nested comments, all inclusive).
**Uses stack:** `yaml@2.8.3` (eemeli), `gray-matter@4.0.3` with `engines.yaml` override.
**Avoids pitfalls:** 4.1 comment preservation, 4.2 markdown body reformatting, 4.3 no derived fields, 4.4 YAML 1.2 pinned + lint.
**Risk flag:** Round-trip edge cases will surface here. Budget extra time. If Phase 2 slips, everything slips.
**Ships:** Nothing user-facing (headless parse/save round-trip CLI for testing).

### Phase 3 — Wireframe renderer (L4)

**Rationale:** The wireframe *is* the product. No amount of TUI polish compensates for wireframes that aren't shareable-good. Depends only on Phase 1, but do it after Phase 2 to keep focus sequential.
**Delivers:** `src/emit/wireframe/`, constraint-based box layout, renderer producing ~40-line ASCII per screen, snapshot tests covering every component type and nested layouts, ~20 reference wireframes committed as golden fixtures.
**Avoids pitfalls:** 1.1 Unicode palette (ASCII baseline in persisted file, BMP box-drawing in preview only), 1.3 copy-paste mangling (fixed target width ~60 cols, explicit `|` right borders, fenced code blocks), 3.1 no device chrome in the frame, 3.2 no unauthorized state variants, 3.4 no auto-regeneration path.
**Dogfood gate:** Author looks at the output and says "I'd paste this in a PR." Do not ship TUI until this passes.
**Ships:** `render-wireframe` script devs can run against a fixture.

### Phase 4 — Editor store + commands + undo (L5)

**Rationale:** Shared substrate for both canvas and wizard. Build it as pure headless library first so both shells are thin.
**Delivers:** `src/editor/`, reactive store over Spec (Zustand-style, no React dep), one file per command with `apply` + `invert`, undo stack capped at ~200, live invariant validation emitting `diagnostics`, debounced autosave plumbing.
**Avoids pitfalls:** 9.4 write-through with debounce (no unsaved state), 2.1/2.2/2.3 enforced via invariants on every patch, foundation for 9.1 shared state between wizard and canvas.
**Ships:** Headless `cli-edit` script for scriptable edits against a spec file.

### Phase 5 — Canvas shell (L6, first half)

**Rationale:** Canvas is the harder UI and exercises the full store API. Building canvas first means the wizard has zero architectural surprises.
**Delivers:** `src/tui/canvas/`, 3-pane layout (screens list / editor / wireframe preview), panes as pi-tui `Component` subscribers to store slices, explicit focus FSM, always-visible help line, command palette (`:` or `Ctrl+P`), shared keybinding table.
**Avoids pitfalls:** 1.4 focus FSM (no global keybindings, mode-scoped dispatch only), 8.3 no alt-buffer raw escape sequences, 9.3 discoverability via help line + palette from MVP (not polish), 9.4 `●`/`✓` save indicator.
**Ships:** Canvas-only extension useful on its own for editing existing specs.

### Phase 6 — Wizard + graduation (L6, second half)

**Rationale:** Wizard reuses canvas's store, commands, and focus FSM. Co-designed with canvas so they share visual vocabulary; graduation is a mode flip (`mode = "canvas"`), not a reset.
**Delivers:** `src/tui/wizard/`, 8 linear steps with save-and-quit at every step, skip-to-canvas escape hatch, step list with jump-to, wizard-as-overlay when re-entered from canvas.
**Avoids pitfalls:** 9.1 wizard/canvas co-design (shared keys + palette + help), 9.2 save at every step + jump-to + skip-to-TODO, wizard re-entry is live edit not restart.
**Ships:** Full wizard-and-canvas experience; first end-to-end usable product.

### Phase 7 — Maestro emitter (L4)

**Rationale:** First emitter. Consumes `Spec.TestFlow` + testID sigils already in the model. Independent of TUI.
**Delivers:** `src/emit/maestro/`, pure emitter from `TestFlow` to YAML, two-file output (`.ios.yaml` + `.android.yaml`) with platform-branched steps, validation via optional `maestro check-flow-syntax` under `MAESTRO_CLI=1`.
**Avoids pitfalls:** 7.1 testID sigils enforced (fail generation if missing), 7.2 no coordinate taps / no nth-child selectors, 7.3 two-file platform-branched output.
**Ships:** `:emit maestro` command.

### Phase 8 — Detox emitter (L4, optional/stretch)

**Rationale:** Consumes the same `TestFlow` AST. Template-based JS codegen, not YAML. Deferred unless a concrete early user demands it.
**Delivers:** `src/emit/detox/`, `.e2e.ts` template emitter, documentation that target project must already have Detox wired.
**Ships:** `:emit detox` command.

### Phase 9 — pi integration + packaging (L7)

**Rationale:** Thin wrapper over a fully-working library. All earlier phases testable as plain Node.js; only Phase 9 needs pi running.
**Delivers:** `src/index.ts` (~50 LOC glue), `pi.registerCommand("spec")`, `pi.registerShortcut`, `pi.registerTool("read_spec")`, `session_start` rehydration, `session_shutdown` flush, `package.json` with `pi.extensions`, `tsup` build, README, `pi install npm:mobile-tui` verified end-to-end.
**Avoids pitfalls:** 1.2 async I/O + worker for big parses + `withFileMutationQueue`, 8.1 state under project `.planning/.mobile-tui/` only, 8.2 peer-dep pi packages + smoke test on two pi versions, 8.3 `ctx.ui.custom()` only, cleanup hook on teardown.
**Ships:** Publishable npm package.

### Phase Ordering Rationale

- **L1 → L2 → L3 before anything else.** Spec format and invariants are the contract every downstream layer signs.
- **Wireframe (Phase 3) before TUI (Phase 5).** If wireframes aren't shareable-good, no UI polish helps. Dogfood gate explicit.
- **Editor store (Phase 4) before either shell.** Single source of truth; shells are presentations. Prevents the "state leaks into shell" anti-pattern.
- **Canvas (Phase 5) before wizard (Phase 6).** Canvas is a superset. Wizard reuses focus FSM, store, commands, keybinding table.
- **Emitters (Phases 7–8) after TUI.** Useful but not core value; TUI + wireframes ships a usable product independently.
- **pi integration (Phase 9) last.** Thin glue. Everything else tests in plain vitest without pi running.

### Research Flags

| Phase | Research likely needed | Reason |
|---|---|---|
| Phase 2 (Serialization) | **YES** | Round-trip edge cases on `eemeli/yaml` Document AST — specific to our schema shape; unknown-key handling, nested comment retention on replaced nodes, markdown-body anchor conventions. `/gsd-research-phase` to produce a concrete diff-apply recipe before implementation. |
| Phase 3 (Wireframe) | **YES** | Layout engine is ~200 LOC but the glyph palette, device-frame convention, state-variant visual language, and "shareable-good" bar are subjective. Research should produce ~20 committed reference wireframes before writing render code. |
| Phase 5 (Canvas) + Phase 6 (Wizard) | **YES (co-designed)** | Focus FSM, shared keybinding table, palette/help-line conventions, wizard-as-overlay mechanics — one research pass covers both. Do not sequence. |
| Phase 1 (Model) | Light | Schema shape is mostly settled by FEATURES.md + A2UI precedent. Research only to validate three hand-authored fixtures before freezing. |
| Phase 4 (Editor store) | Light | Standard reactive-store pattern; no novel research needed beyond choosing `immer` vs hand-rolled. |
| Phase 7 (Maestro) | Light | Command vocabulary is fixed; platform-branching pattern documented. |
| Phase 8 (Detox) | Light if pursued; skip otherwise | Well-documented; template approach is linear work. |
| Phase 9 (pi integration) | Light | ExtensionAPI surface documented in extensions.md; gotchas already catalogued in STACK.md §pi gotchas. Just follow the checklist. |

---

## Open Questions

Residual gaps that should be resolved during phase-level research, not now. Each is **scoped to a specific phase**, not a project-level blocker.

1. **Exact component catalog for the wireframe renderer (Phase 3).** FEATURES lists 12–15 primitives, ARCHITECTURE lists ~10 in the `ComponentNode` union, A2UI has its own canonical set. The three lists overlap but diverge on (e.g.) `SegmentedControl`, `Sheet` modal vs sheet distinction, `Image` vs `Icon` vs `ImagePlaceholder`. Resolve by hand-drafting ~20 reference wireframes in Phase 3 research and letting the catalog be the union of what they use — not by polling.

2. **Markdown-body anchor convention (Phase 2).** Between-wireframe narrative text must survive round-trip. ARCHITECTURE proposes "opaque blobs keyed by `## ScreenName` headers"; PITFALLS proposes "HTML-comment anchors (`<!-- screen:list --> ... <!-- /screen:list -->`)." Pick one in Phase 2 research; the HTML-comment approach is more robust against heading renames.

3. **Sigil syntax (Phase 1).** PITFALLS shows `[Save →save_habit test:btn_save]` and `<<save_habit>>`. The arrow-and-colon form is more scannable and grep-friendly; confirm in Phase 1 while hand-writing fixtures. The sigil grammar must also disambiguate action reference, testID, and state trigger.

4. **State-variant trigger vocabulary (Phase 1).** `VariantTrigger` is referenced in ARCHITECTURE's type hierarchy but not specified. Likely: `{ kind: "empty", when: "<Path> == []" }`, `{ kind: "loading", when: "async <Path>" }`, `{ kind: "error", when: "<Path>.error" }`. Lock during Phase 1 fixture hand-crafting.

5. **JSON Pointer vs alternative path DSL (Phase 1).** ARCHITECTURE says JSON Pointer (RFC 6901) per A2UI. The risk flag is low but worth one sanity check against our binding examples (`/form/email`, `/habits/0/title`). Keep JSON Pointer unless a concrete case breaks.

6. **Exact debounce + atomic-rename save semantics (Phase 2/4).** PITFALLS says "debounced ~500ms with atomic rename." Confirm: single temp file per spec (`.SPEC.md.tmp`), rename-over on flush, handle concurrent `session_shutdown` by forcing flush. Detail-level decision for Phase 2.

7. **Maestro platform-branching heuristic (Phase 7).** When one step needs iOS-only permission-dialog handling, does the generator produce two full flow files with 90% overlap, or one shared file with `runFlow: when: platform:` conditions? Research: Maestro docs confirm per-step `platform` modifier exists; emit two files by default (simpler to diff and reason about) but allow an explicit `shared: true` hint per step.

8. **Should the wizard be flag-gated to 8 steps exactly, or variable 6–10 based on answers?** FEATURES caps at 8–10; PITFALLS warns against branching wizards. Start with fixed 8 (no branching); revisit if users file "too many / too few questions" issues post-launch.

9. **`extract --screen X` extraction format (Phase 4 or a later "LLM-handoff polish" phase).** PITFALLS says <2k tokens per extracted fragment with nav neighbors and referenced entities included. Exact format (full frontmatter? subset? prompt wrapper?) belongs to a dedicated handoff-polish phase once canvas is usable.

None of these block Phase 1. All resolve during their own phase's research pass.

---

## Confidence Assessment

| Area | Confidence | Notes |
|---|---|---|
| Stack | **HIGH** | All versions verified on npm registry (2026-04-17); pi-mono extensions.md is authoritative; Zod v4, eemeli/yaml, Maestro, gray-matter all have multiple independent sources agreeing. Only MEDIUM-HIGH area: wireframe library search is a negative finding ("none fits, build our own") — exhaustive but not exhaustive-proof. |
| Features | **MEDIUM-HIGH** | Core feature set is solidly grounded via adjacent domains (TUI frameworks, wireframe tools, spec-driven LLM codegen). No direct competitor in the 4-way intersection; prioritization involves inference. Validated against competitor matrix. |
| Architecture | **HIGH** | Seven-layer structure is standard for this shape of project; A2UI precedent validates the component model at scale; round-trip AST-diff strategy is well-documented (eemeli/yaml, ruamel.yaml, enhanced-yaml). MEDIUM only on spec-model details that will be nailed during Phase 1 fixture hand-crafting. |
| Pitfalls | **MEDIUM-HIGH** | Terminal rendering, Maestro/Detox, YAML round-trip all independently verified via WebSearch; pi.dev internals were Context7-unavailable so rely on extensions.md + community writeups. Catalog is unusually complete for a greenfield project. |

**Overall confidence:** **HIGH** — sufficient to start Phase 1 immediately. Open Questions above are phase-scoped, not project-scoped.

### Gaps to Address

- **pi.dev internals** — Context7 library entry absent; depend on extensions.md. Mitigate by isolating pi imports to L7 (Phase 9) and building/testing the library against plain Node.js through Phase 8. If pi API churns pre-1.0, only Phase 9 absorbs the churn.
- **Maestro emission ergonomics under real device testing** — documented on paper but unverified end-to-end until Phase 7 produces output that runs on a reference app. Keep the emitter pure + testable so iteration is cheap.
- **"Shareable-good" wireframe bar** — inherently subjective; resolved by Phase 3's dogfood gate (author pastes into a real PR before TUI work starts).
- **Detox scope** — intentionally deferred. Revisit only if an early community user asks for it with a concrete Detox-already-wired project.

---

## Sources

Full source lists in the per-dimension research files. Highlights:

### Primary (HIGH confidence)
- pi-mono extensions.md — authoritative pi ExtensionAPI surface
- `@mariozechner/pi-coding-agent` / `pi-tui` / `pi-ai` — version 0.67.6 confirmed on registry
- Zod v4 release + InfoQ coverage (Aug 2025) — stable, perf gains, ecosystem
- eemeli/yaml — Document AST, comment preservation
- gray-matter — custom engine override documented
- Maestro CLI 2.4.0 (2026-04-02) + docs — flow syntax, platform support
- A2UI (Google) + a2ui.org — framework-agnostic UI spec precedent
- Context7: `/colinhacks/zod`, `/mobile-dev-inc/maestro`, `/mobile-dev-inc/maestro-docs`

### Secondary (MEDIUM confidence)
- QA Wolf — Best Mobile E2E 2026 — Maestro vs Detox positioning
- Panto — Detox vs Maestro — authoring-model tradeoffs
- ByteDesign, Mockdown, BareMinimum — ASCII wireframe competitor landscape
- Uizard, Galileo AI, v0.app — AI wireframe/app intake patterns
- NN/G — Wizards; Stef Walter — Wizard Anti-Pattern — wizard UX grounding
- Addy Osmani — LLM workflow 2026 — prompt scaffold + context packing
- yaml-roundtripping-is-hard (spiffxp) — why AST-diff is the right strategy
- Kitty FAQ — Unicode rendering; claude-code#37283 — DECSET 2026 — terminal rendering reality

### Tertiary (LOW confidence, validate during implementation)
- Wireframe library search — negative finding ("none fits at mobile-UI fidelity inside pi-tui"); exhaustive but someone may know an obscure library we missed.
- Detox emission ergonomics — documented shape, unverified under a real target project; revisit in Phase 8 if pursued.

---

*Research completed: 2026-04-17*
*Ready for roadmap: yes*
*Phase 1 can start immediately; Open Questions are phase-scoped, not project-scoped.*
