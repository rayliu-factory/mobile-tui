# Phase 8: LLM Handoff Commands — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-20
**Phase:** 08-llm-handoff-commands
**Areas discussed:** Prompt content & budget, Semantic token vocabulary, Target differentiation, Command wiring & UX

---

## Prompt Content & Budget

### Token counting strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Character approximation (len/4) | Cheap, deterministic, no extra deps | |
| gpt-tokenizer (pure JS BPE) | Accurate, no native bindings, cl100k_base | ✓ |
| Word count | Coarser estimate, no deps | |

**User's choice:** `gpt-tokenizer` — accurate token counting despite the dep cost.

### Priority order when over budget

| Option | Description | Selected |
|--------|-------------|----------|
| Screen spec first | Screen + acceptance criteria always full; neighbors/entities degrade to name+type | ✓ |
| Balanced trim | All sections at reduced verbosity; none dropped | |
| Hard error if over budget | Emit fails loudly; developer must simplify | |

**User's choice:** Screen spec first — screen component tree and acceptance criteria are never truncated. Nav neighbors and entities degrade to summary form.

---

## Semantic Token Vocabulary

### Vocabulary definition

| Option | Description | Selected |
|--------|-------------|----------|
| Hardcoded enum in src/emit/handoff/ | SEMANTIC_TOKENS set defined in the emitter; test imports it | ✓ |
| Derived from spec props | No separate enum; any non-pixel prop key passes | |
| Config file (.semantic-tokens.yml) | User-editable; adds file I/O | |

**User's choice:** Hardcoded enum — static, auditable, no runtime discovery needed.

### HANDOFF-04 violation detection

| Option | Description | Selected |
|--------|-------------|----------|
| Regex on output string | Assert no /[0-9]+(?:px\|pt\|dp\|rem\|#...) / match | |
| Structural prop audit | Parse spec-props comment block; check every value against SEMANTIC_TOKENS | ✓ |

**User's choice:** Structural prop audit — requires the prompt to include a machine-parseable `<!-- spec-props: { ... } -->` block. More thorough than regex-only; regex used as secondary guard.

---

## Target Differentiation

### Prompt structure per target

| Option | Description | Selected |
|--------|-------------|----------|
| Same skeleton, target framing only | Sections identical; only ## Task preamble varies | ✓ |
| Structurally different per target | Different section order and depth per swiftui/compose/tests | |
| You decide | Single assembler; target is just a header line | |

**User's choice:** Same skeleton — consistent structure, only preamble differs.

### Tests target content

| Option | Description | Selected |
|--------|-------------|----------|
| Maestro flow scaffold | Acceptance criteria + nav + actions with testID sigils → primes Maestro YAML generation | ✓ |
| Generic test scaffold | Framework-agnostic "here is what to test" | |

**User's choice:** Maestro flow scaffold — aligns with Phase 7 emitter; `tests` target adds an `## Actions & TestIDs` section not present for swiftui/compose.

---

## Command Wiring & UX

### Palette vs special handleInput

| Option | Description | Selected |
|--------|-------------|----------|
| Palette commands (COMMANDS registry) | Discoverable via ':' palette; arg-prompt flow handles inputs | ✓ |
| Special handleInput (emit-maestro pattern) | Wired in RootCanvas.handleInput; less discoverable | |

**User's choice:** Palette commands — all three in COMMANDS registry for discoverability.

**Notes:** Despite being palette commands, these still wrap side-effect functions (not Command<T>) since they have no meaningful invert(). Pattern is: COMMANDS entry calls runYankWireframe/runPromptScreen/runExtractScreen.

### :extract file naming

| Option | Description | Selected |
|--------|-------------|----------|
| ./prompts/<screen-id>-<target>.md | Next to spec, same convention as ./flows/ | ✓ |
| ./prompts/<screen-id>-<timestamp>.md | Avoids overwrites; noisy git diffs | |

**User's choice:** `<screen-id>-<target>.md` — deterministic names, silent overwrite, clean git history.

---

## Claude's Discretion

- Full SEMANTIC_TOKENS allowlist values
- Internal file breakdown of `src/emit/handoff/`
- Optional variant flag for `:yank wireframe`
- Exact `gpt-tokenizer` API usage

## Deferred Ideas

- Variant flag for :yank wireframe (`:yank wireframe login --variant loading`)
- Batch extract (`:extract --all`)
- Detox tests target (v2)
- Per-step assertion inference in tests target
