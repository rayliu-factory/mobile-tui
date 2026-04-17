# Phase 1: Spec Model & Invariants — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `01-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-04-17
**Phase:** 01-spec-model-invariants
**Areas discussed:** Sigil grammar lock, VariantTrigger vocabulary, Interaction model shape, Fixture app selection

---

## Sigil Grammar Lock

### Q1 — Which elements are required vs optional inside the brackets?

| Option | Description | Selected |
|--------|-------------|----------|
| All three required | Every sigil must carry Label + →action + test:id (`[Save →save_habit test:btn_save]`). Forces a testID for every interactable. | ✓ |
| Label required; action/testID optional | Validator flags `→action` without a `test:` sigil as a Maestro-path error. | |
| Only sigils on interactables | Non-interactable Text/Icon never get sigils; sigils ONLY on elements with an action. | |

**User's choice:** All three required.
**Notes:** Combined effectively with option C — sigils appear only on interactable elements, and when they do, all three fields are mandatory.

### Q2 — How strict is the label content?

| Option | Description | Selected |
|--------|-------------|----------|
| Printable ASCII only | `[A-Za-z0-9 \-_.]`. No Unicode. Aligns with WIREFRAME-02 (persisted wireframe ASCII-baseline). | ✓ |
| Any Unicode except reserved | Allow any Unicode but reserve `→`, `]`, `[`, `test:` as escapable tokens. | |
| Printable ASCII + require escape for →/] | ASCII-only + `\u2192` / `\]` escapes for literal arrows/brackets. | |

**User's choice:** Printable ASCII only.
**Notes:** Escape rules deferred — will be written the first time a fixture needs them.

### Q3 — Where in the component tree does the sigil-text live?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline in the `text`/`label` prop | Component carries `text: "[Save →save_habit test:btn_save]"` verbatim. | |
| Separate structured fields | In-memory Spec stores `{ label, action, testID }` as three independent fields; sigil is write-shorthand. | ✓ |
| Hybrid: text-field sigil + parser normalises | On-disk: sigil in text. In-memory: structured triple. | |

**User's choice:** Separate structured fields.
**Notes:** Parser normalises on read; Serializer re-emits the sigil on write. Wireframe renderer + Maestro emitter consume the structured triple.

### Q4 — testID uniqueness scope?

| Option | Description | Selected |
|--------|-------------|----------|
| Globally unique across spec | One `test:id` appears exactly once anywhere. Matches Maestro `id:`, SwiftUI `.accessibilityIdentifier`, Compose `.testTag`. | ✓ |
| Unique per-screen | Same id may appear on two screens; requires screen-precondition in Maestro. | |
| Unique per-variant within a screen | Same id allowed across content/empty variants of a screen. | |

**User's choice:** Globally unique across spec.
**Notes:** Validator tracks a `Map<testID, ComponentPath>` during traversal and emits `SPEC_TESTID_COLLISION` on duplicates.

---

## VariantTrigger Vocabulary

### Q1 — How do variants declare when they activate?

| Option | Description | Selected |
|--------|-------------|----------|
| Typed discriminated union per kind | `empty: { when: { collection: /ptr } }`, `loading: { when: { async: /ptr } }`, `error: { when: { field_error: /ptr } }`. Closed grammar, validator-checked. | ✓ |
| Free-form `when:` expression strings | `{ when: '/habits == []' }` opaque strings; requires inventing an expression language or giving up on validation. | |
| Convention-only (no trigger field) | Variant kind IS the trigger; emitter infers by convention. | |

**User's choice:** Typed union per kind.
**Notes:** Extensible for future kinds (e.g. `offline`, `unauth`) without breaking parsers.

### Q2 — Is every variant kind required on every screen?

| Option | Description | Selected |
|--------|-------------|----------|
| All four always required | Every screen authors content + empty + loading + error; missing any is a validator error. | ✓ |
| content required; empty/loading/error optional | Lower friction but risks 'forgot the loading state' bugs. | |
| All four required + explicit `not_applicable: true` opt-out | Strict with justification. | |

**User's choice:** All four required.
**Notes:** Authors set a variant to `null` to mark it explicitly not applicable. The validator permits `null` but forbids omission of the key. Serializer emits literal YAML null.

### Q3 — What shape does each variant's UI take?

| Option | Description | Selected |
|--------|-------------|----------|
| Full component-tree per variant | No inheritance from content; each variant is independent. Matches WIREFRAME-04 (four independent wireframe blocks). | ✓ |
| content + diff patches | Variants declare diffs against content (replace node X, hide Y). | |
| content + named slot swaps | Author slot points in content; variants supply replacements. | |

**User's choice:** Full component-tree per variant.

### Q4 — Which path DSL does the `when` field use?

| Option | Description | Selected |
|--------|-------------|----------|
| JSON Pointer (RFC 6901) | Same DSL as data bindings. One grammar across the spec. | ✓ |
| Dotted path (`habits.title`) | More familiar; but diverges from data-binding DSL. | |
| Named-binding reference only | Bindings pre-registered with ids; `when` references the id. | |

**User's choice:** JSON Pointer.
**Notes:** Resolves Open Question Q5 from research — JSON Pointer unless a concrete fixture case breaks it.

---

## Interaction Model Shape

### Q1 — What is the shape of a single action in the interaction registry?

| Option | Description | Selected |
|--------|-------------|----------|
| Typed intent union | Closed discriminated union: navigate / submit / mutate / present / dismiss / custom. Validator type-checks params. | ✓ |
| Flat string-keyed registry (opaque) | Names + prose descriptions; emitters treat actions as opaque ids. | |
| Structured objects with freeform params | Named + description + opaque params; pays schema cost without the schema value. | |

**User's choice:** Typed intent union.

### Q2 — How are actions referenced from components?

| Option | Description | Selected |
|--------|-------------|----------|
| String id reference only | Sigil `→action` resolves against top-level `actions:` registry. | ✓ |
| Inline definition allowed | Components can either reference by id OR define inline. | |
| Id ref with optional inline override | Reference by id; override params at call site. | |

**User's choice:** String id reference only.
**Notes:** Diagnostic `SPEC_UNRESOLVED_ACTION` on any unresolved ref.

### Q3 — Which action `kind`s ship in v1?

| Option | Description | Selected |
|--------|-------------|----------|
| navigate / submit / mutate / present / dismiss / custom | Six kinds covering the habit-tracker / todo / social-feed space. | ✓ |
| Minimal: navigate / submit / custom | Three kinds; mutate/present/dismiss collapse into custom. | |
| Recommended six + external_link + permission_request | Eight kinds; adds browser-url and OS-permission intents. | |

**User's choice:** Six kinds (navigate / submit / mutate / present / dismiss / custom).
**Notes:** `external_link` and `permission_request` use `custom: { name: "open_url" }` / `custom: { name: "request_camera_permission" }` until a cross-fixture pattern justifies elevation.

### Q4 — Actions registry scope: top-level or per-screen?

| Option | Description | Selected |
|--------|-------------|----------|
| Top-level, spec-wide | One `actions:` registry; any component references by id globally. | ✓ |
| Per-screen, screen-local | Each screen has its own actions list; duplication across screens. | |
| Top-level + screen-local overrides | Global registry + per-screen extensions. | |

**User's choice:** Top-level, spec-wide.

---

## Fixture App Selection

### Q1 — Which three fixtures?

| Option | Description | Selected |
|--------|-------------|----------|
| Habit tracker + Todo + Social feed | Together exercise every component in the closed 18-kind catalog at least once. | ✓ |
| Habit tracker + Weather + Timer | Stress-tests state + actions but narrower component coverage. | |
| Todo + Notes + Stopwatch (tight scope) | Small, quickly authorable; under-exercises Modal/Sheet/TabBar/NavBar. | |
| Social feed + Settings + Auth flow | Targets edge cases (non-data screens, form errors) over catalog breadth. | |

**User's choice:** Habit tracker + Todo + Social feed.

### Q2 — Which fixture satisfies the two-target fidelity gate?

| Option | Description | Selected |
|--------|-------------|----------|
| Habit tracker | Canonical CRUD+state+nav mobile app; NavBar/List/Card/Modal/Toggle/Button all have obvious SwiftUI/Compose mappings. | ✓ |
| One of the other two in my chosen mix | User picks from the selected mix. | |
| All three (stretch) | Hand-translate all three fixtures; probably over-scopes Phase 1. | |

**User's choice:** Habit tracker.
**Notes:** Hand-translated SwiftUI + Compose artifacts ship under `fixtures/targets/habit-tracker.swift` and `fixtures/targets/habit-tracker.kt`.

### Q3 — Hand-author or executor-drafted?

| Option | Description | Selected |
|--------|-------------|----------|
| Executor drafts, user reviews | Faster throughput; structural shape (3×3×2×5) is what's being validated, not content intent. | ✓ |
| User authors each fixture from scratch | Maximum authorial intent, slower Phase 1. | |
| Hybrid: user authors the gate fixture, executor drafts the others | Balance of authorship and throughput. | |

**User's choice:** Executor drafts, user reviews.

---

## Claude's Discretion

Areas where the user explicitly deferred to Claude's judgment during planning (defaults documented in `01-CONTEXT.md <decisions> § Claude's Discretion`):

- Diagnostic code taxonomy (SCREAMING_SNAKE, domain-prefixed)
- ID case conventions + uniqueness regex
- Acceptance-criteria shape (prose one-liners for v1)
- Migration runner function signature (`migrate(input: SpecV{n}): SpecV{n+1}`)
- `back_behavior` closed vocabulary (`"pop" | "dismiss" | "reset-to-root" | { kind: "replace", screen }`)

## Deferred Ideas

See `01-CONTEXT.md <deferred>` — structured acceptance criteria, `permission_request`/`external_link` as first-class kinds, sigil Unicode labels, sigil-on-non-interactable assertion-only testIDs, end-to-end JSON Pointer reachability analysis.
