# Phase 3: Wireframe Renderer & Dogfood Gate — Context

**Gathered:** 2026-04-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Ship a pure-function ASCII wireframe renderer that turns any `Spec` screen × variant into a fixed-width (60-col), ~40-line block a developer would paste into a PR, Slack, or email — the core-value gate the rest of the product leans on. Output is ASCII-baseline (`|`, `-`, `+`, `.`) only; Unicode BMP glyphs for the in-TUI preview live in Phase 5. The phase closes on a dogfood gate: 20 reference wireframes committed under `fixtures/wireframes/`, with ≥3 pasted into a real PR / Slack / issue and judged "shareable" by the author before Phase 4 can start.

**In scope (this phase):** `src/emit/wireframe/` (renderer primitives + per-component glyph emitters + variant-block layout + `render-wireframe` CLI), `fixtures/wireframes/` (20 reference wireframes with index README.md), `fixtures/wireframes/SHARED.md` (dogfood evidence sidecar), snapshot test per 18-kind catalog item + ≥5 composite fixtures, `[BROKEN LINK]` inline marker for cross-ref errors.

**Explicitly NOT in scope:** Unicode BMP box-drawing preview path (Phase 5 canvas), TUI-integrated live preview (Phase 5), editor store / command plumbing (Phase 4), debounced writes (Phase 4), Maestro emission (Phase 7), `:yank wireframe` / `:prompt screen` handoff commands (Phase 8), pi extension wrapping (Phase 9).

**Requirements covered:** WIREFRAME-01, WIREFRAME-02, WIREFRAME-03, WIREFRAME-04, WIREFRAME-05, WIREFRAME-06.

</domain>

<decisions>
## Implementation Decisions

### Visual Vocabulary — Overall Style

- **D-33:** Rendering style is **compact mockup** — single outer `+---+` frame at the chosen fixed width, `+--+` boxes nested only for container components (Card, List items, Modal, Sheet), interactables as bracketed glyphs inline. The wireframe reads like a screenshot of the UI, not a labeled tree or an all-components-boxed diagram. Rationale: matches what PR reviewers expect; highest "shareable-good" density per line.

### Visual Vocabulary — Interactable Glyphs

- **D-34:** Per-kind interactable glyph alphabet (persisted ASCII):
  - **Button:** `[[ Save ]]` for `variant: primary`, `[ Cancel ]` for `variant: secondary` (default), bare `Save` for `variant: text`.
  - **Toggle:** `[ ]` off, `[x]` on, label trails the glyph: `[x] Done`.
  - **TextField:** `Label: ________________` — colon-separator, underscore run fills remaining width; if `bindsTo` has a value in the rendered variant (e.g. `Title: Drink water`), the value appears inline with trailing underscores to width.
  - **SegmentedControl:** `< Day | Week | Month >` with angle-bracket endcaps and `|` separators; selected segment wrapped in asterisks: `< Day | *Week* | Month >`. Claude's Discretion on the selected-segment marker if asterisks collide with body text.
  - **ListItem (tappable):** rendered as the item row; the tappable affordance is implicit (the box + action sigil in the spec is enough); no extra chevron glyph.
- **D-35:** `InteractableBase` sigil triple is **read from the in-memory `{label, action, testID}`**, not from the sigil string form. Phase 1 D-04 locks this: the renderer never sees the raw `[Label →action test:id]` string. Renderer consumes `component.label` only (action + testID are hidden per D-41 below).

### Visual Vocabulary — Container Glyphs

- **D-36:** Container components render as plain `+--+` boxes:
  - **Card:** untitled `+--+ ... +--+` box around its child.
  - **List:** repeated item-boxes with a blank line gap between items (visually reads as a stack of cards even when the item template is a bare Row).
  - **Modal / Sheet:** `+--+` box with a **labeled top border** `+-- Modal -----+` / `+-- Sheet -----+` so the overlay intent is visible. Modal centers in the frame; Sheet anchors to the bottom (last content block before the TabBar/bottom edge).
  - **Column / Row:** **no glyph** — containment is expressed via vertical/horizontal child arrangement and whitespace. Adding boxes to every Column/Row would blow the ~40-line budget and violate D-33's compact principle.
  - **Divider:** single `-----` run matching the content width; no box.
  - **Spacer:** blank line(s) — size `sm` = 1 line, `md` = 2, `lg` = 3 (Claude's Discretion; revisit if fixtures feel wrong).

### Visual Vocabulary — Nav Chrome

- **D-37:** `NavBar` and `TabBar` use **ASCII rule + labeled back** convention — no simulated device chrome (no status bar, notch, or home indicator). Reasoning: PITFALLS §3.1 explicitly bans device chrome as noise-without-info; FEATURES' "device-frame optional" is resolved by choosing the no-chrome path.
  - **NavBar:** single line `< Title                         [trailing]` — leading `< ` when the screen is non-root (even if `back_behavior` is `dismiss` for overlays), title centered-ish, trailing widget right-aligned. Followed by a `---` rule separating the NavBar from body.
  - **TabBar:** `---` rule above, then `[ Home ] | [ Stats ] | [ Settings ]` row with `|` separators. Always bottom-anchored in the frame.
  - **Back arrow:** rendered only when the screen's `back_behavior` is present (i.e., non-root); root screens omit the `< ` prefix.

### Page Frame & Variant Block Layout

- **D-38:** **Fixed width: 60 cols** — outer frame at column 60 (content pad = 58). Matches REQUIREMENTS WIREFRAME-01 baseline. No CLI flag to change width in v1 — every golden fixture locks its width via the renderer constant. Predictable diffs; snapshot stability.
- **D-39:** **Variant stacking order is fixed: `content → empty → loading → error`**, separated by a single blank line. Every screen renders every variant — null variants render as a **1-line "(N/A)" marker frame** (`+-- screen: home  variant: loading  (N/A) --+` with no body), not omitted. Rationale: D-06 (Phase 1) made variants a design-visibility gate; the renderer preserves that by always showing the variant slot even when empty, matching WIREFRAME-04's "no single-block overlays" requirement.
- **D-40:** **Block header merges with the top border**: the top edge of each variant frame is `+-- screen: <id>  variant: <kind>[  when <key> <pointer>] --+`. No extra heading line above the frame, no caption below. Example: `+-- screen: home  variant: empty  when collection /Habit/title --+`. If the header line would exceed 60 cols, the trailing `--+` collapses to a single `-+` and the header text truncates with `...`.
- **D-41:** **`when:` trigger appears only in the block header** (for empty/loading/error variants). Format: `when <key-without-braces> <pointer>` — e.g. `when collection /Habit/title`, `when async /Habit/title`, `when field_error /Habit/title`. `content` variant has no trigger. Rationale: single source of truth inside the persisted wireframe, no duplication inside the frame body.

### Sigil & Text-Style Presentation

- **D-42:** **Sigil metadata hidden in persisted wireframes** — only the `label` field renders. `action` and `testID` stay in the spec file; anyone who needs them reads the YAML. Phase 8's `:prompt screen` handoff command re-assembles them. Rationale: cleanest paste-into-PR surface; action/testID are implementation concerns that clutter human-visual review. Note: the `[BROKEN LINK]` marker (Claude's Discretion) is an exception — it surfaces the unresolved action name inline to aid debugging.
- **D-43:** **`Text.style` → ASCII mapping:**
  - `heading-1` → **ALL CAPS** (no underline): `MY HABITS`.
  - `heading-2` → **Title Case with no underline**: `Drink water` (respects the spec author's capitalization; no forced transform if already mixed).
  - `body` → **plain**, as-authored.
  - `caption` → **wrapped in `(` `)` parens** as a soft italics proxy: `(2 of 5 habits complete)`.
  - Rationale: readers pasting into a PR can tell headings at a glance; no markdown prefix collision (`#` heading markers would re-render as headings when pasted inside a Markdown doc).
- **D-44:** **Text overflow → truncate with `...`** at `width - 3`. Deterministic 1-line rows. Labels, Text nodes, Button labels all follow the same rule: `[[ Save my progress to cl... ]]`. No soft-wrap in v1. Rationale: predictable layout math, predictable snapshots, predictable paste; if authors care enough to keep a long label visible, they shorten it — that's also the real-app advice for small-screen UX.
- **D-45:** **Acceptance prose renders below the `content` variant only** — never duplicated under empty/loading/error. Format: an `acceptance:` footer line followed by indented `- ` bullets (word-wrapped to width if long). Rationale: matches SPEC-10 intent (prose consumed by Maestro + LLM handoff); placing it under `content` puts the "what this screen does" contract adjacent to the happy-path render.

### Dogfood Gate — 20-Wireframe Composition

- **D-46:** **Fixture sourcing: derive from canonical 3 + add ≥5 composite fixtures.** Render 20 wireframes by expanding existing canonicals plus purpose-built composite fixtures:
  - `habit-tracker`: 3 screens × non-null variants (≈ 7 wireframes, including N/A-marker frames where variants are null).
  - `todo`: ≈ 7 wireframes.
  - `social-feed`: ≈ 6 wireframes.
  - `composites/`: 5 new dedicated fixtures targeting WIREFRAME-03's 5-composite requirement (nested Column/Row, Card-in-List, NavBar+TabBar, Modal-over-content, Sheet). Each composite fixture renders its primary variant; composites don't need all 4 variants — they target catalog coverage.
  - Final count must hit **exactly 20 `.wf.txt` files** under `fixtures/wireframes/`. Phase-3 planner may adjust which screens/variants to include to land on the number, but the split stays roughly "canonicals first, composites to reach 20."
- **D-47:** **File layout: one `.wf.txt` per screen-variant** under `fixtures/wireframes/{fixture_slug}/{screen_id}-{variant}.wf.txt`. Examples: `fixtures/wireframes/habit-tracker/home-content.wf.txt`, `fixtures/wireframes/composites/modal-over-content.wf.txt`. Plus `fixtures/wireframes/README.md` as a 20-entry index (path → one-line purpose each). Rationale: literal "one wireframe = one file" counts cleanly, snapshot tests target individual files, git diffs stay per-screen when renderer changes.

### Dogfood Gate — Shareability Evidence

- **D-48:** **`fixtures/wireframes/SHARED.md` sidecar records dogfood evidence.** Structure: at least 3 entries, each listing `screen:{variant}` identifier, paste-target URL (GitHub PR, issue, Slack thread, Discord message), date, and author verdict (`shareable` or `needs-work` with note). The author self-certifies — PROJECT.md scopes v1 audience as "the author, scratching their own itch," so self-judgment is the v1 bar. Post-v1 revisit if community feedback contradicts.
- **D-49:** **Phase 4 first-plan precondition checks `SHARED.md` for ≥3 entries marked `shareable`.** Enforcement lives inside the GSD workflow: Phase 4's `/gsd-plan-phase 4` refuses to produce plans until the gate passes. Rationale: keeps the gate inside the familiar workflow surface; no CI complexity; easy to bypass locally only with conscious intent.

### Claude's Discretion (planner/executor defaults unless flagged)

- **Renderer module layout:** `src/emit/wireframe/` with files split by concern — `layout.ts` (fixed-width frame composition + box-drawing), `components/` subdir (one file per 18 kinds emitting `string[]`), `variants.ts` (4-variant stacking + block-header composition), `cli.ts` (`render-wireframe` entry). Matches the "one file per concern" Phase-2 pattern.
- **`render-wireframe` CLI form:** a plain Node script under `scripts/render-wireframe.ts`, invokable via `npx tsx scripts/render-wireframe.ts <spec-path> <screen-id>`. Also exposed via `npm run wireframe -- <spec> <screen>`. No `bin` entry in `package.json` for v1 (adds publish surface we don't need yet). Output goes to stdout as raw ASCII; shell redirection handles writing to a file.
- **Text output encoding:** UTF-8, LF line endings (enforced), newline at end of file. Snapshot tests normalize with `Buffer.equals`-style comparison against committed `.wf.txt` files.
- **Image placeholder:** `+--IMG---+ / |  alt  | / +--------+` — 3-line box with the `alt` text centered. Size: fixed 10 cols wide unless parent Row/Column constrains tighter. If `alt` is missing, the validator should have caught it (`ImageNode` requires `alt`); renderer emits `(no alt)` inline.
- **Icon placeholder:** inline `[icon:name]` — 1 line, flows with text. `Icon` typically appears next to a label; wrapping in brackets preserves the visual-hint pattern.
- **`[BROKEN LINK]` marker:** inline sentinel for unresolved cross-refs. When `validateSpec` flagged a `SPEC_UNRESOLVED_ACTION` (or similar) and the renderer is still asked to emit, the affected button/interactable renders as `[[ Save ]] !!BROKEN: action=save_habit` on the same line, truncating other content first. Matches Phase 1's 01-06 decision that the preview renderer still emits on Stage-B errors.
- **Snapshot harness:** vitest `.toMatchSnapshot()` per component kind under `src/emit/wireframe/components/*.test.ts`; separate `tests/wireframe-catalog.test.ts` asserts all 18 kinds have a snapshot + the 5 composite fixtures render; separate `tests/dogfood-gate.test.ts` asserts `fixtures/wireframes/` has exactly 20 `.wf.txt` files and `SHARED.md` parses to ≥3 shareable entries.
- **Variant frame padding:** 1-line inner padding top/bottom (blank line after header, blank line before bottom border). Content body gets 2 cols left pad + 2 cols right pad, leaving ~54 cols for rendered children.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents (researcher, planner, executor) MUST read these before planning or implementing.**

### Project-level contract
- `.planning/PROJECT.md` — core value ("wireframes shareable enough to paste in a PR"), Out-of-Scope (no WYSIWYG, no Unicode art, no mouse, no device chrome), Constraints
- `.planning/REQUIREMENTS.md` §Wireframe renderer — WIREFRAME-01..06 full text + traceability
- `.planning/ROADMAP.md` §Phase 3 — goal, 5 success criteria, dogfood-gate description
- `CLAUDE.md` §Technology Stack §The Wireframe Rendering Question — why no library fits; ~200 LOC layout engine recommendation; glyph palette reference (`┌─┐│└┘├┤┬┴┼` reserved for Phase-5 TUI preview, ASCII `|-+.` for persisted output)

### Phase 1 contract (MUST read — defines the Spec shape Phase 3 renders)
- `.planning/phases/01-spec-model-invariants/01-CONTEXT.md` §decisions — D-01..D-17 (sigil grammar, closed component catalog, variant union, action registry). In particular: D-02 (sigils on interactables only), D-04 (sigil → triple normalisation; renderer consumes the triple), D-06/D-07 (four variants as siblings, each a full tree), D-13 (action types the renderer may encounter)
- `src/model/component.ts` — 18-kind `COMPONENT_KINDS` closed catalog + `ComponentNode` union type (authoritative visitor target)
- `src/model/screen.ts` — `Screen` shape with `variants: { content, empty, loading, error }` and optional `acceptance: string[]`
- `src/model/variant.ts` — variant shape: `{ kind, when: { collection | async | field_error: JsonPointer }, tree: ComponentNode[] }`

### Phase 2 contract (MUST read — Phase 3 consumes `parseSpecFile`)
- `.planning/phases/02-serialization-round-trip/02-CONTEXT.md` §decisions — D-18..D-32 (body-opaque splice, sigil origin preservation — irrelevant to renderer since renderer reads the triple)
- `src/serialize/parse.ts` — `parseSpecFile(path): { spec, astHandle, diagnostics, body }` — Phase 3 entry point; renderer ignores `astHandle` + `body` and consumes `spec`
- `.planning/phases/02-serialization-round-trip/02-05-SUMMARY.md` — parse orchestrator behavior; what diagnostics mean for the renderer's `[BROKEN LINK]` path

### Research corpus (synthesised 2026-04-17)
- `.planning/research/PITFALLS.md` §1 (terminal rendering) — §1.1 Unicode palette (ASCII baseline in file, BMP allowed in preview only); §1.3 copy-paste mangling (fixed width, explicit right borders); §3.1 no device chrome in the frame; §3.2 no unauthorized state variants; §3.4 no auto-regeneration path
- `.planning/research/FEATURES.md` §MVP Table Stakes — "ASCII component library" item (12-15 primitives), "ASCII wireframe renderer" spec (~40 lines/screen), "State variants per screen" (first-class, not overlays)
- `.planning/research/ARCHITECTURE.md` §L4 Emit layer — renderer as pure function, no hidden state; snapshot-driven
- `.planning/research/SUMMARY.md` §Build Order §Phase 3 — dogfood gate rationale; ~20 reference wireframes before TUI work starts
- `.planning/research/STACK.md` §Wireframe rendering — negative library finding; build our own

### External standards / inspirational references
- Unicode Box Drawing block (reference only — **not** used in persisted wireframes; Phase 5 preview may consult)
- Markdown fenced code blocks — target paste surface (PR descriptions on GitHub). Width ≤ 60 survives mobile viewing and sidebar-split editors.

### Session artefacts (read-only context)
- `.planning/STATE.md` — current progress; Phase 2 CLOSED; 22 fixtures on disk; 0/20 reference wireframes
- `.planning/phases/02-serialization-round-trip/02-VERIFICATION.md` (if present after `/gsd-verify-work`) — Phase-2 sign-off

### User-referenced docs during this discussion
None — all decisions above are locked from the prior CONTEXT chain + research corpus; no new external refs surfaced in Q&A.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets (from Phases 1 & 2)

- **`src/model/` barrel** — `Spec`, `Screen`, `ComponentNode`, `ScreenVariants`, `Variant` types + `validateSpec`. Renderer imports as read-only consumers.
- **`src/serialize/parse.ts`** — `parseSpecFile(path): { spec, astHandle, diagnostics, body }`. The `render-wireframe` CLI calls this to get a validated Spec; `astHandle` and `body` are ignored. Diagnostics with `severity: 'error'` trigger `[BROKEN LINK]` inline for unresolved refs but do not block emission (01-06 decision).
- **`src/primitives/diagnostic.ts`** — if the renderer needs to surface layout-time issues (e.g., overflow + truncation with `--strict` flag in future), new codes like `WIREFRAME_OVERFLOW_TRUNCATED` (info) can be authored via the existing `diagnostic()` factory. V1 renderer does NOT emit diagnostics; it just renders.
- **Phase 1 fixtures (`fixtures/habit-tracker.spec.md`, `todo.spec.md`, `social-feed.spec.md`)** — the three canonical inputs for Phase-3 wireframe derivation. Each already has screens + variants the renderer must handle. `malformed.spec.md` is NOT a Phase-3 input (it's for diagnostic regression).
- **`fixtures/sigil/` + `fixtures/round-trip/`** — useful as parse-path inputs (demonstrating sigil-form and round-trip-edge specs load cleanly), but the renderer doesn't differentiate sigil-form vs triple-form input (D-22 normalises on parse). Phase 3 doesn't ship new `.spec.md` fixtures under these dirs.

### Established Patterns (follow, don't invent)

- **Pure functions + snapshot tests.** `validateSpec`, `parseSpecFile`, `writeSpecFile` are all pure / Result-typed. The wireframe renderer joins them: `render(spec, screenId): string` — no hidden state, no IO. Snapshot tests are co-located per module (`*.test.ts` next to the source file), integration tests in `tests/`.
- **Never throws at the boundary.** `render(spec, screenId)` returns a string even when the screen has cross-ref errors (inline `[BROKEN LINK]`). Throw only on unrecoverable shape issues (`screenId not in spec.screens` — that's a CLI-caller error, not a renderer-logic error; caller should validate first or catch).
- **One file per concern.** Phase 1 set the precedent (`src/model/{action,variant,component,screen,...}.ts`); Phase 2 mirrored it (`src/serialize/{parse,write,body,sigil,...}.ts`); Phase 3 continues: `src/emit/wireframe/{layout, components/*, variants, cli}.ts`.
- **Closed vocabularies + exhaustive switches.** Every `ComponentNode.kind` must have an emitter; TypeScript's exhaustive-switch check + a grep gate (`COMPONENT_KINDS` appears in the emitter's visitor map) ensure new catalog additions force renderer updates. Matches Phase 1's `walkComponentTree` pattern.
- **Biome + vitest + tsc clean gate.** Phase 3 holds the green line: 0 tsc errors, 0 biome lint errors, all vitest suites green.
- **TDD per-task commit pairs.** `test(03-XX): RED` → `feat(03-XX): GREEN` established convention (Phase 1 + 2). Grep-reconstructable.
- **Co-located `.test.ts` + integration tests in `tests/`.** Phase 3 adds `tests/wireframe-catalog.test.ts` (per-kind snapshot coverage) and `tests/dogfood-gate.test.ts` (20-file count + SHARED.md parse).

### Integration Points

- **Phase 3 → Phase 4 (editor store):** the renderer is the primary subscriber of store state. Phase 4 will call `render(spec, screenId)` to produce the canvas preview pane. Phase 3's pure-function shape makes this wiring trivial.
- **Phase 3 → Phase 5 (canvas TUI):** canvas preview pane consumes the same `render` function. Phase 5 may add a `render({...options, unicode: true})` overload for BMP box-drawing; Phase 3 ships only the ASCII baseline. The `options` parameter shape is a Phase-5 concern; Phase 3 exposes `render(spec, screenId)` without options.
- **Phase 3 → Phase 8 (LLM handoff):** `:yank wireframe <screen-id>` pipes `render(spec, screenId)` through clipboard. `:prompt screen <id> <target>` reads the same spec but re-exposes sigil metadata (action + testID) per handoff-specific needs — independent of wireframe rendering.
- **Phase 4 replans use of renderer:** Phase 4's plan-phase workflow reads `fixtures/wireframes/SHARED.md` as a first-plan precondition; if the file shows < 3 shareable entries, planning fails (D-49).
- **`src/emit/` as Phase-3 home:** ARCHITECTURE §L4 marks `src/emit/` as the layer for all serialisers/emitters. Phase 3 creates `src/emit/wireframe/`; Phase 7 will later create `src/emit/maestro/` as a sibling.

### New Code Layout

- `src/emit/wireframe/` (new directory):
  - `index.ts` — barrel with `render(spec, screenId): string` and `renderAllVariants(spec, screenId): string`
  - `layout.ts` — fixed 60-col frame composer, border drawing, content padding
  - `variants.ts` — 4-variant block composition (header-in-border, null → 1-line marker, blank line separators, acceptance footer under `content`)
  - `components/` subdir — one file per 18-kind emitter (`button.ts`, `toggle.ts`, `card.ts`, ...), each exporting `renderButton(node, width): string[]` (or equivalent)
  - `text-style.ts` — heading/body/caption ASCII mapping (D-43)
  - `overflow.ts` — truncate-with-ellipsis primitive (D-44)
  - Co-located `.test.ts` per emitter
- `scripts/render-wireframe.ts` — CLI entry; reads a `.spec.md`, calls `parseSpecFile`, routes to `render(spec, screenId)`, writes stdout
- `fixtures/wireframes/` — 20 `.wf.txt` files under `{fixture-slug}/{screen}-{variant}.wf.txt`, plus `README.md` index, plus `SHARED.md` evidence sidecar
- `tests/wireframe-catalog.test.ts` — per-kind + 5-composite snapshot coverage (WIREFRAME-03)
- `tests/dogfood-gate.test.ts` — 20-file count assertion + SHARED.md parse + ≥3 shareable entries (WIREFRAME-06)
- `tests/wireframe-ascii-baseline.test.ts` — regex-enforced check that every persisted `.wf.txt` matches `^[|\-+. \x20-\x7E]*$` only (WIREFRAME-02)

</code_context>

<specifics>
## Specific Ideas

- **The 3-PR-paste gate is a real gate, not a formality.** Author commits wireframes, pastes 3 into places where real humans will see them (GitHub PR descriptions, Slack threads, Discord channels, issue descriptions), judges each "shareable" or "needs-work," records evidence in SHARED.md. Phase 4 planning hard-stops until ≥3 are marked shareable. This is the core-value forcing function: if the output isn't good enough to paste, no amount of TUI polish saves the product.
- **Compact mockup style (D-33) is a deliberate rejection of three failure modes:** (1) "labeled tree" dumps that read like a DOM inspector but not like an app; (2) "heavy boxes everywhere" that exhaust the ~40-line budget on trivial screens; (3) "device-frame mockups" that add simulated phone chrome the PR reviewer has to mentally subtract. The wireframe should feel like a low-res screenshot, not a technical diagram.
- **Fixed 60-col width (D-38)** is the "survives copy-paste" bar. GitHub PR descriptions, Slack threads, and most plain-text tools render 60 chars wide without wrapping on mobile or sidebar-split layouts. Authors who want to try other widths post-v1 can fork the renderer; v1 doesn't add the flag.
- **`when:` trigger in the header (D-41)** means a variant's semantic reason is preserved across paste. A pasted `empty` wireframe that shows `when collection /Habit/title` is self-documenting: the reader knows "this is what the user sees when `/Habit/title` collection is empty." Without this, the empty-state wireframe is just a pretty picture.
- **UPPERCASE h1 + Title-Case h2 (D-43)** over markdown underlines because `===`/`---` lines are 2 lines each and the ~40-line budget punishes every extra line. CAPS compresses the heading emphasis to 0 extra lines. Accepts a small typography loss for layout density.
- **Hide sigil metadata in persisted wireframes (D-42)** sharpens the "screenshot feel." A reader scanning a PR description for "does this screen make sense" doesn't need to see `action=save_habit test:save_btn`; they need to see `[[ Save ]]`. The spec file carries the metadata; Phase 8's handoff commands re-surface it for prompts.
- **Null variants get 1-line marker frames, not omitted (D-39).** The decision-visibility design goal from Phase 1 D-06 survives the renderer: if a screen declares `loading: null`, the wireframe makes that visible (`+-- variant: loading  (N/A) --+`) rather than silently hiding it. Future authors editing the spec can see what's intentionally not-applicable.
- **Acceptance prose under `content` only (D-45)** avoids triple-printing the same bullets under 4 variant frames. The happy-path frame is the contract; empty/loading/error are variations of that contract.

</specifics>

<deferred>
## Deferred Ideas

- **Unicode BMP box-drawing preview path** — `render(spec, screenId, {unicode: true})` overload that swaps ASCII glyphs for `┌─┐│└┘├┤┬┴┼`. Phase 5 (canvas) needs this for in-TUI preview. Phase 3 ships ASCII-only; Phase 5 adds the options parameter and re-snapshot-tests the Unicode output.
- **CLI flag to vary rendering width** (`--width 80`) — considered and rejected for v1 per D-38. Post-v1, if authors ask for different-width presets, add as flag + variant snapshots.
- **Soft-wrap instead of truncate-with-ellipsis** — considered for overflow (D-44) and rejected for deterministic snapshot reasons. Revisit only if real fixtures show truncate loses critical info.
- **`render-wireframe --strict` diagnostic mode** — would emit `WIREFRAME_OVERFLOW_TRUNCATED`, `WIREFRAME_UNKNOWN_COMPONENT`, etc., as diagnostics. Not in v1 scope; renderer just renders. If authoring ergonomics demand it post-v1, wire in.
- **Interactive `render-wireframe --watch`** — file-watching re-render loop for rapid iteration on fixture authoring. Deferred; Phase 5 canvas will supersede the need.
- **Alternative visual styles as opt-in renderers** — "labeled-tree mode," "heavy-box mode," even "device-frame mode" as selectable stylesets for authors who disagree with D-33. Deferred; revisit if multiple authors actively file taste disagreements.
- **Non-ASCII label support (Phase 1 deferred item, carried forward)** — Phase 1's D-03 restricted labels to printable ASCII. If a future phase loosens this, renderer needs a transliteration step. Not v1.
- **Rich `[BROKEN LINK]` variants** — separate visual treatment for `SPEC_UNRESOLVED_ACTION` vs `SPEC_TESTID_COLLISION` vs `SPEC_JSONPTR_UNRESOLVED`. Phase 3 v1 uses a single inline marker style per D-Claude; enrich only if debugging-in-wireframe usage grows.
- **Semantic-token-aware wireframe rendering** — HANDOFF-04 mentions prompts reference "semantic tokens" (`variant: primary`, `gap: md`). Renderer ignores `variant` on Button beyond D-34's glyph mapping; `gap` on Column/Row affects whitespace math. Deeper semantic-token rendering (palette swatches, spacing indicators) is Phase 8 territory.
- **Side-by-side 2×2 variant grid** — considered and rejected for v1 (D-39). A post-v1 "dashboard render" could show all 4 variants side-by-side at half-width; loses paste-survival. Revisit if the "all states at a glance" ask surfaces.

</deferred>

---

*Phase: 03-wireframe-renderer-dogfood-gate*
*Context gathered: 2026-04-18*
