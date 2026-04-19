# Phase 8: LLM Handoff Commands — Context

**Gathered:** 2026-04-20
**Status:** Ready for planning

<domain>
## Phase Boundary

A developer can extract a screen's wireframe, or a framework-targeted prompt, from any spec and paste it straight into an LLM of their choice. Three commands deliver this:

- `:yank wireframe <screen-id>` — copies ASCII-baseline wireframe to OS clipboard
- `:prompt screen <id> <target>` (targets: `swiftui`, `compose`, `tests`) — emits a self-contained prompt under 2k tokens
- `:extract --screen <id>` — writes the same prompt fragment to `./prompts/<screen-id>-<target>.md`

**In scope:** `src/emit/handoff/` (assembler + token budget logic), three palette commands wired via COMMANDS registry, `gpt-tokenizer` dep, `./prompts/` output dir, SEMANTIC_TOKENS enum, tokenizer test with structural prop audit, `clipboardy` for clipboard.

**Explicitly NOT in scope:** Detox emitter, per-step assertion inference, mouse support, multi-file batch extract, pi.dev integration (Phase 9).

**Requirements covered:** HANDOFF-01, HANDOFF-02, HANDOFF-03, HANDOFF-04.

</domain>

<decisions>
## Implementation Decisions

### Prompt Content & Token Budget

- **D-201:** **Priority order when 2k token budget is tight:** Screen component tree + acceptance criteria always included in full. Nav neighbors and referenced entities degrade to summary form (name + type only) when the assembled prompt is close to the budget. Neither neighbors nor entities are dropped entirely — they degrade. The screen spec itself is never truncated.
- **D-202:** **Token counting uses `gpt-tokenizer` (pure JS, BPE cl100k_base encoding).** Chosen for accuracy without native bindings or WASM. No character-approximation heuristic. `gpt-tokenizer` is a bundled runtime dep (not peer). The test harness measures emitted prompt token count and asserts it is ≤ 2000.
- **D-203:** **Prompt sections (in order):** `## Task` preamble (target-specific, ~2–3 lines) → `## Screen Spec` (full component tree as structured YAML block) → `## Acceptance Criteria` (from `acceptance_prose` field) → `## Navigation Neighbors` (adjacent screens + edge kind; degrades to name-only when tight) → `## Data Entities` (referenced entities with fields; degrades to name+type when tight).

### Semantic Token Vocabulary

- **D-204:** **Vocabulary is a hardcoded `SEMANTIC_TOKENS` set in `src/emit/handoff/semantic-tokens.ts`.** The set covers prop names and valid values that are allowed in the emitted prompt (e.g., `variant: "primary" | "secondary" | "destructive"`, `gap: "xs" | "sm" | "md" | "lg" | "xl"`, `size: "sm" | "md" | "lg"`, `weight: "regular" | "medium" | "bold"`). Claude decides the full set based on what props appear in ComponentNodeSchema.
- **D-205:** **HANDOFF-04 tokenizer test uses structural prop audit, not regex.** The assembler emits the prompt with a machine-parseable `<!-- spec-props: { ... } -->` HTML comment block containing the structured prop map. The test parses that block and asserts every prop value is a member of `SEMANTIC_TOKENS`. This requires the prompt to carry a parseable prop section alongside human-readable text. Regex `/[0-9]+(?:px|pt|dp|rem|#[0-9a-fA-F]{3,6})/` is used as a secondary guard on the full prompt string.

### Target Framework Differentiation

- **D-206:** **Same structural skeleton for all three targets — only the `## Task` preamble differs.** All three targets include identical sections (Screen Spec, Acceptance Criteria, Neighbors, Entities). The preamble varies:
  - `swiftui` → "Implement this screen in SwiftUI. Use SwiftUI native components aligned to the component tree below."
  - `compose` → "Implement this screen in Jetpack Compose. Use Compose native components aligned to the component tree below."
  - `tests` → "Write Maestro YAML flows for this screen. Each acceptance criterion should map to one or more Maestro steps using the testID sigils listed in the actions section."
- **D-207:** **`tests` target includes an extra `## Actions & TestIDs` section** showing the screen's actions with their `testID` sigils resolved. This primes the LLM to write `tapOn: { id: ... }` steps directly. This section does not appear for `swiftui` or `compose`.

### Command Wiring & UX

- **D-208:** **All three commands go in the COMMANDS registry** (palette-discoverable via `:` or `Ctrl+P`). They follow the palette's existing arg-prompt flow (D-75): screen ID prompt first, then target selection for `:prompt` and `:extract`. This is the canonical command surface — not special `handleInput` wiring.
- **D-209:** **Because all three commands have side effects (clipboard write, file write) and no meaningful `invert()`, they follow the emit-maestro shape:** a separate `runYankWireframe`, `runPromptScreen`, `runExtractScreen` function (not `Command<T>`), called from the COMMANDS `apply()` handler. The COMMANDS registry entry wraps the side-effect function.
- **D-210:** **Output location for `:extract`:** `./prompts/<screen-id>-<target>.md` next to the spec file. Overwrites silently (same as Maestro flow files). Git diff shows content drift across prompt iterations — desirable for tracking.
- **D-211:** **Status line feedback follows the save-indicator / emit-maestro pattern:** success shows `Prompted → ./prompts/login-swiftui.md ✓` clearing after 3s. Clipboard yank shows `Wireframe yanked ✓`. Errors surface the first diagnostic on the status line. No modal, no blocking overlay.

### Claude's Discretion

- Full SEMANTIC_TOKENS allowlist values — derive from what ComponentNodeSchema actually uses as prop values; err toward accepting common design tokens over restrictive.
- Internal file breakdown of `src/emit/handoff/` (assembler.ts, token-budget.ts, semantic-tokens.ts, etc.) — follow `src/emit/maestro/` precedent.
- Exact `gpt-tokenizer` API usage — use `encode(str).length` or equivalent to get token count.
- Whether `:yank wireframe` supports a variant flag (e.g., `:yank wireframe login --variant loading`) — if the screen has named variants, Claude may add optional variant selection; default is the base/content variant.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Command palette & wiring (established pattern)
- `.planning/phases/05-canvas-tui-shell/05-CONTEXT.md` §D-74..D-76 — command palette, arg-prompt flow, COMMANDS registry
- `src/editor/commands/index.ts` — COMMANDS registry; three handoff commands must be added here
- `src/editor/commands/emit-maestro.ts` — side-effect action pattern (no Command<T>, runs from COMMANDS apply())

### Wireframe emitter (substrate for :yank)
- `src/emit/wireframe/index.ts` — `render(spec, screenId)` pure-function emitter; `:yank` calls this and passes the result to clipboardy
- `CLAUDE.md` §clipboardy — confirmed as the clipboard library ("copy wireframe to clipboard quality-of-life action")

### Spec model (handoff assembler input)
- `src/model/spec.ts` — SpecSchema root; screen, nav, data, test_flows
- `src/model/screen.ts` — ScreenSchema with `acceptance_prose`, component tree, variants
- `src/model/navigation.ts` — NavigationGraphSchema; nav neighbors resolved from here
- `src/model/action.ts` — ActionSchema; testID sigils on interactable components for `tests` target
- `src/serialize/sigil.ts` — `SigilTriple`; testID extraction for `## Actions & TestIDs` section

### Requirements (acceptance criteria)
- `.planning/REQUIREMENTS.md` §HANDOFF-01..04 — four acceptance criteria that define done for this phase

### Canvas store & status line (feedback pattern)
- `src/editor/store.ts` — Store interface; commands receive spec + filePath context
- `src/canvas/save-indicator.ts` — StatusMessage pattern; yank/prompt/extract use the same pattern

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/emit/wireframe/` — `render(spec, screenId): string[]` is the exact substrate for `:yank wireframe`. Phase 8 calls it, joins the lines, passes to clipboardy.
- `src/emit/maestro/` — structural model for `src/emit/handoff/`. Pure function, no IO inside emitter.
- `src/editor/commands/emit-maestro.ts` — the side-effect-action pattern; `runEmitMaestro(spec, specFilePath)` is the template for `runYankWireframe`, `runPromptScreen`, `runExtractScreen`.
- `yaml@^2.8.3` — already in deps; used to serialize the structured `## Screen Spec` block in the prompt.

### Established Patterns
- Palette arg-prompt flow (D-75): sequential `Input` prompts for required args. `:prompt screen` needs two args (screen ID, target); `:extract` needs two args (screen ID, target); `:yank wireframe` needs one (screen ID).
- Status line feedback: `StatusMessage` type used by save indicator and emit-maestro — same shape for handoff command results.
- Output dirs (`./flows/`): created on first emit if absent, next to spec file. `./prompts/` follows the same convention.

### Integration Points
- `src/editor/commands/index.ts` — register `yank-wireframe`, `prompt-screen`, `extract-screen` commands
- `src/emit/handoff/` (new directory) — assembler, token budget logic, semantic tokens enum
- `gpt-tokenizer` — new runtime dep to add to `package.json`
- `clipboardy` — already named in CLAUDE.md; add to `package.json` if not already present

</code_context>

<specifics>
## Specific Ideas

- **Structural prop audit test:** The prompt includes a `<!-- spec-props: { ... } -->` HTML comment with a machine-parseable prop map. The vitest test parses this block and checks every value against `SEMANTIC_TOKENS`. This is the HANDOFF-04 acceptance criterion enforcement mechanism.
- **`tests` target extra section:** `## Actions & TestIDs` lists each action with its resolved testID sigil — directly usable by an LLM writing Maestro flows. This differentiates the `tests` target from `swiftui`/`compose` without diverging the overall skeleton.
- **Overwrite semantics for `:extract`:** Silent overwrite, same as `./flows/`. The dev is expected to check git diff.

</specifics>

<deferred>
## Deferred Ideas

- **Variant flag for :yank wireframe** (`:yank wireframe login --variant loading`) — mentioned during analysis; Claude may implement if clean, otherwise base/content variant only.
- **Batch extract** (`:extract --all`) — extract prompts for every screen at once. Out of scope for Phase 8; could be a Phase 9 or stretch goal.
- **Detox tests target** — `tests` target is Maestro-only in Phase 8. Detox scaffold is v2.
- **Per-step assertion inference in tests target** — auto-derive `assertVisible` from acceptance criteria. Deferred per Phase 7 precedent.

</deferred>

---

*Phase: 08-llm-handoff-commands*
*Context gathered: 2026-04-20*
