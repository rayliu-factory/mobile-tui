# Feature Research

**Domain:** Terminal-native wizard+canvas TUI for authoring mobile app specs (ASCII wireframes + YAML-frontmatter Markdown + Maestro/Detox flows) — a pi.dev TypeScript extension
**Researched:** 2026-04-17
**Confidence:** MEDIUM — Core category is an intersection of three well-researched domains (TUI frameworks, wireframe tools, spec-driven LLM codegen). Direct competitors (terminal wireframe editors like ByteDesign, Mockdown, BareMinimum) exist but none combine all four concerns (wizard intake + canvas edit + spec schema + test generation). Feature expectations are solidly grounded in adjacent categories; the unknown is which features matter most when combined.

---

## Feature Landscape

Seven sub-domains from the question, each categorized as **Table Stakes / Differentiator / Anti-Feature**.

### 1. Guided Intake / Wizard (getting from "blank page" to a skeleton)

#### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Single-prompt app description at the start | Every AI-era wireframe tool (Uizard Autodesigner, Galileo/Stitch, v0) accepts a short natural-language product idea as seed input | SMALL | 1-2 sentence "what does this app do" free-text field; piped to LLM to propose screen list |
| Ordered linear progression with back-step | Wizards must be interruptible and reversible; losing progress on step 4 because you can't amend step 2 is unforgiveable | SMALL | `[Back] [Next] [Skip]` footer controls; each step writes to the spec file immediately so Ctrl+C is safe |
| Question-per-screen for primary user flow | PRD templates universally require "describe the user journey" as the backbone of screens | SMALL | Ask "What's the first thing a user does?" then "Then what?" for 3-7 steps |
| Screen list confirmation + edit before wireframing | Users need to see "Login, Home, Detail, Profile" and edit before the tool commits to ASCII drafts | SMALL | Editable list view after LLM proposal; rename / add / delete / reorder |
| Skip-to-canvas escape hatch | Power users will resent being forced through 12 questions when they want to free-edit | SMALL | "Skip wizard" option at any step; lands in canvas with current partial spec |
| Progress indicator (step 3 of 8) | Basic wizard UX — users need to know how much is left | SMALL | Header line: `Intake ━━━━━━━━━━━━ 3/8` |

#### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Question ordering tuned for mobile-native specs (nav pattern → screens → data → auth → states) | Generic wizards ask "features" then "screens"; mobile apps work better starting with nav shape (tab bar vs. stack vs. drawer) because it gates screen layout | SMALL | Fixed ordered playbook: (1) one-liner, (2) primary user, (3) nav pattern, (4) 3-7 screens, (5) auth yes/no, (6) data entities, (7) offline/online, (8) platforms |
| Per-question "why we ask" hint | LLM-grade specs need information users don't know they should provide (e.g., "do you need push notifications" gates permissions block) | SMALL | Toggleable hint line per step: `? What's the nav pattern — affects every screen's chrome` |
| Live skeleton preview alongside wizard | Seeing the spec grow as you answer beats clicking Next into the void | MEDIUM | Split pane: left is question, right is currently-materialized spec outline |
| LLM-assisted fill with manual override | One keypress asks the LLM to propose an answer based on prior answers; user edits and confirms | MEDIUM | `[f] fill with AI` on each free-text question; pi.dev extension API supports this directly |
| Mobile-specific defaults baked in | Wizard knows to ask about Dynamic Island, App Intents, Android back-button behavior, notification permissions, haptics — things generic tools don't ask | SMALL | Fixed decision tree; only ask iOS-specific questions when target includes SwiftUI |

#### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Infinite branching wizard ("if yes, ask 5 more questions") | Thorough-seeming | Users abandon at the third nested branch; blows up step count; hard to test | Cap intake at 8-10 questions; push complexity to canvas mode |
| Non-linear wizard ("jump to any step") | "Flexibility" | Defeats the point of a wizard; if you want nonlinear editing, you're in canvas mode already | Two clear modes: linear wizard OR free canvas. No hybrid |

---

### 2. Canvas / Editor Affordances

#### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Keyboard-only navigation (no mouse required) | Terminal tools must be keyboardable; mouse support is nice-to-have, never required | SMALL | Vim-ish bindings: `hjkl` pane, `j/k` list, `gg/G` jump, `:` command mode; printed cheatsheet |
| Multi-pane layout (nav tree + editor + preview) | Every canvas editor — VS Code, tmux, pi.dev itself — uses this; users expect to see structure and detail simultaneously | MEDIUM | Three-pane default: screens list (left) / current-screen editor (center) / rendered wireframe preview (right) |
| Pane focus/switch keybinding | Moving between panes without reaching for mouse | SMALL | `Tab` / `Shift+Tab` or `Ctrl+h/l` |
| Persistent state across save-quit-reopen | Spec IS the state (per PROJECT.md) — reopening the tool on the same file lands at the last-edited screen | MEDIUM | Write "last-edited screen / last-focus pane" to a tiny sidecar `.mobile-tui.state.json` OR infer from cursor-encoded spec |
| Undo/redo within session | Table stakes for any editor; users make typos | SMALL-MEDIUM | In-memory stack of spec mutations; `u` / `Ctrl+r` |
| Screen-level zoom — focus single screen full-terminal | Comparing the spec's full context is useful; sometimes you need to work on one screen's wireframe at 100% terminal width | SMALL | `z` to zoom-to-current-screen; `q` / `Esc` returns to multi-pane |
| Save on exit + save on timer | Users will Ctrl+C and expect state on disk | SMALL | Debounced autosave on every mutation; explicit `:w` command |
| Command palette | All keyboard-driven editors — Helix, VS Code, pi.dev — expose one; users need discoverability | MEDIUM | `Ctrl+p` or `:` opens fuzzy-finder for commands (add screen, rename, set nav pattern, generate tests, export…) |

#### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Canvas mode reads the spec file as ground truth | Reopens spec → reconstructs full canvas; no hidden state, no "where's my work?" surprises | MEDIUM | Parser round-trips Markdown + YAML → in-memory model → Markdown + YAML with zero drift |
| Live ASCII wireframe preview that re-renders on edit | Editing the component tree of a screen updates the 40-line wireframe in the adjacent pane instantly | MEDIUM | Component tree → ASCII renderer; text-change event triggers re-render |
| Focus screen next-to-spec-text pane | Shows wireframe + Markdown spec for one screen simultaneously; mental model match with what an LLM will ingest | SMALL | Optional two-pane layout (wireframe left / spec Markdown right) |
| Diff-view vs. last commit | Git-backed state means showing "what changed since HEAD" is free value; users edit spec, see diff, commit confidently | MEDIUM | `git diff` subprocess; render with syntax highlight in a pane |
| In-canvas wizard re-entry | `:wizard screen` re-runs intake for a single screen when user realizes they skipped states | SMALL | Reuses wizard engine with scope=one-screen |

#### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Mouse-driven drag-drop of components | "Canvas" implies direct manipulation | Terminal mouse support is fragile across terminals (iTerm vs. kitty vs. Windows Terminal); contradicts "terminal-native" core value | Keyboard-driven component insert (pick from list, append) |
| WYSIWYG pixel layout | Users asking for "visual" wireframes | Entire point of the tool is textual wireframes; if they want Figma, tell them to use Figma | ASCII-only; wireframes are the artifact, not a stepping stone to one |
| Animations / transitions preview | "We need to see it move" | Not expressible in ASCII; adds complexity without artifact value | Capture transitions as spec metadata (e.g. `transition: slide-right`) for the LLM consumer |

---

### 3. ASCII Wireframe Features

#### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Component library with common mobile primitives | Every wireframe tool ships button/input/list/card; ByteDesign and Wiretext ship exactly this lexicon for ASCII | MEDIUM | Support at minimum: TabBar, NavBar, Button, TextInput, List, ListItem, Card, Image placeholder, Icon placeholder, Divider, Toggle, SegmentedControl, Modal frame, Sheet frame |
| Device-frame chrome around wireframe | Users see "phone" context (status bar, notch, home indicator) and immediately recognize "mobile screen" vs. generic box | SMALL | Toggleable box-drawing frame: `┌─iPhone─┐` top, `└─[home]─┘` bottom; include status bar line with `9:41 ●●●● 100%` |
| ~40-line per-screen depth (per PROJECT.md) | The "shareable good" core value demands actual layout fidelity, not 5-line sketches | MEDIUM | Wireframe renderer targets 38-44 line output for a 375×812 equivalent at 1 line ≈ 20pt |
| Copy text rendered inline | Seeing real button labels, headings, microcopy is what makes wireframes useful to a dev | SMALL | Each component node carries a `text` / `label` field; renderer places it in the ASCII box |
| State variants per screen (empty, loading, error, success) | Mobbin, Smashing, and most UX literature treat non-happy-path states as mandatory, not optional | MEDIUM | Per-screen sub-variants: `states: [content, empty, loading, error]` each with its own wireframe |
| Wireframe exports as raw text (copy to clipboard) | Sharing wireframes in Slack, PRs, issues is the dominant distribution path for text artifacts | SMALL | `:yank wireframe` or `:export screen.txt` |

#### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Deterministic ASCII renderer from component tree | Renderer is pure function (tree → ASCII); same input → same output; diffs are meaningful; LLMs can round-trip | MEDIUM-LARGE | Custom layout engine: flex-ish linear layouts, fixed header/footer, proportional lists. No HTML, no external |
| Component-tree edit mode (not pixel-push) | User edits semantic components (`add Button at index 2`), renderer produces ASCII; other ASCII tools have you draw lines character-by-character | MEDIUM | JSON/YAML component tree in spec; commands like `:add button "Sign in" after header`; renderer is downstream |
| Per-component state annotation ("this list empty state shows onboarding card") | LLM code consumers need to know what renders in each state; most tools show only the happy path | SMALL | Each component can declare `visible_when: [content, error]` or similar; state-switcher key `s` cycles the preview |
| Device-size variants (iPhone SE vs. Pro Max, Pixel 8a vs. foldable) | Responsive preview is table stakes in Figma; none exist for ASCII | MEDIUM | Predefined device widths in characters; `:device iphone-se` / `pixel-8a` / `foldable-open`; renderer reflows |
| Annotated wireframes (numbered callouts) | Devs sharing wireframes add "①/②/③" with notes; this is how wireframes become spec documents | SMALL | Support `<1>` marker on any component → rendered as `①` with auto-generated legend below the frame |
| Dark-mode / light-mode variants preview | ASCII doesn't have color, but box-drawing character weight can signal contrast (light uses `─`, dark uses `━`), making dark-mode assumptions explicit | SMALL | Optional per-screen theme toggle in preview |
| ASCII accessibility annotations | Show 44×44pt touch-target bounds, tab order numbering, reading order — things Figma plugins charge money for | MEDIUM | Overlay mode: dimensions marked on buttons; `a11y: { label, order }` fields in component |
| Safe-area markers | iOS/Android safe areas are a frequent bug source; wireframe shows the safe-area rectangle explicitly | SMALL | Dotted line inset to indicate safe area; pragmatic for SwiftUI/Compose consumers |

#### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Freeform-draw ASCII (like Mockdown / asciiflow) | "Let me draw!" | Defeats deterministic round-trip; produces wireframes an LLM can't cleanly parse; loses structure needed for codegen | Component-tree-only authoring; renderer is the artist |
| Emoji-heavy component rendering | "More expressive!" | Breaks monospace alignment in many terminals; unreliable width; Markdown renderers vary | Stick to box-drawing + ASCII + a small approved Unicode set (arrows, bullets) |
| Pixel-perfect fidelity to SwiftUI/Compose rendering | "It should look exactly like the final UI" | False precision: wireframes set expectations the final UI can't meet; misleads stakeholders | Explicit "this is a wireframe, not a mockup" header baked into every export |

---

### 4. Spec Schema Features

#### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Screen registry (id, name, purpose) | Every PRD template opens with a screen inventory | SMALL | YAML frontmatter: `screens: [{id, name, purpose}]` |
| Navigation graph (edges, transition type, back behavior) | Android Navigation Component and SwiftUI `NavigationStack` both formalize this; LLM can't generate correct nav code without it | MEDIUM | `navigation: { from, to, trigger, transition, back_to }` |
| Data models (entities, fields, types, relationships) | Per PROJECT.md active requirement | SMALL-MEDIUM | Simple type system: `string | number | boolean | date | enum | [T] | ref<Entity>` |
| Per-screen state (local UI state, derived state, data needs) | Per PROJECT.md active requirement | SMALL | `state: { local: [...], fetches: [...], derives: [...] }` per screen |
| Interaction list per screen (what happens on tap of each button) | An LLM code-generating without this will invent behaviors; bridge between wireframe and logic | SMALL | `interactions: [{on: tap, target: <componentId>, action: navigate/mutate/api/…}]` |
| API call declarations (endpoint, method, request, response shape) | Concrete enough to generate typed clients; matches shadcn/ui-with-DhiWise pattern of structured data flow | MEDIUM | `apis: [{name, method, path, request, response}]` — referenced from screen interactions |
| Permissions inventory (notifications, camera, location, biometrics, contacts) | Mobile-specific; iOS and Android both require explicit declarations; LLM will produce broken builds without them | SMALL | `permissions: [{name, rationale, platforms: [ios|android]}]` |
| Version / schema field | Schema will evolve; consumers need to know which version they're reading | SMALL | `spec_version: "1.0"` at top of frontmatter |

#### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Cross-reference validation (link-checks between sections) | Spec says "on tap, navigate to `Detail`" — validator ensures `Detail` exists in `screens` | MEDIUM | Runs on save; surfaces inconsistencies; `:check` command |
| Design tokens section (colors, spacing, typography, radii) | W3C design-tokens spec went stable in 2025; SwiftUI/Compose both consume token files natively | SMALL | `tokens: { color: {...}, spacing: {...}, type: {...} }`; lineage clear in spec |
| Accessibility roles and labels per component | WCAG 2.2 AA compliance is non-trivial to retrofit; specifying at spec time avoids rework | SMALL | Per-component `a11y: { role, label, traits, minTargetPt: 44 }` |
| State-machine per screen (formal statechart, XState-compatible) | Complex screens (multi-step form, checkout) are naturally state machines; formal spec beats prose | MEDIUM | Optional `state_machine: { initial, states, transitions }` per screen; statechart-subset |
| Target-framework hints (SwiftUI-specific, Compose-specific) | Spec is framework-agnostic core + two concrete hint sections for the two native stacks | SMALL | `hints: { swiftui: {...}, compose: {...} }` — optional overrides where one platform differs |
| Platform-parity checker | Warns when spec says something only implementable on iOS (e.g., Dynamic Island) without an Android fallback | SMALL | Runs on save; warns, doesn't block |
| Derived "glossary" / "component inventory" auto-generated | Spec's reusable components (e.g., `<PrimaryButton>`) listed and back-referenced | SMALL | Extract on save; append to spec output |
| Embedded decision log | Why is nav a tab bar and not a drawer? Spec rots without the why; decisions in frontmatter keep rationale discoverable | SMALL | `decisions: [{what, why, alternatives_rejected}]` |

#### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Full OpenAPI spec embedded | "Specify backend too!" | Backend isn't in scope; spec balloons; forces backend decisions too early | Reference external OpenAPI file by path; keep spec's API section lightweight |
| Database schema / migrations | "For completeness" | Not the mobile dev's problem; invites scope creep into backend territory | Stop at data-model level; let the LLM generate whatever persistence the app needs |
| Business metrics / analytics events in v1 | "PMs need this" | Important but not mobile-spec-critical; can be added as an optional section later | Leave hook for `analytics: []` in schema but don't force fill |

---

### 5. LLM-Handoff Features

#### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Single copyable "context block" for the whole spec | Users paste this into Claude / pi / Cursor; must be one artifact, not a directory archaeology project | SMALL | Spec file is already that; command `:copy spec` dumps to clipboard |
| Target framework selector (SwiftUI / Compose / both) | LLM output quality hinges on framing the target explicitly | SMALL | `target: [swiftui, compose]` in frontmatter; ties into hint sections |
| Clear machine-readable sections | YAML frontmatter + fenced Markdown sections (`## Screens`, `## Navigation`) — no prose-only sections LLM has to guess at | SMALL | Fixed section order; template-enforced |

#### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Built-in prompt scaffolds ("Build this screen in SwiftUI" / "…in Compose") | One keystroke produces a prompt wrapping the relevant spec subset; aligns with 2026 "context engineering" best practices (Addy Osmani) | SMALL | `:prompt screen Detail swiftui` → writes scaffolded prompt to clipboard or `prompts/` dir |
| Per-screen context packing (subset of spec + referenced components + nav edges touching this screen) | Full spec doesn't fit into a "build one screen" task; per-screen subset is the unit an LLM can cleanly execute | MEDIUM | Generator walks the graph; outputs only the relevant slice |
| Retrieval hints (spec declares "consult Apple HIG for navigation, Material 3 for elevation") | Tells the LLM where to ground; avoids hallucinated APIs | SMALL | Optional `references: [...]` list in frontmatter |
| "Build this screen" vs. "Build the whole app" vs. "Build tests only" prompt variants | Different handoff granularities for different workflows | SMALL | Three commands; each emits a different scaffold |
| LLM-agnostic output (no assumptions about Claude vs. GPT) | Spec consumers are "any LLM"; format avoids model-specific tags | SMALL | Plain Markdown + YAML; no `<|im_start|>` or equivalent |
| Auto-generated per-screen acceptance criteria | LLM-built code needs a "how do I know it's done" contract; extracted from state + interactions | MEDIUM | Emit `acceptance:` section per screen in spec |
| Spec "freshness" / version marker for LLM feedback loop | When dev tweaks spec and re-asks LLM, having a `updated_at` / hash helps LLM recognize context change | SMALL | Frontmatter `updated_at`, content hash of spec |

#### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Extension directly calls an LLM to produce app code | "One-click generate!" | Explicitly out of scope per PROJECT.md; dev reviews spec first, then hands off to LLM of their choice | Scaffolded prompt is the artifact; dev owns the LLM call |
| Fine-tuning / training data export | "Build a dataset of specs" | Off-mission; privacy and ownership concerns | Leave specs as files; the ecosystem does whatever it wants |
| Opinionated Cursor/Claude/Cline-specific output | "Optimize for my favorite tool" | Locks the spec into a workflow; PROJECT.md says "LLM of their choice" | Universal Markdown + YAML; user appends tool-specific prefix if they want |

---

### 6. Test Generation Features

#### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Generate Maestro YAML flows | Per PROJECT.md active requirement | MEDIUM | From nav graph + interactions: one `launchApp` + tap-by-tap flow per user journey |
| Generate Detox JS flows | Per PROJECT.md active requirement | MEDIUM | Same source, different emitter; JS/Jest structure |
| Tap-target inference from wireframe components | Maestro Studio's killer feature: click screenshot element → generated command. Our equivalent: component → tap selector | SMALL-MEDIUM | Each component with an id emits a testId hint; flow templates reference it |
| "Happy path" flow auto-generated per primary user journey | Table stakes — users expect a sensible default flow to exist without hand-authoring | MEDIUM | Walk nav graph from entry to terminal screen; emit linear flow |

#### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Assertion inference (on Detail screen, assert title label exists) | Beyond taps — assertions catch regressions; derived from state data on each screen | MEDIUM | Each screen's `assertions: [...]` auto-populated from state shape; editable |
| State-variant flows (empty-state flow, error-state flow) | Testing non-happy-path is where tests earn their keep; most codegen tools emit only happy paths | MEDIUM | Generate a flow per state variant; stub responses where needed |
| Flow test IDs round-trip into component spec | Spec declares `testId: "sign-in-btn"` → emitted into both SwiftUI `accessibilityIdentifier` hint and Maestro selector | SMALL | Single source of truth for test IDs; no drift |
| Per-flow "why this test exists" comment | Generated tests have docstrings referencing spec section; when tests fail, dev jumps back to spec | SMALL | Comment header in emitted YAML/JS |
| Snapshot of expected nav stack per step | Maestro doesn't inherently assert nav stack; generating assertions against expected screen post-tap catches broken routes | MEDIUM | `- assertVisible: "DetailScreen"` after each navigation |
| Parallel Maestro + Detox emission (dev picks framework, spec supports both) | Most teams pick one; supporting both without duplicating authoring is our angle vs. single-framework tools | MEDIUM | One internal flow IR → two emitters |
| Flow preview in canvas before export | See the generated flow next to the wireframe; trust it before handing to CI | SMALL | Fourth pane or overlay: current flow's YAML |

#### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| XCUITest / Espresso direct emission in v1 | "Native test frameworks!" | Double maintenance burden; Maestro/Detox chosen because they're framework-agnostic and LLM-friendly YAML/JS | Stop at Maestro + Detox; v2 problem if ever |
| Visual regression test generation (screenshots) | "Completeness" | Wireframe tool shouldn't emit pixel baselines; requires runtime not authoring | Out of scope; that's a test runner's job |
| Running the tests from the TUI | "Close the loop!" | pi.dev extension has no device access; execution belongs to CI / Maestro CLI | Emit files, user runs `maestro test flows/` |

---

### 7. Collaboration / Sharing

#### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Plaintext / Markdown export | Entire artifact is already plaintext; share is "commit and point at the file URL in the PR" | TRIVIAL | Already how it works |
| Single-file output | One `spec.md`, not a tree — easy to attach, share, diff, review | SMALL | Enforced by design; referenced assets go in sibling files |
| Git-friendly format (LF-only, stable ordering, no trailing whitespace) | Diffs must be reviewable; unstable YAML key ordering wrecks PR review | SMALL | Emit YAML with stable key order; LF; trim trailing space |

#### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Plain-ASCII wireframe export (just the `~40-line` block) | Drop into Slack/GitHub issue/email with zero tooling; the wireframe alone is the shareable unit | SMALL | `:export wireframe --screen Detail` writes `detail.wireframe.txt` |
| Rendered Markdown-to-HTML export (single file) | For stakeholders who won't read raw Markdown | SMALL | `:export html` with inline CSS, wireframe in `<pre>` |
| PR-ready diff view (inside TUI) | Reviewers sit in terminal too; showing "what changed since HEAD" in the canvas mirrors GitHub PR review | MEDIUM | `:diff HEAD` renders a syntax-highlighted diff pane |
| Spec linter with shareable report | "Here are the 3 things this spec is missing" is a great review aid | MEDIUM | `:lint` emits a Markdown report of warnings/errors |
| Multi-screen "flow sheet" export (several wireframes side-by-side as ASCII grid) | Designers share flow sheets; ASCII equivalent is 3-4 wireframes in a row with arrows between them | MEDIUM-LARGE | `:export flow <name>` composes multiple wireframes with connectors |

#### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Multi-user live cloud collaboration | "Figma for specs!" | Explicitly out of scope per PROJECT.md; breaks git-as-state model; introduces auth, servers, privacy | Git IS the collaboration. PR workflow. That's it |
| Review comments inside the spec tool | "Comment threads on wireframes!" | Same as above — reintroduces cloud state | Use PR/issue comments in GitHub/GitLab referencing line numbers |
| Share-link URLs (cloud-hosted spec view) | "Link to spec without git" | Requires hosting, TOS, privacy, moderation | Users paste the Markdown in a gist or put it in their repo |
| PDF export | "Stakeholders want a PDF" | Fidelity loss; monospace fonts don't always embed cleanly; wireframes are designed for terminal view | Markdown → HTML → user's browser "Save as PDF" if truly needed |
| SVG wireframe export | "Visual parity!" | Defeats ASCII-only artifact identity; requires font embedding; breaks the text-is-the-artifact value prop | Plaintext is the export; consumers can use a monospace SVG lib themselves |

---

## Feature Dependencies

```
[Spec schema: screens list]
    └──required-by──> [Canvas mode] (need something to list in left pane)
    └──required-by──> [Wizard output] (skeleton ends here)
    └──required-by──> [Navigation graph] (edges reference screen IDs)

[Canvas mode]
    └──requires──> [Spec-read: parse Markdown+YAML → model]
    └──requires──> [Spec-write: serialize model → Markdown+YAML]
    └──requires──> [ASCII renderer: component tree → 40-line block]

[ASCII renderer]
    └──requires──> [Component library (Button/Input/List/Card/TabBar/...)]
    └──required-by──> [Live preview pane]
    └──required-by──> [Wireframe export]
    └──required-by──> [Flow-sheet export]

[Navigation graph]
    └──required-by──> [Maestro flow generation]
    └──required-by──> [Detox flow generation]
    └──required-by──> [Per-screen prompt scaffolds] (knows what screens lead here)

[Interactions per screen]
    └──required-by──> [Maestro/Detox tap sequences]
    └──required-by──> [Acceptance criteria generation]

[Component testId field]
    └──required-by──> [Maestro/Detox selector emission]
    └──enhances──> [SwiftUI accessibilityIdentifier hint]

[State variants (empty/loading/error)]
    └──enhances──> [ASCII renderer] (renders per variant)
    └──required-by──> [State-variant test flows]

[Wizard mode]
    └──requires──> [Spec-write]
    └──enhances──> [Canvas mode] (wizard writes skeleton that canvas extends)

[Diff view]
    └──requires──> [Git subprocess invocation]
    └──enhances──> [Collaboration via PR]

[LLM-fill in wizard]
    └──requires──> [pi.dev extension LLM call API]
    └──enhances──> [Wizard mode]

[Design tokens]
    └──enhances──> [ASCII renderer] (dark/light preview)
    └──enhances──> [Target framework hints]

[State machine per screen]
    └──requires──> [Per-screen state]
    └──enhances──> [Test flow coverage] (emit a flow per transition)
```

### Dependency Notes

- **Spec read/write is foundational — almost everything depends on it.** If the parser/serializer drifts, every other feature (canvas, wizard re-entry, flow gen) is unreliable. Build this first, harden with round-trip tests.
- **ASCII renderer gates the "core value" check.** Until the renderer produces "shareable good" wireframes, no amount of schema work matters. Should ship by end of phase 1 with a realistic sample.
- **Navigation graph unlocks test generation.** Can't emit useful Maestro flows without knowing how screens connect.
- **testId as single-source shared across component, renderer, and flow emitter.** Avoid duplicated IDs; the component in the spec owns it.
- **Canvas mode depends on wizard mode only for convenience, not function.** Canvas should be operable against a spec authored by hand (someone else's, or imported). Dependency is one-way.

---

## MVP Definition

### Launch With (v1)

Minimum to validate the core value ("wireframes good enough to share") and the full spec→test pipeline.

- [ ] **Spec read/write (parse + serialize Markdown+YAML)** — foundational; everything rides on this
- [ ] **Spec schema v1** (screens, navigation, data models, per-screen state, interactions, APIs, permissions)
- [ ] **Wizard mode with 8 fixed questions** (idea → nav pattern → screens → auth → data → offline → target platforms → done)
- [ ] **Canvas mode with 3-pane layout** (screens list / editor / wireframe preview)
- [ ] **ASCII component library** (12-15 primitives: TabBar, NavBar, Button, TextInput, List, ListItem, Card, Image, Icon, Divider, Toggle, SegmentedControl, Modal, Sheet)
- [ ] **ASCII renderer** producing ~40-line wireframes per screen with device-frame chrome
- [ ] **State variants per screen** (content, empty, loading, error) with per-variant wireframes
- [ ] **Keyboard navigation + command palette** — table stakes for any canvas tool
- [ ] **Undo/redo within session**
- [ ] **Maestro YAML flow generation** (happy path per user journey, tap sequences from interactions)
- [ ] **Detox JS flow generation** (same source, parallel emitter)
- [ ] **Prompt scaffold commands** (`:prompt screen X swiftui` / `compose` / `tests`)
- [ ] **Wireframe export as plaintext** (per-screen, to clipboard or file)
- [ ] **Packaged as pi.dev TypeScript extension** (per PROJECT.md)

### Add After Validation (v1.x)

Triggered by community feedback on the initial extension publish.

- [ ] **Cross-reference validator / `:check`** — when users file bug reports about "my nav edge pointed at a nonexistent screen," validation earns its keep
- [ ] **Diff view vs. HEAD** — triggered when users ask "what did I change?"
- [ ] **Device-size variants** (iPhone SE vs. Pro Max, Pixel vs. foldable) — triggered when community asks for "responsive" wireframes
- [ ] **Annotation markers (`①`/`②`)** — triggered when users start asking for "how do I explain *that part* of the wireframe"
- [ ] **Design tokens section** in spec — triggered when consumers want color/spacing parity with SwiftUI/Compose code
- [ ] **Accessibility annotations** (role, label, min target size) — triggered when an accessibility-minded consumer complains about missing a11y specs
- [ ] **Spec linter report export** — triggered when specs get big enough that users want a "health check"
- [ ] **LLM-assisted fill in wizard** — nice-to-have; probably wait for the wizard to feel stable first
- [ ] **In-canvas wizard re-entry per screen** — triggered when users realize retroactively they skipped a screen's state details

### Future Consideration (v2+)

Gated by clear product-market fit and observed demand.

- [ ] **State machine per screen (XState subset)** — adds spec complexity; defer until users demand formal state modeling
- [ ] **Flow-sheet multi-screen export** (ASCII grid with arrows) — expensive to render well; requires real layout engine; wait for demand
- [ ] **Assertion inference beyond "screen visible"** — property-level assertions require deeper data binding; defer
- [ ] **Target-framework hints (`hints.swiftui` / `hints.compose`)** — requires observing real spec→code drift before knowing what to encode
- [ ] **Acceptance criteria auto-generation** — valuable but easy to produce bad output; needs good heuristics

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Spec read/write (parser + serializer, round-trippable) | HIGH | MEDIUM | P1 |
| Spec schema v1 (all required fields) | HIGH | MEDIUM | P1 |
| ASCII component library (12-15 primitives) | HIGH | MEDIUM | P1 |
| ASCII renderer producing ~40-line wireframes | HIGH | HIGH | P1 |
| Wizard mode (8 fixed questions) | HIGH | MEDIUM | P1 |
| Canvas mode (3-pane layout) | HIGH | MEDIUM | P1 |
| State variants per screen (content/empty/loading/error) | HIGH | MEDIUM | P1 |
| Maestro YAML generation | HIGH | MEDIUM | P1 |
| Detox JS generation | MEDIUM | MEDIUM | P1 |
| Keyboard navigation + command palette | HIGH | MEDIUM | P1 |
| Undo/redo | MEDIUM | LOW | P1 |
| Wireframe plaintext export | HIGH | LOW | P1 |
| Prompt scaffold commands | HIGH | LOW | P1 |
| Cross-reference validator | MEDIUM | MEDIUM | P2 |
| Diff view vs. HEAD | MEDIUM | MEDIUM | P2 |
| Device-size variants | MEDIUM | MEDIUM | P2 |
| Design tokens section | MEDIUM | LOW | P2 |
| Accessibility annotations | MEDIUM | LOW | P2 |
| LLM-fill assist in wizard | MEDIUM | LOW | P2 |
| Wireframe annotations (numbered callouts) | LOW | LOW | P2 |
| In-canvas wizard re-entry | LOW | LOW | P2 |
| State machine per screen | LOW | HIGH | P3 |
| Flow-sheet multi-screen export | LOW | HIGH | P3 |
| Assertion inference beyond visible | LOW | HIGH | P3 |
| HTML export | LOW | LOW | P3 |

**Priority key:**
- P1: Must have for launch (validates core value or completes the pipeline)
- P2: Should have, add once P1 is shipped and stable
- P3: Nice to have, defer until product-market fit

---

## Competitor Feature Analysis

Picking the four closest analogs. Spotting where we overlap vs. differentiate.

| Feature | ByteDesign / Mockdown (ASCII wireframe editors) | Uizard / Galileo (AI wireframe to spec) | Maestro Studio (test authoring) | v0.app (AI app builder) | Our Approach |
|---------|-------------------------------------------------|------------------------------------------|----------------------------------|---------------------|--------------|
| Intake wizard | None (blank canvas) | Single-prompt autodesigner | Record from running app | Single-prompt → full app | 8-question guided wizard, mobile-specific |
| Canvas / editor | Freeform character grid (mouse-heavy) | Drag-drop WYSIWYG | Screenshot-click inspector | Chat-driven; no canvas | Keyboard-only 3-pane TUI with live wireframe preview |
| Wireframe fidelity | Low-fi ASCII, small (pixel/grid) | High-fi mockups (raster) | N/A | High-fi React components | High-fi ASCII, ~40 lines, device-framed |
| Structured spec output | None (just visual artifact) | Figma export + basic properties | YAML flow files only | React code directly | Markdown + YAML frontmatter — the spec IS the deliverable |
| Nav graph | None | Implicit in Figma frames | Recorded as flow steps | Implicit in generated routes | Explicit graph with edges, transitions, back behavior |
| Data models | None | Limited | None | Generated schema (Postgres/Drizzle) | First-class; entities, fields, relationships |
| State variants | None | Some (via manual frame creation) | None (runtime only) | Generated code paths | First-class per-screen (content/empty/loading/error) |
| Test generation | None | None | Interactive record-replay | None (not testing focused) | Maestro + Detox emission from nav + interactions |
| LLM handoff | None (output is visual) | Figma file — LLM-unfriendly | Flow file is the output | Output IS the app | Prompt scaffolds + spec chunks per screen |
| Terminal-native | Mockdown: web; ByteDesign: terminal-ish | Web | CLI + companion browser UI | Web | Pure TUI in pi.dev |
| State storage | None / local | Cloud-first | Local files | Cloud | Git-backed single file; spec IS the state |
| Target platforms | None | iOS/Android mockups; no codegen for native stacks | iOS/Android runtime | Web/React | SwiftUI + Jetpack Compose (framework-agnostic spec) |

**Where we win:**
- Only tool in the intersection: terminal-native + structured-spec output + native-mobile-stack-aware + test generation
- Only ASCII wireframe tool producing a spec a codegen LLM can consume directly
- Git-as-state + single-file output is friendlier to dev workflows than all cloud-based competitors
- Component-tree-driven ASCII beats freeform ASCII for deterministic re-rendering and LLM parsing

**Where we will be weaker:**
- Visual fidelity vs. Uizard / Galileo (intentional — "text is the artifact")
- Multi-user collaboration vs. Figma (intentional — out of scope)
- Breadth of target frameworks vs. v0.app (intentional — v1 native only)
- Installation friction vs. web tools (pi.dev extension, not a browser tab)

---

## Summary of Anti-Features (Consolidated)

Reinforcing PROJECT.md boundaries and adding more. Each has a reason and an alternative.

1. **WYSIWYG / GUI wireframing** — breaks terminal-native identity; use ASCII-only authoring (already in PROJECT.md)
2. **React Native / Flutter target generation** — v1 native only (already in PROJECT.md)
3. **Multi-user cloud collaboration / cloud drafts** — breaks git-as-state (already in PROJECT.md)
4. **Extension generates app code itself** — dev reviews spec first, LLM second (already in PROJECT.md)
5. **Shipping as a pi skill or standalone CLI** — TS extension is required (already in PROJECT.md)
6. **Freeform-draw ASCII (character-by-character)** — defeats deterministic round-trip; components only
7. **Mouse-driven drag-drop** — fragile terminal mouse support; keyboard-only
8. **Pixel-perfect SwiftUI/Compose preview in ASCII** — false precision; wireframes not mockups
9. **Animations / transitions preview** — inexpressible in ASCII; capture as metadata instead
10. **Infinite branching wizard** — hard to test and complete; cap at 8-10 questions
11. **Full OpenAPI spec embedded** — expands scope into backend; reference external file instead
12. **Database schema / migrations in spec** — backend problem, not mobile-spec problem
13. **Direct LLM invocation to produce app code** — explicitly out of scope
14. **Tool-specific output (Cursor-only / Claude-only formatting)** — breaks "LLM of their choice"
15. **XCUITest / Espresso direct emission (v1)** — Maestro/Detox already cover the need
16. **Visual regression / screenshot tests** — authoring tool, not a test runner
17. **TUI executes generated tests** — no device access in extension; stop at emit
18. **Mandatory multi-user review comments inside the tool** — use PR workflow
19. **Cloud share-links** — requires hosting, privacy, auth; git suffices
20. **PDF export** — font embedding issues; HTML export + browser Save-as-PDF if needed
21. **SVG wireframe export** — breaks text-is-the-artifact identity
22. **Emoji-heavy rendering** — breaks monospace alignment; stick to box-drawing + approved Unicode
23. **Non-linear wizard / jump-to-any-step** — if you want nonlinear, you want canvas
24. **Business metrics / analytics events embedded** — leave a hook but don't force
25. **Fine-tuning / training dataset exports** — off-mission, privacy concerns

---

## Sources

- [ByteDesign — AI ASCII Wireframe Designer](https://tsukimitei.github.io/ByteDesign/) — closest terminal-based ASCII-wireframe competitor; component library confirms table stakes lexicon
- [Mockdown — ASCII Wireframe Editor](https://www.mockdown.design/) — web-based but 20+ components show category standard
- [BareMinimum — Free AI ASCII Wireframe Generator](https://bareminimum.design/) — AI prompt → ASCII + shadcn/ui code output; handoff pattern reference
- [Wyreframe — ASCII to HTML/UI library](https://github.com/wickedev/wyreframe) — scene management + interaction DSL + responsive previews; influences differentiators
- [Wiretext skill listing](https://lobehub.com/skills/tommylower-skills-wiretext) — enumerates expected component primitives (button, input, select, checkbox, radio, toggle, table, modal, card, navbar, tabs)
- [Uizard](https://uizard.io/) and [Galileo AI / Google Stitch review (2026)](https://www.banani.co/blog/galileo-ai-features-and-alternatives) — intake wizard patterns, handoff format analysis
- [Uizard Review 2026](https://textify.ai/uizard-review-2026-ai-ui-design-tool/) — confirms text-to-multi-screen is table stakes in AI wireframe tools
- [v0.app (Vercel) 2026 guide](https://www.nxcode.io/resources/news/v0-by-vercel-complete-guide-2026) — agentic app-description → app code; closest in intent, different surface
- [Maestro documentation](https://docs.maestro.dev/) — YAML flow authoring canonical reference
- [Maestro Studio + Claude AI (Very Good Ventures)](https://verygood.ventures/blog/maestro-mcp-claude-mobile-ui-test-automation/) — AI-assisted test authoring patterns
- [Detox vs Maestro comparison (Panto AI)](https://www.getpanto.ai/blog/detox-vs-maestro) — YAML vs. JS tradeoffs for emission targets
- [Maestro E2E with React Native (Add Jam)](https://addjam.com/blog/2026-02-18/our-experience-adding-e2e-testing-react-native-maestro/) — real-world flow structure
- [pi-mono extensions documentation](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/extensions.md) — pi.dev TS extension API: `ctx.ui.custom()`, session persistence, TUI components
- [@mariozechner/pi-tui](https://www.npmjs.com/package/@mariozechner/pi-tui) — component inventory available to the extension (Text, Input, Editor, SelectList, Box, Container)
- [Extending Pi Coding Agent with Custom Tools and Widgets (JoelClaw)](https://joelclaw.com/extending-pi-with-custom-tools) — widget lifecycle and `requestRender()` patterns
- [Mobbin — Empty State UI Design](https://mobbin.com/glossary/empty-state) — empty-state categorization (informational / action-oriented / celebratory)
- [Smashing Magazine — Error states for mobile](https://www.smashingmagazine.com/2016/09/how-to-design-error-states-for-mobile-apps/) — error-state UX bar
- [Simple UI Problem: States — Loading, Error, Empty and Content](https://medium.com/trendyol-tech/simple-ui-problem-states-loading-error-empty-and-content-cbf924b39fcb) — confirms 4-variant baseline
- [A2UI by Google](https://github.com/google/A2UI) — LLM-friendly UI description format; confirms YAML-ish structured output is the direction
- [Design Tokens Community Group](https://www.designtokens.org/) — W3C design tokens spec (stable 2025.10)
- [Accessibility for Design Engineers: WCAG 2.2 Guide](https://inhaq.com/blog/accessibility-for-design-engineers-building-inclusive-uis.html) — 44×44pt / 48×48dp touch targets, tab order
- [Android Navigation deep links](https://developer.android.com/guide/navigation/navigation-deep-link) — canonical nav-graph schema with deep links
- [Expo Router common navigation patterns](https://docs.expo.dev/router/basics/common-navigation-patterns/) — stack/tab/modal patterns across frameworks
- [My LLM coding workflow going into 2026 (Addy Osmani)](https://medium.com/@addyosmani/my-llm-coding-workflow-going-into-2026-52fe1681325e) — context packing + prompt scaffold rationale
- [Context Engineering for LLM Apps](https://aishwaryasrinivasan.substack.com/p/context-engineering-for-llm-apps) — per-task context subsets vs. full-dump
- [FigJam AI + Figma First Draft](https://help.figma.com/hc/en-us/articles/18706554628119-Make-boards-and-diagrams-with-FigJam-AI) — comparable (but visual/cloud) AI wireframe intake
- [Structurizr DSL](https://docs.structurizr.com/dsl) — precedent for text-based structured spec authoring, model-driven multi-view generation
- [XState](https://xstate.js.org/) — statechart subset for per-screen state machines in spec
- [Mobile app PRD guidelines (MadAppGang)](https://madappgang.com/blog/mobile-app-prd-guidelines/) — traditional PRD structure that our schema covers in machine-readable form

---

*Feature research for: Terminal-native wizard+canvas TUI for mobile app specs — pi.dev TypeScript extension*
*Researched: 2026-04-17*
