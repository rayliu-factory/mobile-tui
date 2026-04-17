# Phase 1: Spec Model & Invariants — Context

**Gathered:** 2026-04-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Lock the framework-agnostic Spec shape — Zod v4 schemas, closed A2UI-shaped component catalog, `validateSpec()` contract returning `Diagnostic[]`, and the `migrations/v1_to_v2.ts` scaffold. Three hand-authored fixture specs (3 screens + 2 entities + 5 interactions each) prove the model; a fourth deliberately-malformed fixture proves the diagnostics path.

**In scope (this phase):** `src/model/`, `src/primitives/`, `validateSpec()`, `schema: mobile-tui/1` constant, migration-runner scaffold, fixtures, Zod-compiled types.

**Explicitly NOT in scope:** serialization / round-trip (Phase 2), wireframe rendering (Phase 3), editor store + undo (Phase 4), canvas / wizard TUI (Phases 5–6), Maestro emission (Phase 7), pi integration (Phase 9).

**Requirements covered:** SPEC-01, SPEC-02, SPEC-03, SPEC-04, SPEC-05, SPEC-06, SPEC-07, SPEC-10, SERDE-08.

</domain>

<decisions>
## Implementation Decisions

### Sigil Grammar

- **D-01:** Sigil form is `[Label →action test:id]`. All three components are **required** when a sigil appears.
- **D-02:** Sigils appear **only on interactable elements** (Button, TextField, Toggle, SegmentedControl, tappable ListItem, Link-style Text, etc.). Non-interactable components (plain Text, Icon, Divider, Spacer) never carry a sigil — they use ordinary props.
- **D-03:** `Label` content is **printable ASCII only** (`[A-Za-z0-9 \-_.]` plus standard punctuation). This protects WIREFRAME-02 (persisted wireframes are ASCII-baseline). Escaping rules for literal `→` / `]` inside labels are deferred — if the need arises in a fixture, escape with `\u2192` / `\]` and document it then.
- **D-04:** Sigil is **write-shorthand only**. The in-memory `Spec` stores `{ label: string, action: string, testID: string }` as three independent fields on the component node. Parser normalises sigil → triple on read; Serializer re-emits sigil on write. Wireframe renderer and Maestro emitter consume the structured triple, not the sigil string.
- **D-05:** `testID` is **globally unique across the entire spec**. The validator tracks a `Map<testID, ComponentPath>` during traversal and emits a `Diagnostic` on collision. Matches SwiftUI `.accessibilityIdentifier` + Compose `Modifier.testTag` + Maestro `id:` selector semantics.

### State Variants

- **D-06:** Every screen declares **all four variants** (`content`, `empty`, `loading`, `error`) as siblings under `variants:` — no opt-in, no inheritance. Authors may set a variant to `null` to mark it explicitly not applicable; the validator permits `null` but forbids *omission* of the key. Forces the design decision without hiding it.
- **D-07:** Each variant is a **full component tree**. No diffs against `content`, no slot swaps, no inherited nodes. Renderer (Phase 3) draws four independent wireframe blocks per screen, matching WIREFRAME-04.
- **D-08:** Variant activation uses a **closed discriminated union** per kind (not free-form expression strings):
  ```ts
  // Pseudocode for Zod shape
  ContentVariant   = { kind: "content",  tree: ComponentNode[] }
  EmptyVariant     = { kind: "empty",    when: { collection:   JsonPointer }, tree: ComponentNode[] } | null
  LoadingVariant   = { kind: "loading",  when: { async:        JsonPointer }, tree: ComponentNode[] } | null
  ErrorVariant     = { kind: "error",    when: { field_error:  JsonPointer }, tree: ComponentNode[] } | null
  ```
  The closed grammar lets the validator type-check `when` fields and Maestro/handoff emitters reason about variant intent later.
- **D-09:** All `when` paths use **JSON Pointer (RFC 6901)** — same DSL as data bindings. One grammar across the spec. Research Open Question Q5 resolved: keep JSON Pointer unless a concrete fixture case breaks it.

### Interaction Model (Actions Registry)

- **D-10:** Actions live in a **top-level `actions:` registry** in the spec frontmatter. One map per spec; entries are keyed by id. Same id bindable from multiple components across screens (the SPEC-06 rationale).
- **D-11:** Components reference actions by **string id only** (via the sigil's `→action` component). Inline action definitions are forbidden. Validator errors on unresolved refs (diagnostic: `SPEC_UNRESOLVED_ACTION`).
- **D-12:** Each action is a **typed intent union** with six closed kinds in v1:
  - `{ kind: "navigate", screen: ScreenId, params?: Record<string, JsonPointer> }` — nav-graph edge.
  - `{ kind: "submit",   entity: EntityName, source?: JsonPointer }` — form submission targeting an entity.
  - `{ kind: "mutate",   target: JsonPointer, op: "toggle" | "set" | "push" | "remove", value?: Json }` — local state change.
  - `{ kind: "present",  overlay: ScreenId }` — open a Modal or Sheet (overlay screens marked as such in the nav graph).
  - `{ kind: "dismiss" }` — close current Modal/Sheet OR pop nav stack (resolution in execution).
  - `{ kind: "custom",   name: string, description?: string }` — explicit escape hatch for anything the closed set doesn't cover.
- **D-13:** The validator cross-checks intent params against the rest of the spec: `navigate.screen` must exist in `screens:`; `submit.entity` must exist in `data.entities:`; `mutate.target` must resolve under the data model; `present.overlay` must be a screen with `kind: overlay` (Modal or Sheet). Each diagnostic has a specific code.

### Fixtures (success criteria #1 and #5)

- **D-14:** Three canonical v1 fixtures under `fixtures/`:
  - `habit-tracker.spec.md` — NavBar + List + Card + Toggle + Modal; 2 entities (Habit, Completion); 5 interactions covering `navigate`, `submit`, `mutate`(toggle), `present`, `dismiss`.
  - `todo.spec.md` — TabBar + TextField + SegmentedControl + List; 2 entities (Task, Project); 5 interactions covering `submit`, `mutate`(push/remove), `navigate`, `custom`, `dismiss`.
  - `social-feed.spec.md` — Image + Card + List + NavBar + Sheet; 2 entities (Post, Author); 5 interactions covering `navigate`(with params), `present`, `mutate`(set), `submit`, `custom`.
  Between the three, every component in the closed 18-kind catalog appears at least once → this fulfils SPEC-01 catalog-coverage proof via fixture snapshots rather than a standalone test.
- **D-15:** A deliberately-malformed fixture `fixtures/malformed.spec.md` carries every class of diagnostic (missing `back_behavior`, unknown component `kind`, dangling `→action` ref, JSON Pointer resolving to nothing, testID collision, variant key omission, action intent type mismatch). The Phase 1 test suite asserts `validateSpec(malformed)` returns the expected `Diagnostic[]` with every code present — proves the never-throw contract.
- **D-16:** `habit-tracker.spec.md` is the **"two-target fidelity" gate fixture** (success criterion #5). It gets hand-translated to SwiftUI + Jetpack Compose in Phase 1 as committed artifacts under `fixtures/targets/habit-tracker.swift` and `fixtures/targets/habit-tracker.kt`. Zero ambiguity in translation is the pass bar.
- **D-17:** **Executor drafts, user reviews** all fixtures. Content detail is not load-bearing — structural shape (3×3×2×5) is what the model is being validated against. Fixtures live in `fixtures/` at repo root (not under `.planning/`) so they ship with the published package and act as runnable schema documentation.

### Claude's Discretion (defaults if no objection during planning)

- **Diagnostic codes:** SCREAMING_SNAKE_CASE, namespaced by domain → `SPEC_UNKNOWN_COMPONENT`, `SPEC_UNRESOLVED_ACTION`, `SPEC_TESTID_COLLISION`, `SPEC_MISSING_BACK_BEHAVIOR`, `SPEC_VARIANT_OMITTED`, `SPEC_JSONPTR_UNRESOLVED`, `SPEC_ACTION_TYPE_MISMATCH`. Severity scale: `error | warning | info` only (no `hint`). `path` field in diagnostics is a JSON Pointer into the spec AST.
- **ID case conventions:** screen ids, entity names, action ids, testIDs all `[a-z][a-z0-9_]*` (snake_case). Validator regex-enforces. Entity names are PascalCase exception — entities are types. Case-mismatch is a diagnostic, not a fatal error.
- **Uniqueness scopes:** screen ids unique spec-wide; entity names unique spec-wide; action ids unique spec-wide; testIDs unique spec-wide (already decided, D-05).
- **Acceptance criteria shape (SPEC-10):** prose one-liners in an optional `acceptance:` array per screen. No structured given/when/then in v1 — free prose reads better in Markdown and the Maestro emitter's Phase-7 responsibility is to write flows, not auto-derive them from criteria. A future phase may upgrade this to structured pairs.
- **Migration runner scaffold (SERDE-08):** file `src/migrations/v1_to_v2.ts` ships with signature `export function migrate(input: SpecV1): SpecV2` and an empty-op body (`return input as unknown as SpecV2`). A `src/migrations/index.ts` exposes `runMigrations(spec, fromVersion, toVersion)` that chains versioned migrators. No-op migration harness round-trips one fixture as a CI test. Schema version constant lives in `src/model/version.ts` as `export const SCHEMA_VERSION = "mobile-tui/1" as const`.
- **Back-behavior vocabulary (PITFALLS §6.1):** `back_behavior: "pop" | "dismiss" | "reset-to-root" | { kind: "replace", screen: ScreenId }`. Required on every non-root screen. Validator emits `SPEC_MISSING_BACK_BEHAVIOR` diagnostic on omission.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents (researcher, planner, executor) MUST read these before planning or implementing.**

### Project-level contract
- `.planning/PROJECT.md` — core value, constraints, Out-of-Scope boundaries
- `.planning/REQUIREMENTS.md` — SPEC-01..10, SERDE-08 full text + traceability
- `.planning/ROADMAP.md` §Phase 1 — goal, success criteria, dependency posture

### Research corpus (synthesized 2026-04-17)
- `.planning/research/SUMMARY.md` — executive take, build-order implications, Open Questions Q3/Q4/Q5 resolved here
- `.planning/research/STACK.md` — Zod v4, `yaml@^2.8.3`, `gray-matter@^4.0.3`, Node ≥20, package shape
- `.planning/research/ARCHITECTURE.md` — seven-layer structure (Phase 1 = L1/L2), A2UI-shaped component model, JSON Pointer bindings
- `.planning/research/PITFALLS.md` — §2 (model over/under-engineering), §5 (colocation / acceptance), §6 (back_behavior / capabilities), §7 (sigils banning coord-tap / nth-child)
- `.planning/research/FEATURES.md` — MVP scope, closed component catalog (18 kinds), state-variants-as-first-class rationale

### External standards (referenced by schema)
- RFC 6901 (JSON Pointer) — the binding / when-path / diagnostic-path DSL. https://datatracker.ietf.org/doc/html/rfc6901
- A2UI component vocabulary (Google) — source of the closed component set. https://a2ui.org/

### Session artifacts (read-only context)
- `.planning/STATE.md` — current position, accumulated decisions, flagged placement notes (SERDE-08 in Phase 1, SPEC-08/09 deferred to Phase 2)
- `CLAUDE.md` — stack recommendations (matches STACK.md); "What NOT to Use" list; pi.dev extension gotchas

**No external specs for the decisions in `<decisions>` above** — sigil grammar, variant trigger union, action intent union, and fixture selection are all locked here and should be treated as authoritative for Phase 1 and downstream phases.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

**None.** Greenfield project — `src/` does not yet exist. Phase 1 lays the first layer (L1 primitives + L2 model).

### Established Patterns (from STACK.md / ARCHITECTURE.md — to be followed, not invented)

- **Validation:** Zod v4 for every spec type; schemas compose via `z.discriminatedUnion()` for variants, actions, components. Exported types via `z.infer<typeof X>`. No TypeBox in this phase (TypeBox appears only in Phase 9's `pi.registerTool.parameters` slot).
- **File layout (seven-layer model):** `src/primitives/` (pure helpers, no deps on other layers), `src/model/` (Spec type + Zod schemas + `validateSpec()`), `src/migrations/` (versioned migration runners). Phase 1 touches only these three dirs.
- **Diagnostics never throw.** `validateSpec()` returns `{ spec: Spec | null, diagnostics: Diagnostic[] }` — the caller (Phase 2 serializer) inspects `severity` to gate save. Zod's `safeParse` is the engine; Zod errors are mapped to the `Diagnostic` shape with issue-path → JSON Pointer conversion.
- **Closed vocabularies everywhere.** Component `kind`, action `kind`, variant `kind`, `back_behavior`, `mutate.op` are all Zod `z.enum()` or `z.discriminatedUnion()` — no `z.string()` escape hatches. Enforces the 'no over/under-engineering' PITFALLS §2 rule.

### Integration Points

- **Phase 2 (serialization)** imports `Spec`, `validateSpec`, and `SCHEMA_VERSION` from Phase 1's `src/model/`. The write-through save contract depends on `Diagnostic[]` severity (SPEC-09 gates on `severity !== "error"`). Phase 1 defines the shape; Phase 2 implements the gate.
- **Phase 3 (wireframe)** imports `Spec` and the component tree types. Pure read-only consumer of the model.
- **Phase 7 (Maestro)** imports `Spec.TestFlow` (not yet in v1 scope — but the action registry + sigil structure defined here is what the Maestro emitter will eventually consume).
- **Migration runner** is the future-proofing hook: Phase 1 ships the scaffolding file + signature so no later phase has to invent the chaining mechanism under deadline pressure.

</code_context>

<specifics>
## Specific Ideas

- Sigil is the **only** binding mechanism for wireframe ↔ spec ↔ Maestro selectors. Coordinate taps and nth-child selectors are forbidden at the schema level — a missing testID on an action-bearing component is a `Diagnostic: error`, not a warning. This is the PITFALLS §3.3, §7.1, §7.2 enforcement point.
- "Shareable sigil-less wireframe preview" (for humans reading the markdown body of a spec) is Phase 3's problem. Phase 1 stores the structured triple; Phase 3 decides whether to render the sigil verbatim or elide it.
- The `custom: { kind: "custom", name }` action kind is the **only** escape hatch in the intent union. Every new behavior downstream should be tried as `custom` first; kinds only get added to the closed union when a concrete cross-fixture pattern emerges.
- `null` as the explicit "not applicable" marker for a variant (D-06) is a load-bearing design choice — serializer emits `empty: null` as literal YAML null, not as absent key; round-trip must preserve this.

</specifics>

<deferred>
## Deferred Ideas

- **Structured acceptance criteria** — given/when/then or `{when, expect}` pairs that the Maestro emitter could consume directly. Intentionally deferred: v1 ships prose-line criteria; a future phase may upgrade when Maestro emitter matures.
- **Per-screen state machines (XState-shaped)** — already v2 per REQUIREMENTS.md; not in scope here.
- **`permission_request` and `external_link` as first-class action kinds** — considered for v1 but deferred. Use `custom: { name: "request_camera_permission" }` or `custom: { name: "open_url", ... }` until a pattern across fixtures demands elevation.
- **Sigil-label escaping for Unicode labels / arrows in labels** — rules will be written the first time a fixture needs them; ASCII-only in v1.
- **Sigil support on non-interactable elements for assertion-only testIDs** (e.g., asserting a Text is visible without it being tappable) — deferred; for v1, achieve this by giving the Text an `action: { kind: "custom", name: "noop" }` if it genuinely needs a testID, or wait for a variant-assertion mechanism in a later phase.
- **Static analysis of data-binding path reachability end-to-end** — validator only checks that a JSON Pointer's *prefix* resolves to a defined entity field; full traversal of array shapes under `mutate.op: push/remove` is left for Phase 4 when commands actually execute mutations.

</deferred>

---

*Phase: 01-spec-model-invariants*
*Context gathered: 2026-04-17*
