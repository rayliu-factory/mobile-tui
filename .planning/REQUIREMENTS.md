# mobile-tui — v1 Requirements

Scope derived from `.planning/PROJECT.md` and `.planning/research/SUMMARY.md` (2026-04-17).
All v1 requirements are hypotheses until shipped and validated.

## v1 Requirements

### Spec model (SPEC)

- [x] **SPEC-01**: The spec is a framework-agnostic tree of A2UI-shaped components (Column, Row, Text, Button, TextField, List, ListItem, Card, Image, Icon, Divider, Toggle, SegmentedControl, TabBar, NavBar, Modal, Sheet, Spacer — closed vocabulary for v1)
- [x] **SPEC-02**: The spec captures Screens, each with an id, title, and a component tree
- [x] **SPEC-03**: The spec captures a Navigation graph (edges between screens with trigger + transition) plus required `back_behavior` on every non-root screen
- [x] **SPEC-04**: The spec captures Data models — Entities with named Fields, relationships, and typed bindings via JSON Pointers (RFC 6901)
- [x] **SPEC-05**: Every screen captures State variants as first-class children: `content`, `empty`, `loading`, `error` (not variants of the happy path)
- [x] **SPEC-06**: Interactions (button/link/gesture actions) are modeled as named references, not inline handlers, so the same action can be bound from multiple UI elements
- [x] **SPEC-07**: testID sigils are embedded in interactable components via the syntax `[Label →action test:id]`, and the validator fails generation if a sigil referenced by an emitter is missing
- [x] **SPEC-08**: The spec has a top-level `schema: mobile-tui/1` frontmatter field from the first serialized output; unknown frontmatter keys round-trip through AST-native preservation (D-26 — no `_unknown:` literal materializes) — `injectSchemaIfAbsent` (Plan 02-03) + `partitionTopLevel` (Plan 02-02) + Plan 02-05's 20-fixture Buffer.equals round-trip validates theme/integrations unknown-top-level keys surviving byte-identical
- [x] **SPEC-09**: `validateSpec()` returns a `Diagnostic[]` (code + severity + path + message) — it never throws on schema violations; write-through save is gated on `severity !== "error"`
- [x] **SPEC-10**: Every screen optionally carries acceptance criteria (prose lines) that the Maestro emitter and LLM-handoff scaffold both consume

### Serialization (SERDE)

- [x] **SERDE-01**: The spec file is a single Markdown file with YAML frontmatter; the file on disk is the single source of truth (no hidden cache that can diverge) — Plan 02-05 retired the last `.spec.json` siblings; `parseSpecFile(path)` reads `.spec.md` directly via gray-matter + eemeli/yaml
- [x] **SERDE-02**: Parsing uses `gray-matter` with its `engines.yaml` wired to `eemeli/yaml`'s Document AST parser — `js-yaml` is explicitly banned (gray-matter + yaml deps installed in Plan 02-01; architectural-invariant audit `tests/no-js-yaml.test.ts` asserts ban at dep + import level. engines.yaml wiring lands in Plan 02-02.)
- [x] **SERDE-03**: Serializing uses diff-and-apply against the retained `YAML.Document` AST (`setIn`/`deleteIn`), never `YAML.stringify(spec)`, so comments, key order, blank lines, and anchors survive a no-op save byte-identical
- [x] **SERDE-04**: The Markdown body between frontmatter and EOF is treated as opaque text; body bytes extracted verbatim via `findFrontmatterBounds` (Plan 02-02) and re-spliced byte-identically by `writeSpecFile` (Plan 02-04 step 7). Plan 02-05 validates via the 20-fixture round-trip matrix including `comment-only-body.spec.md` + `nested-block-scalar.spec.md` + full-prose-body canonicals. HTML-comment screen-anchor convention (`<!-- screen:ID -->`) is a Phase-4 editor-store concern; the L3 serializer stays fully opaque (D-18).
- [x] **SERDE-05**: Round-trip test suite covers 20 golden fixtures, including hand-edited-with-comments (3 variants), reordered keys (4), unknown fields (2), YAML-1.1 gotchas (2), empty file, comment-only body, nested block scalar, sigil-form (3), triple-form canonicals (3); CI fails on any byte-level drift via `Buffer#equals` assertion in `tests/round-trip.test.ts` — Plan 02-05 SHIPPED.
- [x] **SERDE-06**: Writes are atomic (write to `.SPEC.md.tmp` → `rename` over target) and debounced ~500ms; `session_shutdown` forces an immediate flush — atomic primitive complete (Plan 02-04 `atomicWrite` + `detectOrphanTmp`); debounce + shutdown flush are Phase 4 wrapping
- [x] **SERDE-07**: YAML 1.2 is pinned in the parser options; emission escapes values that YAML 1.1 would have misinterpreted (`yes`/`no`/`on`/`off`/`1.0`) — auto-quote enforced in Plan 02-04 `setScalarPreserving` for all 8 gotcha literals (yes/no/on/off/y/n/true/false, case-insensitive) forced to QUOTE_DOUBLE on scalar replacement
- [x] **SERDE-08**: A schema-migration runner lives at `migrations/v{n}_to_v{n+1}.ts` from commit 1, even if the list of migrations is empty at v1

### Wireframe renderer (WIREFRAME)

- [x] **WIREFRAME-01**: Given a Screen's component tree, the renderer produces a ~40-line ASCII wireframe at a fixed target width (~60 cols) with explicit right borders so copy-paste into PRs/Slack/email does not visually mangle
- [x] **WIREFRAME-02**: The persisted wireframe uses the ASCII baseline character set (`|`, `-`, `+`, `.`); Unicode BMP box-drawing glyphs are allowed **only** in the live in-TUI preview, never in the written file
- [x] **WIREFRAME-03**: The renderer supports every component in the closed v1 catalog; a snapshot test exists per component and for at least 5 composite layouts
- [x] **WIREFRAME-04**: Each of the 4 state variants (content/empty/loading/error) renders as its own wireframe block under the screen — no "empty state as a squiggle on top of the happy path"
- [x] **WIREFRAME-05**: The renderer is a pure function from spec to string; it has no hidden state, does not touch disk, and is independently runnable via a `render-wireframe <spec> <screen-id>` script
- [x] **WIREFRAME-06**: At least 20 reference wireframes are committed as golden fixtures before any TUI work starts (the "would a dev paste this in a PR" bar is an explicit gate)

### Editor store (EDITOR)

- [ ] **EDITOR-01**: The editor exposes a reactive store over the Spec that both wizard and canvas subscribe to — a single source of truth with no per-shell copies
- [ ] **EDITOR-02**: Every state mutation is a named command with `apply(state) → newState` and `invert(state) → inverse` shape, one file per command, exhaustively tested
- [ ] **EDITOR-03**: An undo/redo stack of at least 200 steps, traversable via `u` / `Ctrl+r` in both shells
- [ ] **EDITOR-04**: After every successful apply, the store debounces a write-through save via the serializer — there is no "save" button and no "unsaved" state
- [ ] **EDITOR-05**: After every apply, invariants are re-validated and diagnostics are published to subscribers for inline display
- [ ] **EDITOR-06**: A headless `cli-edit` script can apply any command against a spec file without the TUI, so commands are scriptable and test-harnessable

### Wizard mode (WIZARD)

- [ ] **WIZARD-01**: The wizard walks the user through 8 fixed linear steps: app idea → primary user → navigation pattern → screens → auth → data → offline/sync → target platforms (no branching in v1)
- [ ] **WIZARD-02**: Every step saves its answers to the spec file immediately on advance; the user can quit at any step without losing work
- [ ] **WIZARD-03**: From any step, the user can jump back to an earlier step (linear step list with position indicator) and can skip-to-canvas at any point
- [ ] **WIZARD-04**: When the wizard is re-entered against an existing spec, it edits in place rather than restarting — unfinished steps surface as `TODO` markers, finished steps show their saved answer
- [ ] **WIZARD-05**: Wizard uses the same keybinding table and command palette as canvas; moving from wizard to canvas is a mode flip with no reset

### Canvas mode (CANVAS)

- [ ] **CANVAS-01**: Canvas shows a 3-pane layout: screens list (left) / editor (center) / wireframe preview (right); keyboard-only navigation with explicit focus FSM and no global keybindings
- [ ] **CANVAS-02**: A command palette is always reachable via `:` or `Ctrl+P`; it lists every command the editor exposes and their current keybindings
- [ ] **CANVAS-03**: A persistent single-line help line at the bottom of the TUI shows the 4-6 most relevant bindings for the current focus
- [ ] **CANVAS-04**: A save indicator (`●` dirty → `✓` clean) reflects the debounced write-through state so the user always knows disk is in sync
- [ ] **CANVAS-05**: Canvas is useful on its own against an existing spec file — it is not wizard-gated
- [ ] **CANVAS-06**: Canvas renders only within the region granted by `ctx.ui.custom()`; no raw alt-buffer escape sequences, no fighting pi's own chrome

### Maestro emitter (MAESTRO)

- [ ] **MAESTRO-01**: The Maestro emitter is a pure function from `Spec.TestFlow` + nav graph + interactions to YAML; it has no implicit IO
- [ ] **MAESTRO-02**: Output is two files per flow: `<flow>.ios.yaml` and `<flow>.android.yaml` with platform-branched steps where needed
- [ ] **MAESTRO-03**: Every interaction in the emitted flow selects via a `test:` sigil registered in the spec — coordinate taps and nth-child selectors are forbidden and cause emission to fail loudly
- [ ] **MAESTRO-04**: Emission validates output via `maestro check-flow-syntax` when `MAESTRO_CLI=1` is set; otherwise emits without the external check but still enforces our own schema
- [ ] **MAESTRO-05**: A `:emit maestro` command in canvas writes the YAML files next to the spec in a `./flows/` directory

### LLM handoff (HANDOFF)

- [ ] **HANDOFF-01**: A `:yank wireframe <screen-id>` command copies the plaintext wireframe (ASCII-baseline) to the OS clipboard for pasting into a PR / Slack / chat
- [ ] **HANDOFF-02**: A `:prompt screen <id> <target>` command (targets: `swiftui`, `compose`, `tests`) emits a <2k-token self-contained prompt — screen spec + neighbors + referenced entities + acceptance criteria — suitable for a "build this one screen" LLM task
- [ ] **HANDOFF-03**: An `:extract --screen <id>` command writes the same fragment to a file for offline use
- [ ] **HANDOFF-04**: Prompt scaffolds reference target frameworks by semantic token (`variant: primary`, `gap: md`) rather than by pixel values or framework idioms, so both SwiftUI and Compose outputs are faithful

### pi.dev integration + packaging (PI)

- [ ] **PI-01**: The extension registers a single `/spec` slash command and scoped keyboard shortcuts via `pi.registerCommand` + `pi.registerShortcut`
- [ ] **PI-02**: pi's ExtensionAPI packages (`@mariozechner/pi-coding-agent`, `@mariozechner/pi-tui`) are declared as `peerDependencies`, never bundled; runtime deps live in `dependencies`
- [ ] **PI-03**: Per-project transient state lives under `.planning/.mobile-tui/` in the project and is gitignored; no state is stored under `~/.pi/` or any global location
- [ ] **PI-04**: `session_start` rehydrates any in-flight spec session; `session_shutdown` flushes any pending debounced save and releases the `ctx.ui.custom()` region
- [ ] **PI-05**: All spec-file I/O flows through `withFileMutationQueue(absPath, fn)` so concurrent writes (pi tools + extension) don't race
- [ ] **PI-06**: Build output is ESM + dts via `tsup`; the entry is a `default export` function receiving `ExtensionAPI`; `package.json` declares `pi.extensions` per pi-mono conventions
- [ ] **PI-07**: Publishable as an npm package; `pi install npm:mobile-tui` followed by `/spec` works end-to-end against at least two pi versions
- [ ] **PI-08**: README documents install, `/spec` usage, the spec schema, and the handoff commands; no hidden feature

## v2 Requirements (deferred)

- [ ] Detox emitter (`:emit detox`) — JS codegen from the same `TestFlow` AST, documented assumption that the target project has Detox wired to a native build
- [ ] Per-screen state machines (XState-shaped) captured in the spec
- [ ] Flow-sheet exports (PDF / SVG of the nav graph and wireframe grid)
- [ ] Assertion inference on Maestro flows (auto-derive "expect visible X" from the spec's acceptance criteria)
- [ ] Accessibility spec fields (WCAG-style contrast, labels, focus order) as first-class
- [ ] Design-token pipeline integration (import tokens from an external `tokens.json`)

## Out of Scope

- Graphical or web-based wireframing UI — the project is terminal-only by design; wireframes live as ASCII and are read in the terminal or pasted as plaintext
- Shipping as a pi skill or standalone CLI — the product needs persistent canvas state and custom multi-pane TUI components that only the full pi TypeScript extension surface supports
- React Native or Flutter as target framework output — v1 targets the two native stacks (SwiftUI, Jetpack Compose); framework-agnostic spec does not mean "infinite targets"
- The extension generating the app code itself — the dev reviews the spec and hands it to an LLM of their choice; we own the spec, not the app
- Multi-user collaboration, cloud drafts, or a synced database — state is the single spec file in git; no hidden stores, no accounts, no server
- Freeform ASCII art authoring — wireframes are rendered outputs of a component tree, never hand-drawn characters; this is a deliberate architectural choice, not a feature gap
- Mouse support in the TUI — keyboard-only for keyboard-driven developers who live in the terminal
- An alt-buffer takeover UI — the extension draws only within the region pi's `ctx.ui.custom()` grants
- YAML-preserving parsers other than `eemeli/yaml` (`js-yaml`, `yamljs`) — they strip comments and reorder keys on round-trip, which breaks the spec-as-state contract
- Zod alternatives for the internal schema — TypeBox is used only in the narrow `pi.registerTool.parameters` slot pi requires; all internal validation stays on Zod v4
- WYSIWYG / visual editing modes — editing is structural (edit the component tree; preview updates); we never try to be Figma-in-terminal
- Schema-less / fully-prose specs — the core promise depends on a typed spec; if a user wants freeform prose, a plain Markdown file does the job

## Traceability

<!-- Populated by roadmapper. One row per requirement, mapped to exactly one phase. -->

| Requirement | Phase | Status |
|-------------|-------|--------|
| SPEC-01 | Phase 1 | Complete |
| SPEC-02 | Phase 1 | Complete |
| SPEC-03 | Phase 1 | Complete |
| SPEC-04 | Phase 1 | Complete |
| SPEC-05 | Phase 1 | Complete |
| SPEC-06 | Phase 1 | Complete |
| SPEC-07 | Phase 1 | Complete |
| SPEC-08 | Phase 2 | Complete (Plan 02-05) |
| SPEC-09 | Phase 2 | Complete (Plan 02-04) |
| SPEC-10 | Phase 1 | Complete |
| SERDE-01 | Phase 2 | Complete (Plan 02-05) |
| SERDE-02 | Phase 2 | Complete (Plan 02-01) |
| SERDE-03 | Phase 2 | Complete (Plan 02-04) |
| SERDE-04 | Phase 2 | Complete (Plan 02-05) |
| SERDE-05 | Phase 2 | Complete (Plan 02-05) |
| SERDE-06 | Phase 2 | Complete (Plan 02-04 atomic primitive; debounce Phase 4) |
| SERDE-07 | Phase 2 | Complete (Plan 02-04) |
| SERDE-08 | Phase 1 | Complete |
| WIREFRAME-01 | Phase 3 | Complete |
| WIREFRAME-02 | Phase 3 | Complete |
| WIREFRAME-03 | Phase 3 | Complete |
| WIREFRAME-04 | Phase 3 | Complete |
| WIREFRAME-05 | Phase 3 | Complete |
| WIREFRAME-06 | Phase 3 | Complete |
| EDITOR-01 | Phase 4 | Pending |
| EDITOR-02 | Phase 4 | Pending |
| EDITOR-03 | Phase 4 | Pending |
| EDITOR-04 | Phase 4 | Pending |
| EDITOR-05 | Phase 4 | Pending |
| EDITOR-06 | Phase 4 | Pending |
| WIZARD-01 | Phase 6 | Pending |
| WIZARD-02 | Phase 6 | Pending |
| WIZARD-03 | Phase 6 | Pending |
| WIZARD-04 | Phase 6 | Pending |
| WIZARD-05 | Phase 6 | Pending |
| CANVAS-01 | Phase 5 | Pending |
| CANVAS-02 | Phase 5 | Pending |
| CANVAS-03 | Phase 5 | Pending |
| CANVAS-04 | Phase 5 | Pending |
| CANVAS-05 | Phase 5 | Pending |
| CANVAS-06 | Phase 5 | Pending |
| MAESTRO-01 | Phase 7 | Pending |
| MAESTRO-02 | Phase 7 | Pending |
| MAESTRO-03 | Phase 7 | Pending |
| MAESTRO-04 | Phase 7 | Pending |
| MAESTRO-05 | Phase 7 | Pending |
| HANDOFF-01 | Phase 8 | Pending |
| HANDOFF-02 | Phase 8 | Pending |
| HANDOFF-03 | Phase 8 | Pending |
| HANDOFF-04 | Phase 8 | Pending |
| PI-01 | Phase 9 | Pending |
| PI-02 | Phase 9 | Pending |
| PI-03 | Phase 9 | Pending |
| PI-04 | Phase 9 | Pending |
| PI-05 | Phase 9 | Pending |
| PI-06 | Phase 9 | Pending |
| PI-07 | Phase 9 | Pending |
| PI-08 | Phase 9 | Pending |

**Coverage**: 58 / 58 requirements mapped. No orphans. No duplicates.

---
*Last updated: 2026-04-17 after roadmap creation.*
