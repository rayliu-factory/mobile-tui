# Pitfalls Research

**Domain:** pi.dev TUI extension for authoring LLM-consumable mobile-app specs (Markdown + YAML + ASCII wireframes + Maestro/Detox flows)
**Researched:** 2026-04-17
**Confidence:** MEDIUM-HIGH (Context7 unavailable for pi.dev internals; WebSearch verified on terminal rendering, Maestro/Detox, YAML round-trip)

---

## 1. TUI Rendering Pitfalls

### Pitfall 1.1: Unicode box-drawing that renders inconsistently across terminals

**What goes wrong:**
Wireframes using heavy box-drawing (`┌ ─ ┐ │ └ ┘ ╔ ╗ █ ▓ ▒ ░`) look crisp in iTerm2 / Kitty with a Nerd Font but break in tmux under a different TERM, in Windows Terminal without the right font, in basic SSH sessions, and catastrophically when pasted into GitHub issues, email, or Slack. Kitty specifically rescales or truncates wide glyphs that don't fit a cell rather than overflowing; Powerline / Private-Use-Area glyphs render at one cell when they expect two; tmux breaks entirely when switching between terminals with different TERM values because it does not support multiple terminfo definitions.

**Why it happens:**
Developers build on one terminal (usually iTerm + a patched font) and assume the rendering transfers. The "shareable wireframe" promise in this project means the wireframe is pasted into GitHub, PRs, Linear, Notion — none of which are terminals.

**How to avoid:**
- Define an **"ASCII baseline" character set** for wireframes: `|`, `-`, `+`, `:`, space, alphanumerics only. No box-drawing, no block chars, no Nerd Font glyphs in the wireframe body.
- Allow a **"rich mode"** that upgrades to `┌┐└┘─│` (BMP box-drawing) only for in-TUI preview, never in the persisted spec file.
- Test render matrix: iTerm2, Kitty, Ghostty, tmux-over-ssh, Windows Terminal, plain macOS Terminal.app — and `cat wireframe.md | less`.
- Emit synchronized-output sequences (DECSET 2026) for in-TUI redraws to prevent flicker.

**Warning signs:**
- First screenshot someone shares on Discord has misaligned borders.
- A user reports "why is this box crooked" and it's fine on your machine.
- The spec file renders differently in VS Code's markdown preview vs. GitHub.

**Phase to address:** Wireframe-rendering phase — lock the character palette **before** writing the layout engine, or every later change is a compatibility break.

---

### Pitfall 1.2: Fighting pi.dev's chrome / blocking pi's event loop

**What goes wrong:**
Custom TUI components registered via `ctx.ui.custom()` run inside pi's main process. A synchronous parse of a large spec, a blocking `readFileSync`, a tight render loop, or a misused `setInterval` freezes pi entirely — the agent stops responding, keyboard input is lost, the user's chat session dies. Conversely, TUI components that draw outside their allotted region clobber pi's own chrome (status line, input prompt), leaving the user with a corrupted screen that requires `/reload` or a full pi restart.

**Why it happens:**
Extension authors treat pi like a blank terminal framework. It isn't — it's a host with its own rendering budget and redraw cycle. The docs show small examples; real extensions (persistent canvas) are long-lived and do real work.

**How to avoid:**
- All I/O through async APIs; never `fs.readFileSync` on the spec file.
- Offload parsing / rendering of large specs to a worker or an async generator; yield to the event loop every N screens.
- Keep every `setInterval` handle, clear it on extension teardown and on `/reload`. Extensions should register a cleanup hook and actually tear down.
- Confine drawing to the region pi grants; ask the pi API for dimensions rather than querying `process.stdout.columns` directly.
- Use pi's theme tokens (`theme.fg("success")`) — hardcoded ANSI desyncs from the user's palette and looks broken in dark/light switches.

**Warning signs:**
- pi becomes unresponsive while the extension is "thinking."
- `/reload` leaves ghost components or duplicated key handlers.
- Screen corruption that persists after the extension closes.
- The status line overlaps the wireframe on narrow terminals.

**Phase to address:** Extension scaffolding phase — establish the worker/async-IO pattern and teardown hooks **before** the first long-running canvas component.

---

### Pitfall 1.3: Copy-paste mangling of ASCII wireframes

**What goes wrong:**
The user renders a beautiful wireframe, cmd-drags to select it, pastes it into a GitHub PR, and the destination applies a proportional font, strips trailing spaces, collapses consecutive spaces to one, word-wraps at 80 chars, or converts tabs. The wireframe becomes unreadable in exactly the place where "shareable" was the core value.

**Why it happens:**
Terminal selection often copies with trailing whitespace stripped (for hygiene). Some terminals copy with ANSI color codes included; some without. Destination apps normalize whitespace. GitHub wraps long lines in issue bodies. Slack converts to a proportional font unless wrapped in ``` blocks.

**How to avoid:**
- Design wireframes to work **inside a fenced code block** (```). The spec file must always wrap wireframes in ``` so that `cat spec.md` and rendered markdown both preserve them.
- Pad to a **fixed target width** (e.g. 60 columns) that survives most paste destinations; never rely on trailing whitespace.
- Use `|` as an explicit right-border character so stripped trailing spaces are invisible.
- Provide a "copy wireframe" command that copies the fenced block directly via OSC 52 (most terminals support it) rather than relying on mouse-selection.

**Warning signs:**
- A user's shared wireframe looks wrong in a PR comment.
- Wireframe width varies by screen because rendering is terminal-width-adaptive.
- Missing right borders in the persisted file.

**Phase to address:** Wireframe-rendering phase — fix target width and right-border convention before first preview.

---

### Pitfall 1.4: Focus management and keyboard nav in canvas mode

**What goes wrong:**
Canvas mode has dozens of keybindings (`j/k` move between screens, `e` edit wireframe, `n` add nav, `d` add data model, `Esc` — but escape *where*?). Keybindings leak between modal contexts, `Ctrl+C` sometimes exits the extension and sometimes cancels an edit, tab-cycle skips unfocusable elements, and arrow keys fight with pi's own command history. Users can't figure out what has focus because there's no visible indicator, or the indicator (reversed video) disappears under certain color schemes.

**Why it happens:**
Focus is hard. Most TUI frameworks let you register keybindings globally and call it a day. The second modal state (wizard overlay on canvas) produces keybinding collisions.

**How to avoid:**
- Formal focus/mode state machine; every keypress is dispatched through the current mode, never globally.
- A **persistent help line** showing available keys for the current mode.
- A visible focus indicator that uses *both* color and a glyph (`▶`) so it works under colorblindness and terminal palette differences.
- Reserve `Ctrl+C` for "cancel the current input, but stay in the extension"; use `q` or `:q` for full exit with a save confirmation.
- Never bind single-letter keys while any text input is focused.

**Warning signs:**
- A keybinding does different things depending on where the user came from.
- The user types text and it triggers a shortcut.
- `Esc` sometimes exits the extension.

**Phase to address:** Canvas-mode phase — define the focus FSM before wiring any keybindings.

---

## 2. Spec / DSL Design Pitfalls

### Pitfall 2.1: Over-engineering the schema into ad-hoc XML / RDF

**What goes wrong:**
A well-meaning attempt at "precision" produces a schema with nested entities, cross-references by ID, discriminated unions for every widget type, and a 400-line YAML schema validator. The spec becomes unreadable, humans refuse to hand-edit it, and the "human dev reviews first, LLM second" contract breaks because no human can review a 2000-line YAML file.

**Why it happens:**
Developers who have been burned by loose specs over-correct. TypeScript encourages rich types. The temptation to model every possible UI idiom (especially to bridge SwiftUI + Compose) pushes toward a universal UI DSL — a problem that has eaten whole companies (RN, Xamarin, Flutter).

**How to avoid:**
- **Describe intent, not design.** The spec says "a primary action button that creates a new habit"; the wireframe (plain text) shows layout; the LLM chooses `Button { }` vs `FilledTonalButton { }`.
- Schema budget: **one screen's metadata fits in ~30 lines of YAML.** If it doesn't, simplify.
- No cross-references by numeric ID. Use screen *slugs* (human-readable) everywhere. Grep-friendly > DAG-pure.
- Resist modeling widget trees. The ASCII wireframe is the widget tree; the YAML is structure *around* it.
- Version the schema explicitly (`schema: mobile-tui/1`) from the first commit. Every breaking change bumps the number; provide an auto-migrator.

**Warning signs:**
- You find yourself writing a `oneOf` with more than 4 branches.
- The schema has entities the user never edits directly.
- Hand-authored test fixtures are painful to write.
- "We need a DSL for styling" appears in a thread.

**Phase to address:** Spec-model phase — lock schema boundaries **before** writing the serializer or any renderer.

---

### Pitfall 2.2: Under-engineering leaving LLMs to hallucinate structure

**What goes wrong:**
The other extreme: spec is a loose prose document with some bullet points. The LLM then invents field names, invents state names, assumes data relationships that weren't specified, and produces inconsistent code across screens. Acceptance criteria are implicit, so the Maestro tests hallucinate IDs that the generated app doesn't expose.

**Why it happens:**
Reaction to 2.1. "Markdown is all you need." It isn't — LLMs still need structure, just the *right* amount.

**How to avoid:**
- **Non-negotiable structured fields per screen:** `id`, `route`, `title`, `data_in`, `data_out`, `actions`, `states` (loading/empty/error/populated), `nav_targets`.
- Every identifier (`action.create_habit`, `state.loading`) is referenced by name from the Maestro flows — the spec enforces a closed vocabulary per project.
- Validate on save: every nav_target must reference a real screen.id; every action referenced in a Maestro flow must be declared on a screen.
- Provide an LLM-readable "contract" header at the top: "Each screen has sections X, Y, Z in this order. If you're generating code, assume field A is always present."

**Warning signs:**
- Two screens express the same idea differently.
- An LLM builds something plausible but wrong and the spec "technically" allowed it.
- Maestro tests fail because they refer to a testID the app code never set.

**Phase to address:** Spec-model phase — draft 3 real-world specs by hand first; the schema is whatever they converge on.

---

### Pitfall 2.3: Tight coupling to a single framework's idioms

**What goes wrong:**
Early schema decisions bake in iOS navigation (NavigationStack, sheets, dismiss) or Android (NavHost, popBackStack). When the other target is added, either the schema gets a messy `platform: ios | android` discriminator everywhere or the spec only produces idiomatic code for one platform.

**Why it happens:**
The author uses one platform more day-to-day. SwiftUI has `@State`, `@Binding`, `@Environment`; Compose has `remember`, `CompositionLocal`. Whichever vocabulary leaks in first becomes the spec's vocabulary.

**How to avoid:**
- Use **neutral nouns**: `screen`, `modal`, `sheet`, `stack`, `tab`, `drawer`. Not `NavigationStack`, not `NavHost`.
- State model: `view_state` (loading / error / ...), `local_state` (named scalars and lists), `shared_state` (app-level, cross-screen). No `@State` vs `remember` in the spec.
- Navigation: declare as a graph (`from: screens.list, to: screens.detail, trigger: tap_item, transition: push`). The generator picks `NavigationStack.append` or `navController.navigate`.
- Write the SwiftUI reference impl *and* the Compose reference impl of the same screen by hand from the spec; if either feels unnatural, the spec leaks the other platform's idioms.

**Warning signs:**
- An iOS dev reads the spec and says "where does the sheet come from?"
- An Android dev reads the spec and says "what's a NavigationStack?"
- The generator needs `if platform == ios` branches for structural decisions.

**Phase to address:** Spec-model phase — write hand-crafted SwiftUI and Compose from one shared spec as a validation gate.

---

### Pitfall 2.4: Schema versioning with no migration story

**What goes wrong:**
Schema v1 ships. v2 renames a field, moves another under a new parent. Existing spec files in user repos break silently — the tool opens them, "loses" fields that don't match v2 names, and on save silently drops the user's data. Because the spec file IS the state, git is the only recovery.

**Why it happens:**
Schema changes feel safe in a new project. Users who adopted early don't expect version skew.

**How to avoid:**
- `schema: mobile-tui/1` in frontmatter from commit 1.
- Migrations are code, not ad-hoc. `migrations/v1_to_v2.ts` that reads v1 YAML and writes v2 YAML.
- On open, if `schema` is older, prompt the user: "migrate to v2? A backup will be written to `spec.v1.bak.md`."
- Never silently drop fields. Unknown fields go into `_unknown:` and round-trip back out.
- CI test: every historical fixture from every prior version round-trips through the current tool.

**Warning signs:**
- A user says "my spec lost data after I updated."
- Diffs on spec files show deletions nobody made.
- There's no way to open an old-format spec.

**Phase to address:** Spec-model phase — introduce schema version in the very first serialized output.

---

## 3. Wireframe Fidelity Pitfalls

### Pitfall 3.1: Over-literal device chrome

**What goes wrong:**
Wireframes include drawn status bars, notches, home indicators, battery icons, carrier names. They look "realistic" but lie — the real device chrome comes from the OS, not the app, and the LLM dutifully generates code that re-draws a fake status bar on top of the real one.

**Why it happens:**
The author traces what they see on an iPhone. "Shareable good" gets conflated with "pixel-perfect."

**How to avoke:**
- Wireframes represent **the app's drawing surface**, not the device screen. No status bar, no notch.
- Optional 1-line "device hint" above the wireframe (`[iPhone 15, portrait]`) as a *comment*, not part of the frame.
- Explicit `safe_areas: top | bottom | keyboard_avoiding` fields in the spec metadata instead of drawing them.

**Warning signs:**
- Wireframes include a `9:41` time display.
- Generated code includes custom status-bar drawing.
- Wireframes change when you "switch device model."

**Phase to address:** Wireframe-rendering phase — decide what the frame represents before any rendering code.

---

### Pitfall 3.2: Fake states implying unspecified features

**What goes wrong:**
The wireframe depicts a dark-mode variant, a dynamic-type large-text variant, and an RTL variant — features that look thorough but imply commitments the spec never made. The LLM generates full dark-mode theming code the dev didn't ask for, and Maestro tests now need to cover dark mode because "the wireframe says so."

**Why it happens:**
Wireframing tools historically show variants to demonstrate "completeness."

**How to avoid:**
- One canonical render per screen. State variants (loading / empty / error / populated) are first-class in the spec as separate frames; dark mode / RTL / large-text are **out of scope** unless declared in a top-level `features:` array.
- If declared, they have their own section with their own wireframes; otherwise they don't appear.
- Never auto-render a dark-mode variant "for free."

**Warning signs:**
- Generated code includes dark-mode assets the spec never mentioned.
- The spec file has rendering variations nobody asked for.
- "Just add a dark version of this wireframe for completeness."

**Phase to address:** Wireframe-rendering phase — define the canonical-frame + explicit-state-variant rule.

---

### Pitfall 3.3: Wireframe drifting from screen metadata

**What goes wrong:**
The wireframe shows a button labeled "Save"; the spec's `actions:` list says `save_habit`; after two edit cycles, the wireframe label becomes "Create" but the action is still `save_habit`. The LLM produces code where the button says "Create" and calls `saveHabit()`. Maestro tests (referencing `save_habit`) still pass; the user sees inconsistent labels.

**Why it happens:**
The wireframe is hand-edited text, the metadata is structured YAML. Nothing links them.

**How to avoid:**
- Mark referenceable elements in the wireframe with a **sigil** (`[Save →save_habit]` or `<<save_habit>>`). On save, the tool validates every sigil resolves to a declared action/state.
- Optional: on edit, highlight orphan sigils in red in the TUI.
- Never auto-sync — that causes other problems (see 3.4). Just validate + warn.

**Warning signs:**
- Labels in the wireframe drift from labels in generated code.
- A sigil references a nonexistent action.
- The spec passes validation but a human sees the inconsistency.

**Phase to address:** Spec-model + wireframe-rendering phases — sigil convention in spec schema, validation in serializer.

---

### Pitfall 3.4: Auto-regenerating wireframes and overwriting hand edits

**What goes wrong:**
Canvas mode lets the user regenerate the wireframe from structured fields ("the data model changed — re-render"). The regenerator produces a reasonable frame but silently obliterates the user's manual tweaks (custom spacing, annotation comments, intentional blank rows used as visual grouping).

**Why it happens:**
The tool has two sources of truth — structured data and the frame — and regeneration is tempting as "keep them in sync."

**How to avoid:**
- Wireframes are **authored, not generated.** The tool provides a *scaffold* at screen creation, then the user owns it.
- On data-model changes, the tool **prompts** but never silently updates the frame.
- "Regenerate wireframe" is a destructive action behind a confirmation and writes a `.bak`.
- Sigil validation (3.3) flags drift; humans resolve it.

**Warning signs:**
- Users stop hand-editing wireframes because "it'll get overwritten."
- Comment annotations vanish between sessions.
- Git diffs show churn nobody initiated.

**Phase to address:** Wireframe-rendering phase — no auto-regeneration path exists in the MVP.

---

## 4. Round-trip Editing Pitfalls

### Pitfall 4.1: Comments, key order, and whitespace stripped by YAML libraries

**What goes wrong:**
The user hand-edits `spec.md` — adds `# TODO: confirm with designer` comments, reorders fields for their own mental model, indents for readability. The tool reopens the file via `js-yaml.load` + `js-yaml.dump`, and the output is alphabetically-ordered, comment-free, reformatted. Git diff shows a 200-line change the user didn't make, and next time they edit they lose trust in the tool.

**Why it happens:**
Standard YAML libraries (`js-yaml`) parse to a plain JS object and dump deterministic output. Round-trip preservation is a separate capability.

**How to avoid:**
- Use **`yaml` (eemeli/yaml)** in AST mode (`parseDocument` → `Document`), not `js-yaml`. It preserves comments, key order, anchors, and most whitespace. Mutate the Document and re-stringify.
- For the markdown body (below frontmatter), do **not** re-parse and re-emit — treat it as an opaque string. Touch only the frontmatter through the AST; splice the body back verbatim.
- Golden-file test: open 20 hand-crafted specs, save without edits, assert byte-equality.

**Warning signs:**
- Reopening a spec produces a nonzero diff.
- User comments disappear.
- Key order changes.

**Phase to address:** Spec-serializer phase — this is a hard dependency on library choice; decide **before** writing the first load/save.

---

### Pitfall 4.2: Markdown body reformatted by a Markdown AST round-trip

**What goes wrong:**
The tool parses the markdown body with `remark` / `markdown-it`, modifies a section, stringifies. Output has different heading styles (`Setext` → `ATX`), link references normalized, emphasis markers swapped (`_` → `*`), fenced code languages renamed. Wireframes inside code blocks are preserved but everything around them churns.

**Why it happens:**
Markdown has many equivalent representations. AST → stringify is lossy at the syntax level.

**How to avoid:**
- Treat the markdown body as **opaque string**. For in-place edits, use line-range splicing anchored on HTML comments (`<!-- screen:list -->` ... `<!-- /screen:list -->`).
- When writing a new screen, append a new anchored block; never rewrite existing blocks without intent.
- If markdown manipulation is necessary, use `mdast-util-from-markdown` + `mdast-util-to-markdown` with strict formatting options set, and pin the version.

**Warning signs:**
- Diffs on the markdown body change unrelated formatting.
- Code fences get language tags they didn't have.
- Blockquotes or lists reformat.

**Phase to address:** Spec-serializer phase — commit to line-range splicing before writing the editor.

---

### Pitfall 4.3: Stale derived fields baked into the file

**What goes wrong:**
The spec has a `last_updated`, `hash`, or `nav_graph_rendered` field the tool sets on every save. Now every save produces a diff even when nothing changed. Worse, a `nav_graph` ASCII diagram is rendered into the file and then drifts as the user hand-edits the `navigation:` list without re-running the tool.

**Why it happens:**
Tempting to embed derivable things for visibility in the rendered file.

**How to avoid:**
- **No derived fields in the spec file.** Hashes, timestamps, generated diagrams live in a `.planning/.mobile-tui/cache.json` (gitignored) or are regenerated on demand.
- If a derivable thing *must* be in the file (e.g. a nav-graph summary for humans), mark it with `<!-- generated, do not edit -->` and re-derive on every open, flagging drift.
- `git log spec.md` should show only real changes.

**Warning signs:**
- Every "open + save" produces a diff.
- A user edited a section and the "summary" became stale.
- Timestamp churn in git history.

**Phase to address:** Spec-serializer phase — "no derived fields" is a schema rule from day one.

---

### Pitfall 4.4: YAML parsing divergence between tools

**What goes wrong:**
The user edits the file with Neovim + a YAML plugin that accepts `yes` as boolean `true`. The extension uses a stricter parser (`yaml` 1.2 strict) that treats `yes` as string `"yes"`. Semantics drift silently: a boolean flag is wrong, a Maestro flow reads a string where a bool was expected.

**Why it happens:**
YAML 1.1 vs 1.2 differ on `yes`/`no`/`on`/`off`. Sexagesimal numbers. The Norway problem (`NO` → `false`). Different parsers make different choices.

**How to avoid:**
- Declare YAML version explicitly: `%YAML 1.2 ---` at the top of the frontmatter (or an explicit convention to always quote strings that could be misparsed).
- **Lint on open:** detect `yes/no/on/off/NO/y/n` as unquoted scalars and warn.
- Prefer explicit types: `featured: true`, not `featured: yes`.
- Ship a `mobile-tui lint spec.md` command.

**Warning signs:**
- A bool was `true` in the UI but reads as `"true"` (string) downstream.
- A country-code field behaves oddly for Norway.
- Tests pass in one parser, fail in another.

**Phase to address:** Spec-serializer phase — pick YAML 1.2 strict, document, lint.

---

## 5. LLM-Handoff Pitfalls

### Pitfall 5.1: Implicit context and scattered per-screen info

**What goes wrong:**
A screen's data is spread: wireframe at line 200, actions at line 450, state at line 600, relevant Maestro flow in a separate file. The LLM, especially mid-document, loses context — "Add a delete button to the Habit Detail screen" results in edits that reference data fields from the wrong screen because the nearest `data_in:` block is for List, not Detail.

**Why it happens:**
Natural markdown flow (all screens, then all nav, then all data) is human-friendly but LLM-hostile. LLMs attend best to local context; pronouns ("this screen," "the button") dissolve at distance.

**How to avoid:**
- **Screen-local colocation.** Everything about one screen in one contiguous block: `## screen: habit_detail`, then its YAML block, wireframe, actions, states, local Maestro fragment.
- Cross-screen things (nav graph, global data models) get their own top-level sections with explicit screen references by slug.
- No pronouns in generated text. "The button" → "The `save_habit` action on screen `habit_detail`."

**Warning signs:**
- LLM-generated code confuses two similar screens.
- The spec reads fine top-to-bottom but an LLM asked a specific question fails.
- Context-window-limited models do worse than 200k models on the same spec.

**Phase to address:** Spec-model phase — lock the colocation convention.

---

### Pitfall 5.2: Context-window blow-out on large apps

**What goes wrong:**
A 30-screen app produces a 25k-token spec. A 70-screen app produces 60k+ tokens and becomes unusable with mid-tier models; even on 200k-token models, attention degrades — "effective context can fall below advertised limits by up to 99% on complex tasks."

**Why it happens:**
Each wireframe is ~40 lines. Each screen has metadata. It adds up fast.

**How to avoid:**
- **One screen per markdown section** with stable anchor IDs, so the LLM can be given just the screens it needs.
- Provide a `mobile-tui extract --screen habit_detail` command that outputs a self-contained spec fragment (screen + its nav-graph neighbors + referenced data models).
- Keep a short `INDEX.md` (<2k tokens) that's always loadable: screen list, one-line description each, nav graph. The LLM uses the index to decide which screen blocks to load.
- Explicit token budget per screen: <1500 tokens including wireframe.

**Warning signs:**
- An LLM says "I can't see the full spec."
- Specs exceed 40k tokens.
- LLM performance noticeably worse on the 30th screen vs. the 3rd.

**Phase to address:** Spec-model + output phases — the extraction tool is a first-class MVP feature.

---

### Pitfall 5.3: Missing per-screen acceptance criteria

**What goes wrong:**
Prose like "this screen shows a list of habits" leaves the LLM to decide what "shows" means. No explicit success criteria → generated code may "work" and pass type-checks but miss the actual behavioral intent. Maestro tests reflect what was built, not what was specified.

**Why it happens:**
Acceptance criteria feel heavyweight for a design doc. Tests are an afterthought.

**How to avoid:**
- Every screen has an `acceptance:` YAML list: each item is a checkable condition (`"tapping the primary action navigates to habit_new"`, `"empty state shows when habits.length == 0"`).
- The Maestro flow is generated *from* acceptance criteria — criteria drive flows, not vice versa.
- Validate: every `acceptance:` item must be referenced by at least one generated Maestro step; dangling criteria are a warning.

**Warning signs:**
- The LLM's code builds but the generated Maestro flow doesn't meaningfully test it.
- A PR description can't answer "how do we know this is done?"
- Screens without `acceptance:` pass validation.

**Phase to address:** Spec-model phase — make `acceptance:` required (minimum 1 item).

---

## 6. Mobile Model Pitfalls

### Pitfall 6.1: Platform-idiom leakage in navigation model

**What goes wrong:**
Spec models nav as "push onto stack, pop to dismiss" (iOS mental model). On Android, the hardware/gesture Back behavior differs: Back can pop the stack, exit the app, or be intercepted. Compose's `NavHost` expects route strings. The LLM builds Android code that ignores hardware Back because the spec never accounted for it.

**Why it happens:**
iOS nav is the default mental model in the 2020s design world. Android nav is "just what iOS does minus a bar."

**How to avoid:**
- Nav spec declares `back_behavior:` per screen: `pop_stack | dismiss_modal | exit_app | intercepted_confirm_unsaved`. Both platforms consume this.
- Gestures as explicit: `gestures: [swipe_back, swipe_dismiss_sheet]`. Android 10+ edge-swipe conflicts with in-app horizontal swipes — declare which takes priority.
- Test matrix generated for Maestro: Android Back, iOS swipe-back, both modal-dismiss paths.

**Warning signs:**
- Android builds crash or exit unexpectedly on Back.
- "How do you dismiss this?" has no answer for one of the two platforms.
- Generated code has an iOS-shaped nav that's ported awkwardly to Compose.

**Phase to address:** Spec-model phase — `back_behavior` is a required field on any non-root screen.

---

### Pitfall 6.2: Missing permissions, deep links, orientation, keyboard

**What goes wrong:**
Spec covers happy paths but no permissions (location, camera, notifications, photo library), no deep-link entry points, no orientation handling, no keyboard-avoiding behavior. The LLM ships an app that: crashes on permission denial, can't be reached from a link, renders broken in landscape, covers the text field with the keyboard. iOS AASA and Android app-links caching bite hard; if the deep-link URL pattern changes late, AASA takes hours to propagate.

**Why it happens:**
These live in "the gap between designer and developer." Wireframes don't naturally show them.

**How to avoid:**
- Top-level `capabilities:` block: `permissions:` (list with rationales + denial-state behavior), `deep_links:` (URL patterns per screen), `orientations:` (lock / allow), `keyboard_avoiding:` (per screen that has text input).
- Each permission has a `denied_state` referencing a wireframe (the fallback UI the app shows when denied).
- Deep-link patterns are case-sensitive and must exactly match `.well-known/apple-app-site-association` and Android intent filters.
- Generate Maestro flows that explicitly exercise permission-granted and permission-denied paths.

**Warning signs:**
- No `permissions:` block on an app that clearly needs them.
- Deep-link URL patterns change more than once during spec evolution.
- Landscape screenshots break.

**Phase to address:** Spec-model phase — `capabilities:` block in the top-level schema.

---

### Pitfall 6.3: Data model conflation (UI state vs persisted state vs remote)

**What goes wrong:**
Spec has one `data:` section per screen mixing "the fields this screen displays" with "the entity in the DB" with "the response from the API." LLM builds a monolithic model and the generated code has one bloated type doing three jobs; Swift `struct` ↔ `Codable` ↔ SwiftData / Compose `data class` ↔ Room ↔ Retrofit bindings become tangled.

**Why it happens:**
In a UI-first tool, "data" feels singular.

**How to avoid:**
- Three distinct layers in the schema: `entities:` (app-wide, persisted), `view_models:` (per screen, derived), `dtos:` (remote API shapes, per endpoint).
- Explicit mappings: `view_models.habit_list.source: entities.habit (collection, sorted_by: created_at desc)`.
- Never let an entity directly drive a view.

**Warning signs:**
- A "data" block has UI-specific fields (`is_selected`) mixed with persistence fields (`id`, `created_at`).
- Generated code has massive types that serialize everything.
- Changing one DB field requires edits across many screens.

**Phase to address:** Spec-model phase — three-layer data model is a design decision, not a refactor.

---

## 7. Maestro / Detox Generation Pitfalls

### Pitfall 7.1: Selectors referring to testIDs the app code doesn't set

**What goes wrong:**
Generated Maestro flows say `tapOn: id: "save_habit_button"`. The LLM building the app uses `Button("Save") {}` without `.accessibilityIdentifier("save_habit_button")`. Flows silently fail with "element not found" or, worse, fall through to text matching and tap the wrong thing.

**Why it happens:**
Flows are generated from the spec; the app is generated separately. Nothing enforces the contract.

**How to avoid:**
- Spec declares `test_id:` on every actionable element in the wireframe sigil: `[Save →save_habit test:btn_save]`.
- Generator emits **both** SwiftUI's `.accessibilityIdentifier("btn_save")` / Compose's `Modifier.testTag("btn_save")` **and** the Maestro `id: btn_save` reference from the same source.
- Provide a `mobile-tui verify-testids` command that scans the generated app source for required testIDs and reports misses.
- testIDs are **stable across text changes and localization** — this is one of the only things Maestro does well; use it.

**Warning signs:**
- Maestro logs show "element not found."
- Flows tap by coordinates or text.
- testIDs exist in flows but not in app source.

**Phase to address:** Maestro-generator + app-generation-guide phases — sigils with `test:` become a schema rule.

---

### Pitfall 7.2: Coordinate-based or nth-child selectors

**What goes wrong:**
Generator, unable to determine a stable selector, emits `tapOn: {x: 200, y: 450}` or "tap the second cell." Tests pass on the reference device and break on every other size class and on any UI change.

**Why it happens:**
Falling back to coordinates is the easy path when a named selector isn't available.

**How to avoid:**
- **Ban coordinate taps** in the generator. If no selector exists, fail the generation and require the spec to declare a testID.
- Ban `nth-of-type` selectors. List items use `id: habit_cell_{{index}}` or a data-driven `id: habit_cell_{{habit.id}}` with the id field declared in the view_model.
- Preflight lint: every Maestro flow step references a testID declared in the wireframe sigils.

**Warning signs:**
- Tests fail on iPad / foldable / landscape.
- A minor UI tweak breaks 10 tests.
- "Just hardcode the coordinates for now."

**Phase to address:** Maestro-generator phase — selector policy is a generator-time constraint.

---

### Pitfall 7.3: Cross-platform flow divergence

**What goes wrong:**
Generator produces one Maestro flow that "should work on both platforms." It doesn't: Android shows a permission dialog iOS doesn't, the Back button exists on one, modal dismiss gestures differ, animation timing differs. Flows silently diverge — one platform's CI is green, the other intermittently fails.

**Why it happens:**
"Maestro is cross-platform" is marketing. Real flows need platform branching.

**How to avoid:**
- Flows declare `platform: ios | android | both` per step; emit two `.yaml` files at the end (`flow.ios.yaml`, `flow.android.yaml`), identical where possible, branched where needed.
- Shared fixtures: permission-grant helper per platform, Back-button handling per platform.
- Detox target (iOS) and Maestro target (Android) if both are being generated: keep them distinct; don't try to unify.
- Detox has documented reliability issues (launches succeeding only 2/10 times on physical devices, animation-sync problems). Default to Maestro; make Detox opt-in only when Detox-specific features are needed.

**Warning signs:**
- One-platform CI consistently red.
- Flows full of `runFlow: when: platform = ...` at every step.
- Timing issues that appear on one platform only.

**Phase to address:** Maestro-generator phase — branched-output model from the first generated flow.

---

## 8. pi.dev Extension Pitfalls

### Pitfall 8.1: State leaking across pi sessions

**What goes wrong:**
Extension caches canvas state (open screen, cursor position, undo stack) in a global variable or a local JSON file keyed by nothing. User opens a second pi session on a different project; state collides. User switches branches; stale cache points at screens that no longer exist.

**Why it happens:**
`~/.pi/agent/extensions/mobile-tui/state.json` feels innocuous until multiple projects share it.

**How to avoid:**
- Cache keyed by **absolute spec-file path + git commit hash**. Invalidate on hash mismatch.
- Scope all transient state under `.planning/.mobile-tui/` in the project; put it in `.gitignore`.
- On extension `/reload`, re-initialize from the on-disk spec; don't trust in-memory state across reloads.
- Never store anything the user would be surprised to see survive a pi restart — except explicit preferences, which go in `~/.pi/agent/extensions/mobile-tui/config.json`.

**Warning signs:**
- Opening a second spec shows artifacts from the first.
- After a `/reload`, stale undo history.
- Cross-branch ghost screens.

**Phase to address:** Extension scaffolding phase — state-scoping convention before any caching.

---

### Pitfall 8.2: Package / version conflicts with pi-provided dependencies

**What goes wrong:**
The extension depends on `yaml@2.5` but pi's runtime bundles `yaml@2.2`. TypeScript version mismatch. The extension loads but fails at runtime with "method X not a function." Or — subtler — it works in local dev and fails in the published package because of a peer-dep constraint.

**Why it happens:**
pi provides a runtime; extensions share the process. Node resolution picks whichever is first.

**How to avoid:**
- Check pi's extension docs for **pinned runtime versions**; treat those as peerDependencies, not dependencies.
- `bundleDependencies` in `package.json` for things you control tightly.
- Smoke-test against pi's current release *and* the previous minor before publishing.
- Avoid deps that ship native binaries (node-pty, node-gyp-built parsers) — those break hardest in a sandboxed host.

**Warning signs:**
- "Works on my machine, fails after `npm publish`."
- pi logs show `Cannot find module` for something that's declared.
- Different behavior on different users' pi versions.

**Phase to address:** Packaging phase — dependency policy before the first publish.

---

### Pitfall 8.3: Extension draws outside its region / fights pi's chrome

**What goes wrong:**
Canvas mode uses full-screen alt-buffer mode (`\e[?1049h`), takes over pi's terminal entirely. User `/exit`s and their terminal is in a weird state; their scrollback is gone; pi's status line is overdrawn.

**Why it happens:**
Full-screen TUI tempts extension authors who've built standalone TUIs before.

**How to avoid:**
- Use pi's `ctx.ui.custom()` and draw within the region pi grants; never grab the terminal.
- No raw escape sequences that change terminal modes (alt buffer, cursor shape) without restoring on teardown.
- Register a cleanup hook (`process.on('exit', ...)`, pi's extension-deactivate event) that explicitly restores terminal state.
- If the canvas genuinely needs full-screen: implement it as a temporary takeover with a clearly defined enter/exit protocol, not the extension's steady state.

**Warning signs:**
- Terminal acts weird after the extension exits.
- Scrollback disappears.
- pi's own status line overlaps the extension.

**Phase to address:** Canvas-mode phase — alt-buffer policy decided before implementation.

---

## 9. UX Pitfalls

### Pitfall 9.1: Wizard and canvas feel like two different tools

**What goes wrong:**
Wizard has its own visual language (full-screen prompts, linear progress bar, numbered steps). Canvas has its own (split-pane, modal overlays, multi-focus). A user who completes the wizard hits canvas and can't find anything; re-entering the wizard later feels like restarting.

**Why it happens:**
Wizards and canvases are different patterns, often implemented by different code paths with different component libraries.

**How to avoid:**
- Shared visual vocabulary: same color palette, same help-line convention, same key layout (`?` always opens help, `q` always exits with save prompt, etc.).
- Wizard is a **thin overlay on canvas state.** Completing the wizard lands the user on the canvas with the first screen focused. Re-entering the wizard from canvas is an overlay, not a context switch — canvas remains visible behind.
- No "restart the wizard" — revisiting a wizard section jumps straight to that section, editing live.
- One consistent escape route (`Esc` or `q`) from anywhere.

**Warning signs:**
- Users ask "how do I get back to the wizard?"
- Keybindings differ between modes.
- Re-running the wizard feels destructive.

**Phase to address:** Wizard-flow + canvas-mode phases — design them together, not sequentially.

---

### Pitfall 9.2: No escape from a long wizard

**What goes wrong:**
The wizard has 12 steps. On step 8, the user realizes they want to skip ahead, save-and-quit, or jump back to step 3. There's only Next / Back. They either slog through, lose work, or force-quit.

**Why it happens:**
Wizards are natively linear. NN/g: "wizards are not gracefully interruptible — if users quit midway, they might not only lose their work, but may need to click again through the preceding steps."

**How to avoid:**
- **Save-and-exit at every step.** The partial spec is valid markdown even with half the fields blank; empty fields are explicit TODOs in the file.
- Step list visible with jump-to: sidebar/top shows all 12 steps; `g <n>` or clickable.
- "Skip" button per step; skipped steps are marked in the final spec as `TODO:` and the user can complete later in canvas.
- Wizard resumes where it was left if the partial spec is reopened.

**Warning signs:**
- Users abandon the wizard partway through.
- Same questions get asked every time they re-enter.
- Force-quit is the only way out.

**Phase to address:** Wizard-flow phase — save-on-every-step from the first prompt.

---

### Pitfall 9.3: Canvas discoverability — hidden features, mystery keybindings

**What goes wrong:**
Canvas has 20 keybindings. No visible help. `?` shows a help panel but you have to know to press it. Users use 5% of features, miss the actually-powerful ones, and eventually abandon the tool as "too simple" because they never saw the rest.

**Why it happens:**
Power users love keyboard-only. First-time users need affordances.

**How to avoid:**
- Always-visible help line at bottom showing context-appropriate keys (like vim's `:help` or lazygit's bottom bar).
- First-run tutorial overlay that points at each region.
- Command palette (`:` or `Ctrl+P`) listing every action by name — discoverability without memorization.
- "Hint mode" that highlights features the user hasn't used yet.

**Warning signs:**
- Users say "I didn't know it could do that."
- Feature usage telemetry (if collected) shows long-tail features unused.
- Help-issue volume on basic actions.

**Phase to address:** Canvas-mode phase — help line and command palette are MVP, not polish.

---

### Pitfall 9.4: Losing work on crash / saving-vs-unsaving confusion

**What goes wrong:**
pi crashes or the user `/exit`s without saving. 20 minutes of canvas work evaporates. Or: the user thinks they saved, closes, returns, and edits are gone because "save" was a wizard-only concept.

**Why it happens:**
"Spec file IS the state" conflicts with in-memory buffers holding unsaved edits. The dual source of truth causes confusion.

**How to avoid:**
- **Write-through model:** every meaningful edit writes to disk immediately (debounced ~500ms). No "unsaved" state.
- Status indicator: `● spec.md` if pending writes within the debounce window; `✓ spec.md` otherwise.
- Crash recovery: on every open, check for `.spec.md.swp`-style lock files and offer recovery.
- `q` prompts only if there are genuinely pending writes; otherwise exits silently.
- git is the undo history — show `git log -p spec.md` as "recent changes" inside the TUI.

**Warning signs:**
- Users ask "did I save?"
- Work is lost to crashes.
- The tool has both a save button and an autosave toggle.

**Phase to address:** Spec-serializer + canvas-mode phases — write-through is a foundational decision.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| `js-yaml` instead of `yaml` AST | Simpler API, faster to ship | Breaks round-trip; comments and order lost; user trust erodes after first edit cycle | Never — this is foundational |
| Regenerating wireframes from structured data | "Always in sync" demo story | Obliterates hand edits, reduces author agency | Only as an explicit one-shot "scaffold" command at screen creation |
| Coordinate-based Maestro taps when selectors unclear | Flow is "complete" | Breaks on every size class and every UI tweak; maintenance nightmare | Never — fail the generation instead |
| Storing canvas state in a global file | Simple persistence | Cross-project leakage, git-branch staleness | Only for user preferences (theme, keybindings), never for document state |
| Full-screen alt-buffer TUI | Richer canvas experience | Fights pi chrome, corrupts terminal on crash | Only with an explicit enter/exit protocol and restoration guarantee |
| Single Maestro flow "for both platforms" | Half the files to maintain | Silent cross-platform divergence, one CI permanently red | Only when the flow genuinely has zero platform-specific steps (rare) |
| Derived fields (hashes, timestamps) in the spec | Visible freshness indicator | Git churn on every open; merge conflicts | Never in the persisted file; fine in a gitignored cache |
| Hardcoded ANSI colors | Quick visual polish | Breaks on theme switch, colorblind users, light/dark | Never — use pi's theme tokens |
| Unicode box-drawing in the persisted wireframe | Prettier in-TUI preview | Breaks in GitHub, email, Slack paste destinations | Only in the in-TUI render layer; file uses ASCII baseline |
| Global keybindings (not per-mode) | Simpler dispatch | Collisions with text inputs, unpredictable behavior | Never — always mode-scoped |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| pi.dev extension API | Using `fs.readFileSync` on spec load | Async `fs/promises`; yield to event loop during parsing |
| pi theme | Hardcoded `\e[31m` red for errors | `theme.fg("error", ...)` — adapts to user's palette |
| js-yaml vs yaml (eemeli) | Using js-yaml for round-trip editing | `yaml` Document AST preserves comments, order, anchors |
| Remark/markdown-it for body | Parsing and re-emitting the markdown body | Line-range splicing on HTML-comment anchors; body is opaque string |
| Maestro | Coordinate-based taps as fallback | Required testIDs; fail generation if not declared |
| Detox | Assuming Detox is as reliable as Maestro | Default to Maestro; Detox only for iOS-specific deep features |
| SwiftUI `.accessibilityIdentifier` / Compose `Modifier.testTag` | Generating app code without them | Emit testIDs on every actionable element from the spec's `test:` sigil |
| Android hardware Back | Treating it as "iOS swipe-back" | Explicit `back_behavior:` per screen; platform-branched Maestro flows |
| iOS AASA deep-link files | Editing after shipping without allowing cache time | Lock deep-link URL patterns early; AASA propagation takes hours; no `.well-known` redirects |
| YAML 1.1 vs 1.2 | Treating `yes`/`no` as booleans | Pin to YAML 1.2; lint unquoted `yes`/`no`/`on`/`off`/country-code `NO` |
| Nerd Font glyphs | Using them in the persisted wireframe | In-TUI only; persisted file uses ASCII baseline + BMP box-drawing at most |
| tmux | Assuming one TERM works everywhere | Test under both direct terminal and tmux; issue synchronized-output (DECSET 2026) |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Re-parsing entire spec on every keystroke | Laggy typing, high CPU | Incremental parse scoped to the current screen block | ~10+ screens / ~5k lines |
| Re-rendering the full wireframe list every redraw | Flicker, cursor jumps | Dirty-region tracking; only redraw the changed screen | ~20+ screens |
| Loading all screens into context before extraction | Token blow-out, LLM degradation | `mobile-tui extract --screen X` outputs just one + dependencies | Apps with >30 screens |
| Writing full spec on every keystroke | Disk churn, git index thrashing | Debounced write-through (~500ms), single atomic rename | Any non-trivial editing session |
| Synchronous YAML parse on open | Blocks pi's event loop | Async parse in worker, progressive canvas population | Specs >2k lines |
| Unbounded undo history in memory | Memory growth over long sessions | Cap at 200 operations or snapshot every 20 | Long continuous editing (>1hr) |
| Full-file git diff on every open to show "recent changes" | Slow startup | Cache git log output, invalidate on commit | Repos with long history |

---

## Security Mistakes (Domain-Specific)

| Mistake | Risk | Prevention |
|---------|------|------------|
| Writing spec files outside the project root | Path traversal if user opens a malicious spec | Validate all paths stay within `cwd`; reject `..` segments |
| Executing YAML anchors/aliases without bounds | YAML billion-laughs DoS | Use a safe parser mode; bound alias expansion depth |
| LLM-generated Maestro flows that include shell escapes | Arbitrary command execution if flows run locally | Strictly validate Maestro YAML against known-good schema; never pass through unknown `runScript:` directives |
| Caching user specs outside the project | Sensitive app design leaks across projects | All caches in `.planning/.mobile-tui/` under the project, gitignored |
| Reading pi user config for credentials | Unnecessary exposure | The extension should never need credentials — local file I/O only |
| Allowing `!!js/function` in YAML load | RCE via crafted spec | Use `yaml` 1.2 defaults; never enable custom tags |

---

## UX Pitfalls (Summary Table)

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Wizard and canvas feel like different tools | Disorientation, forced re-learning | Shared keybindings, shared palette, wizard as overlay on canvas |
| Long wizard with no escape | Abandonment, lost work | Save-at-every-step; step list with jump-to; skip-to-TODO |
| Hidden canvas keybindings | Power features unused, tool feels "simple" | Always-visible help line + command palette + first-run tour |
| Saving vs. unsaving confusion | "Did I save?" ambient anxiety | Write-through (no unsaved state); `●`/`✓` indicator |
| Auto-regeneration overwriting edits | Distrust, defensive behavior | No silent regeneration; confirmation + `.bak` |
| Wireframe drift from metadata | Inconsistent generated app | Sigils link wireframe elements to declared actions; lint on save |
| Mystery focus state | Can't tell what keys will do | Explicit focus indicator (color + glyph) + mode in help line |
| Re-running wizard feels destructive | Users avoid the wizard | Wizard revisit = live edit, not restart |
| Hardcoded colors | Broken under dark mode or colorblind users | pi theme tokens only |
| Terminal-size-dependent layouts | Breaks on narrow / wide screens | Fixed target width for wireframes; responsive chrome only |

---

## "Looks Done But Isn't" Checklist

- [ ] **Wireframe render:** Render the same spec on iTerm2, Kitty, Ghostty, tmux-over-ssh, Windows Terminal, macOS Terminal.app — verify no mangling. Paste into GitHub PR, Slack, and Discord — verify no mangling.
- [ ] **Round-trip:** Hand-edit a spec (add comments, reorder keys, add blank lines), open in the tool, close without editing. `git diff` must show zero changes.
- [ ] **Schema version:** Every serialized spec has `schema: mobile-tui/1` in frontmatter. A deliberately older file triggers a migration prompt.
- [ ] **testID coverage:** Every actionable element in every wireframe has a `test:` sigil, and the generated Maestro flow references only those IDs.
- [ ] **Platform branch:** The Maestro output is two files (`.ios.yaml`, `.android.yaml`); differences are intentional and explicit, not accidental.
- [ ] **Back behavior:** Every non-root screen declares `back_behavior:`. Android hardware-Back flow exists.
- [ ] **Capabilities:** `permissions:`, `deep_links:`, `orientations:`, `keyboard_avoiding:` blocks exist (even if empty, they're declared).
- [ ] **Acceptance criteria:** Every screen has ≥1 `acceptance:` item. Every Maestro step references at least one.
- [ ] **No derived fields:** `git log spec.md --stat` shows only real changes; no churn from hashes or timestamps.
- [ ] **Save-and-quit at every wizard step:** Pressing `Ctrl+C` at step 6 of 12 leaves a valid partial spec on disk.
- [ ] **Write-through:** There is no "save" button or keybinding; the file updates on edit.
- [ ] **pi teardown:** Extension `/reload` leaves no ghost state, no zombie intervals, no terminal corruption.
- [ ] **Token budget:** Largest test spec (~30 screens) stays under 30k tokens; `extract --screen X` produces self-contained output under 2k tokens.
- [ ] **Extraction self-contained:** Extracted-single-screen spec is valid as an LLM prompt (includes referenced entities, nav neighbors, relevant tests).
- [ ] **Crash recovery:** Force-kill pi mid-edit; on restart, work is intact.
- [ ] **Theme respect:** Switch pi's theme mid-session; extension colors update.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| `js-yaml` baked in, round-trip broken | HIGH | Swap to `yaml` AST; write serializer-compat tests; re-serialize user repos (offer migration command); restore trust with a visible changelog |
| Schema v1 shipped without version field | HIGH | Introduce `schema: mobile-tui/1` in v2; detect missing version as v0; write v0→v1 migrator; one-time rewrite of all existing files |
| Wireframes use Unicode box-drawing in persisted file | MEDIUM | Add an ASCII-ify pass; provide `mobile-tui migrate --ascii-wireframes`; document paste targets |
| Maestro flows use coordinates | MEDIUM | Add lint rule that fails generation on coord taps; require testIDs retroactively; flag stale flows |
| State leaking across pi sessions | LOW | Move state file under project `.planning/.mobile-tui/`; `.gitignore` it; one-time cleanup of `~/.pi/agent/extensions/mobile-tui/state/` |
| Comments stripped on first save | HIGH (trust damage) | Same as row 1; also add a noisy warning on detection |
| Wireframe auto-regenerator obliterated user edits | HIGH | Restore from `.bak`; disable auto-regeneration; require explicit confirmation going forward |
| Extension freezes pi | MEDIUM | Identify sync I/O or tight loop; move to async/worker; add extension-level watchdog that warns on >500ms handler execution |
| Terminal corrupted after crash | LOW | Ship a `mobile-tui reset-terminal` command (writes `\e[?1049l\e[?25h`); document in README |
| Spec file larger than LLM context | MEDIUM | Ship extraction tool; update usage docs; partition large specs into per-screen files with an `INDEX.md` |
| Wireframe drift from metadata | MEDIUM | Introduce sigils; add lint; offer auto-annotation migration |
| Deep-link URL pattern changed late | HIGH (AASA caching hours+) | Lock pattern convention early; if changed, document propagation time; provide a verification flow |

---

## Pitfall-to-Phase Mapping

Phase names are illustrative — adapt during roadmap creation. The point is *which structural decision prevents the pitfall*.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1.1 Unicode box-drawing breakage | Wireframe-rendering phase | Multi-terminal render matrix in CI-equivalent manual test |
| 1.2 Blocking pi event loop / chrome fight | Extension scaffolding phase | Watchdog logs no handler >500ms; `/reload` clean |
| 1.3 Copy-paste mangling | Wireframe-rendering phase | Paste into GitHub PR preview; diff vs source |
| 1.4 Focus management | Canvas-mode phase | FSM unit tests; no global keybinding handlers |
| 2.1 Over-engineering schema | Spec-model phase | Hand-authored fixtures <30 YAML lines per screen |
| 2.2 Under-engineering schema | Spec-model phase | Closed-vocabulary validation on save |
| 2.3 Framework idiom leakage | Spec-model phase | Hand-crafted SwiftUI + Compose from one spec both feel idiomatic |
| 2.4 Schema versioning | Spec-model phase | `schema: mobile-tui/1` in every serialized spec; migration tests |
| 3.1 Over-literal device chrome | Wireframe-rendering phase | Wireframes have no status bar / notch / battery |
| 3.2 Fake state variants | Wireframe-rendering phase | Variant frames require a declared `features:` entry |
| 3.3 Wireframe/metadata drift | Spec-model + wireframe phases | Sigil lint on save |
| 3.4 Auto-regeneration | Wireframe-rendering phase | No auto-regen code path in MVP |
| 4.1 YAML round-trip loss | Spec-serializer phase | Golden-file byte-equality tests |
| 4.2 Markdown body reformatting | Spec-serializer phase | Line-range splicing on anchors; opaque-body tests |
| 4.3 Derived fields | Spec-serializer phase | `git log` shows only real changes |
| 4.4 YAML parser divergence | Spec-serializer phase | YAML 1.2 pinned; lint on open |
| 5.1 Scattered per-screen info | Spec-model phase | Colocation convention enforced by template |
| 5.2 Context-window blow-out | Spec-model + output phases | `extract --screen` produces <2k-token fragments |
| 5.3 Missing acceptance criteria | Spec-model phase | `acceptance:` required with ≥1 item |
| 6.1 Platform nav idiom leakage | Spec-model phase | `back_behavior:` required on non-root screens |
| 6.2 Missing capabilities | Spec-model phase | `capabilities:` block in top-level template |
| 6.3 Data model conflation | Spec-model phase | Three-layer `entities` / `view_models` / `dtos` enforced |
| 7.1 Missing testIDs | Maestro-generator + app-guide phases | `test:` sigil required on actionable elements |
| 7.2 Coordinate-based selectors | Maestro-generator phase | Generator fails on missing testIDs |
| 7.3 Cross-platform flow divergence | Maestro-generator phase | Two-file output (`.ios.yaml`, `.android.yaml`) |
| 8.1 State leaking across sessions | Extension scaffolding phase | State under project `.planning/.mobile-tui/` only |
| 8.2 Package version conflicts | Packaging phase | Peer-dep policy; multi-version smoke test |
| 8.3 Fighting pi chrome | Canvas-mode phase | Alt-buffer policy + teardown hook |
| 9.1 Wizard ≠ canvas feel | Wizard + canvas phases (co-designed) | Shared keybinding table; usability walkthrough |
| 9.2 No escape from wizard | Wizard-flow phase | Save-at-every-step; resume test |
| 9.3 Canvas discoverability | Canvas-mode phase | Always-visible help line; command palette from MVP |
| 9.4 Lost work on crash | Spec-serializer + canvas phases | Write-through; force-kill recovery test |

---

## Sources

**Terminal rendering:**
- [Kitty FAQ — Unicode width and private-use-area handling](https://sw.kovidgoyal.net/kitty/faq/)
- [claude-code#37283 — TUI flicker and DECSET 2026 synchronized output](https://github.com/anthropics/claude-code/issues/37283)
- [Terminal Gui — TUI Unicode discussion](https://github.com/gui-cs/Terminal.Gui/discussions/2939)
- [VSCode issue #35681 — proportional fonts in terminal](https://github.com/microsoft/vscode/issues/35681)
- [EZASCII — fonts for ASCII art and Unicode](https://ezascii.com/blog/best-fonts-for-unicode-and-ascii-art)

**pi.dev extensions:**
- [pi-mono extensions.md](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/extensions.md)
- [mariozechner.at — building pi coding agent](https://mariozechner.at/posts/2025-11-30-pi-coding-agent/)
- [pi.dev extension details gist](https://gist.github.com/rajeshpv/eccc1dc8d70e8cdcf948de3312ca111f)
- [JoelClaw — Extending Pi with custom tools](https://joelclaw.com/extending-pi-with-custom-tools)

**YAML / Markdown round-trip:**
- [Typora YAML front matter — fault-tolerant parsing](https://support.typora.io/YAML/)
- [Falldrive — dprint ignore around YAML frontmatter](https://www.falldrive.dsausa.org/avoid/yaml-frontmatter-in-markdown-files)
- [GitHub docs — YAML frontmatter conventions](https://docs.github.com/en/contributing/writing-for-github-docs/using-yaml-frontmatter)

**Maestro / Detox:**
- [QA Wolf — Best Mobile E2E 2026](https://www.qawolf.com/blog/best-mobile-app-testing-frameworks-2026)
- [PkgPulse — Detox vs Maestro vs Appium 2026](https://www.pkgpulse.com/blog/detox-vs-maestro-vs-appium-react-native-e2e-testing-2026)
- [Add Jam — Maestro E2E experience](https://addjam.com/blog/2026-02-18/our-experience-adding-e2e-testing-react-native-maestro/)
- [Panto — Detox vs Maestro comparison](https://www.getpanto.ai/blog/detox-vs-maestro)

**Mobile nav / deep links:**
- [Android Developers — Navigation principles](https://developer.android.com/guide/navigation/principles)
- [Android Developers — Gesture navigation compatibility](https://developer.android.com/develop/ui/views/touch-and-input/gestures/gesturenav)
- [Android Developers — Create deep links](https://developer.android.com/training/app-links/deep-linking)
- [Smler — Deep linking 2026 guide (AASA caching, case-sensitivity)](https://app.smler.io/blogs/deep-linking/what-is-deep-linking-in-mobile-apps-complete-guide-2026)

**LLM-consumable markdown:**
- [SearchCans — Format Markdown for LLMs](https://www.searchcans.com/blog/markdown-formatting-strategies-llm-understanding/)
- [Atlan — LLM context window limitations 2026](https://atlan.com/know/llm-context-window-limitations/)
- [DevToolKit — LLM context windows 2026](https://www.devtoolkit.cloud/blog/llm-context-windows-explained-why-size-matters)

**Wizard UX:**
- [NN/G — Wizards: Definition and design recommendations](https://www.nngroup.com/articles/wizards/)
- [Stef Walter — The Wizard Anti-Pattern](http://stef.thewalter.net/installer-anti-pattern.html)
- [NN/G — Modes in user interfaces](https://www.nngroup.com/articles/modes/)

**SwiftUI / Compose:**
- [ProAndroidDev — SwiftUI vs Jetpack Compose](https://proandroiddev.com/swiftui-vs-jetpack-compose-by-an-android-engineer-6b48415f36b3)
- [QuickBird Studios — SwiftUI vs Compose](https://quickbirdstudios.com/blog/swiftui-vs-android-jetpack-compose/)

---
*Pitfalls research for: pi.dev TUI extension producing LLM-consumable mobile app specs*
*Researched: 2026-04-17*
