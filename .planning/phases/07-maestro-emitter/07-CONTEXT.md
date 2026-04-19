# Phase 7: Maestro Emitter — Context

**Gathered:** 2026-04-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Pure emitter from `TestFlow` + nav graph to `<flow>.ios.yaml` / `<flow>.android.yaml`. The emitter is a pure function with no implicit IO. Every interaction selects via a `test:` sigil — coordinate taps and nth-child selectors are forbidden and cause emission to fail loudly with a diagnostic. Wired to `:emit maestro` in the canvas command palette.

**In scope:** `TestFlow` schema + SpecSchema extension, `src/emit/maestro/` emitter (pure function), `src/editor/commands/emit-maestro.ts` canvas command, `./flows/` output directory, `maestro check-flow-syntax` validation gate when `MAESTRO_CLI=1`, golden fixture flows in CI.

**Explicitly NOT in scope:** Detox emitter (v2), per-step assertion lists (deferred), CLI script entry for emit (canvas command only), LLM handoff commands (Phase 8).

**Requirements covered:** MAESTRO-01, MAESTRO-02, MAESTRO-03, MAESTRO-04, MAESTRO-05.

</domain>

<decisions>
## Implementation Decisions

### TestFlow Schema

- **D-105:** **TestFlow is defined explicitly in the spec YAML — not derived from the nav graph.** The developer writes `test_flows:` blocks. Each flow has a name and a list of steps. The emitter walks those steps and maps each to Maestro commands. This is predictable, round-trips cleanly, and avoids the guessing decisions that auto-synthesis would require.
- **D-106:** **A single TestFlow step is `{ screen: ScreenId, action: ActionId }`.** The emitter resolves the component carrying that actionId in the named screen's content variant, reads its `testID` sigil, and emits `tapOn: { id: testID }`. If the testID is missing (sigil not registered on any component in that screen), emission fails loudly with a diagnostic naming the missing sigil — no silent fallback per MAESTRO-03.
- **D-107:** **`test_flows` is a top-level field in SpecSchema, alongside `screens`, `actions`, `data`, `navigation`.** Added via `test_flows: z.array(TestFlowSchema).optional()` (optional so existing specs without flows parse without errors). SpecSchema `.strict()` is preserved — `test_flows` is added to the known-key set.
- **D-108:** **`TestFlowSchema` shape:**
  ```ts
  TestFlowSchema = z.object({
    name: z.string(),                           // e.g. "add_habit_flow"
    steps: z.array(z.object({
      screen: ScreenIdSchema,
      action: ActionIdSchema,
      platform: z.enum(["ios", "android", "both"]).default("both"),
    })),
  })
  ```
  Each step defaults to `platform: both` when omitted.

### Action-to-Maestro Mapping

- **D-109:** **Fixed codified defaults per action kind — no per-step overrides.** The emitter uses a static mapping table:
  - `navigate` → `tapOn: { id: testID }` (Maestro handles the screen transition implicitly)
  - `submit` → `tapOn: { id: testID }` (taps the submit button/trigger component)
  - `mutate` → `tapOn: { id: testID }` (taps the component; Maestro-level state mutation is not modeled)
  - `present` → `tapOn: { id: testID }` (taps the trigger that opens the overlay)
  - `dismiss` → `tapOn: { id: testID }` (taps the dismiss trigger)
  - `custom` → `tapOn: { id: testID }` (testID used; action `name` is emitted as a YAML comment for human reference)
- **D-110:** **Maestro selector is always `tapOn: { id: testID }`.** Selection is exclusively by accessibility ID (the `test:` sigil value). Label-based selection (`tapOn: "label"`) is never emitted — it would be fragile and violates MAESTRO-03's sigil-gated requirement. A missing testID on the matched component is an emit-time diagnostic error.

### Platform Branching

- **D-111:** **Each step carries an optional `platform: ios | android | both` field (default `both`).** Platform-specific steps (e.g., iOS permission dialog, Android system back) are annotated at the step level. The emitter writes both files from the same step list, filtering steps by platform. Shared steps (`platform: both`) appear byte-identically in both files. No platform markers appear in the YAML output itself.
- **D-112:** **Two output files per flow: `<flow-name>.ios.yaml` and `<flow-name>.android.yaml`, written to `./flows/` next to the spec file.** A flow with only `platform: both` steps produces two identical files. A flow with mixed platforms produces files that diverge at the platform-specific steps — satisfying MAESTRO-02 SC3.

### :emit maestro Command Wiring

- **D-113:** **`:emit maestro` is wired as a canvas command palette entry.** `emit-maestro` is added to the COMMANDS registry in `src/editor/commands/emit-maestro.ts`. It appears in the palette (`:` or `Ctrl+P`) like any other command. The command receives the spec's resolved path through the store context — same pattern as autosave.
- **D-114:** **Success and error feedback via the canvas status line only.** On success: `Emitted N flow(s) → ./flows/` with a checkmark, clearing after 3s (same pattern as the save indicator `●`/`✓`). On error (missing sigil, invalid flow schema): status line shows the first diagnostic message. No modal, no blocking overlay — consistent with the existing UX pattern from Phase 5.

### Claude's Discretion

- **Maestro flow file header format:** Claude decides the YAML header block (appId, env block, tags, etc.). Recommend a minimal header: `appId: com.example.app` placeholder with a comment that the developer should replace it. No timestamps, no randomness (MAESTRO-01 pure-function requirement).
- **`maestro check-flow-syntax` invocation:** Claude decides how to invoke the CLI when `MAESTRO_CLI=1` is set — a child process exec against each emitted file with error output surfaced as diagnostics.
- **Emitter directory structure:** `src/emit/maestro/` following the `src/emit/wireframe/` precedent. Exact internal file breakdown (emitter.ts, step-mapper.ts, platform-filter.ts, etc.) is Claude's call.
- **TestFlow cross-reference validation:** Claude decides whether to add a Phase-7 crossReferencePass that validates all `screen` + `action` references in `test_flows[]` exist in `screens[]` + `actions{}`. Recommend yes — emit should fail fast on structural errors, not just missing sigils.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Maestro CLI docs (emitter output target)
- `CLAUDE.md` §Maestro emission approach — Maestro YAML structure, command surface, YAML library choice
- `CLAUDE.md` §Maestro vs Detox — confirms Maestro-only for v1, YAML-first rationale

### Spec model (emitter input)
- `src/model/spec.ts` — SpecSchema root; `test_flows` field must be added here
- `src/model/action.ts` — 6-kind ActionSchema discriminated union; mapping table source
- `src/model/navigation.ts` — NavigationGraphSchema; nav graph context for emitter
- `src/model/screen.ts` — ScreenSchema; component tree where testID sigils live
- `src/primitives/ids.ts` — ScreenIdSchema, ActionIdSchema; typed ID brands for TestFlow steps

### Sigil system (testID source)
- `src/serialize/sigil.ts` — SIGIL_REGEX, INTERACTABLE_KINDS, SigilTriple; testID is the `test:` component of the sigil triple

### Existing emitter pattern (structural reference)
- `src/emit/wireframe/index.ts` — `render(spec, screenId)` pure-function emitter pattern to follow
- `src/emit/wireframe/dispatch.ts` — how the emitter walks the component tree

### Canvas command pattern (for :emit maestro)
- `src/editor/commands/index.ts` — COMMANDS registry; emit-maestro must be added here
- `src/editor/store.ts` — `createStore` / `Store` interface; commands receive store context including spec path
- `.planning/phases/05-canvas-tui-shell/05-CONTEXT.md` §D-74..D-76 — command palette integration pattern
- `src/canvas/save-indicator.ts` — status line feedback pattern (●/✓); emit result uses the same pattern

### REQUIREMENTS (full acceptance criteria)
- `.planning/REQUIREMENTS.md` §MAESTRO-01..05 — the five acceptance criteria that define done

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/emit/wireframe/` — structural model for a pure-function emitter. Phase 7 creates `src/emit/maestro/` following the same pattern: pure functions, `string[]` or YAML object output, no IO inside the emitter itself.
- `src/serialize/sigil.ts` — `SIGIL_REGEX`, `INTERACTABLE_KINDS`, `SigilTriple` — the testID is already extracted and available at parse time. The emitter reads it from the Spec object, not from the raw YAML.
- `src/editor/commands/` — each command is a file with `apply` + `invert` exports. `emit-maestro.ts` follows this shape but `invert` is a no-op (file emission is not undoable).
- `yaml@^2.8.3` (eemeli/yaml) — already in deps; used for Maestro YAML output generation.

### Established Patterns
- Pure-function emitters: `render(spec, screenId): string[]` pattern from wireframe renderer. Maestro emitter: `emitMaestroFlow(flow: TestFlow, spec: Spec): { ios: string, android: string }`.
- SpecSchema extension via spread: wizard fields were added with `...WizardMetaSchema.shape` inside the existing `z.object({...}).strict()` call. `test_flows` follows the same pattern.
- Command registry: commands in `src/editor/commands/index.ts` use a simple `{ name, apply, invert }` shape. Emit command's `apply` triggers the emitter and writes files via `withFileMutationQueue` (or direct `fs.writeFile` since flows are not the spec itself).

### Integration Points
- `SpecSchema` in `src/model/spec.ts` — add `test_flows: z.array(TestFlowSchema).optional()`
- `src/editor/commands/index.ts` — register `emit-maestro`
- Canvas status line — same `StatusMessage` type used by save indicator for emit feedback

</code_context>

<specifics>
## Specific Ideas

- **testID-only selection:** Always `tapOn: { id: testID }` — never label-based. The sigil `test:` field is exactly the Maestro accessibility ID. This is the Phase 7 invariant.
- **Quiet success / loud failure:** On success, status line shows a brief confirmation. On any missing sigil, the emitter returns a `Diagnostic[]` and writes no files — same all-or-nothing pattern as the serializer's save gate (SERDE-04).
- **Golden flows in CI:** Phase 7 must commit golden `flows/` output from the fixture specs and diff them in CI (MAESTRO-05 SC5). The habit-tracker, todo, and social-feed fixtures need `test_flows:` blocks added.

</specifics>

<deferred>
## Deferred Ideas

- **Detox emitter** — explicitly out of scope for v1 per ROADMAP and CLAUDE.md. Deferred to v2.
- **Per-step assertions (`assert:` list on each step)** — raised during discussion, deferred. Would add `assertVisible` blocks to the YAML output. Scope for a later phase or Phase 7 stretch goal only if core flow emission proves fast.
- **CLI script for emit** — `scripts/emit.ts` as a standalone terminal entry. Not needed for MAESTRO-05 (canvas command satisfies the requirement). Can be added in Phase 8/9 if useful for CI pipelines.
- **TextField → inputText inference** — smarter mapping where the emitter checks component kind and emits `inputText` for TextFields. Deferred in favor of uniform `tapOn: { id }` for now; can be revisited if fixture flows look wrong.

</deferred>

---

*Phase: 07-maestro-emitter*
*Context gathered: 2026-04-19*
