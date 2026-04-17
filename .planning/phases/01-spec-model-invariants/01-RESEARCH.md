# Phase 1: Spec Model & Invariants — Research

**Researched:** 2026-04-17
**Domain:** TypeScript library — Zod v4 schema for a framework-agnostic mobile-app spec, with validator returning `Diagnostic[]` never throwing, migration scaffolding, and fixture-driven proof
**Confidence:** HIGH on stack versions, file layout, JSON Pointer choice; HIGH on the key finding that discriminated unions don't compose with recursion in Zod v4 (well documented, multiple GitHub issues agree); MEDIUM-HIGH on cross-reference validation pattern (single-pass superRefine is standard but combinatorial detail lives in the code).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Sigil Grammar**
- **D-01:** Sigil form is `[Label →action test:id]`. All three components are **required** when a sigil appears.
- **D-02:** Sigils appear **only on interactable elements** (Button, TextField, Toggle, SegmentedControl, tappable ListItem, Link-style Text). Non-interactables (plain Text, Icon, Divider, Spacer) never carry a sigil.
- **D-03:** `Label` content is **printable ASCII only** (`[A-Za-z0-9 \-_.]` plus standard punctuation). Escaping rules for literal `→` / `]` deferred — if needed, escape with `\u2192` / `\]`.
- **D-04:** Sigil is **write-shorthand only**. In-memory `Spec` stores `{ label: string, action: string, testID: string }` as three independent fields. Parser normalises sigil → triple on read; Serializer re-emits sigil on write. Wireframe renderer and Maestro emitter consume the structured triple, not the sigil string. **Phase 1 stores the triple only; sigil parsing/emission is Phase 2's problem.**
- **D-05:** `testID` is **globally unique across the entire spec**. Validator tracks a `Map<testID, ComponentPath>` during traversal and emits a `Diagnostic` on collision. Matches SwiftUI `.accessibilityIdentifier` + Compose `Modifier.testTag` + Maestro `id:` selector semantics.

**State Variants**
- **D-06:** Every screen declares **all four variants** (`content`, `empty`, `loading`, `error`) as siblings under `variants:`. Authors may set a variant to `null` (explicit N/A); validator permits `null` but forbids *omission* of the key.
- **D-07:** Each variant is a **full component tree**. No diffs against `content`, no slot swaps, no inherited nodes.
- **D-08:** Variant activation uses a **closed discriminated union** per kind:
  ```ts
  ContentVariant   = { kind: "content",  tree: ComponentNode[] }
  EmptyVariant     = { kind: "empty",    when: { collection:   JsonPointer }, tree: ComponentNode[] } | null
  LoadingVariant   = { kind: "loading",  when: { async:        JsonPointer }, tree: ComponentNode[] } | null
  ErrorVariant     = { kind: "error",    when: { field_error:  JsonPointer }, tree: ComponentNode[] } | null
  ```
- **D-09:** All `when` paths use **JSON Pointer (RFC 6901)**. One grammar across the spec.

**Interaction Model (Actions Registry)**
- **D-10:** Actions live in a **top-level `actions:` registry**. One map per spec; entries keyed by id. Same id bindable from multiple components.
- **D-11:** Components reference actions by **string id only**. Inline action definitions are forbidden. Validator errors on unresolved refs (`SPEC_UNRESOLVED_ACTION`).
- **D-12:** Each action is a typed intent union with six closed kinds in v1:
  - `{ kind: "navigate", screen: ScreenId, params?: Record<string, JsonPointer> }`
  - `{ kind: "submit",   entity: EntityName, source?: JsonPointer }`
  - `{ kind: "mutate",   target: JsonPointer, op: "toggle" | "set" | "push" | "remove", value?: Json }`
  - `{ kind: "present",  overlay: ScreenId }`
  - `{ kind: "dismiss" }`
  - `{ kind: "custom",   name: string, description?: string }`
- **D-13:** Validator cross-checks intent params: `navigate.screen` must exist in `screens:`; `submit.entity` must exist in `data.entities:`; `mutate.target` must resolve under the data model; `present.overlay` must be a screen with `kind: overlay` (Modal or Sheet). Each diagnostic has a specific code.

**Fixtures (success criteria #1 and #5)**
- **D-14:** Three canonical v1 fixtures under `fixtures/`:
  - `habit-tracker.spec.md` — NavBar + List + Card + Toggle + Modal; 2 entities (Habit, Completion); 5 interactions covering `navigate`, `submit`, `mutate`(toggle), `present`, `dismiss`.
  - `todo.spec.md` — TabBar + TextField + SegmentedControl + List; 2 entities (Task, Project); 5 interactions covering `submit`, `mutate`(push/remove), `navigate`, `custom`, `dismiss`.
  - `social-feed.spec.md` — Image + Card + List + NavBar + Sheet; 2 entities (Post, Author); 5 interactions covering `navigate`(with params), `present`, `mutate`(set), `submit`, `custom`.
  Between the three, every component in the closed 18-kind catalog appears at least once.
- **D-15:** `fixtures/malformed.spec.md` carries every class of diagnostic (missing `back_behavior`, unknown `kind`, dangling `→action`, JSON Pointer resolving to nothing, testID collision, variant key omission, action intent type mismatch).
- **D-16:** `habit-tracker.spec.md` is the **"two-target fidelity" gate fixture**. Hand-translated SwiftUI + Jetpack Compose committed under `fixtures/targets/habit-tracker.swift` and `fixtures/targets/habit-tracker.kt`.
- **D-17:** **Executor drafts, user reviews** all fixtures. Structural shape (3×3×2×5) is what matters. Fixtures live in `fixtures/` at repo root.

### Claude's Discretion

- **Diagnostic codes:** SCREAMING_SNAKE_CASE, namespaced by domain → `SPEC_UNKNOWN_COMPONENT`, `SPEC_UNRESOLVED_ACTION`, `SPEC_TESTID_COLLISION`, `SPEC_MISSING_BACK_BEHAVIOR`, `SPEC_VARIANT_OMITTED`, `SPEC_JSONPTR_UNRESOLVED`, `SPEC_ACTION_TYPE_MISMATCH`. Severity scale: `error | warning | info` only. `path` field is JSON Pointer into the spec AST.
- **ID case conventions:** screen ids, entity names, action ids, testIDs all `[a-z][a-z0-9_]*` (snake_case). Validator regex-enforces. Entity names are PascalCase exception — entities are types. Case-mismatch is a diagnostic, not fatal.
- **Uniqueness scopes:** screen ids, entity names, action ids, testIDs all unique spec-wide.
- **Acceptance criteria shape (SPEC-10):** prose one-liners in optional `acceptance:` array per screen. No structured given/when/then in v1.
- **Migration runner scaffold (SERDE-08):** file `src/migrations/v1_to_v2.ts` ships with signature `export function migrate(input: SpecV1): SpecV2` and empty-op body (`return input as unknown as SpecV2`). `src/migrations/index.ts` exposes `runMigrations(spec, fromVersion, toVersion)` chaining versioned migrators. Schema version: `export const SCHEMA_VERSION = "mobile-tui/1" as const` in `src/model/version.ts`.
- **Back-behavior vocabulary:** `back_behavior: "pop" | "dismiss" | "reset-to-root" | { kind: "replace", screen: ScreenId }`. Required on every non-root screen.

### Deferred Ideas (OUT OF SCOPE)

- Structured acceptance criteria (given/when/then or `{when, expect}` pairs) — v1 ships prose lines only.
- Per-screen state machines (XState-shaped) — v2.
- `permission_request` and `external_link` as first-class action kinds — use `custom: { name: "..." }` until a pattern demands elevation.
- Sigil-label escaping for Unicode labels — ASCII-only in v1.
- Sigil support on non-interactable elements for assertion-only testIDs — use `custom: { name: "noop" }` if needed.
- Static analysis of data-binding path reachability end-to-end under `mutate.op: push/remove` — prefix resolution only in Phase 1.
- File I/O, YAML parsing, markdown body, round-trip preservation — **Phase 2's job**. Phase 1's `validateSpec(spec: unknown)` takes a parsed object.
- Sigil-string parsing on read and sigil-string emission on write — **Phase 2's job**. Phase 1 stores the triple.
- Wireframe rendering — Phase 3.
- TypeBox — appears only in Phase 9's `pi.registerTool.parameters` slot.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SPEC-01 | Closed A2UI-shaped component catalog (18 kinds) | §Standard Stack (z.union + z.lazy recursion), §Architecture Patterns (closed-vocab enforcement via discriminatedUnion/union of literal `kind`), §Code Examples (ComponentNode schema) |
| SPEC-02 | Screens capture id, title, component tree | §Architecture Patterns (screen record with variants), §Code Examples (ScreenSchema) |
| SPEC-03 | Navigation graph + required `back_behavior` on every non-root screen | §Architecture Patterns (`back_behavior` discriminated union), §Code Examples (NavEdgeSchema + BackBehaviorSchema), §Common Pitfalls (PITFALLS §6.1) |
| SPEC-04 | Data models — entities, fields, relationships, JSON Pointer bindings (RFC 6901) | §Standard Stack (jsonpointer@5.0.1), §Code Examples (Entity schema + JsonPointer branded type) |
| SPEC-05 | State variants first-class per screen | §Architecture Patterns (variant discriminated union with JSON Pointer `when`), §Code Examples (VariantSchema) |
| SPEC-06 | Actions as named references, not inline handlers | §Architecture Patterns (top-level actions registry, cross-reference pass), §Code Examples (ActionSchema discriminated union) |
| SPEC-07 | testID sigils on interactable components | §Architecture Patterns (triple in memory, sigil in Phase 2), §Code Examples (InteractableBase type) |
| SPEC-10 | Per-screen optional acceptance criteria (prose lines) | §Architecture Patterns (optional `acceptance: string[]`), §Code Examples (ScreenSchema) |
| SERDE-08 | Schema migration runner scaffold at `migrations/v{n}_to_v{n+1}.ts` | §Architecture Patterns (versioned module + reducer chain), §Code Examples (runMigrations signature) |

</phase_requirements>

## Project Constraints (from CLAUDE.md)

Phase 1 MUST honor these directives verbatim:

- **Zod v4 for internal validation.** TypeBox only in Phase 9's `pi.registerTool.parameters` slot — **not introduced in Phase 1**.
- **No js-yaml, no chalk-as-primary, no SQLite, no chokidar, no dotenv, no zod v3, no Ink, no blessed.** Phase 1 adds only `zod` and `jsonpointer` as runtime deps.
- **Peer-dep pi packages.** Phase 1 has zero pi surface — no peer deps introduced yet (Phase 9 adds them).
- **Node `>=20`** in `engines.node`.
- **Type: `module`** — ESM only.
- **Runtime deps live in `dependencies`, not `devDependencies`** (pi installs with `--omit=dev`).
- **GSD workflow enforcement:** all edits happen under a GSD command; no direct repo edits outside.

## Summary

Phase 1 is **pure TypeScript library work** — zero pi surface, zero file I/O, zero TUI. The goal is to freeze the `Spec` type shape in Zod v4 schemas, expose a never-throwing `validateSpec(spec: unknown)` that returns `{ spec: Spec | null, diagnostics: Diagnostic[] }`, and ship the migration-runner scaffold + three canonical fixtures + one malformed fixture.

The single technically-non-trivial finding: **`z.discriminatedUnion` does NOT compose with recursion in Zod v4** [VERIFIED: colinhacks/zod#4264, #4714, #5288 — multiple open issues agree, #5288 closed as "not planned"]. Since the A2UI component tree is inherently recursive (`Column` contains `Column`) and we want closed-vocab enforcement on 18 `kind` values, we resolve by using `z.union([...])` wrapped in `z.lazy()` for the recursive `ComponentNode`, and keep `z.discriminatedUnion` for the non-recursive schemas (Action, Variant, BackBehavior). Type inference is preserved via explicit `z.ZodType<ComponentNode>` annotation on the lazy getter — this is the canonical Zod recursive-tree pattern.

Everything else is straight-line Zod work: `z.enum` for the 18-kind catalog, `z.discriminatedUnion("kind", [...])` for the six action kinds and four variant kinds, a single `superRefine` pass at the root that performs cross-reference validation (unresolved actions, dangling nav targets, JSON Pointer resolution, testID uniqueness) and emits `Diagnostic[]` entries with issue-path → JSON Pointer conversion. `safeParse` never throws; we map its `issues[]` to our `Diagnostic[]` shape and concatenate with cross-ref diagnostics.

**Primary recommendation:** Build the L2 model file by file in this order: (1) `primitives/` (branded IDs + `Result<T,E>` + JSON Pointer helpers using `jsonpointer@5.0.1`), (2) `model/version.ts` (`SCHEMA_VERSION` constant), (3) leaf schemas (action, back-behavior, field, entity), (4) recursive ComponentNode via `z.lazy` + `z.union`, (5) variant schemas (discriminated union, non-recursive), (6) Screen + NavigationGraph + Spec root schemas, (7) `validateSpec()` wrapping `safeParse` + a staged cross-reference pass, (8) `migrations/v1_to_v2.ts` + `migrations/index.ts` no-op runner, (9) fixtures. Tests are vitest; malformed.spec.md drives a snapshot test over the full `Diagnostic[]` output.

## Architectural Responsibility Map

Phase 1 is single-tier (pure TypeScript library). No frontend/backend/database split. But the conceptual "responsibility tiers" within the phase are worth enumerating for plan clarity.

| Capability | Primary Layer (within Phase 1) | Secondary Layer | Rationale |
|------------|--------------------------------|-----------------|-----------|
| Branded ID types, Result<T,E>, JSON Pointer helpers | L1 primitives (`src/primitives/`) | — | Pure helpers; depend on nothing else |
| Zod schemas + inferred types for Spec shape | L2 model (`src/model/`) | L1 | Composed from primitives; no file I/O |
| `validateSpec()` contract | L2 model (`src/model/invariants.ts`) | L1, leaf schemas | Single entry; wraps safeParse + cross-ref pass |
| Closed-vocabulary component catalog | L2 model (`src/model/component.ts`) | L1 (JsonPointer) | `z.union([...])` + `z.lazy` + explicit `z.ZodType<ComponentNode>` annotation |
| Variant/Action/BackBehavior discriminated unions | L2 model (`src/model/*.ts`) | L1 | Non-recursive; safe to use `z.discriminatedUnion` |
| Migration runner scaffold | L3 migrations (`src/migrations/`) | L2 (imports SpecV1 type) | Separate folder because migrations must never import from serializer/emitter/TUI |
| Fixture specs + malformed fixture | `fixtures/` at repo root | — | Ships with published package (not under `src/`) |
| Vitest snapshot tests against fixtures | `tests/` or colocated `*.test.ts` | — | Drives `validateSpec()` and exercises migration runner |

**Non-goal tiers (explicitly NOT in Phase 1):** L3 serialization (Phase 2), L4 emitters (Phase 3 wireframe, Phase 7 Maestro), L5 editor store (Phase 4), L6 TUI (Phases 5–6), L7 pi surface (Phase 9).

## Standard Stack

### Core (runtime deps — added in this phase)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `zod` | `^4.3.6` | Single SOT for Spec schema; drives `validateSpec()` via `safeParse`; `z.infer<typeof Spec>` produces the exported TypeScript types | **[VERIFIED: npm registry 2026-04-17 — current version 4.3.6, published 2026-01-25]** — locked by CONTEXT.md and CLAUDE.md stack table. Zod v4 is 14× faster string parsing, 10× faster tsc than v3. `safeParse` never throws — perfect fit for SPEC-09 contract. |
| `jsonpointer` | `^5.0.1` | RFC 6901 JSON Pointer get/set/has for `when:` path validation, `mutate.target` resolution, diagnostic path emission | **[VERIFIED: npm registry 2026-04-17 — 5.0.1, MIT, zero deps, 6.8kB unpacked]**. Types via `@types/jsonpointer@4.0.2`. Chosen over `json-pointer@0.6.2` (manuelstofer) because latter is 100kB with a `foreach` dep and no bundled types. [CITED: https://www.npmjs.com/package/jsonpointer] |

### Supporting (dev deps — first introduction of the toolchain in this phase)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `typescript` | `^5.6.x` | Type-only compilation (`tsc --noEmit` in CI); jiti handles execution at pi runtime | **[CLAUDE.md compat: pi-mono ecosystem pins `^5.6`; registry-current 6.0.3 deferred]**. `tsconfig.json` targets `ES2022`, `moduleResolution: "bundler"`, `strict: true`, `verbatimModuleSyntax: true`. See Open Question #1 (RESOLVED) — pinned to `^5.6.x` per CLAUDE.md §Development Tools; defer `^6.0` upgrade to a later phase once pi-mono ships 6.x compat. |
| `@types/jsonpointer` | `^4.0.2` | Type definitions for `jsonpointer` (library ships JS only) | Always — in `devDependencies`. |
| `vitest` | `^4.1.4` | Unit tests + snapshot tests for fixture Diagnostic[] output | **[VERIFIED: npm registry 2026-04-17 — 4.1.4]**. `toMatchSnapshot()` for malformed-fixture diagnostics, standard `expect().toEqual(...)` for schema parse results. |
| `@vitest/coverage-v8` | `^4.1.x` | Coverage on schema + validator logic | Ship with a coverage threshold (validator module should hit ≥95%, schemas ≥90%). |
| `@biomejs/biome` | `^2.4.12` | Linter + formatter | **[VERIFIED: npm registry 2026-04-17 — 2.4.12]**. Single binary, no ESLint+Prettier config fights. Matches pi-mono monorepo style. [CITED: https://medium.com/@onix_react/whats-new-in-biome-v2-4-00890baad13b] |
| `tsup` | `^8.5.1` | ESM + dts build to `dist/` for publish | **[VERIFIED: npm registry 2026-04-17 — 8.5.1]**. Treat `zod` and `jsonpointer` as NOT external (they must be in `dependencies`, per CLAUDE.md pi extension gotcha #2). Entry: `src/index.ts`. Output: ESM only. **Optional for Phase 1** — the build pipeline lives in tooling tasks; Phase 1 minimally needs it only to prove `tsc --noEmit` is green. Full `tsup` wiring can land here or slip to Phase 9 packaging. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `jsonpointer@5.0.1` | `json-pointer@0.6.2` (manuelstofer) | 14× larger (100kB vs 6.8kB), extra `foreach` transitive dep, no bundled types. Both implement RFC 6901 correctly. Pick `jsonpointer` for smaller surface. [VERIFIED: npm view both packages] |
| `jsonpointer@5.0.1` | Hand-rolled JSON Pointer (~30 LOC) | Doable — RFC 6901 escape rules (`~0` for `~`, `~1` for `/`) are simple [CITED: https://datatracker.ietf.org/doc/html/rfc6901]. But adding a verified 6.8kB dep with proper types costs less than auditing our own impl for the `~01`-vs-`/` decoding-order gotcha. **Recommendation: use the library.** |
| Zod v4 `z.discriminatedUnion` for recursive `ComponentNode` | Zod v4 `z.union` + `z.lazy` | **LOCKED by Zod v4 limitation:** `z.discriminatedUnion` does not compose with recursion — multiple issues (colinhacks/zod#4264, #4714, #5288) confirm "Cannot access 'list' before initialization" at runtime when getters reference the discriminated union during construction, and TS type inference collapses to `unknown`. `z.union` works correctly with `z.lazy` + explicit `z.ZodType<ComponentNode>` annotation. Runtime cost: linear try-each-variant instead of discriminator-keyed lookup. For 18 kinds on specs of 3–10 screens, this is irrelevant (parse runs at save, not keystroke). [VERIFIED: colinhacks/zod#4264, #5288] |
| Zod `z.discriminatedUnion` for Action | Zod `z.union` | Not necessary — Action is non-recursive (it's a flat tagged record). `z.discriminatedUnion("kind", [...])` gives faster parse + clearer errors. Use it. |
| Zod `z.discriminatedUnion` for Variant | Zod `z.union` | Variants are non-recursive at the top level (tree is recursive, but each variant wraps a tree — the variant itself is flat). Use `z.discriminatedUnion("kind", [...])` plus nullable wrapper for empty/loading/error. |
| Zod v4 `z.interface()` | `z.object()` | `z.interface()` is Zod v4's new syntax for recursive types with getters, but it's not required — `z.object({ ..., get subcategories() { return z.array(Category) } })` works equivalently. Use `z.object` throughout for consistency and because the recursive case uses `z.lazy` (not getter) anyway due to the discriminated-union constraint. [CITED: https://zod.dev/api#recursive-types] |
| Immer for diagnostic accumulation | Plain `diagnostics: Diagnostic[] = []` + `push()` | Not needed — Phase 1 builds diagnostic arrays imperatively in the superRefine + cross-ref pass; mutation of a local array is idiomatic here. |

**Installation:**

```bash
npm install zod jsonpointer
npm install -D typescript vitest @vitest/coverage-v8 @biomejs/biome tsup @types/jsonpointer
```

**Version verification (2026-04-17, against npm registry):**

| Package | Claimed | Verified | Published |
|---------|---------|----------|-----------|
| zod | 4.3.6 | 4.3.6 | 2026-01-25 |
| jsonpointer | 5.0.1 | 5.0.1 | over a year ago |
| @types/jsonpointer | 4.0.2 | 4.0.2 | — |
| typescript | 6.0.3 | 6.0.3 | — |
| vitest | 4.1.4 | 4.1.4 | — |
| @biomejs/biome | 2.4.12 | 2.4.12 | — |
| tsup | 8.5.1 | 8.5.1 | — |

## Architecture Patterns

### System Architecture Diagram

Phase 1 delivers a pure in-memory library. No I/O, no pi, no TUI. Data flow is synchronous and single-pass.

```
                                 consumer (tests, future Phase 2 serializer)
                                             │
                                             │ validateSpec(input: unknown)
                                             ▼
                        ┌─────────────────────────────────────────┐
                        │  src/model/invariants.ts                │
                        │  ┌───────────────────────────────────┐  │
                        │  │ Stage A: zod safeParse(input)     │  │
                        │  │  → {success, data|error}          │  │
                        │  │  → map error.issues → Diagnostic  │  │
                        │  └───────────────────────────────────┘  │
                        │          │                              │
                        │          │ if no structural errors:     │
                        │          ▼                              │
                        │  ┌───────────────────────────────────┐  │
                        │  │ Stage B: cross-reference pass     │  │
                        │  │  - action refs resolve            │  │
                        │  │  - nav targets resolve            │  │
                        │  │  - JSON Pointer paths resolve     │  │
                        │  │  - testID collision check         │  │
                        │  │  - back_behavior present on non-  │  │
                        │  │    root screens                   │  │
                        │  │  → append Diagnostic[] entries    │  │
                        │  └───────────────────────────────────┘  │
                        │          │                              │
                        │          ▼                              │
                        │   return { spec: Spec|null,             │
                        │            diagnostics: Diagnostic[] }  │
                        └─────────────────────────────────────────┘
                                             ▲
                                             │ composes
                        ┌────────────────────┴────────────────────┐
                        │                                         │
              ┌─────────▼──────────┐              ┌───────────────▼─────────┐
              │ src/model/spec.ts  │              │ src/primitives/         │
              │  Spec root         │              │   - ids.ts (branded)    │
              │    ↓ composes      │              │   - path.ts (JSON Ptr)  │
              │  Screen, Nav,      │              │   - result.ts           │
              │  DataModel,        │              └─────────────────────────┘
              │  Action, etc.      │                        │
              └─────────┬──────────┘                        │ imports
                        │                                   │
                        ▼                                   │
              ┌──────────────────────────┐                  │
              │ src/model/component.ts   │──────────────────┘
              │  ComponentNode           │
              │   recursive via z.lazy   │
              │   + z.union([18 kinds])  │
              │   + z.ZodType annotation │
              └──────────────────────────┘


                     ┌────────────────────────────────┐
                     │ src/migrations/                │   (Phase 1 scaffold)
                     │   - v1_to_v2.ts (empty-op)     │
                     │   - index.ts (runMigrations    │
                     │     chain)                     │
                     │   imports SpecV1 from model/   │
                     └────────────────────────────────┘


fixtures/habit-tracker.spec.md ─┐
fixtures/todo.spec.md           ├─► used by vitest tests that
fixtures/social-feed.spec.md    │   invoke validateSpec() on pre-parsed
fixtures/malformed.spec.md      │   Spec objects (Phase 1 does NOT read
fixtures/targets/               │   the .md files — that's Phase 2).
  habit-tracker.swift           │   Tests assert expected Diagnostic[].
  habit-tracker.kt              ┘
```

**Reading the diagram:**
1. Consumers (vitest tests today, Phase 2 serializer tomorrow) call `validateSpec(input)` with parsed JSON/YAML data.
2. Stage A runs Zod's `safeParse`; structural/type/enum violations become Diagnostics.
3. Stage B runs cross-reference checks that Zod can't express cleanly (identity-based resolution, path resolution against sibling data, uniqueness across traversal).
4. The return is always `{ spec, diagnostics }` — never throws.
5. `src/migrations/` is scaffolding only — an empty-op v1_to_v2 proves the chain works.
6. Fixtures are data files. Phase 1 tests feed pre-parsed JSON (authored in TS test files or parsed via a minimal test helper) to `validateSpec`. The `.md` parsing itself is Phase 2.

### Recommended Project Structure

```
mobile-tui/
├── package.json                # runtime: zod, jsonpointer; devs: TS, vitest, biome, tsup
├── tsconfig.json               # ES2022, bundler, strict, verbatimModuleSyntax
├── biome.json                  # extends recommended + noExplicitAny:error
├── vitest.config.ts            # globals:false; include src/**/*.test.ts + tests/**/*.test.ts
├── src/
│   ├── primitives/             # L1 — pure helpers, no deps on L2+
│   │   ├── ids.ts              # ScreenId, EntityName, ActionId, TestID branded strings
│   │   ├── path.ts             # JsonPointer branded string + resolve/has helpers (jsonpointer)
│   │   ├── result.ts           # Result<T, E> + helpers (ok/err/isOk/isErr)
│   │   ├── diagnostic.ts       # Diagnostic type + severity enum + factory helpers
│   │   └── index.ts
│   ├── model/                  # L2 — Spec type + Zod schemas + validator
│   │   ├── version.ts          # export const SCHEMA_VERSION = "mobile-tui/1" as const
│   │   ├── component.ts        # ComponentNode recursive schema (z.lazy + z.union)
│   │   ├── action.ts           # Action discriminated union (6 kinds)
│   │   ├── variant.ts          # Variant discriminated union (4 kinds, nullable)
│   │   ├── back-behavior.ts    # BackBehavior discriminated union
│   │   ├── data.ts             # Entity, Field, FieldType, Relationship
│   │   ├── navigation.ts       # NavEdge, NavigationGraph
│   │   ├── screen.ts           # Screen schema (composes variants, acceptance, back_behavior)
│   │   ├── spec.ts             # Spec root schema (composes everything)
│   │   ├── invariants.ts       # validateSpec() + cross-ref passes
│   │   └── index.ts            # re-exports: Spec type, validateSpec, SCHEMA_VERSION, Diagnostic
│   ├── migrations/             # L3 migrations (scaffold only in Phase 1)
│   │   ├── v1_to_v2.ts         # empty-op: export function migrate(s: SpecV1): SpecV2
│   │   ├── index.ts            # runMigrations(spec, fromVersion, toVersion) chain
│   │   └── index.test.ts       # no-op migration round-trips habit-tracker fixture
│   └── index.ts                # library entry: re-exports model/ + migrations/
├── fixtures/                   # v1 canonical fixtures (ships with published package)
│   ├── habit-tracker.spec.md   # 3 screens, 2 entities, 5 interactions
│   ├── todo.spec.md            # 3 screens, 2 entities, 5 interactions
│   ├── social-feed.spec.md     # 3 screens, 2 entities, 5 interactions
│   ├── malformed.spec.md       # every diagnostic code triggered
│   └── targets/
│       ├── habit-tracker.swift  # hand-translated SwiftUI — two-target fidelity gate
│       └── habit-tracker.kt     # hand-translated Jetpack Compose
└── tests/
    ├── helpers/
    │   └── parse-fixture.ts    # MINIMAL frontmatter reader (just enough for tests;
    │                           # NOT the production parser — that's Phase 2)
    ├── fixtures.test.ts        # asserts 3 canonical fixtures validate with 0 errors
    ├── malformed.test.ts       # asserts malformed.spec.md produces expected Diagnostic[]
    └── migrations.test.ts      # asserts runMigrations(v1_spec, "1", "1") round-trips
```

**Why this layout:**

- **One folder per layer** — `primitives/` → `model/` → `migrations/`. Later phases (`serialize/`, `emit/`, `editor/`, `tui/`) will live as siblings. ESLint/Biome `no-restricted-imports` can enforce the direction.
- **`model/` split by concept, not by schema size.** `component.ts` is the only recursive schema; isolating it from the rest of `model/` keeps the `z.lazy` pattern in one file.
- **`fixtures/` at repo root, not under `tests/` or `src/`** — fixtures ship with the published package per D-17. This is both a distribution decision (users get example specs with the install) and a documentation decision (fixtures are runnable schema reference).
- **`tests/helpers/parse-fixture.ts`** is a test-only, minimal YAML-frontmatter + JSON-ish body reader. It is NOT the production parser. Production parsing is Phase 2. The helper lives in `tests/` to keep that boundary explicit. **Alternative:** author fixtures as `.ts` files that export a `Spec` literal directly — skip the helper entirely. **Recommendation:** ship `.md` fixtures (matches D-14 wording) and build the test helper; Phase 2's real parser replaces it later. See Open Questions #2.
- **`migrations/index.test.ts` colocated** — the no-op migration round-trip test proves the chain works; keeping it beside `index.ts` makes it the first thing Phase N+1 authors see when adding a new migrator.

### Pattern 1: Recursive Component Tree via `z.lazy` + `z.union` + Explicit Type Annotation

**What:** The A2UI-shaped component tree is recursive — a `Column` contains children that may include `Column`, `Row`, `Card`, `List`, etc. Zod v4's `z.discriminatedUnion` fails here (see Alternatives Considered). The canonical workaround is `z.union` wrapped in `z.lazy`, with an explicit `z.ZodType<ComponentNode>` type annotation on the lazy schema so TypeScript inference works.

**When to use:** Only for the recursive schemas in Phase 1 (`ComponentNode` and its variant-tree wrapper). Non-recursive schemas (Action, Variant kind header, BackBehavior) should stay on `z.discriminatedUnion` for faster parse + clearer errors.

**Example:**

```typescript
// src/model/component.ts
// Source pattern: [CITED: https://zod.dev/api#recursive-types]
//                 + [VERIFIED: colinhacks/zod#4264, #5288 — discriminatedUnion doesn't compose]
import { z } from "zod";
import { JsonPointerSchema } from "../primitives/path";
import { TestIDSchema } from "../primitives/ids";

// 18-kind closed catalog
const COMPONENT_KINDS = [
  "Column", "Row", "Text", "Button", "TextField",
  "List", "ListItem", "Card", "Image", "Icon",
  "Divider", "Toggle", "SegmentedControl", "TabBar",
  "NavBar", "Modal", "Sheet", "Spacer",
] as const;

export type ComponentKind = (typeof COMPONENT_KINDS)[number];
export const ComponentKindSchema = z.enum(COMPONENT_KINDS);

// Interactable base — carries the sigil triple in memory (per D-04)
const InteractableBase = z.object({
  label: z.string().regex(/^[\x20-\x7E]+$/, "ASCII-only label"),
  action: z.string().regex(/^[a-z][a-z0-9_]*$/, "snake_case action id"),
  testID: z.string().regex(/^[a-z][a-z0-9_]*$/, "snake_case testID"),
});

// --- Leaf (non-recursive) component schemas ---
const TextNode = z.object({
  kind: z.literal("Text"),
  text: z.string(),
  style: z.enum(["heading-1", "heading-2", "body", "caption"]).optional(),
});

const IconNode = z.object({
  kind: z.literal("Icon"),
  name: z.string(),
});

const DividerNode = z.object({ kind: z.literal("Divider") });
const SpacerNode = z.object({
  kind: z.literal("Spacer"),
  size: z.enum(["sm", "md", "lg"]).optional(),
});

const ImageNode = z.object({
  kind: z.literal("Image"),
  source: z.string(),
  alt: z.string(),
});

const ButtonNode = InteractableBase.extend({
  kind: z.literal("Button"),
  variant: z.enum(["primary", "secondary", "text"]).optional(),
});

const TextFieldNode = InteractableBase.extend({
  kind: z.literal("TextField"),
  placeholder: z.string().optional(),
  bindsTo: JsonPointerSchema.optional(),
});

const ToggleNode = InteractableBase.extend({
  kind: z.literal("Toggle"),
  bindsTo: JsonPointerSchema.optional(),
});

const SegmentedControlNode = InteractableBase.extend({
  kind: z.literal("SegmentedControl"),
  options: z.array(z.string()).min(2),
  bindsTo: JsonPointerSchema.optional(),
});

// --- Recursive declarations ---
// Forward declare the TypeScript type so z.lazy's annotation works.
export type ComponentNode =
  | { kind: "Text"; text: string; style?: string }
  | { kind: "Icon"; name: string }
  | { kind: "Divider" }
  | { kind: "Spacer"; size?: "sm" | "md" | "lg" }
  | { kind: "Image"; source: string; alt: string }
  | { kind: "Button"; label: string; action: string; testID: string; variant?: string }
  | { kind: "TextField"; label: string; action: string; testID: string; placeholder?: string; bindsTo?: string }
  | { kind: "Toggle"; label: string; action: string; testID: string; bindsTo?: string }
  | { kind: "SegmentedControl"; label: string; action: string; testID: string; options: string[]; bindsTo?: string }
  | { kind: "Column"; children: ComponentNode[]; align?: string; gap?: string }
  | { kind: "Row"; children: ComponentNode[]; align?: string; gap?: string }
  | { kind: "Card"; child: ComponentNode }
  | { kind: "List"; itemTemplate: ComponentNode; bindsTo: string }
  | { kind: "ListItem"; children: ComponentNode[]; label?: string; action?: string; testID?: string }
  | { kind: "NavBar"; title: string; leading?: ComponentNode; trailing?: ComponentNode }
  | { kind: "TabBar"; items: Array<{ label: string; action: string; testID: string; icon?: string }> }
  | { kind: "Modal"; child: ComponentNode }
  | { kind: "Sheet"; child: ComponentNode };

// The lazy schema. Explicit z.ZodType<ComponentNode> annotation is REQUIRED
// for TypeScript inference to terminate on recursive union.
export const ComponentNodeSchema: z.ZodType<ComponentNode> = z.lazy(() =>
  z.union([
    TextNode,
    IconNode,
    DividerNode,
    SpacerNode,
    ImageNode,
    ButtonNode,
    TextFieldNode,
    ToggleNode,
    SegmentedControlNode,
    // Recursive branches — reference ComponentNodeSchema via the lazy wrapper
    z.object({
      kind: z.literal("Column"),
      children: z.array(ComponentNodeSchema),
      align: z.enum(["start", "center", "end"]).optional(),
      gap: z.enum(["sm", "md", "lg"]).optional(),
    }),
    z.object({
      kind: z.literal("Row"),
      children: z.array(ComponentNodeSchema),
      align: z.enum(["start", "center", "end"]).optional(),
      gap: z.enum(["sm", "md", "lg"]).optional(),
    }),
    z.object({
      kind: z.literal("Card"),
      child: ComponentNodeSchema,
    }),
    z.object({
      kind: z.literal("List"),
      itemTemplate: ComponentNodeSchema,
      bindsTo: JsonPointerSchema,
    }),
    z.object({
      kind: z.literal("ListItem"),
      children: z.array(ComponentNodeSchema),
      label: z.string().optional(),
      action: z.string().optional(),
      testID: z.string().optional(),
    }).refine(
      // Either all three (interactable) or none (container)
      (v) => (v.label && v.action && v.testID) || (!v.label && !v.action && !v.testID),
      { message: "ListItem sigil triple must be all-or-nothing" }
    ),
    z.object({
      kind: z.literal("NavBar"),
      title: z.string(),
      leading: ComponentNodeSchema.optional(),
      trailing: ComponentNodeSchema.optional(),
    }),
    z.object({
      kind: z.literal("TabBar"),
      items: z.array(
        InteractableBase.extend({ icon: z.string().optional() })
      ).min(2).max(5),
    }),
    z.object({
      kind: z.literal("Modal"),
      child: ComponentNodeSchema,
    }),
    z.object({
      kind: z.literal("Sheet"),
      child: ComponentNodeSchema,
    }),
  ])
);
```

**Why this works:**

- `z.lazy(() => z.union([...]))` defers schema construction until evaluation time, breaking the `Cannot access ... before initialization` cycle [VERIFIED: colinhacks/zod#4264].
- `z.union` accepts self-reference inside its argument array (via the lazy thunk).
- `z.ZodType<ComponentNode>` on the left-hand side terminates TypeScript's recursive inference — without it, the inferred type collapses to `any` or `unknown` [CITED: https://zod.dev/api#recursive-types].
- `z.discriminatedUnion("kind", ...)` cannot be substituted here — verified limitation.
- Parse performance is linear over the 18 branches (vs. constant-time discriminator lookup). For 3–10 screen specs at <10kB, this is not a concern; parsing runs at save time, not per keystroke.

### Pattern 2: Non-Recursive Discriminated Union for Action / Variant / BackBehavior

**What:** Where the type shape is non-recursive (flat tagged records), `z.discriminatedUnion("kind", [...])` is the correct tool — faster parse, clearer errors, and composes cleanly.

**Example:**

```typescript
// src/model/action.ts
import { z } from "zod";
import { ScreenIdSchema, EntityNameSchema } from "../primitives/ids";
import { JsonPointerSchema } from "../primitives/path";

const NavigateAction = z.object({
  kind: z.literal("navigate"),
  screen: ScreenIdSchema,
  params: z.record(z.string(), JsonPointerSchema).optional(),
});
const SubmitAction = z.object({
  kind: z.literal("submit"),
  entity: EntityNameSchema,
  source: JsonPointerSchema.optional(),
});
const MutateAction = z.object({
  kind: z.literal("mutate"),
  target: JsonPointerSchema,
  op: z.enum(["toggle", "set", "push", "remove"]),
  value: z.unknown().optional(),  // any JSON value
});
const PresentAction = z.object({
  kind: z.literal("present"),
  overlay: ScreenIdSchema,
});
const DismissAction = z.object({ kind: z.literal("dismiss") });
const CustomAction = z.object({
  kind: z.literal("custom"),
  name: z.string(),
  description: z.string().optional(),
});

export const ActionSchema = z.discriminatedUnion("kind", [
  NavigateAction, SubmitAction, MutateAction,
  PresentAction, DismissAction, CustomAction,
]);

export type Action = z.infer<typeof ActionSchema>;
```

Same pattern for `BackBehavior` (string literals union + object literal for `replace`) and the `Variant` kind header (even though each variant carries a `tree: ComponentNode[]` that IS recursive via `ComponentNodeSchema`, the variant discriminator itself is flat so `discriminatedUnion` works — the recursion is confined to the component schema reference).

### Pattern 3: Two-Stage Validation — `safeParse` + Cross-Reference `superRefine` at Root

**What:** Zod's `safeParse` catches structural errors (wrong types, missing fields, unknown enum values). Cross-reference validation (does `navigate.screen` exist in `screens:`? is this testID unique spec-wide?) can't be expressed within a single schema because it needs identity-based resolution across sibling branches. Two approaches:

**Option A — single-pass `z.superRefine` at the Spec root.** The Spec schema carries a top-level `.superRefine()` that receives the whole parsed Spec and adds `ctx.addIssue(...)` entries for every cross-ref violation. Zod's issue-path becomes the diagnostic path.

**Option B — staged: `safeParse` first, then an external `crossReferencePass(spec)` function that appends to the Diagnostic[] array.** Cleaner separation of concerns; avoids mixing structural + semantic issues in one traversal.

**Recommendation: Option B.** Reasons:
1. `safeParse` can return structural errors with paths that are nonsensical for cross-ref checks (e.g., if `screens` isn't an array, cross-ref pass should skip entirely).
2. Cross-ref pass needs a fully-typed Spec; running it inside `superRefine` means operating on a partial/unvalidated shape.
3. Easier to test: each pass is a pure function with its own test file.
4. Diagnostic codes divide cleanly: Zod issues → structural codes (`ZOD_INVALID_TYPE`, `ZOD_UNKNOWN_ENUM`, etc., wrapped); cross-ref → our namespaced codes (`SPEC_UNRESOLVED_ACTION`, etc.).

**Example:**

```typescript
// src/model/invariants.ts
import { SpecSchema, type Spec } from "./spec";
import { type Diagnostic } from "../primitives/diagnostic";
import { zodIssuesToDiagnostics } from "./zod-issue-adapter";
import { crossReferencePass } from "./cross-reference";

export function validateSpec(
  input: unknown
): { spec: Spec | null; diagnostics: Diagnostic[] } {
  const parsed = SpecSchema.safeParse(input);

  if (!parsed.success) {
    // Structural errors only — cross-ref pass would be unsafe on partial data
    return {
      spec: null,
      diagnostics: zodIssuesToDiagnostics(parsed.error.issues),
    };
  }

  // Structural pass green → run cross-reference pass on typed data
  const crossRefDiagnostics = crossReferencePass(parsed.data);

  // Spec is returned even if cross-ref emits errors — caller (Phase 2
  // serializer) gates write-through on severity === "error"; the Spec
  // value is still structurally valid and usable for read-only operations.
  return {
    spec: parsed.data,
    diagnostics: crossRefDiagnostics,
  };
}
```

### Pattern 4: Zod `issues[].path` → RFC 6901 JSON Pointer Conversion

**What:** Zod `safeParse` returns `error.issues`, each with a `path: (string | number)[]` indicating the location of the error. Our Diagnostic shape wants a JSON Pointer string. A small adapter converts.

**Example:**

```typescript
// src/primitives/path.ts — helpers + branded type
import { z } from "zod";

// Branded type for compile-time safety
export type JsonPointer = string & { readonly __brand: "JsonPointer" };

// RFC 6901: empty string = whole document; "/" = object member with empty string name
export const JsonPointerSchema = z
  .string()
  .regex(/^(\/([^~/]|~[01])*)*$/, "invalid JSON Pointer (RFC 6901)")
  .transform((s) => s as JsonPointer);

// Encode a segment: RFC 6901 escape rules, order matters
export function encodeSegment(s: string): string {
  return s.replace(/~/g, "~0").replace(/\//g, "~1");
}

// Decode a segment: RFC 6901 decode order (/~1/ first, then /~0/)
export function decodeSegment(s: string): string {
  return s.replace(/~1/g, "/").replace(/~0/g, "~");
}

// Convert Zod's path to a JSON Pointer string
// Source: [VERIFIED: RFC 6901 §3 — datatracker.ietf.org/doc/html/rfc6901]
export function pathToJsonPointer(path: ReadonlyArray<string | number>): JsonPointer {
  if (path.length === 0) return "" as JsonPointer;
  return ("/" + path.map((seg) => encodeSegment(String(seg))).join("/")) as JsonPointer;
}
```

```typescript
// src/model/zod-issue-adapter.ts
import type { z } from "zod";
import { pathToJsonPointer } from "../primitives/path";
import type { Diagnostic } from "../primitives/diagnostic";

// Map Zod v4 issue codes to our SPEC_* namespace where it makes sense;
// leave the rest as ZOD_* so they're still traceable.
const CODE_MAP: Record<string, string> = {
  invalid_type: "SPEC_INVALID_TYPE",
  invalid_literal: "SPEC_INVALID_VALUE",
  invalid_enum_value: "SPEC_UNKNOWN_ENUM_VALUE",
  unrecognized_keys: "SPEC_UNKNOWN_FIELD",
  // ...etc.
};

export function zodIssuesToDiagnostics(
  issues: ReadonlyArray<z.core.$ZodIssue>
): Diagnostic[] {
  return issues.map((issue) => ({
    code: CODE_MAP[issue.code] ?? `ZOD_${issue.code.toUpperCase()}`,
    severity: "error",
    path: pathToJsonPointer(issue.path),
    message: issue.message,
  }));
}
```

### Pattern 5: Cross-Reference Pass — Visitor with Path Accumulator

**What:** Walk the Spec tree once, building up a set of registered IDs (screen ids, entity names, action ids, testIDs) and a map of where each was declared. Then walk a second time (or accumulate during the first walk) checking references resolve. This is more readable than stuffing the logic into a root-level superRefine.

**Structure:**

```typescript
// src/model/cross-reference.ts
import type { Spec } from "./spec";
import type { Diagnostic } from "../primitives/diagnostic";
import { pathToJsonPointer } from "../primitives/path";
import * as jsonpointer from "jsonpointer";

export function crossReferencePass(spec: Spec): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  // --- Pass 1: collect declarations ---
  const declaredScreens = new Set(spec.screens.map((s) => s.id));
  const declaredEntities = new Set(spec.data.entities.map((e) => e.name));
  const declaredActions = new Set(Object.keys(spec.actions));
  const testIDRegistry = new Map<string, string>();  // testID → first-seen JSON Pointer

  // --- Pass 2: walk for references + collisions ---

  // back_behavior required on every non-root screen
  for (const [idx, screen] of spec.screens.entries()) {
    if (screen.id !== spec.navigation.root && !screen.back_behavior) {
      diagnostics.push({
        code: "SPEC_MISSING_BACK_BEHAVIOR",
        severity: "error",
        path: pathToJsonPointer(["screens", idx, "back_behavior"]),
        message: `Non-root screen "${screen.id}" must declare back_behavior`,
      });
    }

    // Variant key omission — all four keys must be present (null allowed)
    for (const key of ["content", "empty", "loading", "error"] as const) {
      if (!(key in screen.variants)) {
        diagnostics.push({
          code: "SPEC_VARIANT_OMITTED",
          severity: "error",
          path: pathToJsonPointer(["screens", idx, "variants", key]),
          message: `Screen "${screen.id}" must declare variant key "${key}" (use null for N/A)`,
        });
      }
    }

    // Walk component tree for testID collisions + sigil action resolution
    walkComponentTree(screen.variants.content?.tree ?? [],
      ["screens", idx, "variants", "content", "tree"],
      { declaredActions, testIDRegistry, diagnostics });
    // ... same for empty/loading/error variants
  }

  // Action intent type cross-checks
  for (const [actionId, action] of Object.entries(spec.actions)) {
    switch (action.kind) {
      case "navigate":
        if (!declaredScreens.has(action.screen)) {
          diagnostics.push({
            code: "SPEC_UNRESOLVED_ACTION",
            severity: "error",
            path: pathToJsonPointer(["actions", actionId, "screen"]),
            message: `navigate.screen "${action.screen}" not found in screens`,
          });
        }
        break;
      case "submit":
        if (!declaredEntities.has(action.entity)) {
          diagnostics.push({
            code: "SPEC_UNRESOLVED_ACTION",
            severity: "error",
            path: pathToJsonPointer(["actions", actionId, "entity"]),
            message: `submit.entity "${action.entity}" not found in data.entities`,
          });
        }
        break;
      case "mutate":
        // Resolve prefix under data model; full push/remove array-shape validation
        // is explicitly out of scope per CONTEXT.md deferred item.
        if (!resolveJsonPointerPrefix(spec, action.target)) {
          diagnostics.push({
            code: "SPEC_JSONPTR_UNRESOLVED",
            severity: "error",
            path: pathToJsonPointer(["actions", actionId, "target"]),
            message: `mutate.target "${action.target}" does not resolve under data model`,
          });
        }
        break;
      case "present":
        const overlay = spec.screens.find((s) => s.id === action.overlay);
        if (!overlay) {
          diagnostics.push({
            code: "SPEC_UNRESOLVED_ACTION",
            severity: "error",
            path: pathToJsonPointer(["actions", actionId, "overlay"]),
            message: `present.overlay "${action.overlay}" not found in screens`,
          });
        } else if (overlay.kind !== "overlay") {
          diagnostics.push({
            code: "SPEC_ACTION_TYPE_MISMATCH",
            severity: "error",
            path: pathToJsonPointer(["actions", actionId, "overlay"]),
            message: `present.overlay "${action.overlay}" must be an overlay screen (Modal or Sheet)`,
          });
        }
        break;
    }
  }

  return diagnostics;
}
```

### Anti-Patterns to Avoid

- **Using `z.discriminatedUnion` for ComponentNode.** Verified to break in Zod v4 (runtime error + TS inference loss). Use `z.union` + `z.lazy` + explicit `z.ZodType<ComponentNode>` annotation.
- **Throwing from `validateSpec()`.** Contract forbids it (SPEC-09). Every error path returns `{ spec: null, diagnostics: [...] }`; uncaught throws are a contract violation.
- **Cross-ref logic inside individual field schemas.** E.g., a `z.string().refine((s) => declaredScreens.has(s))` inside NavigateAction — this requires passing context through schema construction and is fragile. Keep cross-ref in the post-parse pass.
- **Mutating `input` in `validateSpec`.** The spec must be immutable; all ID normalization (if any) happens in Phase 2's parser.
- **Parsing fixtures with gray-matter/yaml in Phase 1 tests.** This leaks serialization concerns into model tests. Either author fixtures as `.ts` literal exports or ship a minimal test-only helper that Phase 2 will supersede.
- **Making `severity` a free string.** Use `z.enum(["error", "warning", "info"])` so the enum is closed from day one.
- **`z.object({}).passthrough()` for unknown fields on Spec root.** Phase 2 owns the `_unknown:` bucket (SPEC-08). Phase 1's Spec schema is `.strict()` — unknown top-level keys produce `SPEC_UNKNOWN_FIELD` diagnostics.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON Pointer get/has/resolve | Custom ~30 LOC implementation | `jsonpointer@5.0.1` | RFC 6901 escape-decode order gotcha (`~01` must not become `/`); library is 6.8kB, zero deps, bundled types. [VERIFIED: npm view jsonpointer, RFC 6901 §4] |
| Schema validation + type inference | Hand-written type guards + assertions | `zod@4.3.6` | Locked by CLAUDE.md, and — more importantly — `z.infer` is the single source of truth binding runtime validation to compile-time types. Hand-rolled guards drift from types. |
| Recursive TypeScript tree validation | `switch`/`if` chain on `kind` | Zod `z.union` + `z.lazy` + `z.ZodType<T>` | Combinatorial explosion across 18 kinds × N levels of nesting. Zod handles this with one schema definition. |
| Migration chain runner | Custom register-by-version dictionary | A simple reducer over a versioned-module array | The chain has literally zero migrations in Phase 1 — don't over-engineer. Pattern: `export const migrations = [v1_to_v2]; runMigrations(spec, from, to)` maps `from..to` into an index range, reduces. ~15 LOC; no library needed. |
| Diagnostic-path formatting | Stringify arrays as `"/foo/0/bar"` manually | `pathToJsonPointer(path)` helper (~10 LOC, uses jsonpointer escape rules) | Must be RFC 6901 compliant — `foo/bar` in a key must serialize as `foo~1bar`. Tiny function, but the escaping is non-obvious. |
| Fixture markdown parsing in Phase 1 | gray-matter / yaml integration | Test-only helper OR fixtures as `.ts` exports | Phase 2 owns `.md` parsing. Introducing gray-matter in Phase 1 pulls serialization concerns into the model layer. |

**Key insight:** Phase 1's surface area is already small (one validator, one set of schemas, one scaffold). The risk isn't "under-library" — it's "over-abstraction." Don't add `fp-ts`, don't add `io-ts`, don't add custom branded-type libraries, don't add immer. Zod + jsonpointer + ~30 LOC of helpers is the whole runtime.

## Common Pitfalls

### Pitfall 1: Zod recursive discriminated union collapses TS inference

**What goes wrong:** Using `z.discriminatedUnion("kind", [...])` for ComponentNode produces "Cannot access 'ComponentNodeSchema' before initialization" at runtime AND collapses inferred type to `{ [x: string]: any; kind?: unknown }`.
**Why it happens:** `z.discriminatedUnion` eagerly walks branch schemas to build its discriminator map before lazy evaluation fires. [VERIFIED: colinhacks/zod#4264, #5288]
**How to avoid:** Use `z.union` + `z.lazy` + explicit `z.ZodType<ComponentNode>` annotation. Reserve `z.discriminatedUnion` for non-recursive unions (Action, Variant wrapper, BackBehavior).
**Warning signs:** Any `z.infer` that lands on `{ [x: string]: any }` or `unknown`. Run `tsc --noEmit` on every schema file.

### Pitfall 2: Zod `safeParse` issue.path leaks to callers unchanged

**What goes wrong:** Phase 2 serializer receives Diagnostic[] with `path: (string | number)[]` and either emits it as-is into the saved spec (wrong — caller expects JSON Pointer string per D-09) or does ad-hoc string-joining without RFC 6901 escaping (silently breaks for keys containing `/` or `~`).
**Why it happens:** Zod returns its own path shape; the Diagnostic contract uses JSON Pointer string.
**How to avoid:** `pathToJsonPointer()` helper in `src/primitives/path.ts` is the ONLY conversion allowed; the adapter runs inside `zodIssuesToDiagnostics`. Diagnostic.path is typed as `JsonPointer` (branded string) to prevent accidental raw-array leaks.
**Warning signs:** Test snapshot shows `"path":[“screens”,0,"id"]` instead of `"path":"/screens/0/id"`.

### Pitfall 3: testID collision tracker walks only top-level components

**What goes wrong:** The cross-ref pass checks testIDs on `screen.variants.content.tree[*]` at the top level but skips descendants (children of Column, items of List, etc.) — collisions deep in the tree are missed.
**Why it happens:** Writing a shallow visitor is faster than writing a full recursive walker; devs skip the nested case thinking "I'll come back to it."
**How to avoid:** Write `walkComponentTree(node, path, ctx)` as a full recursive function from the start. Test it against a fixture with a deep tree (habit-tracker's Card inside List inside Column).
**Warning signs:** Malformed fixture has a testID collision inside a nested List but tests don't flag it.

### Pitfall 4: JSON Pointer "resolves under data model" is under-specified

**What goes wrong:** CONTEXT.md says `mutate.target` must "resolve under the data model." But `mutate.op: push` requires the target to be an array; `mutate.op: set` requires it to be any valid path; `mutate.op: toggle` requires it to be a boolean field. Per CONTEXT.md deferred list, full array-shape validation under push/remove is out of scope for Phase 1 — but the "resolve" check itself must be specified.
**Why it happens:** The data model isn't a concrete JSON instance — it's a *type definition* (Entity + Fields). A JSON Pointer of `/habit/0/title` doesn't resolve against "the entity definition" the way it would against "a habit instance."
**How to avoid:** Phase 1 resolves `mutate.target` against the **entity/field name space**, not against a hypothetical instance. Rule: pointer `/EntityName/field_name` resolves iff `EntityName` is in `data.entities` and `field_name` is one of its fields. Array indices and nested refs are validated only structurally (must be numeric or snake_case). This matches CONTEXT.md "prefix resolves to a defined entity field."
**Warning signs:** Cross-ref pass emits `SPEC_JSONPTR_UNRESOLVED` for paths that hand-inspection confirms valid; or fails to emit for paths like `/Habit/nonexistent_field`.

### Pitfall 5: Fixtures re-validate but habit-tracker hand-translations drift

**What goes wrong:** The two-target fidelity gate (D-16) requires `fixtures/targets/habit-tracker.swift` and `.kt` to hand-translate the spec. During Phase 1, `habit-tracker.spec.md` evolves as the schema solidifies; SwiftUI and Compose artifacts were committed on day 1 and never updated. By Phase 1 end the two files describe a stale spec.
**Why it happens:** Hand-translated artifacts are easy to forget. They look "done" once committed.
**How to avoid:** Commit the hand-translations LAST — only after `habit-tracker.spec.md` is locked green and the schema is frozen. Treat the gate as "committable only when spec is final." Include a doc comment at the top of each target file pointing at the spec version/commit it was translated from.
**Warning signs:** A reviewer asks "does this translation match the current spec?" and the answer is "let me check."

### Pitfall 6: `validateSpec(null)` or `validateSpec(undefined)` throws

**What goes wrong:** Someone calls `validateSpec()` with no args, or with the result of `YAML.parse("")` which is `undefined`. Zod's `safeParse(undefined)` handles this correctly (returns `{ success: false, error: ... }`), but wrapper code that does `parsed.error.issues.map(...)` without guarding for `parsed.error === undefined` in the happy path throws.
**Why it happens:** TypeScript narrowing feels safe but isn't audited for the `issues` length zero case or null-input case.
**How to avoid:** Unit test `validateSpec(null)`, `validateSpec(undefined)`, `validateSpec(42)`, `validateSpec([])`, `validateSpec({})`, and `validateSpec("arbitrary string")`. Each must return `{ spec: null, diagnostics: [at least one error] }` without throwing. Add these as the first set of tests in `malformed.test.ts`.
**Warning signs:** A test that passes `null` throws instead of returning diagnostics.

### Pitfall 7: Migration runner chain signature can't be typed across versions

**What goes wrong:** `runMigrations<From, To>(spec, from, to)` wants `From` to narrow by `from: "1"`, but TypeScript can't resolve the chain `v1 → v2 → v3` as an indexed type without a versioned map.
**Why it happens:** Chained migrations have heterogeneous input/output types at each hop; TS doesn't natively compose function types over a string-literal index.
**How to avoid:** Phase 1 has ONE migration (v1 → v2) and it's empty-op. Type it simply:
```typescript
// src/migrations/index.ts
import { migrate as v1_to_v2 } from "./v1_to_v2";

export type SpecVersion = "1" | "2";  // grows as migrations land
export const MIGRATIONS = [
  { from: "1" as const, to: "2" as const, run: v1_to_v2 },
];

export function runMigrations(
  spec: unknown,
  fromVersion: SpecVersion,
  toVersion: SpecVersion
): unknown {
  // Simple reducer — find the slice of MIGRATIONS matching from..to and apply in order
  if (fromVersion === toVersion) return spec;
  let current: unknown = spec;
  let v = fromVersion;
  while (v !== toVersion) {
    const step = MIGRATIONS.find((m) => m.from === v);
    if (!step) throw new Error(`No migration from v${v} toward v${toVersion}`);
    current = step.run(current as never);
    v = step.to;
  }
  return current;
}
```
The return is `unknown` — callers re-validate with `validateSpec()` after migrating. This is intentional: migration returns a spec of the target version, but the caller should always confirm with the target version's schema. Defer fancier typing until v2→v3 lands.
**Warning signs:** Someone tries to write `runMigrations(spec, "1", "3")` with three migration hops and hits `any` everywhere.

### Pitfall 8: Biome config collides with tsc strict settings

**What goes wrong:** Biome runs `useStrictMode` + `noExplicitAny` as errors; `tsconfig.json` runs `"strict": true` + `"noUncheckedIndexedAccess": true`. Developer adds `const first = array[0]` (Biome silent) and tsc blows up on `first | undefined` narrowing. Or the other direction: developer adds an `any` cast to appease tsc and Biome red-lines it.
**Why it happens:** Two tools, overlapping-but-not-identical scope. Both enforce strict but with different knobs.
**How to avoid:** Pick a single "source of truth" per check. For example: let tsc own `any` detection (`"strict": true` + `"noImplicitAny": true`) and let Biome own stylistic rules (import order, unused vars). Document the split in `biome.json`:
```json
{
  "$schema": "https://biomejs.dev/schemas/2.4.12/schema.json",
  "files": { "ignoreUnknown": true },
  "linter": {
    "rules": {
      "recommended": true,
      "suspicious": { "noExplicitAny": "error" },
      "style": { "noNonNullAssertion": "error" }
    }
  },
  "formatter": { "indentWidth": 2, "lineWidth": 100 }
}
```
[CITED: https://biomejs.dev/reference/configuration/]
**Warning signs:** CI fails on Biome after tsc passes, or vice versa, and the fix requires a lint-disable comment.

## Code Examples

### Example 1: Schema Version Constant

```typescript
// src/model/version.ts
// Source: D-15, CONTEXT.md — Claude's Discretion "Migration runner scaffold"
export const SCHEMA_VERSION = "mobile-tui/1" as const;
export type SchemaVersion = typeof SCHEMA_VERSION;
```

### Example 2: Diagnostic Shape + Factories

```typescript
// src/primitives/diagnostic.ts
// Source: CONTEXT.md — Claude's Discretion "Diagnostic codes" + SPEC-09
import { z } from "zod";
import type { JsonPointer } from "./path";

export const DiagnosticSeveritySchema = z.enum(["error", "warning", "info"]);
export type DiagnosticSeverity = z.infer<typeof DiagnosticSeveritySchema>;

export const DiagnosticSchema = z.object({
  code: z.string().regex(/^[A-Z][A-Z0-9_]*$/, "SCREAMING_SNAKE_CASE code"),
  severity: DiagnosticSeveritySchema,
  path: z.string(),  // JsonPointer — RFC 6901 string
  message: z.string().min(1),
});
export type Diagnostic = z.infer<typeof DiagnosticSchema>;

// Factory helpers (optional but consistent)
export function error(code: string, path: JsonPointer, message: string): Diagnostic {
  return { code, severity: "error", path, message };
}
export function warning(code: string, path: JsonPointer, message: string): Diagnostic {
  return { code, severity: "warning", path, message };
}
```

### Example 3: Branded ID Types with Zod

```typescript
// src/primitives/ids.ts
// Source: CONTEXT.md — Claude's Discretion "ID case conventions"
import { z } from "zod";

// snake_case identifiers
const SNAKE_CASE = /^[a-z][a-z0-9_]*$/;

export type ScreenId = string & { readonly __brand: "ScreenId" };
export const ScreenIdSchema = z
  .string()
  .regex(SNAKE_CASE, "screen id must be snake_case")
  .transform((s) => s as ScreenId);

export type ActionId = string & { readonly __brand: "ActionId" };
export const ActionIdSchema = z
  .string()
  .regex(SNAKE_CASE, "action id must be snake_case")
  .transform((s) => s as ActionId);

export type TestID = string & { readonly __brand: "TestID" };
export const TestIDSchema = z
  .string()
  .regex(SNAKE_CASE, "testID must be snake_case")
  .transform((s) => s as TestID);

// PascalCase for entity names (entities are types)
export type EntityName = string & { readonly __brand: "EntityName" };
export const EntityNameSchema = z
  .string()
  .regex(/^[A-Z][A-Za-z0-9]*$/, "entity name must be PascalCase")
  .transform((s) => s as EntityName);
```

### Example 4: BackBehavior Discriminated Union

```typescript
// src/model/back-behavior.ts
// Source: CONTEXT.md — Claude's Discretion "Back-behavior vocabulary"
import { z } from "zod";
import { ScreenIdSchema } from "../primitives/ids";

export const BackBehaviorSchema = z.union([
  z.literal("pop"),
  z.literal("dismiss"),
  z.literal("reset-to-root"),
  z.object({
    kind: z.literal("replace"),
    screen: ScreenIdSchema,
  }),
]);
export type BackBehavior = z.infer<typeof BackBehaviorSchema>;
```

### Example 5: Migration Runner Scaffold

```typescript
// src/migrations/v1_to_v2.ts
// Source: CONTEXT.md — Claude's Discretion "Migration runner scaffold" + SERDE-08
import type { Spec } from "../model/spec";

// Placeholder types — as v2 lands, import from versioned schema files
type SpecV1 = Spec;
type SpecV2 = Spec;  // identical shape at v1 — will diverge in a future phase

export function migrate(input: SpecV1): SpecV2 {
  // No-op in Phase 1. Future migrations: transform v1-shaped input to v2-shaped output.
  return input as unknown as SpecV2;
}
```

```typescript
// src/migrations/index.ts
import { migrate as v1_to_v2 } from "./v1_to_v2";

// Grows as migrations land. Keep strictly ordered and contiguous by version.
const MIGRATIONS = [
  { from: "1", to: "2", run: v1_to_v2 },
] as const;

export type SpecVersion = "1" | "2";

export function runMigrations(
  spec: unknown,
  fromVersion: SpecVersion,
  toVersion: SpecVersion
): unknown {
  if (fromVersion === toVersion) return spec;

  let current: unknown = spec;
  let v: string = fromVersion;

  while (v !== toVersion) {
    const step = MIGRATIONS.find((m) => m.from === v);
    if (!step) {
      throw new Error(
        `No migration path from v${v} toward v${toVersion} in MIGRATIONS chain`
      );
    }
    current = step.run(current as never);
    v = step.to;
  }

  return current;
}
```

### Example 6: Fixture Test Pattern (vitest)

```typescript
// tests/fixtures.test.ts
import { describe, it, expect } from "vitest";
import { validateSpec } from "../src/model";
import { readFixture } from "./helpers/parse-fixture";

describe("canonical fixtures validate clean", () => {
  it.each(["habit-tracker", "todo", "social-feed"])(
    "%s.spec.md produces zero error-severity diagnostics",
    (name) => {
      const spec = readFixture(`fixtures/${name}.spec.md`);
      const { spec: result, diagnostics } = validateSpec(spec);
      const errors = diagnostics.filter((d) => d.severity === "error");
      expect(errors).toEqual([]);
      expect(result).not.toBeNull();
    }
  );
});
```

```typescript
// tests/malformed.test.ts
import { describe, it, expect } from "vitest";
import { validateSpec } from "../src/model";
import { readFixture } from "./helpers/parse-fixture";

describe("malformed fixture triggers every diagnostic code", () => {
  const EXPECTED_CODES = [
    "SPEC_MISSING_BACK_BEHAVIOR",
    "SPEC_UNKNOWN_COMPONENT",
    "SPEC_UNRESOLVED_ACTION",
    "SPEC_JSONPTR_UNRESOLVED",
    "SPEC_TESTID_COLLISION",
    "SPEC_VARIANT_OMITTED",
    "SPEC_ACTION_TYPE_MISMATCH",
  ] as const;

  it("produces expected Diagnostic[] without throwing", () => {
    const spec = readFixture("fixtures/malformed.spec.md");
    const { diagnostics } = validateSpec(spec);
    // Snapshot for byte-level assertion on the full array
    expect(diagnostics).toMatchSnapshot();
  });

  it.each(EXPECTED_CODES)("emits a diagnostic of code %s", (code) => {
    const spec = readFixture("fixtures/malformed.spec.md");
    const { diagnostics } = validateSpec(spec);
    const match = diagnostics.find((d) => d.code === code);
    expect(match).toBeDefined();
    expect(match?.severity).toBe("error");
    // path must be an RFC 6901 JSON Pointer string
    expect(match?.path).toMatch(/^(\/|$)/);
  });
});

describe("validateSpec never throws on hostile inputs", () => {
  it.each([null, undefined, 42, "string", [], {}, true])(
    "handles %s by returning null spec + error diagnostics",
    (input) => {
      const { spec, diagnostics } = validateSpec(input);
      expect(spec).toBeNull();
      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].severity).toBe("error");
    }
  );
});
```

## Runtime State Inventory

**Not applicable — Phase 1 is greenfield.** No rename, refactor, or migration work. `src/` does not yet exist. No stored data, no live service config, no OS-registered state, no secrets, no build artifacts pre-exist. First-time introduction of all files.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime, `tsc --noEmit`, `vitest` | ✓ | v25.2.1 (>=20 required) | — |
| npm | Install dependencies | ✓ | 11.7.0 | — |
| git | Commits (if `commit_docs` enabled) | ✓ | 2.50.1 | — |
| TypeScript | Type-check | ✗ (not yet installed) | — | `npm install -D typescript` at plan start |
| vitest | Run tests | ✗ (not yet installed) | — | `npm install -D vitest` at plan start |
| @biomejs/biome | Lint/format | ✗ (not yet installed) | — | `npm install -D @biomejs/biome` at plan start |
| zod | Runtime | ✗ (not yet installed) | — | `npm install zod` at plan start |
| jsonpointer | Runtime | ✗ (not yet installed) | — | `npm install jsonpointer @types/jsonpointer` at plan start |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None material — every missing tool is an npm install. Plan must include a task to run `npm install` with the full runtime + dev dep list before first test runs.

**Note on Node version:** The machine has Node v25.2.1, well above the `>=20` minimum. `package.json` should declare `"engines": { "node": ">=20" }` to match pi's requirement, not `>=25`.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `vitest@^4.1.4` (locked by stack) |
| Config file | `vitest.config.ts` (to be created in Wave 0) |
| Quick run command | `npx vitest run` (single pass, no watch) |
| Full suite command | `npx vitest run --coverage` |

Phase 1 has no existing test infrastructure — everything is Wave 0 work (see "Wave 0 Gaps" below).

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SPEC-01 | 18-kind closed component catalog enforced | unit | `npx vitest run src/model/component.test.ts` | ❌ Wave 0 |
| SPEC-01 | Every catalog kind appears in at least one canonical fixture | unit (fixture-driven) | `npx vitest run tests/catalog-coverage.test.ts` | ❌ Wave 0 |
| SPEC-02 | Screens capture id + title + component tree | unit | `npx vitest run src/model/screen.test.ts` | ❌ Wave 0 |
| SPEC-03 | NavigationGraph shape + required `back_behavior` on non-root screens | unit + cross-ref | `npx vitest run src/model/navigation.test.ts tests/malformed.test.ts` | ❌ Wave 0 |
| SPEC-04 | Data model entities + fields + relationships + JSON Pointer binding resolves against entity/field namespace | unit + cross-ref | `npx vitest run src/model/data.test.ts tests/fixtures.test.ts` | ❌ Wave 0 |
| SPEC-05 | Four-variant mandatory structure (`null` allowed, omission rejected) | unit + cross-ref | `npx vitest run src/model/variant.test.ts tests/malformed.test.ts` | ❌ Wave 0 |
| SPEC-06 | Actions in top-level registry; components reference by id only; unresolved ref → diagnostic | unit + cross-ref | `npx vitest run src/model/action.test.ts tests/malformed.test.ts` | ❌ Wave 0 |
| SPEC-07 | Sigil triple present on interactable components; testID globally unique; collision diagnosed | unit + cross-ref | `npx vitest run tests/malformed.test.ts -t testid` | ❌ Wave 0 |
| SPEC-10 | `acceptance: string[]` optional per screen; when present, every entry is a non-empty string | unit | `npx vitest run src/model/screen.test.ts -t acceptance` | ❌ Wave 0 |
| SERDE-08 | `migrations/v1_to_v2.ts` exists + `runMigrations` chains correctly | unit | `npx vitest run src/migrations/index.test.ts` | ❌ Wave 0 |
| — | `validateSpec()` never throws on hostile inputs (null/undefined/primitives) | unit | `npx vitest run tests/malformed.test.ts -t "never throws"` | ❌ Wave 0 |
| — | Diagnostic.path is always a valid RFC 6901 JSON Pointer | property test | `npx vitest run tests/diagnostic-path.test.ts` | ❌ Wave 0 |
| — | Three canonical fixtures produce zero error-severity diagnostics | snapshot | `npx vitest run tests/fixtures.test.ts` | ❌ Wave 0 |
| — | Malformed fixture produces expected Diagnostic[] (snapshot) | snapshot | `npx vitest run tests/malformed.test.ts -t snapshot` | ❌ Wave 0 |
| — | habit-tracker two-target fidelity gate: hand-translated SwiftUI + Compose committed and reference the spec | **manual** | grep fixtures/targets/*.swift *.kt for every Screen.id from habit-tracker.spec.md | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run --changed` (runs tests affected by staged changes, typically <5s)
- **Per wave merge:** `npx vitest run` (full suite, typically <15s for Phase 1 — validator is pure and fast)
- **Phase gate:** `npx vitest run --coverage && tsc --noEmit && npx biome check src` — all three must be green before `/gsd-verify-work`

### Wave 0 Gaps

Everything is greenfield. Wave 0 must create:

- [ ] `package.json` — runtime deps (`zod`, `jsonpointer`), dev deps (`typescript`, `vitest`, `@vitest/coverage-v8`, `@biomejs/biome`, `tsup`, `@types/jsonpointer`), `engines.node: ">=20"`, `type: "module"`
- [ ] `tsconfig.json` — `"target": "ES2022"`, `"moduleResolution": "bundler"`, `"strict": true`, `"verbatimModuleSyntax": true`, `"noUncheckedIndexedAccess": true`
- [ ] `biome.json` — minimal strict config; `files.ignoreUnknown: true`; `linter.rules.recommended: true`; `noExplicitAny: error`
- [ ] `vitest.config.ts` — `include: ["src/**/*.test.ts", "tests/**/*.test.ts"]`, globals: false, coverage: v8
- [ ] `tests/helpers/parse-fixture.ts` — minimal frontmatter reader for Phase 1 tests (gray-matter NOT required; a ~20 LOC regex splitter is enough for test data). Alternatively, author fixtures as `.ts` files and skip the helper.
- [ ] `src/index.ts` — library entry that re-exports `model/` + `migrations/`
- [ ] Framework install: `npm install zod jsonpointer && npm install -D typescript vitest @vitest/coverage-v8 @biomejs/biome tsup @types/jsonpointer`

No existing test infrastructure — all tests are new in Phase 1.

## Security Domain

> `security_enforcement` not explicitly set in `.planning/config.json` (key absent). Per directive, treat as enabled.

### Applicable ASVS Categories

Phase 1 is a pure TypeScript validation library with no network I/O, authentication, sessions, or cryptography. The applicable category is V5 (Input Validation), plus one non-ASVS supply-chain concern.

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | **yes** | Zod v4 schemas are the validation layer. Every external input (user-authored spec files, LLM-generated spec content) passes through `validateSpec()` before any downstream consumer touches it. Closed vocabularies (`z.enum`) for all `kind` fields prevent injection of unknown discriminator values. Regex constraints on IDs (`/^[a-z][a-z0-9_]*$/`) prevent path-traversal-shaped content from reaching the filesystem layer (Phase 2). |
| V6 Cryptography | no | — |
| V7 Data Protection | no | — |
| V8 Error Handling | **yes** (narrow) | `validateSpec()` never throws; Diagnostic[] returns communicate failure without leaking internal state or stack traces. Never expose full Zod issue objects to callers — they contain input values that could include sensitive copy. Always go through the `zodIssuesToDiagnostics` adapter which emits the code + path + sanitized message only. |
| V9 Communication Security | no | — |
| V10 Malicious Code | **supply-chain** | Zod v4.3.6 and jsonpointer 5.0.1 are both widely-used, zero-deps (jsonpointer) or minimal-deps (zod). Pin exact versions in `package-lock.json`. Do NOT add any dep with native binaries or `postinstall` scripts to this phase. |
| V11 Business Logic | no | — |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| User (or LLM) submits a spec with a `mutate.target` JSON Pointer containing `../` / path traversal-shaped tokens intended to escape the spec scope when Phase 2 resolves the pointer against file state | Tampering | JSON Pointer is NOT a filesystem path. RFC 6901 only defines navigation within a JSON document; `/` has no filesystem meaning. Document this in code comments. Phase 2 serializer must never pass a JsonPointer to `fs.*` APIs. [VERIFIED: RFC 6901] |
| Unbounded recursion depth in ComponentNode (nested Column-inside-Column-inside-Column... to exhaust stack) | DoS | Zod `z.union` evaluates depth-first during `safeParse`; a pathological input could in theory stack-overflow. Practical limit is thousands of levels deep — well beyond any real spec. If a test fixture is deliberately adversarial, Zod returns a validation error before stack overflow. No additional mitigation needed for Phase 1; add a `maxDepth` rule only if a real fixture requires it. |
| Regex denial-of-service (ReDoS) in ID schemas | DoS | All regexes use simple non-backtracking patterns (`^[a-z][a-z0-9_]*$`, `^[\x20-\x7E]+$`). No alternation + nested quantifiers. Verify by `// biome-ignore: regex is anchored + non-backtracking` comments on each pattern and a sanity test with a 100kB input string. |
| Prototype pollution via `input` with `__proto__` or `constructor.prototype` keys | Tampering | Zod `z.object({...}).strict()` rejects unknown keys including `__proto__`. Use `.strict()` on the Spec root (Phase 2 owns the `_unknown:` bucket; Phase 1's Spec is strict). [VERIFIED: zod docs — unrecognized_keys issue] |
| LLM-generated spec with malicious content in string fields (`description`, `label`) designed to break later HTML rendering | XSS (downstream) | Out of scope for Phase 1 — we don't render. Phase 1 enforces that `label` matches printable-ASCII regex. Downstream renderers (Phase 3 ASCII, future HTML exports) own their own escaping. |

**No network I/O, no credentials, no cryptography, no persistence in Phase 1** — attack surface is limited to "submit a crafted JSON blob to `validateSpec()` and trigger DoS or unexpected behavior." All known avenues (regex, recursion, prototype) are mitigated by standard Zod practices.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Zod v3 `z.discriminatedUnion` with `z.lazy` workaround for recursive types | Zod v4 simplified recursive types via getters (`get subcategories() { return z.array(Category) }`) for *non-discriminated* recursion; discriminated unions still break with recursion | Zod 4.0 stable (Aug 2025), current 4.3.6 (Jan 2026) | Our ComponentNode still needs `z.lazy` + `z.union` — the v4 getter syntax helps other recursive schemas but not discriminated ones. [VERIFIED: zod.dev/api#recursive-types, colinhacks/zod#4264] |
| Hand-rolled JSON Pointer (common in 2020–2022 era schemas) | Well-maintained zero-dep libraries like `jsonpointer@5.0.1` | — | Drop hand-rolled. Use library to avoid `~0`/`~1` decode-order gotcha. |
| TypeBox for validation-with-JSON-Schema-output | Zod v4 with built-in `.toJSONSchema()` | Zod 4.0 (Aug 2025) | We don't need JSON Schema output in Phase 1. If/when Phase 9 publishes a schema for IDE autocomplete, Zod v4's built-in converter replaces the "use TypeBox for this" recommendation from older research. [CITED: zod.dev/v4] |
| `biome 1.x` with shared formatter+linter config | `biome 2.4.x` with extended rule set + faster assist | Biome 2.0 stable (mid-2025), 2.4 (early 2026) | Config-file schema version bump; use `"$schema": "https://biomejs.dev/schemas/2.4.12/schema.json"`. [CITED: biomejs.dev/reference/configuration] |

**Deprecated/outdated:**
- **`z.discriminatedUnion` + `z.lazy` for recursive trees** — doesn't work in Zod v4. Use `z.union` + `z.lazy`.
- **`json-pointer` (manuelstofer)** — still maintained but larger, and modern alternatives have better types.
- **Zod v3** — CLAUDE.md explicitly bans. Don't go there.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | TypeScript 6.0.3 is acceptable; CLAUDE.md said `^5.6.x` but registry shows 6.0.3 is current stable | §Standard Stack (Supporting) | Low. If user prefers `^5.6`, pin it. Biome/tsup/vitest all work on both. See Open Questions #1. |
| A2 | Phase 1 tests author fixtures either as `.ts` exports OR via a minimal frontmatter splitter; full gray-matter integration is Phase 2 | §Recommended Project Structure, §Common Pitfalls #5 | Medium. If someone imports gray-matter in Phase 1, they'll pull Phase 2's parser dependency graph into the validator layer. Discuss with planner. See Open Questions #2. |
| A3 | `mutate.target` JSON Pointer "resolves under data model" means "first two tokens resolve to Entity + field_name in data.entities" — full array-shape validation for push/remove is deferred per CONTEXT.md | §Common Pitfalls #4, §Pattern 5 | Medium. If the planner interprets "resolves" more strictly, cross-ref pass logic expands. Confirm during plan. |
| A4 | `overlay` screens are marked by a `kind: "overlay"` discriminator on the Screen schema (D-13 reference to "overlay screens marked as such in the nav graph") | §Pattern 5 (present action validation) | Medium. If the marking lives on NavEdge or elsewhere, the cross-ref logic queries a different field. Confirm during plan — concrete data shape for the overlay marker. |
| A5 | Single cross-reference pass (rather than interleaving cross-ref checks with component-tree traversal) is the cleanest approach | §Pattern 3 | Low. Alternative is one big traversal that does everything; both work. Preference is "multiple named passes > one sprawling function." |
| A6 | The Zod v4 `issue.code` enum (`invalid_type`, `invalid_literal`, etc.) is stable between 4.3.x patches | §Pattern 4 | Low. Zod v4 is major-version-stable; breaking changes land in v5. If a new code appears mid-phase, unmapped codes fall through to `ZOD_${code.toUpperCase()}` which stays readable. |
| A7 | Vitest snapshot format is stable between 4.1.x patches; committed snapshots don't need updates on patch-version bump | §Validation Architecture | Low. Standard Vitest practice. |
| A8 | The 18-kind catalog can be fully described with the field sets sketched in §Code Examples; no component requires fields beyond what's shown | §Architecture Patterns #1 | Medium. Fixture authoring will surface missing fields. Executor drafts fixtures; user reviews — the review step catches this. |
| A9 | `runMigrations` returns `unknown` (caller re-validates) is preferable to fully-typed chain signature for Phase 1 | §Pattern 7 | Low. Phase 1 has one empty-op migration; over-engineering the types helps nobody. Revisit at v2→v3 landing. |

**Count:** 9 assumptions. Every one is either low-risk or has a clear resolution path ("confirm during plan"). None are load-bearing for the phase-shape decision.

## Open Questions (RESOLVED)

All six Open Questions were resolved during Phase 1 planning. The resolutions below are authoritative for Phase 1 execution; Phase 2+ may revisit where noted.

1. **TypeScript version: `^5.6` (per CLAUDE.md) or `^6.0` (registry current)?**
   - **RESOLVED:** pinned `^5.6` in Plan 01-01 per CLAUDE.md §Development Tools (pi-mono ecosystem compat). Defer `^6.0` upgrade to a later phase once pi-mono ships 6.x compat.
   - What we know: TypeScript 6.0.3 is current stable (npm view). CLAUDE.md says `^5.6.x`.
   - What's unclear: Whether CLAUDE.md's pin is intentional (compat with pi-mono) or stale (written before 6.0 released).
   - Recommendation: Default to `^5.6` for compatibility with the rest of the pi ecosystem; upgrade later if type-check incompatibilities surface. **Confirm with planner before writing tsconfig.**

2. **Fixture file format: `.spec.md` with frontmatter, or `.spec.ts` with literal export?**
   - **RESOLVED:** fixtures ship as `.spec.md` (human-authored, D-14) **plus** a `.spec.json` sibling (Phase 1 test input). Phase 2 replaces the sibling-file approach with markdown-body parsing via gray-matter + eemeli/yaml; the `.spec.json` siblings are dropped at that point.
   - What we know: D-14 says `*.spec.md`. D-17 says fixtures ship with the package as runnable schema documentation.
   - What's unclear: Whether Phase 1 tests parse the `.md` themselves (requires a minimal helper) or whether fixtures get a parallel `.ts` export for Phase 1 tests and the `.md` becomes Phase 2's concern.
   - Recommendation: Ship `.md` as the canonical fixture (D-14); Phase 1 tests use a minimal 20-LOC helper (`tests/helpers/parse-fixture.ts`) that splits frontmatter and `JSON.parse`s a flattened YAML-ish subset. Phase 2 replaces the helper with gray-matter + yaml. Alternative: author fixtures as `.ts` and generate `.md` at Phase 2 time. Prefer canonical `.md` from day one.

3. **Does `overlay` marking live on Screen (`kind: "overlay"`) or on NavEdge (`kind: "modal"`)?**
   - **RESOLVED:** Screen carries an explicit `kind: "regular" | "overlay"` discriminator field (see Plan 01-05 and Plan 01-06 cross-ref checks). `present.overlay` cross-reference is a direct lookup — no tree walk.
   - What we know: D-13 says "`present.overlay` must be a screen with `kind: overlay` (Modal or Sheet)."
   - What's unclear: Whether Screen itself carries a `kind: "regular" | "overlay"` discriminator, or whether "overlay" is inferred from the component tree containing a top-level Modal/Sheet.
   - Recommendation: Add an explicit `kind: "regular" | "overlay"` field on Screen so the cross-ref check is a direct lookup, not a tree walk. Confirm with planner. If tree-walk is preferred, the logic goes in `crossReferencePass`.

4. **`mutate.target` resolution — full path or prefix only?**
   - **RESOLVED:** two-token prefix (`/EntityName/field_name`) per CONTEXT.md §Deferred Ideas (Plan 01-06 `resolveJsonPointerPrefix`). Deeper traversal deferred to Phase 4 when commands actually execute mutations.
   - What we know: CONTEXT.md defers full array-shape validation; says "prefix resolves to a defined entity field."
   - What's unclear: Exact definition of "prefix." Is it the first two tokens (`/Entity/field`)? Or the first token (`/Entity`)? Or arbitrary-length as long as it matches nested field types?
   - Recommendation: Lock as `/Entity/field` two-token minimum; additional tokens (array indices, nested entity refs) pass structurally but don't semantically validate in Phase 1. Phase 4 (editor store) may extend when mutations actually execute.

5. **Does the migration runner need a pre-Phase-1 "v0 → v1" migrator for legacy specs with no schema field?**
   - **RESOLVED:** only `v1_to_v2` ships in Phase 1 (empty-op scaffold per D-16, Plan 01-07). No v0 legacy specs exist; v0→v1 is not needed. Phase 2 may add `v0_to_v1` if legacy fixtures surface.
   - What we know: SERDE-08 requires the scaffold; SPEC-08 (first-emit frontmatter injection) is Phase 2.
   - What's unclear: Whether a legacy-to-v1 migrator should ship in Phase 1 as a seed example or wait until Phase 2 surfaces actual legacy specs.
   - Recommendation: Phase 1 ships only the `v1_to_v2` empty-op (per D-16). No "v0" migrator. If legacy fixtures exist, Phase 2 adds a `v0_to_v1` migrator that injects the `schema:` field — this is a Phase 2 scope item, not Phase 1.

6. **Should `ListItem`'s sigil triple be enforced via `z.refine` (cleaner) or via intersection/branded types (more type-safe)?**
   - **RESOLVED:** Zod `.refine()` predicate (recommended per §Pattern 1). Intersection-type approach rejected as harder to read and maintain; runtime check emits a clean error message while the TS type stays permissive.
   - What we know: ListItem may or may not be interactable (tappable cell vs. container cell per D-02).
   - What's unclear: TS ergonomics of the "all three or none" constraint.
   - Recommendation: `.refine()` as shown in §Pattern 1 — it emits a clean error message; the TS type stays permissive. Downstream consumers check `if (listItem.action)` before using the triple.

**All six resolutions locked above.** No Open Questions remain blocking Phase 1.

## Sources

### Primary (HIGH confidence)

- [Zod v4 API Documentation — Recursive Types](https://zod.dev/api) — recursive type pattern via getter syntax; confirms `z.interface()` for non-discriminated recursion
- [Zod v4 Release Notes](https://zod.dev/v4) — stable release context; performance notes
- [RFC 6901 — JSON Pointer](https://datatracker.ietf.org/doc/html/rfc6901) — canonical spec for pointer syntax, escaping (`~0`, `~1`), and evaluation semantics against arrays vs objects
- [colinhacks/zod#4264](https://github.com/colinhacks/zod/issues/4264) — verified: `z.discriminatedUnion` does NOT compose with recursion in Zod v4
- [colinhacks/zod#5288](https://github.com/colinhacks/zod/issues/5288) — verified: maintainers closed as "not planned"; canonical workaround is `z.union` instead
- [colinhacks/zod#4714](https://github.com/colinhacks/zod/issues/4714) — additional evidence: `.and` + recursion loses inference
- [jsonpointer npm package](https://www.npmjs.com/package/jsonpointer) — verified: 5.0.1, MIT, zero deps, 6.8kB unpacked
- [@types/jsonpointer npm package](https://www.npmjs.com/package/@types/jsonpointer) — verified: 4.0.2
- npm registry direct queries (2026-04-17): `zod@4.3.6`, `jsonpointer@5.0.1`, `typescript@6.0.3`, `vitest@4.1.4`, `@biomejs/biome@2.4.12`, `tsup@8.5.1`
- CLAUDE.md stack table + "What NOT to Use" list + pi.dev extension gotchas — project-scope authoritative
- CONTEXT.md decisions D-01..D-17 + Claude's Discretion block — phase-scope authoritative

### Secondary (MEDIUM confidence)

- [Biome 2.4 Configuration Reference](https://biomejs.dev/reference/configuration/) — config schema, rule categories
- [Biome 2.4 Release Notes on Medium](https://medium.com/@onix_react/whats-new-in-biome-v2-4-00890baad13b) — context for "current" status
- [colinhacks/zod#3628](https://github.com/colinhacks/zod/issues/3628) — background on z.lazy behavior
- [Vitest Snapshot Testing](https://vitest.dev/guide/snapshot.html) — `toMatchSnapshot` API used for malformed-fixture Diagnostic[]
- [Vitest expect API](https://vitest.dev/api/expect.html) — `expect.schemaMatching` pattern (informational; not used in Phase 1)

### Tertiary (LOW confidence / inference)

- TypeScript 6.0.3 vs 5.6 decision — assumption that either works with the toolchain; needs confirmation with planner (see Open Questions #1).
- `overlay` Screen discriminator shape — inferred from D-13 wording; needs confirmation (see Open Questions #3).

## Metadata

**Confidence breakdown:**
- Standard stack versions: **HIGH** — all verified against npm registry on 2026-04-17
- Recursive Zod pattern (use `z.union` + `z.lazy`, NOT `z.discriminatedUnion`): **HIGH** — multiple independent GitHub issues confirm, maintainers closed one as "not planned"
- JSON Pointer library choice: **HIGH** — `jsonpointer@5.0.1` objectively smaller and better-typed than alternatives
- Cross-reference validation pattern (two-stage: Zod safeParse + post-pass): **MEDIUM-HIGH** — common TS pattern but the exact visitor shape is a judgment call
- File layout: **HIGH** — matches ARCHITECTURE.md §2 verbatim (L1 primitives / L2 model / L3 migrations)
- Test sampling approach: **MEDIUM-HIGH** — Vitest snapshot + per-code test pattern is standard; specific snapshot format stability across 4.1.x is an assumption
- Open Questions not blocking plan: **HIGH** — every OQ has a recommended default

**Research date:** 2026-04-17
**Valid until:** 2026-06-17 (60 days — stack versions are recent and slow-moving; Zod recursive-union behavior is unlikely to change in a patch release)

---

*Phase: 01-spec-model-invariants*
*Research completed: 2026-04-17*
