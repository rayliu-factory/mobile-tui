# Architecture Research

**Domain:** pi.dev TypeScript TUI extension for authoring framework-agnostic mobile app specs
**Researched:** 2026-04-17
**Confidence:** HIGH on pi extension surface and general layering; MEDIUM on spec model details (to be validated during implementation); MEDIUM on round-trip strategy (well-known hard problem, proven tooling exists but edge cases will surface)

---

## 1. Standard Architecture

### System Overview

Seven layers, strict top-to-bottom dependency direction. **Lower layers never import from higher layers.** This is the spine that every phase must respect.

```
┌───────────────────────────────────────────────────────────────────────┐
│  L7  pi Integration Surface              (pi extensions API)          │
│      index.ts — default export (pi: ExtensionAPI) => void             │
│      Registers: /spec command, keybindings, session hooks, tool       │
├───────────────────────────────────────────────────────────────────────┤
│  L6  TUI Shell              (pi-tui components, ctx.ui.custom)        │
│      WizardShell  │  CanvasShell   │  SharedChrome (status, footer)   │
├───────────────────────────────────────────────────────────────────────┤
│  L5  Application State      (Editor: single store, two presentations) │
│      Editor (Zustand-style store)  │  Commands  │  Selection/Focus    │
├───────────────────────────────────────────────────────────────────────┤
│  L4  Emitters               (pure: Model → artifact string)           │
│      WireframeRenderer  │  MaestroEmitter  │  DetoxEmitter            │
├───────────────────────────────────────────────────────────────────────┤
│  L3  Serialization          (Model ⇌ file text, round-trip safe)      │
│      SpecParser │ SpecSerializer │ YAMLDoc (eemeli/yaml AST)          │
├───────────────────────────────────────────────────────────────────────┤
│  L2  Domain Model           (pure TypeScript types + invariants)      │
│      Spec, Screen, Wireframe, NavigationGraph, DataModel,             │
│      Entity, Field, StateVariant, Interaction, TestFlow               │
├───────────────────────────────────────────────────────────────────────┤
│  L1  Primitives             (ids, JSON-Pointer paths, Result<T,E>)    │
│      ComponentId, ScreenId, Path, validate helpers, error types       │
└───────────────────────────────────────────────────────────────────────┘
```

**Dependency rule:** L2 knows nothing about files. L3 knows nothing about TUI. L4 knows nothing about the store. L5 knows nothing about pi. L6 knows nothing about serialization. L7 is the only layer that imports from `@mariozechner/pi-coding-agent`.

This rule is enforceable with a single ESLint `no-restricted-imports` config per folder — worth doing on day one.

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Primitives (L1)** | Branded IDs, JSON-Pointer path type, `Result<T,E>`, small validators | `type ScreenId = string & { __brand }`; pure functions |
| **Spec Model (L2)** | In-memory tree: Spec → Screens/Wireframes/Nav/Data/Tests. Invariants (no dangling nav targets, no references to missing fields). | Plain TS types + factory functions + invariant checker. No classes with behavior. |
| **SpecParser (L3)** | File text → Spec. Accepts hand-edits, reports diagnostics with line/col. | Uses `eemeli/yaml` Document for frontmatter; a small markdown section parser for body. |
| **SpecSerializer (L3)** | Spec + original AST → file text. Round-trip preserving comments and author ordering. | Same `YAML.Document`; merge model deltas into AST instead of re-stringify. |
| **WireframeRenderer (L4)** | Wireframe AST (component tree for one screen) → ~40-line ANSI-free ASCII string. | Constraint-based box layout; pure function. |
| **MaestroEmitter (L4)** | Spec.TestFlow → Maestro YAML string. | Pure function; stable ordering. |
| **DetoxEmitter (L4)** | Spec.TestFlow → Detox `.test.js` string. Detox has no YAML — this is a JS codegen. | Template-based JS codegen, `by.id(...)`. |
| **Editor store (L5)** | Single source of truth for in-memory spec + cursor/selection + dirty flag + undo stack. Emits change events. | Zustand / custom reactive store; immer for patches. |
| **Commands (L5)** | All edits go through commands: `AddScreen`, `RenameScreen`, `AddField`, etc. Commands produce model patches. | Command pattern; each command = function + inverse for undo. |
| **WizardShell (L6)** | Linear intake UI. Owns local sub-wizard state (current step). Writes through commands. | `ctx.ui.custom()` overlay sequence. |
| **CanvasShell (L6)** | Keyboard-driven tabs: Screens, Nav, Data, Tests. Panes subscribe to store slices. | `ctx.ui.setWidget()` + custom editor component. |
| **pi Surface (L7)** | Registers `/spec` command, keybinding (e.g. `Ctrl+Shift+S`), `session_start` hook to load current spec, tool so LLM can query spec. | `pi.registerCommand`, `pi.registerShortcut`, `pi.on("session_start")`, `pi.registerTool`. |

---

## 2. Recommended Project Structure

```
mobile-tui/
├── package.json                # pi.extensions: ["./dist/index.js"]
├── tsconfig.json
├── src/
│   ├── primitives/             # L1 — ids, paths, Result type
│   │   ├── ids.ts
│   │   ├── path.ts             # JSON-Pointer helpers
│   │   └── result.ts
│   ├── model/                  # L2 — domain types + invariants
│   │   ├── spec.ts             # root Spec type + factory
│   │   ├── screen.ts
│   │   ├── wireframe.ts        # component-tree types
│   │   ├── navigation.ts
│   │   ├── data-model.ts       # Entity, Field, relationships
│   │   ├── state-variant.ts    # loading/empty/error per screen
│   │   ├── interaction.ts
│   │   ├── test-flow.ts
│   │   └── invariants.ts       # validateSpec(spec) → Diagnostic[]
│   ├── serialize/              # L3 — parse + serialize + round-trip
│   │   ├── parser.ts
│   │   ├── serializer.ts
│   │   ├── yaml-doc.ts         # wraps eemeli/yaml Document
│   │   ├── markdown-sections.ts
│   │   └── round-trip.test.ts
│   ├── emit/                   # L4 — pure renderers/emitters
│   │   ├── wireframe/
│   │   │   ├── layout.ts       # constraint solver for boxes
│   │   │   ├── render.ts       # tree → ASCII string
│   │   │   └── __snapshots__/  # golden files
│   │   ├── maestro/
│   │   │   └── emit.ts
│   │   └── detox/
│   │       └── emit.ts
│   ├── editor/                 # L5 — state + commands
│   │   ├── store.ts            # reactive store over Spec
│   │   ├── commands/           # one file per command
│   │   │   ├── add-screen.ts
│   │   │   ├── rename-screen.ts
│   │   │   └── ...
│   │   ├── undo.ts
│   │   └── diagnostics.ts      # live invariant check
│   ├── tui/                    # L6 — UI shells
│   │   ├── wizard/
│   │   │   ├── shell.ts
│   │   │   ├── steps/          # one file per wizard step
│   │   │   └── graduation.ts   # wizard → canvas handoff
│   │   ├── canvas/
│   │   │   ├── shell.ts
│   │   │   ├── panes/          # screens / nav / data / tests
│   │   │   └── keybindings.ts
│   │   └── shared/
│   │       ├── header.ts
│   │       └── footer.ts
│   └── index.ts                # L7 — pi extension entry
└── tests/
    ├── fixtures/               # golden spec files, hand-edited samples
    └── integration/            # full parse→edit→serialize tests
```

### Structure Rationale

- **One folder per layer** makes the dependency rule enforceable by lint config (`no-restricted-imports`).
- **`emit/` is sibling to `editor/`, not beneath it** — emitters must stay pure; keeping them out of the state-management folder prevents accidental coupling to the store.
- **Commands as individual files** — the canvas grows to ~30+ commands; folders keep diffs reviewable and let each command own its own test file.
- **`serialize/` colocated with its own `.test.ts` for round-trip** — round-trip regressions must fail CI loudly; keeping the test next to the code invites adding fixtures.
- **Wireframe has `__snapshots__/`** — visual regressions on ASCII output are caught only by golden files; this folder must be committed.

---

## 3. Spec Model (Canonical Entities)

### Concrete Type Hierarchy

```typescript
// L2 — src/model/spec.ts
export interface Spec {
  version: "1";               // schema version, for future migrations
  meta: {
    name: string;
    platform: ("ios" | "android")[];  // targets this spec promises to serve
    createdAt: string;
    updatedAt: string;
  };
  dataModel: DataModel;       // shared across screens
  screens: Screen[];          // order is author-meaningful
  navigation: NavigationGraph;
  tests: TestFlow[];
}

export interface DataModel {
  entities: Entity[];
}

export interface Entity {
  id: EntityId;
  name: string;               // e.g. "User"
  fields: Field[];
  relationships: Relationship[];
}

export interface Field {
  id: FieldId;
  name: string;
  type: FieldType;            // "string" | "int" | "bool" | "date" | { ref: EntityId }
  required: boolean;
  notes?: string;
}

export interface Relationship {
  from: EntityId;
  to: EntityId;
  kind: "one-to-one" | "one-to-many" | "many-to-many";
  name: string;               // e.g. "posts"
}

export interface Screen {
  id: ScreenId;
  name: string;               // e.g. "Login"
  purpose: string;            // one-line intent
  wireframe: Wireframe;       // default/happy-path variant
  variants: StateVariant[];   // loading, empty, error, custom
  interactions: Interaction[];
  localState: LocalStateDecl[];
  bindings: DataBinding[];    // which entity fields this screen reads/writes
}

export interface Wireframe {
  root: ComponentNode;        // always a Column or Screen container
}

// Flat catalog, adjacency-list layout — modeled on A2UI
export type ComponentNode =
  | { id: string; type: "Column"; children: ComponentNode[]; align?: Align; gap?: number }
  | { id: string; type: "Row";    children: ComponentNode[]; align?: Align; gap?: number }
  | { id: string; type: "Text";   text: string; style?: TextStyle }
  | { id: string; type: "Button"; label: string; variant?: "primary"|"secondary"|"text"; actionId?: InteractionId }
  | { id: string; type: "TextField"; label: string; bindsTo?: Path; placeholder?: string }
  | { id: string; type: "Image";  source: string; alt: string }
  | { id: string; type: "List";   itemTemplate: ComponentNode; bindsTo: Path }
  | { id: string; type: "Card";   child: ComponentNode }
  | { id: string; type: "Divider" }
  | { id: string; type: "Spacer"; size?: "sm"|"md"|"lg" };

export interface StateVariant {
  id: VariantId;
  kind: "loading" | "empty" | "error" | "custom";
  label?: string;             // for "custom"
  wireframe: Wireframe;       // override tree for this state
  trigger: VariantTrigger;    // condition that shows this variant
}

export interface Interaction {
  id: InteractionId;
  trigger: { componentId: string; event: "tap" | "longPress" | "submit" | "change" };
  effect:
    | { kind: "navigate"; to: ScreenId; transition?: NavTransition }
    | { kind: "mutate"; path: Path; value: unknown }
    | { kind: "call"; name: string; args?: Record<string, Path | unknown> };
}

export interface NavigationGraph {
  root: ScreenId;
  edges: NavEdge[];
}

export interface NavEdge {
  from: ScreenId;
  to: ScreenId;
  kind: "push" | "modal" | "replace" | "tab";
  backBehavior?: "pop" | "dismiss" | "none";
}

export interface TestFlow {
  id: TestFlowId;
  name: string;
  platforms: ("maestro" | "detox")[];
  steps: TestStep[];
}

export type TestStep =
  | { kind: "launch" }
  | { kind: "tap"; target: ComponentRef }             // ComponentRef = screenId + componentId
  | { kind: "input"; target: ComponentRef; text: string }
  | { kind: "assertVisible"; target: ComponentRef }
  | { kind: "assertText"; target: ComponentRef; text: string }
  | { kind: "wait"; ms: number };
```

### Entity Relationship Diagram

```
Spec
 ├── meta
 ├── DataModel
 │    └── Entity*
 │         ├── Field*
 │         └── Relationship*
 ├── Screen*
 │    ├── Wireframe (root: ComponentNode tree)
 │    ├── StateVariant*  (each has its own Wireframe)
 │    ├── Interaction*   (references ComponentNode.id + optional ScreenId)
 │    ├── LocalStateDecl*
 │    └── DataBinding*   (references Entity/Field)
 ├── NavigationGraph
 │    └── NavEdge*       (from: ScreenId → to: ScreenId)
 └── TestFlow*
      └── TestStep*      (references ScreenId + ComponentNode.id)
```

**Invariants the model must enforce** (L2 `invariants.ts`):

1. Every `NavEdge.from/to` resolves to an existing `Screen.id`.
2. Every `Interaction.trigger.componentId` exists in the screen's wireframe tree.
3. Every `TestStep.target` references a valid screen + component.
4. Every `DataBinding` field exists in the `DataModel`.
5. Every `Wireframe.root` ID is unique within that wireframe (IDs can repeat across wireframes).
6. `NavigationGraph.root` is a valid `ScreenId`.

These run on every `store.set` in dev builds, so invalid models are caught before they hit disk.

---

## 4. Round-Trip Serialization Strategy

This is the hardest problem in the whole system. The author edits the file by hand between runs; the tool must not clobber comments, reorder keys, re-indent, or lose inline markdown.

### The approach: keep the AST, mutate it, stringify from it

Not "parse to model → write model as YAML." Instead:

1. **Parse once:** load the file into a `YAML.Document` (from the `yaml` / eemeli npm package). The Document is a full AST with preserved comments, blank lines, key ordering, flow/block styles, and anchors.
2. **Project to model:** walk the AST and build the pure `Spec` value. This projection is **lossy by design** — comments and ordering stay in the AST, not the model.
3. **Edit the model:** all in-memory operations are on `Spec`.
4. **Merge back:** on save, *diff the new Spec against the original Spec* and apply the diff to the AST with targeted `doc.setIn(path, value)` / `doc.deleteIn(path)` calls. Unchanged subtrees are never touched, so their comments and formatting survive verbatim.
5. **Handle new nodes:** when an insertion is needed, place it at the end of its parent collection with a minimal stable format (block style, 2-space indent) and let the user re-flow manually if they want.

Key libraries:

- **`yaml`** (eemeli/yaml) — exposes `Document`, `doc.contents` (the AST), `doc.setIn([path], value)`, `doc.toString()`. This is the right backbone.
- **`enhanced-yaml`** — wraps `yaml` and does "source-preserving stringify" by aligning a new Document with the original source. Useful as a fallback library; the diff-and-apply strategy above is cleaner for a known schema.

### Markdown body

Frontmatter holds the structured Spec; the Markdown body holds the ASCII wireframes in fenced code blocks:

```markdown
---
# ... YAML Spec frontmatter ...
---

## Login screen

```ascii
┌────────────────────────┐
│  Login                 │
│  ┌──────────────────┐  │
│  │ Email            │  │
│  └──────────────────┘  │
│  ...                   │
```
```

The wireframe renderer owns those fenced blocks completely — they are **regenerated from the spec every save**. They are never hand-edited. A doc comment at the top of the file says so. If a user edits them, the tool reports a warning on next load ("wireframe out of date, regenerating from spec").

**Narrative markdown between wireframes** (section headers, author notes) is preserved verbatim. The serializer treats non-wireframe markdown spans as opaque blobs keyed by the preceding `## ScreenName` header.

### What we do NOT try to do

- Not trying to reconcile conflicting hand-edits to the YAML structure itself beyond "best effort parse with diagnostics." If the user adds a new field to an entity by hand, we pick it up — but if they restructure the YAML so it no longer parses as a Spec, we error out with a clear line/column diagnostic rather than "fixing" it.
- Not trying CRDT semantics. The spec is git-backed; merge conflicts are the user's problem (and `.md` + YAML conflicts are human-readable, so this is acceptable).
- Not preserving inline YAML comments that live *inside* a value we overwrite. If the user changes the model such that a value is replaced, comments attached to the replaced node are dropped. We warn on save.

### Round-trip test discipline

`src/serialize/round-trip.test.ts` must include:

- Parse → serialize with no model changes → byte-identical output.
- Parse → single-field edit → serialize → diff touches only that field + `updatedAt`.
- Parse hand-edited file with comments → make unrelated edit → serialize → comments preserved.
- Parse, clobber a user-added unknown key → warn surfaces in diagnostics.

Make these table-driven over a fixtures folder. Adding a fixture must be easier than debugging a round-trip regression.

---

## 5. Framework-Agnostic Spec → SwiftUI / Jetpack Compose Mapping

The spec must not embed SwiftUI `VStack` or Compose `Column` semantics. It names the intent; each target has a renderer that chooses the idiomatic widget.

### The shape: flat component catalog + JSON-Pointer bindings

Modeled directly on [A2UI](https://a2ui.org) and OpenUI's component registry pattern:

- Finite vocabulary of ~12 components (see `ComponentNode` union in Section 3).
- Layout expressed as `Column`/`Row`/`List`/`Card` with children; no absolute positioning.
- State bindings use JSON Pointers (`/users/0/name`) so the spec stays target-neutral.
- Styling uses semantic tokens (`variant: "primary"`, `style: "heading-1"`), never raw colors or pixel values. Tokens resolve at target-render time.

### Concrete example

**Spec (YAML, framework-agnostic):**

```yaml
screens:
  - id: login
    name: Login
    wireframe:
      root:
        id: root
        type: Column
        gap: md
        align: center
        children:
          - { id: title, type: Text, text: "Welcome back", style: heading-1 }
          - { id: email, type: TextField, label: "Email", bindsTo: /form/email }
          - { id: pw,    type: TextField, label: "Password", bindsTo: /form/password }
          - { id: submit, type: Button, label: "Sign in", variant: primary, actionId: login_submit }
    interactions:
      - id: login_submit
        trigger: { componentId: submit, event: tap }
        effect: { kind: navigate, to: home }
```

**SwiftUI target (what a consumer LLM produces):**

```swift
struct LoginScreen: View {
  @State private var form = LoginForm()
  var body: some View {
    VStack(spacing: 16) {
      Text("Welcome back").font(.largeTitle)
      TextField("Email", text: $form.email)
      SecureField("Password", text: $form.password)
      Button("Sign in") { navigate(to: .home) }
        .buttonStyle(.borderedProminent)
    }
  }
}
```

**Jetpack Compose target:**

```kotlin
@Composable
fun LoginScreen(nav: NavController) {
  var form by remember { mutableStateOf(LoginForm()) }
  Column(
    verticalArrangement = Arrangement.spacedBy(16.dp),
    horizontalAlignment = Alignment.CenterHorizontally,
  ) {
    Text("Welcome back", style = MaterialTheme.typography.headlineLarge)
    OutlinedTextField(form.email, { form = form.copy(email = it) }, label = { Text("Email") })
    OutlinedTextField(form.password, { form = form.copy(password = it) }, label = { Text("Password") }, visualTransformation = PasswordVisualTransformation())
    Button(onClick = { nav.navigate("home") }) { Text("Sign in") }
  }
}
```

Both targets inherit the same tree shape and binding semantics; the LLM that consumes the spec makes the idiomatic swap.

### Why this shape

- **A2UI validates the approach at scale** — Google's agent-UI protocol uses precisely this structure (flat catalog, `Column`/`Row`/`Text`/`Button`/`TextField`/`List`, JSON-Pointer bindings) to target Flutter, React, SwiftUI, and Compose from one JSON payload.
- **Matches both native frameworks 1:1.** SwiftUI has `VStack`/`HStack`/`List`; Compose has `Column`/`Row`/`LazyColumn`. The names differ but the semantics are identical. `TextField` maps to `TextField` on both sides. `Button` maps to `Button` on both sides.
- **Semantic tokens (not pixel values)** — this is the shadcn-registry / design-tokens-pipeline lesson. Don't bake Material 3 or Human Interface numbers into the spec; name the intent (`variant: primary`, `gap: md`) and let each target resolve.
- **Wireframe renderer consumes the same tree** — one data structure, three consumers (ASCII renderer, SwiftUI-generating LLM, Compose-generating LLM). Adding a fourth target (React Native, Flutter) later is a renderer, not a spec change.

### What must NOT be in the spec

- No SwiftUI property modifiers (`.padding(.horizontal, 16)`).
- No Compose `Modifier.fillMaxWidth()`.
- No color hex codes — tokens only.
- No target-specific lifecycle (`@StateObject`, `viewModel()`).

The wireframe renderer enforces this implicitly: if it can't render it in ASCII, the spec shouldn't carry it.

---

## 6. Wizard ↔ Canvas State Sharing

Both modes edit the same `Spec`. The pattern that works is **single store, two presentations, graduation = mode switch, not reset**.

### State machine

```
          ┌─────────────┐
          │  no spec    │
          │  file yet   │
          └──────┬──────┘
                 │  /spec  (or keybinding)
                 ▼
          ┌─────────────────┐
          │  WIZARD mode    │◄──────┐
          │  (step 1..N)    │       │ user presses "back to wizard"
          └──────┬──────────┘       │  (rare, mostly for onboarding replay)
                 │                  │
                 │  last step done  │
                 │  OR user presses │
                 │  "skip to canvas"│
                 ▼                  │
          ┌─────────────────┐       │
          │  CANVAS mode    │───────┘
          │  (free-form)    │
          └─────────────────┘
```

### Implementation

```typescript
// L5 — editor/store.ts
interface EditorState {
  spec: Spec;                   // single source of truth
  mode: "wizard" | "canvas";
  wizardStep?: number;          // present only in wizard mode
  focus: {                      // present in both modes
    screenId?: ScreenId;
    componentId?: string;
  };
  dirty: boolean;
  diagnostics: Diagnostic[];
}
```

Key rules:

1. **`spec` is owned by the store, not by either shell.** Wizard and Canvas both read from and write to the same store via commands.
2. **Commands don't care about mode.** `AddScreen` works identically in wizard step 3 and in canvas. The shells differ only in *which commands they expose* and *how they present the current state*.
3. **Graduation is a single state transition:** `mode = "canvas"`. The `Spec` does not change; no migration, no reset. The wizard's last step simply sets `mode = "canvas"` and unmounts itself.
4. **Regression is allowed but rare:** "replay wizard" re-mounts the wizard shell against the current spec, seeding wizard answers from the existing spec values. It never discards user edits.
5. **Canvas displays wizard-mode diagnostics.** If the wizard left gaps (e.g. no screens yet), canvas shows them in the diagnostics pane; user can fix by invoking the same commands directly.

This is the Redux-of-rendering pattern: one store, multiple React-style shells subscribed to it. The fact that pi-tui isn't React doesn't change the architecture — we can use a lightweight reactive store (Zustand has no React dependency, or roll a 30-line signal-based store).

---

## 7. Data Flow

### Edit flow

```
user keystroke (TUI)
    │
    ▼
Shell dispatches a Command (e.g. AddField)
    │
    ▼
Editor.store.apply(command)
    │  ├── command produces patch
    │  ├── store applies patch to spec
    │  ├── invariants.validate(spec) → diagnostics
    │  └── emits change event
    │
    ├────────────────┬──────────────┬──────────────┐
    ▼                ▼              ▼              ▼
Shell re-renders  WireframeRenderer  Diagnostics  Dirty flag
(wizard/canvas)   regenerates ASCII   pane updates  → autosave
                  for affected screen
```

### Load flow

```
session_start (pi)
    │
    ▼
look for ./SPEC.md (or configured path)
    │
    ├── not found → store.setMode("wizard"), new empty Spec
    │
    └── found
         ▼
    SpecParser.parse(file)
         │  returns { spec, astHandle, diagnostics }
         ▼
    store.load({ spec, astHandle })
         │
         ▼
    store.setMode("canvas")  // has a spec → canvas
         │
         ▼
    CanvasShell mounts, shows first screen
```

### Save flow

```
store change → debounce 500ms → save()
    │
    ▼
SpecSerializer.serialize(spec, astHandle)
    │  ├── diff(spec, astHandle.lastProjected)
    │  ├── apply diff to yaml.Document
    │  └── render markdown body (regenerate wireframes)
    ▼
atomic write: write to .SPEC.md.tmp, rename over SPEC.md
    ▼
astHandle.lastProjected = spec
    ▼
store.dirty = false
```

### Emit flow (on demand)

```
user invokes /spec emit maestro
    │
    ▼
MaestroEmitter.emit(spec.tests)
    │
    ▼
write to ./maestro/*.yaml
    ▼
notify: "wrote N flows"
```

---

## 8. Build Order

The phase order falls out of the dependency graph. **Build lower layers first, pin their contracts, never break them upward.** Every phase ends with a passing test that exercises the layer and locks its contract.

### Phase 1 — L1/L2: Primitives + Spec model + invariants
**Output:** `src/primitives/`, `src/model/`, `validateSpec()`.
**Validates:** "I can construct a Spec in TS that represents a non-trivial app (3 screens, 2 entities, 5 interactions) and invariants catch broken references."
**Ships:** nothing user-facing. This is the load-bearing type system.

### Phase 2 — L3: Serializer + round-trip
**Output:** `src/serialize/`, round-trip test suite with ~8 golden fixtures (including hand-edited-with-comments cases).
**Validates:** "Parse → no-op → serialize is byte-identical on every fixture. Edit-one-field round-trips leave unrelated bytes untouched."
**Ships:** nothing user-facing. Depends on Phase 1.
**Risk flag:** round-trip edge cases (nested comments, unknown keys, re-flowing a collection) will surface here. Budget extra time. If this phase slips, *everything* downstream slips — the file-is-state contract is binding.

### Phase 3 — L4: Wireframe renderer
**Output:** `src/emit/wireframe/`, snapshot test suite covering all component types + nested layouts.
**Validates:** "Given a Wireframe tree, I get a ~40-line ASCII box that I would actually paste into Slack."
**Ships:** a `render-wireframe` script devs can run against a fixture. Depends on Phase 1 only.
**Risk flag:** this is the project's **core value** — wireframes must be "shareable good." Don't ship the TUI until this is good. Iterate on golden fixtures mercilessly.

### Phase 4 — L5: Editor store + commands + undo
**Output:** `src/editor/`, unit tests per command, undo/redo stack.
**Validates:** "All edit operations flow through commands; undo works; diagnostics update live."
**Ships:** a headless `cli-edit` script (scriptable edits against a spec file) as a shake-out. Depends on Phases 1+2.

### Phase 5 — L6 first half: Canvas shell
**Output:** `src/tui/canvas/`, pane-per-concept (screens / nav / data / tests), keybinding map.
**Validates:** "I can load SPEC.md, edit it via keyboard in the TUI, and saves round-trip cleanly."
**Ships:** canvas-only extension (no wizard). Useful on its own for editing existing specs. Depends on Phases 1–4.
**Why canvas before wizard:** canvas is the harder UI and exercises the full store API. Wizard reuses a subset. Building canvas first means the wizard has zero surprises.

### Phase 6 — L6 second half: Wizard + graduation
**Output:** `src/tui/wizard/`, linear step flow, graduation handoff.
**Validates:** "Empty-spec new-user flow produces a skeleton, graduates to canvas without reset."
**Ships:** full wizard-and-canvas experience. Depends on Phase 5.

### Phase 7 — L4: Maestro emitter
**Output:** `src/emit/maestro/`.
**Validates:** "Generated YAML runs on Maestro Studio against a reference app."
**Ships:** `/spec emit maestro` command. Depends on Phases 1+4.

### Phase 8 — L4: Detox emitter
**Output:** `src/emit/detox/`.
**Validates:** "Generated .test.js runs under Detox."
**Ships:** `/spec emit detox` command. Depends on Phases 1+4.
**Note:** Detox has no YAML format — this is JavaScript code generation, meaningfully different work from Maestro.

### Phase 9 — L7: pi integration + packaging
**Output:** `src/index.ts`, `package.json` with `pi.extensions`, README, install instructions.
**Validates:** "`pi install npm:mobile-tui` then `/spec` launches the extension."
**Ships:** publishable npm package. Depends on Phases 1–8.

### Build-order rationale

- **L1 → L2 → L3 first:** everything downstream reads/writes specs. Lock the file format before building UI on top of it, or UI work becomes migration work.
- **L4 wireframe before TUI:** the wireframe *is* the product. If it's not good yet, no TUI fix helps.
- **Canvas before wizard:** canvas is a superset of what wizard needs.
- **Emitters after TUI:** emitters are valuable but not the core value; TUI + good wireframes ships a usable-if-incomplete product.
- **pi integration last:** wraps a working library. All the earlier phases test as plain Node.js; only phase 9 needs pi running.

---

## 9. pi Extension Packaging & Distribution

### Entry point shape

```typescript
// src/index.ts — L7
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { createEditor } from "./editor/store.js";
import { CanvasShell } from "./tui/canvas/shell.js";
import { WizardShell } from "./tui/wizard/shell.js";
import { loadSpec, saveSpec } from "./serialize/index.js";

export default function (pi: ExtensionAPI) {
  const editor = createEditor();

  // Load on session start
  pi.on("session_start", async (_event, ctx) => {
    const result = await loadSpec(ctx.cwd);
    if (result.ok) {
      editor.load(result.value);
      editor.setMode("canvas");
    } else {
      editor.setMode("wizard");
    }
  });

  // /spec command → opens shell
  pi.registerCommand("spec", {
    description: "Author a mobile app spec",
    handler: async (_args, ctx) => {
      if (!ctx.hasUI) return;
      if (editor.mode === "wizard") await WizardShell.run(ctx, editor);
      else                           await CanvasShell.run(ctx, editor);
    },
  });

  // Keybinding for fast access
  pi.registerShortcut("ctrl+shift+s", {
    description: "Open spec editor",
    handler: async (ctx) => {
      if (editor.mode === "wizard") await WizardShell.run(ctx, editor);
      else                           await CanvasShell.run(ctx, editor);
    },
  });

  // Tool so the LLM can query the spec
  pi.registerTool({
    name: "read_spec",
    label: "Read mobile spec",
    description: "Return the current mobile app spec as structured JSON.",
    parameters: Type.Object({}),
    async execute() {
      return { content: [{ type: "text", text: JSON.stringify(editor.spec, null, 2) }] };
    },
  });

  // Autosave
  editor.onChange(async () => {
    await saveSpec(editor.spec, editor.astHandle);
  });
}
```

### package.json shape

```json
{
  "name": "mobile-tui",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "pi": {
    "extensions": ["./dist/index.js"]
  },
  "dependencies": {
    "@mariozechner/pi-coding-agent": "^x.y.z",
    "@mariozechner/pi-tui": "^x.y.z",
    "@sinclair/typebox": "^0.x",
    "yaml": "^2.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "vitest": "^1.x"
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest"
  }
}
```

### Installation paths

Three ways users can install:

1. **Global auto-discovery:** build output placed at `~/.pi/agent/extensions/mobile-tui/index.ts` — loaded on startup by pi.
2. **Project-local:** `.pi/extensions/mobile-tui/` in the user's repo — useful if a team pins a version per project.
3. **Package reference in `~/.pi/settings.json`:**
   ```json
   { "packages": ["npm:mobile-tui@0.1.0"] }
   ```
   then `pi install` pulls it from npm.

### Hot reload

Users run `/reload` after updating the extension. We must handle `session_shutdown` → clean up editor subscriptions; and `session_start` with `reason: "reload"` → re-read the spec file. Do not persist state in module globals that assume module identity; use the store as the only state holder.

### Lifecycle hooks to use

- `session_start` — load `./SPEC.md` if present, set mode.
- `session_shutdown` — flush any pending autosave.
- `before_agent_start` — inject the current spec into the system prompt preamble so the LLM has context (optional, gated by a flag).

---

## 10. Architectural Patterns

### Pattern 1: Command/Patch Store (L5)

**What:** All edits to the Spec go through explicit `Command` objects that produce immutable patches. The store applies patches and emits events.

**When to use:** Every TUI edit, every test, every wizard step. No ad-hoc mutation of the Spec anywhere in the codebase.

**Trade-offs:**
- Pros: undo/redo is free (invert the patch); diagnostics run on every change; test replay is trivial.
- Cons: boilerplate per command.

**Example:**

```typescript
// editor/commands/add-field.ts
export function AddField(entityId: EntityId, field: Field): Command {
  return {
    name: "AddField",
    apply(spec) {
      const entity = findEntity(spec, entityId);
      return produce(spec, (s) => { s.dataModel.entities.find(e => e.id === entityId)!.fields.push(field); });
    },
    invert(spec) {
      return produce(spec, (s) => {
        const e = s.dataModel.entities.find(e => e.id === entityId)!;
        e.fields = e.fields.filter(f => f.id !== field.id);
      });
    },
  };
}
```

### Pattern 2: AST-Preserving Serialization (L3)

**What:** Keep the YAML.Document AST alongside the Spec value. Serialize by applying a model diff to the AST, not by re-emitting from scratch.

**When to use:** The one and only save path. Never call `YAML.stringify(spec)` directly on user-facing writes.

**Trade-offs:**
- Pros: comments, ordering, formatting preserved; round-trip-safe.
- Cons: more code than naive stringify; requires diff/apply infra.

**Example:**

```typescript
function serialize(next: Spec, handle: AstHandle): string {
  const diff = diffSpec(handle.lastProjected, next);
  for (const op of diff.ops) {
    if (op.kind === "set")    handle.doc.setIn(op.path, op.value);
    if (op.kind === "delete") handle.doc.deleteIn(op.path);
  }
  const body = renderMarkdownBody(next);
  return `---\n${handle.doc.toString()}---\n\n${body}`;
}
```

### Pattern 3: Pure Emitters (L4)

**What:** Wireframe/Maestro/Detox emitters are pure functions: `(inputs) => string`. No I/O, no store access, no hidden state.

**When to use:** All artifact generation.

**Trade-offs:**
- Pros: trivially unit-testable with golden fixtures; safe to call from anywhere.
- Cons: must pass all needed context explicitly — mildly more verbose.

**Example:**

```typescript
// emit/wireframe/render.ts
export function renderWireframe(wireframe: Wireframe, opts?: RenderOpts): string {
  const laid = layout(wireframe.root, opts);
  return drawBox(laid);
}
```

### Pattern 4: Shell-as-Presentation (L6)

**What:** Wizard and Canvas shells are pure presentations of the store. They read store slices and dispatch commands. They own no spec state themselves.

**When to use:** Any TUI surface that edits the spec.

**Trade-offs:**
- Pros: graduation is a mode flip; tests can run shells headlessly.
- Cons: careful discipline needed — tempting to cache spec fragments in the shell; don't.

---

## 11. Anti-Patterns

### Anti-Pattern 1: Stringify-from-scratch save

**What people do:** `fs.writeFile(path, YAML.stringify(spec))` on save.
**Why it's wrong:** clobbers comments, reorders keys, re-indents, destroys author trust.
**Do this instead:** AST-preserving serialization (Pattern 2).

### Anti-Pattern 2: Baking SwiftUI or Compose semantics into the spec

**What people do:** `{ type: "VStack", padding: 16 }` or `{ type: "Column", modifier: "fillMaxWidth" }`.
**Why it's wrong:** couples the spec to one target; wireframe renderer can't handle the idioms; second-target LLMs hallucinate translations.
**Do this instead:** semantic vocabulary only — `{ type: "Column", gap: "md" }`. Let each target interpret.

### Anti-Pattern 3: Storing spec state in the shell

**What people do:** WizardShell holds `currentScreen: Screen` as local state; syncs to store occasionally.
**Why it's wrong:** divergence between shell and store; canvas sees stale data; undo breaks.
**Do this instead:** store is the single source of truth; shells read via subscriptions.

### Anti-Pattern 4: One emitter emitting both Maestro and Detox

**What people do:** `generateTests(flow, { format: "maestro" | "detox" })`.
**Why it's wrong:** Maestro is declarative YAML; Detox is imperative JS with a test-runner. Their abstractions don't overlap cleanly. One emitter accretes conditionals until it's unmaintainable.
**Do this instead:** separate modules (`emit/maestro/`, `emit/detox/`) that share the `TestFlow` input type but nothing else.

### Anti-Pattern 5: Allowing the user to hand-edit the wireframe ASCII

**What people do:** Treat the markdown body wireframes as authoritative; try to parse ASCII back into a tree.
**Why it's wrong:** ASCII-to-tree is underspecified and the renderer can regenerate trivially. Users will "improve" wireframes and the tree won't match.
**Do this instead:** wireframes are *outputs only*. Regenerate on every save. Document this in the file header comment. If the user edits them, warn and regenerate next save.

### Anti-Pattern 6: Putting business logic in L7

**What people do:** Extension entry point `index.ts` accumulates command handlers, autosave logic, diff logic.
**Why it's wrong:** pi integration layer becomes untestable (needs pi running); layer violation; hot-reload fragility.
**Do this instead:** L7 is ~50 lines of glue. Everything else lives in the library layers and is testable with plain vitest.

---

## 12. Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Maestro CLI | File-based: emit YAML to `./maestro/*.yaml`, user runs `maestro test` | Don't invoke Maestro ourselves; users have local installs. |
| Detox | File-based: emit `.test.js` to `./e2e/*.test.js` | Must match the user's existing Detox config; ship a default. |
| Git | None — we just write files; user commits | Honor `.gitignore`; don't write inside it. |
| pi sub-agents / tools | `registerTool("read_spec")` so LLMs can query the spec | Keeps spec authoritative for downstream code generation. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Editor store ↔ Shells (L5↔L6) | Subscription + dispatch; no direct Spec mutation | Store exposes `subscribe(selector)` and `dispatch(command)`. |
| Parser/Serializer ↔ Model (L3↔L2) | Parser returns `{ spec, astHandle }`; serializer takes both | `astHandle` is opaque to everything else; only L3 unwraps it. |
| Model ↔ Emitters (L2→L4) | Direct import of model types; emitters take model values | Emitters never touch the store. |
| Extension entry ↔ Shells (L7↔L6) | pi `ctx.ui.custom` receives shell factory | Hot-reload: shells must tear down cleanly on `session_shutdown`. |

---

## 13. Scaling Considerations

This project scales along axes different from user count. The relevant axes are **spec size**, **component catalog growth**, and **target expansion**.

| Axis | Small (day 1) | Medium | Large |
|------|---------------|--------|-------|
| Screens per spec | 1-10 | 30-50 | 100+ |
| Approach | In-memory, parse whole file | Same | Virtualize canvas panes; lazy-render wireframes |
| Component catalog | ~12 types | ~20 types | Consider component plugins |
| Targets | SwiftUI + Compose | + React Native | Generalize emitter interface |

### Scaling Priorities

1. **First bottleneck: wireframe re-render on every keystroke.** Fix: memoize per-screen rendering keyed by wireframe identity; only re-render the screen being edited.
2. **Second bottleneck: YAML round-trip diff at 100+ screens.** Fix: invalidate AST nodes per-screen rather than diffing the whole spec. Can be deferred until pain is real.
3. **Third bottleneck: diagnostics running on every patch.** Fix: run incrementally (only validate touched subtrees). Only worth doing if spec size actually hits triple digits.

None of these need to be solved in v1.

---

## 14. Risk Areas (Flags for Roadmap)

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Round-trip regressions** as edge cases accumulate | HIGH | Fixture-driven test discipline from Phase 2; no save without AST-preservation; warn on dropped comments. |
| **Wireframe renderer "good enough" is subjective** | HIGH | Dogfood early; commit ~20 reference wireframes as golden fixtures; iterate until author says "I'd share this." |
| **pi API churn** (pre-1.0 coding-agent) | MEDIUM | Pin version in package.json; isolate pi imports to L7 only so migrations are small. |
| **Detox emitter scope creep** (JS codegen is unbounded) | MEDIUM | Constrain to a fixed step vocabulary (launch/tap/input/assertVisible/assertText/wait); anything else → "not supported yet." |
| **Spec schema churn** breaks user files | MEDIUM | `spec.version: "1"` field and a migration runner from day one; never remove fields, only deprecate. |
| **Component catalog drift** between targets | MEDIUM | Keep catalog small (~12 nodes); validate SwiftUI + Compose manual render for every catalog addition before shipping. |
| **State binding path format** choices | LOW | Use JSON Pointer (RFC 6901) verbatim — proven by A2UI; don't invent a custom path DSL. |

---

## 15. Sources

**pi.dev / pi-coding-agent extension API:**
- [pi-mono/packages/coding-agent/docs/extensions.md](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/extensions.md) — authoritative extension API reference (ExtensionAPI methods, lifecycle events, UI context, hot-reload, distribution)
- [@mariozechner/pi-coding-agent on npm](https://www.npmjs.com/package/@mariozechner/pi-coding-agent) — package, version, installation
- [pi-tui: Terminal UI Library (DeepWiki)](https://deepwiki.com/badlogic/pi-mono/5-pi-tui:-terminal-ui-library) — component primitives (Text, Input, Editor, Box, Markdown, Container)
- [pi-mono repo root](https://github.com/badlogic/pi-mono) — cross-reference for all pi packages

**Framework-agnostic UI spec (A2UI / OpenUI / design tokens):**
- [A2UI: What is A2UI?](https://a2ui.org/introduction/what-is-a2ui/) — framework-agnostic JSON UI protocol targeting Flutter, React, SwiftUI, Compose
- [google/A2UI GitHub](https://github.com/google/A2UI) — full spec, component catalog model, JSON Pointer bindings
- [A2UI v0.10 protocol spec](https://github.com/google/A2UI/tree/main/specification/v0_10) — concrete component list (Text, Image, Row, Column, List, Card, Button, TextField, etc.) and event/action model
- [Fundamental Differences of Compose and SwiftUI](https://medium.com/mateedevs/fundamental-differences-of-compose-and-swiftui-2dc0cdd0b37) — validates that the abstractions align at the primitive level

**YAML round-trip preservation:**
- [yaml npm package (eemeli/yaml)](https://www.npmjs.com/package/yaml) — the TypeScript YAML lib with Document AST and round-trip support
- [eemeli.org/yaml docs](https://eemeli.org/yaml/v1/) — Document, setIn, deleteIn, toString preserving source formatting
- [enhanced-yaml on npm](https://www.npmjs.com/package/enhanced-yaml) — source-preserving stringify wrapper over eemeli/yaml
- [yaml-roundtripping-is-hard (spiffxp)](https://gist.github.com/spiffxp/0ecfae1f315de4de484e60b3b2bd199e) — the canonical "why this is hard" writeup; informs the diff-and-apply strategy
- [ruamel.yaml](https://yaml.dev/doc/ruamel.yaml/detail/) — Python prior art; validates the AST-preserving approach

**Test emitters:**
- [Maestro docs — YAML flow syntax](https://docs.maestro.dev/) — launchApp, tapOn, assertVisible, inputText; YAML declarative format
- [Maestro launchApp reference](https://docs.maestro.dev/reference/commands-available/launchapp) — command vocabulary for the emitter
- [Detox — Your First Test](https://wix.github.io/Detox/docs/introduction/your-first-test/) — confirms Detox is JavaScript-native (no YAML); by.id matcher, expect().toBeVisible()
- [Detox vs. Maestro: Reducing Flakiness](https://maestro.dev/insights/detox-vs-maestro-reducing-flakiness-react-native) — comparison informing the "two separate emitters, not one" decision

---

*Architecture research for: pi.dev TUI extension for mobile app spec authoring*
*Researched: 2026-04-17*
