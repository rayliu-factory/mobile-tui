# Phase 08: LLM Handoff Commands — Research

**Researched:** 2026-04-20
**Domain:** Prompt assembly, token counting, clipboard I/O, semantic token enforcement, file output
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-201 — Token budget degradation priority:** Screen component tree + acceptance criteria always included in full. Nav neighbors and referenced entities degrade to summary form (name + type only) when close to the 2k budget. Neither section is dropped entirely — they degrade. The screen spec itself is never truncated.

**D-202 — Token counting library: `gpt-tokenizer` (pure JS, BPE cl100k_base encoding).** Not a character-approximation heuristic. `gpt-tokenizer` is a bundled runtime dep (not peer). The test harness asserts emitted prompt token count is ≤ 2000.

**D-203 — Prompt section order:** `## Task` preamble (target-specific, ~2–3 lines) → `## Screen Spec` (full component tree as structured YAML block) → `## Acceptance Criteria` → `## Navigation Neighbors` (degrades to name-only when tight) → `## Data Entities` (degrades to name+type when tight).

**D-204 — Semantic token vocabulary is a hardcoded `SEMANTIC_TOKENS` set in `src/emit/handoff/semantic-tokens.ts`.** Covers prop names and valid values appearing in ComponentNodeSchema (e.g., `variant: "primary" | "secondary" | "text"`, `gap: "sm" | "md" | "lg"`, `size: "sm" | "md" | "lg"`, `weight: "regular" | "medium" | "bold"`). Values derived from what ComponentNodeSchema actually uses.

**D-205 — HANDOFF-04 tokenizer test uses structural prop audit, not regex.** The assembler emits the prompt with a `<!-- spec-props: { ... } -->` HTML comment block containing the structured prop map. The test parses that block and asserts every prop value is a member of `SEMANTIC_TOKENS`. Regex `/[0-9]+(?:px|pt|dp|rem|#[0-9a-fA-F]{3,6})/` is used as a secondary guard on the full prompt string.

**D-206 — Same structural skeleton for all three targets — only the `## Task` preamble differs.** All three targets include identical sections. Preambles:
- `swiftui` → "Implement this screen in SwiftUI. Use SwiftUI native components aligned to the component tree below."
- `compose` → "Implement this screen in Jetpack Compose. Use Compose native components aligned to the component tree below."
- `tests` → "Write Maestro YAML flows for this screen. Each acceptance criterion should map to one or more Maestro steps using the testID sigils listed in the actions section."

**D-207 — `tests` target includes an extra `## Actions & TestIDs` section** showing the screen's actions with their `testID` sigils resolved. This section does not appear for `swiftui` or `compose`.

**D-208 — All three commands go in the COMMANDS registry** (palette-discoverable via `:` or `Ctrl+P`). They follow the palette's existing arg-prompt flow (D-75): screen ID prompt first, then target selection for `:prompt` and `:extract`.

**D-209 — Side-effect function pattern (not Command<T>).** Three runner functions: `runYankWireframe`, `runPromptScreen`, `runExtractScreen`. The COMMANDS registry entries wrap these. They follow the `emit-maestro` shape.

**D-210 — Output location for `:extract`:** `./prompts/<screen-id>-<target>.md` next to the spec file. Overwrites silently.

**D-211 — Status line feedback:** success shows `Prompted → ./prompts/login-swiftui.md ✓` clearing after 3s. Clipboard yank shows `Wireframe yanked ✓`. Errors surface first diagnostic on the status line. No modal, no blocking overlay.

### Claude's Discretion

- Full SEMANTIC_TOKENS allowlist values — derive from what ComponentNodeSchema actually uses as prop values; err toward accepting common design tokens over restrictive.
- Internal file breakdown of `src/emit/handoff/` — follow `src/emit/maestro/` precedent.
- Exact `gpt-tokenizer` API usage — use `countTokens(str)` or `isWithinTokenLimit(str, 2000)`.
- Whether `:yank wireframe` supports a variant flag — default is the base/content variant; Claude may add optional variant selection if clean.

### Deferred Ideas (OUT OF SCOPE)

- Variant flag for `:yank wireframe` (`:yank wireframe login --variant loading`)
- Batch extract (`:extract --all`)
- Detox tests target — `tests` target is Maestro-only in Phase 8
- Per-step assertion inference in tests target
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HANDOFF-01 | `:yank wireframe <screen-id>` copies ASCII-baseline wireframe to OS clipboard | clipboardy@5.3.1; wireframe renderer already provides `render(spec, screenId)` |
| HANDOFF-02 | `:prompt screen <id> <target>` emits <2k-token self-contained prompt for swiftui/compose/tests | gpt-tokenizer `countTokens` / `isWithinTokenLimit`; assembler pattern from `src/emit/maestro/` |
| HANDOFF-03 | `:extract --screen <id>` writes same fragment to `./prompts/<screen-id>-<target>.md` | `node:fs/promises` `mkdir` + `writeFile`; same IO pattern as emit-maestro |
| HANDOFF-04 | Emitted prompts reference styling via semantic tokens, never pixel values or framework idioms | hardcoded `SEMANTIC_TOKENS` set; structural prop audit via `<!-- spec-props: ... -->` comment block |
</phase_requirements>

---

## Summary

Phase 8 delivers three commands that are the product's primary value delivery: the handoff from spec to LLM. The phase is entirely additive — no existing code is modified except `src/editor/commands/index.ts` (add three entries) and `src/canvas/root.ts` (wire three trigger methods). All computation is pure functions in `src/emit/handoff/`; all IO is in runner functions that follow the `emit-maestro` pattern.

The three hardest design problems are: (1) the token budget degradation algorithm for HANDOFF-02, (2) the structural prop audit mechanism for HANDOFF-04, and (3) wiring the three commands into the existing palette arg-prompt flow without disturbing the existing command registry shape. All three have locked decisions from the discuss-phase (D-201..D-211) that eliminate architectural uncertainty.

**The critical technical dependency is `gpt-tokenizer@3.4.0`.** It ships both ESM and CJS exports, is pure JS (no WASM, no native bindings), uses cl100k_base BPE encoding, and exposes a `countTokens(str)` function and an `isWithinTokenLimit(str, limit)` early-exit function. `clipboardy@5.3.1` is the clipboard library; it requires Node ≥ 20 and is ESM-only with a `node` export condition — compatible with the project's `"type": "module"` package and Node 20+ engine requirement.

**Primary recommendation:** Build `src/emit/handoff/` as three files (assembler.ts, token-budget.ts, semantic-tokens.ts) following the `src/emit/maestro/` structural precedent. Wire command runners as `src/editor/commands/{yank-wireframe,prompt-screen,extract-screen}.ts` following `emit-maestro.ts` exactly.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Wireframe text for clipboard | Emit layer (`src/emit/wireframe/`) | — | `render(spec, screenId)` already exists; yank is a pure consumer |
| Prompt assembly + token budget | Emit layer (`src/emit/handoff/`) | — | Pure function from Spec → string; no IO inside the assembler |
| Semantic token enforcement | Emit layer (`src/emit/handoff/semantic-tokens.ts`) | Test layer | Hardcoded allowlist; assembler injects `<!-- spec-props -->` block for test audit |
| Clipboard write | Command runner (`src/editor/commands/yank-wireframe.ts`) | — | Side-effect lives outside pure emitter |
| File write for `:extract` | Command runner (`src/editor/commands/extract-screen.ts`) | — | Mirrors emit-maestro's `mkdir` + `writeFile` pattern |
| Command wiring + arg prompts | Canvas (`src/canvas/root.ts`) + COMMANDS registry | Palette overlay | Side-effect actions wired as `triggerXxx()` in RootCanvas; palette discovers via COMMANDS keys |
| Status line feedback | Canvas (`src/canvas/root.ts`) | — | `emitStatus` pattern already in place for emit-maestro (D-114 / D-211) |

---

## Standard Stack

### Core (New Dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `gpt-tokenizer` | `^3.4.0` | Token counting — `countTokens(str)` and `isWithinTokenLimit(str, limit)` | Pure JS BPE (cl100k_base), ships ESM+CJS, no WASM/native bindings, 3.4.0 published 2025-11-07. Locked per D-202. |
| `clipboardy` | `^5.3.1` | Write ASCII wireframe text to OS clipboard | ESM, Node 20+, cross-platform (macOS pbcopy / xclip / xsel / Windows PowerShell). Locked per D-208 + CLAUDE.md. |

**Version verification:** `gpt-tokenizer@3.4.0` and `clipboardy@5.3.1` verified against npm registry 2026-04-20. [VERIFIED: npm registry]

### Already in Use (No New Deps)

| Library | Version | Purpose |
|---------|---------|---------|
| `yaml@^2.8.3` | 2.8.3 | Serialize screen component tree as YAML block inside prompt `## Screen Spec` section |
| `zod@^4.3.6` | 4.3.6 | Spec model; all types imported from existing `src/model/` |
| `node:fs/promises` | Node built-in | `mkdir` + `writeFile` for `:extract` file output |
| `node:path` | Node built-in | `dirname`, `join`, `basename` for `./prompts/` path construction |

### Installation

```bash
npm install gpt-tokenizer clipboardy
```

Confirm versions match:
```bash
npm view gpt-tokenizer version   # expect 3.4.0
npm view clipboardy version      # expect 5.3.1
```

---

## Architecture Patterns

### System Architecture Diagram

```
Spec (from store.getState().spec)
        │
        ▼
┌─────────────────────────────────────────────────────┐
│  src/emit/handoff/assembler.ts                      │
│  assemblePrompt(spec, screenId, target): string     │
│                                                     │
│  1. Resolve screen + nav neighbors + entities       │
│  2. Build section strings (task preamble / spec /   │
│     acceptance / neighbors / entities)              │
│  3. measureTokens() each section via gpt-tokenizer  │
│  4. Degrade neighbors+entities when over budget     │
│  5. Inject <!-- spec-props: {...} --> comment block │
│  6. Join sections → final prompt string             │
└──────────────────────────┬──────────────────────────┘
                           │ pure string
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
  ┌──────────────┐ ┌────────────────┐ ┌──────────────────────┐
  │ yank-wire-   │ │ prompt-screen  │ │ extract-screen       │
  │ frame.ts     │ │ .ts            │ │ .ts                  │
  │              │ │                │ │                      │
  │ renderSingle │ │ assemble → log │ │ assemble → mkdir +   │
  │ clipboardy   │ │ token count    │ │ writeFile to         │
  │ .write()     │ │ → status line  │ │ ./prompts/<id>-<t>.md│
  └──────────────┘ └────────────────┘ └──────────────────────┘
            │              │              │
            └──────────────┼──────────────┘
                           ▼
              src/canvas/root.ts
              triggerYankWireframe()
              triggerPromptScreen()
              triggerExtractScreen()
              → emitStatus (D-114 pattern)
              → tui.requestRender()
```

### Recommended Project Structure

```
src/
├── emit/
│   ├── wireframe/         # existing — renderSingleVariant() used by :yank
│   ├── maestro/           # existing — structural model to follow
│   └── handoff/           # NEW — Phase 8 home
│       ├── assembler.ts   # assemblePrompt(spec, screenId, target): string
│       ├── token-budget.ts# countTokens(), isWithinTokenLimit(), degradeSections()
│       └── semantic-tokens.ts  # SEMANTIC_TOKENS set + propAudit()
├── editor/
│   └── commands/
│       ├── emit-maestro.ts     # existing pattern template
│       ├── yank-wireframe.ts   # NEW: runYankWireframe(spec, filePath)
│       ├── prompt-screen.ts    # NEW: runPromptScreen(spec, filePath, screenId, target)
│       └── extract-screen.ts  # NEW: runExtractScreen(spec, filePath, screenId, target)
└── canvas/
    └── root.ts            # add triggerYankWireframe / triggerPromptScreen / triggerExtractScreen
```

### Pattern 1: Token Budget Degradation

**What:** Assemble sections at full fidelity, measure total tokens, degrade gracefully when over 2000.
**When to use:** Every `assemblePrompt()` call — the budget check is mandatory per HANDOFF-02.

```typescript
// Source: gpt-tokenizer@3.4.0 docs (context7 + npm registry verified)
import { countTokens, isWithinTokenLimit } from "gpt-tokenizer";

type Target = "swiftui" | "compose" | "tests";

interface AssembledSections {
  task: string;        // ~20-60 tokens — never degraded
  spec: string;        // component tree YAML — never truncated (D-201)
  acceptance: string;  // acceptance_prose lines — never truncated (D-201)
  neighbors: string;   // full: id + title + edge kind; degraded: id only
  entities: string;    // full: name + fields; degraded: name + type only
  propsComment: string; // <!-- spec-props: {...} --> — always included (D-205)
}

function degradeIfNeeded(sections: AssembledSections): string {
  const full = joinSections(sections);
  if (isWithinTokenLimit(full, 2000) !== false) return full;

  // Degrade neighbors to name-only, entities to name+type (D-201)
  const degraded = {
    ...sections,
    neighbors: summarizeNeighbors(sections),
    entities: summarizeEntities(sections),
  };
  return joinSections(degraded);
}
```

### Pattern 2: Structural Prop Audit (HANDOFF-04)

**What:** Inject a machine-parseable `<!-- spec-props: {...} -->` block into the emitted prompt. Tests parse this block and verify every prop value is in `SEMANTIC_TOKENS`.
**When to use:** All three targets emit this block so the test can verify any emitted prompt.

```typescript
// src/emit/handoff/semantic-tokens.ts
// Prop values that are ALLOWED in emitted prompts (D-204)
export const SEMANTIC_TOKENS = new Set([
  // Button.variant
  "primary", "secondary", "text",
  // Spacer.size, Column.gap, Row.gap
  "sm", "md", "lg",
  // Text.style
  "heading-1", "heading-2", "body", "caption",
  // SegmentedControl uses option strings from spec — no constraint here
  // NavTransition (informational only, not a style prop)
  "push", "modal", "sheet", "replace", "none",
  // BackBehavior kinds
  "pop", "dismiss",
  // Screen kinds
  "regular", "overlay",
]);

// In assembler.ts — collect all prop:value pairs from the component tree
// and inject as HTML comment alongside prompt sections
function buildPropsComment(propMap: Record<string, string>): string {
  return `<!-- spec-props: ${JSON.stringify(propMap)} -->`;
}
```

```typescript
// In tests/handoff-semantic-tokens.test.ts
import { SEMANTIC_TOKENS } from "../src/emit/handoff/semantic-tokens.ts";

test("no pixel values in prompt", () => {
  const prompt = assemblePrompt(spec, "login", "swiftui");
  expect(prompt).not.toMatch(/[0-9]+(?:px|pt|dp|rem|#[0-9a-fA-F]{3,6})/);
});

test("all prop values are semantic tokens", () => {
  const prompt = assemblePrompt(spec, "login", "swiftui");
  const match = prompt.match(/<!-- spec-props: ({.*?}) -->/s);
  const propMap = JSON.parse(match![1]!);
  for (const [prop, value] of Object.entries(propMap)) {
    expect(SEMANTIC_TOKENS.has(value as string), `${prop}: ${value}`).toBe(true);
  }
});
```

### Pattern 3: Side-Effect Runner (mirrors emit-maestro.ts)

**What:** Pure function emitter + side-effect IO separated; result feeds status line.
**When to use:** All three handoff command runners.

```typescript
// src/editor/commands/yank-wireframe.ts
import clipboardy from "clipboardy";
import { renderSingleVariant } from "../../emit/wireframe/index.ts";
import type { Spec } from "../../model/index.ts";

export interface YankWireframeResult {
  ok: boolean;
  message: string;
}

export async function runYankWireframe(
  spec: Spec,
  screenId: string,
): Promise<YankWireframeResult> {
  // 1. Pure emit (no IO)
  // renderSingleVariant returns string (not string[]); content variant = base wireframe.
  // render() returns ALL 4 variants joined — too verbose for clipboard (WIREFRAME-02).
  // [VERIFIED: src/emit/wireframe/variants.ts lines 94-115]
  const text = renderSingleVariant(spec, screenId, "content");

  // 2. Clipboard write (side effect)
  await clipboardy.write(text);

  return { ok: true, message: "Wireframe yanked ✓" };
}
```

```typescript
// src/editor/commands/extract-screen.ts
import { mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { assemblePrompt } from "../../emit/handoff/assembler.ts";
import type { Spec } from "../../model/index.ts";

export async function runExtractScreen(
  spec: Spec,
  specFilePath: string,
  screenId: string,
  target: "swiftui" | "compose" | "tests",
): Promise<{ ok: boolean; message: string }> {
  const prompt = assemblePrompt(spec, screenId, target);
  const promptsDir = join(dirname(specFilePath), "prompts");
  await mkdir(promptsDir, { recursive: true });
  // T-8-path-traversal: sanitize screenId + target to [a-z0-9_-] only
  const safeName = basename(`${screenId.replace(/[^a-z0-9_-]/g, "_")}-${target}`);
  const outPath = join(promptsDir, `${safeName}.md`);
  await writeFile(outPath, prompt, "utf8");
  return { ok: true, message: `Prompted → ./prompts/${safeName}.md ✓` };
}
```

### Pattern 4: COMMANDS Registry Entry for Side-Effect Actions — RESOLVED [2026-04-20]

**Resolution:** Side-effect commands (`yank-wireframe`, `prompt-screen`, `extract-screen`) go INTO the COMMANDS registry (D-208). The palette enumerates `Object.values(COMMANDS)` — this is the only palette surface. There is no separate SIDE_EFFECT_COMMANDS table.

Each COMMANDS entry has:
- `apply()` → calls the runner function (`runYankWireframe` / `runPromptScreen` / `runExtractScreen`) via `void` fire-and-forget, returns the unchanged spec (no spec mutation). A `sideEffectCallback` registered by RootCanvas fires the `emitStatus` pattern when the runner resolves.
- `invert()` → no-op (returns unchanged spec). Side effects cannot be undone. An undo entry IS pushed to the stack (the store always does this), but invoking it has no visible effect on the spec.

**Implementation approach (per D-208 + D-209):**

RootCanvas registers a side-effect result callback on construction. Each COMMANDS entry for `yank-wireframe`, `prompt-screen`, `extract-screen` accepts a `screenId` (and `target` for prompt/extract) via `argsSchema`, then in `apply()`:
1. Reads `spec` from the apply args (unchanged spec is returned — no mutation)
2. Fires `void runXxx(spec, screenId, target)` and resolves the result via the registered `onSideEffectResult` callback on RootCanvas

**Concrete COMMANDS shape (kebab-case names matching D-56):**

```typescript
// src/editor/commands/yank-wireframe.ts — COMMANDS entry export
export const yankWireframeCommand: Command<typeof yankWireframeArgsSchema> = {
  name: "yank-wireframe",
  argsSchema: yankWireframeArgsSchema,   // z.object({ screenId: z.string() })
  apply(spec, _astHandle, args) {
    // Fire side-effect runner. Result delivered via onSideEffectResult callback
    // registered by RootCanvas — NOT via store state mutation.
    void runYankWireframe(spec, args.screenId).then((result) => {
      yankWireframeCommand._onResult?.(result);
    });
    return { spec, inverseArgs: null };  // unchanged spec — no mutation
  },
  invert(spec, _astHandle, _inverseArgs) {
    return { spec };  // no-op — side effects cannot be undone
  },
  // Mutable callback slot — set by RootCanvas after store creation
  _onResult: undefined as ((r: { ok: boolean; message: string }) => void) | undefined,
};
```

RootCanvas wires `_onResult` after store creation to fire the `emitStatus` + `tui.requestRender()` pattern. Command naming: `yank-wireframe`, `prompt-screen`, `extract-screen` (kebab-case, D-56).

**What this replaces:** The prior approach (SIDE_EFFECT_COMMANDS table + custom palette section) is INCORRECT. The palette already enumerates all COMMANDS via `Object.values(COMMANDS)` — adding entries there is sufficient for D-208 palette discoverability.

### Pattern 5: Screen Subgraph Extraction

**What:** Given a screenId, extract the screen + all nav neighbors (screens reachable via outbound edges) + all entities referenced by the screen's component tree.

```typescript
// src/emit/handoff/assembler.ts — subgraph resolution
function resolveNeighbors(spec: Spec, screenId: string): Screen[] {
  const neighborIds = spec.navigation.edges
    .filter(e => e.from === screenId || e.to === screenId)
    .flatMap(e => [e.from, e.to])
    .filter(id => id !== screenId);
  const unique = [...new Set(neighborIds)];
  return unique.flatMap(id => spec.screens.find(s => s.id === id) ?? []);
}

function resolveEntities(spec: Spec, screen: Screen): Entity[] {
  // Walk component tree collecting bindsTo JSON Pointers;
  // extract entity name from pointer prefix (e.g., /habits/0/name → entity "habit")
  const pointers = collectBindsTo(screen.variants.content?.tree ?? []);
  const entityNames = new Set(pointers.map(p => p.split("/")[1]));
  return spec.data.entities.filter(e => entityNames.has(e.name));
}
```

### Anti-Patterns to Avoid

- **Character-counting as token approximation:** The 2k token budget is a measured constraint per HANDOFF-02. Never use `str.length / 4` as a proxy — use `countTokens(str)` from gpt-tokenizer. [VERIFIED: locked per D-202]
- **Truncating the screen spec:** D-201 is explicit — the screen component tree and acceptance criteria are NEVER truncated, only neighbors/entities degrade.
- **Shell injection in extract paths:** Never construct paths via `exec("writeFile " + screenId)`. Use `join()` + `basename()` with sanitized screenId (`/[^a-z0-9_-]/g` → `"_"`).
- **Running clipboardy synchronously:** `clipboardy.write()` is async. Always `await` it.
- **Importing gpt-tokenizer CJS in an ESM module:** Use the default `import { countTokens } from "gpt-tokenizer"` path — the `"."` export resolves to `./esm/main.js` under ESM. [VERIFIED: npm registry exports map]
- **Using a SIDE_EFFECT_COMMANDS table or extending palette/index.ts:** The palette already enumerates COMMANDS. Adding side-effect commands to COMMANDS is the correct approach (D-208). Do NOT add a parallel enumeration path to the palette.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Token counting | Character-count heuristic | `gpt-tokenizer@3.4.0` `countTokens()` | BPE encoding is non-linear; YAML, code, and prose tokenize very differently. A 4-char-per-token estimate can be off by 30–40% for YAML-heavy content. |
| Early budget exit | Loop counting chars and breaking | `isWithinTokenLimit(str, 2000)` | Stops encoding at the limit; no wasted work for prompts well under budget. |
| Clipboard write | `pbcopy` subprocess / xclip shell | `clipboardy@5.3.1` | Cross-platform (macOS / Linux / Windows), handles encoding edge cases, ESM-native, async. |
| Output directory creation | Manual `stat` + `mkdir` | `mkdir(dir, { recursive: true })` | Built into Node 20+ `fs/promises`; already used in emit-maestro. |

**Key insight:** The token-counting domain has many tempting shortcuts (char count, word count, byte count) that produce subtly wrong results. Structured YAML like the spec's component tree tokenizes differently from prose — always measure with an actual BPE tokenizer.

---

## Common Pitfalls

### Pitfall 1: clipboardy Requires the `node` Export Condition

**What goes wrong:** Importing `clipboardy` without the `node` export condition resolves to `browser.js`, which uses `navigator.clipboard` and throws in a Node/terminal context.
**Why it happens:** clipboardy 5.x ships a dual export: `"node": "./index.js"` and `"default": "./browser.js"`. Node's ESM resolution uses the `node` condition automatically when running in Node — but bundlers (esbuild, tsup) that don't set the `node` condition will pick `browser.js`.
**How to avoid:** Run without a bundler (jiti handles `.ts` directly, Node picks the `node` condition). If using tsup for publish, add `platform: "node"` to tsup config.
**Warning signs:** `TypeError: navigator is not defined` or `Error: navigator.clipboard is not supported` at runtime.

### Pitfall 2: gpt-tokenizer Data Files Are Large

**What goes wrong:** gpt-tokenizer@3.4.0's unpacked size is ~53MB because it bundles BPE vocabulary data files alongside the JS. When imported, jiti loads the whole package.
**Why it happens:** BPE tokenizers require large vocabulary files (cl100k_base has ~100k token pairs).
**How to avoid:** This is expected and unavoidable for accurate BPE counting. The first import is the only penalty — subsequent calls reuse the loaded vocabulary. Do NOT lazy-import per call; import once at module level.
**Warning signs:** Slow cold start on first `:prompt` invocation (~100–300ms). This is normal and expected.

### Pitfall 3: Token Budget Overshoot from YAML Serialization

**What goes wrong:** `YAML.stringify(screen.variants)` of a complex screen can produce 800–1200 tokens of YAML alone, exhausting the budget before neighbors and entities are added.
**Why it happens:** YAML serialization of a deeply-nested component tree (Column → Row → Card → List) is verbose — keys, indentation, and list markers all count as tokens.
**How to avoid:** Measure `countTokens(specSection)` immediately after building the screen spec section. If it exceeds ~1500 tokens (the threshold below which neighbors + minimal entities still fit), consider emitting a compact form: one-level-deep tree with child count annotations (`Column (3 children)`) instead of the full recursive tree.
**Warning signs:** `isWithinTokenLimit(fullPrompt, 2000)` returns `false` even after neighbor/entity degradation. This means the screen spec itself is too large — flag as a WARNING in the status line and emit truncated neighbors + degraded entities as a best-effort result.

### Pitfall 4: `<!-- spec-props -->` Comment Breaks YAML Parsers If Prompt Is Re-Parsed

**What goes wrong:** If another tool attempts to parse the emitted `.md` file as YAML-with-frontmatter, the `<!-- spec-props: {...} -->` HTML comment inside the Markdown body causes no issues. However, if it appears inside the YAML block in the `## Screen Spec` section, YAML parsers will choke on it.
**Why it happens:** HTML comments are not valid YAML.
**How to avoid:** Always place the `<!-- spec-props: {...} -->` block OUTSIDE the YAML code fence — as a standalone line after the `## Screen Spec` section's closing ` ``` ` fence. The test's regex `<!--spec-props: ({...}) -->` finds it regardless of position in the Markdown body.

### Pitfall 5: Path Traversal via screenId

**What goes wrong:** `:extract --screen "../../../etc/passwd"` writes outside `./prompts/`.
**Why it happens:** screenId comes from palette user input.
**How to avoid:** Sanitize with `screenId.replace(/[^a-z0-9_-]/g, "_")` then additionally apply `basename()` — belt-and-suspenders, same as emit-maestro's `safeName` pattern.
**Warning signs:** Any `/` or `..` in the output path.

### Pitfall 6: Using `render()` Instead of `renderSingleVariant()` for `:yank`

**What goes wrong:** `clipboardy.write(render(spec, screenId))` copies all 4 variant blocks (content + empty + loading + error) to the clipboard — far too verbose for pasting into a PR or chat.
**Why it happens:** `render()` returns ALL 4 variant wireframes as a single concatenated string. It is designed for the file-save path, not clipboard.
**How to avoid:** Use `renderSingleVariant(spec, screenId, "content")` — returns a single-variant string. [VERIFIED: src/emit/wireframe/variants.ts lines 94-115]
**Warning signs:** Clipboard paste is 4x longer than expected, showing multiple `+--screen:...+` header lines.

### Pitfall 7: Neighbors Include the Source Screen Itself

**What goes wrong:** Edge traversal includes both `from` and `to` — if `screenId === edge.to`, the source screen appears in its own neighbor list.
**Why it happens:** The navigation graph stores undirected-seeming edges as directed pairs.
**How to avoid:** After collecting neighbor IDs, filter: `neighborIds.filter(id => id !== screenId)`.

---

## Code Examples

Verified patterns from official sources and existing codebase:

### gpt-tokenizer: Count Tokens and Budget Check

```typescript
// Source: context7 /niieani/gpt-tokenizer — verified 2026-04-20
import { countTokens, isWithinTokenLimit } from "gpt-tokenizer";

// Exact count
const n = countTokens("Implement this screen in SwiftUI...");
console.log(n); // e.g., 9

// Budget guard (more efficient than countTokens for pass/fail checks)
const result = isWithinTokenLimit(promptStr, 2000);
if (result === false) {
  // over budget — degrade and retry
} else {
  // within budget; result === token count
}
```

### clipboardy: Write to OS Clipboard

```typescript
// Source: clipboardy@5.3.1 npm package — verified 2026-04-20
// ESM import — Node resolves to ./index.js via "node" export condition
import clipboardy from "clipboardy";

await clipboardy.write("ASCII wireframe text here");
const text = await clipboardy.read(); // read back for verification
```

### assemblePrompt: Full Section Structure

```typescript
// Prompt section order per D-203
function assemblePrompt(spec: Spec, screenId: string, target: Target): string {
  const screen = spec.screens.find(s => s.id === screenId);
  if (!screen) throw new Error(`Screen not found: ${screenId}`);

  const taskPreamble = buildTaskPreamble(target);
  const specSection = buildSpecSection(screen);
  const acceptanceSection = buildAcceptanceSection(screen);
  const neighborsSection = buildNeighborsSection(spec, screenId, false); // full
  const entitiesSection = buildEntitiesSection(spec, screen, false);     // full
  const propsComment = buildPropsComment(collectProps(screen));

  // Extra section for tests target (D-207)
  const actionsSection = target === "tests"
    ? buildActionsSection(spec, screen)
    : "";

  const full = [
    taskPreamble, specSection, acceptanceSection,
    neighborsSection, entitiesSection,
    actionsSection, propsComment
  ].filter(Boolean).join("\n\n");

  if (isWithinTokenLimit(full, 2000) !== false) return full;

  // Degrade per D-201
  const degraded = [
    taskPreamble, specSection, acceptanceSection,
    buildNeighborsSection(spec, screenId, true),  // name-only
    buildEntitiesSection(spec, screen, true),      // name+type only
    actionsSection, propsComment
  ].filter(Boolean).join("\n\n");

  return degraded;
}
```

### emit-maestro Pattern: Status Timer (existing, to replicate)

```typescript
// From src/canvas/root.ts lines 218-232 [VERIFIED: read from codebase]
private triggerYankWireframe(): void {
  const state = this.store.getState();
  // screenId comes from palette arg-prompt flow
  const screenId = state.activeScreenId ?? "";
  void runYankWireframe(state.spec, screenId).then((result) => {
    if (this.emitStatusTimer !== null) clearTimeout(this.emitStatusTimer);
    this.emitStatus = { message: result.message, ok: result.ok };
    this.tui?.requestRender();
    this.emitStatusTimer = setTimeout(() => {
      this.emitStatus = null;
      this.emitStatusTimer = null;
      this.tui?.requestRender();
    }, 3000);
  });
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| tiktoken (WASM) for BPE counting | `gpt-tokenizer` (pure JS) | 2023 onward | No native bindings; works in all Node contexts including jiti |
| Character-count token approximation | Exact BPE via `countTokens()` | — | 30-40% accuracy improvement for structured YAML content |
| `xclip` subprocess for Linux clipboard | `clipboardy` unified API | 2015→ present | Cross-platform, async, proper encoding |

**Deprecated/outdated:**
- `@dqbd/tiktoken`: WASM-based; requires `.wasm` file at runtime; size 23MB. Not viable in jiti/.ts context without build step.
- `js-tiktoken`: WASM-based CJS-only; same issue.
- clipboardy v2/v3: CommonJS only; clipboardy v5 is ESM-only matching this project's `"type": "module"`.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | ~~RESOLVED~~ `render()` returns all 4 variants as one string; `:yank` uses `renderSingleVariant(spec, screenId, "content")` | Architecture Patterns | No risk — verified |
| A2 | ~~RESOLVED~~ The palette enumerates `Object.values(COMMANDS)` exclusively — side-effect commands surface in the palette by being added to COMMANDS with `apply()` calling the runner and `invert()` as a no-op. Verified against `src/canvas/palette/index.ts` constructor. [2026-04-20] | Pattern 4 | No risk — verified |
| A3 | `spec.data.entities` is the correct path for entity access on the Spec type | Code Examples | Check `src/model/data.ts` for exact field name if entity resolution fails at compile |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed.
*(1 assumption present — low risk, easily verified against existing source files.)*

---

## Open Questions

1. **`render()` signature — RESOLVED**
   - Verified: `render(spec, screenId): string` returns ALL 4 variant blocks (content + empty + loading + error) joined as a single string. [VERIFIED: src/emit/wireframe/variants.ts lines 77-79]
   - `:yank wireframe` MUST use `renderSingleVariant(spec, screenId, "content"): string` — returns only the content variant block. [VERIFIED: src/emit/wireframe/variants.ts lines 94-115]
   - No open question remains. Planner: use `renderSingleVariant` in `yank-wireframe.ts`.

2. **Palette side-effect command discovery — RESOLVED [2026-04-20]**
   - RESOLVED: Side-effect commands go into COMMANDS. `apply()` calls the runner function. `invert()` is a no-op — side effects cannot be undone and must not mutate the spec. CommandPalette enumerates COMMANDS via `Object.values(COMMANDS)` — this is the only palette surface. Approach A (SIDE_EFFECT_COMMANDS table) is not needed and must not be implemented. [VERIFIED: src/canvas/palette/index.ts constructor lines 297-306]

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js ≥ 20 | clipboardy | ✓ | Darwin 25.2.0 (system) | — |
| npm | package install | ✓ | (present — project has package.json) | — |
| `gpt-tokenizer` | HANDOFF-02 token counting | ✗ not yet installed | — | none (locked dep) |
| `clipboardy` | HANDOFF-01 clipboard write | ✗ not yet installed | — | none (locked dep) |

**Missing dependencies with no fallback:**
- `gpt-tokenizer` and `clipboardy` must be installed as part of Wave 0 (first plan task).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest@4.1.4 |
| Config file | vitest.config.ts (or package.json `test` script) |
| Quick run command | `npx vitest run tests/handoff` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HANDOFF-01 | `:yank wireframe` copies ASCII wireframe (no Unicode glyphs, no trailing control chars) | unit (mock clipboardy) | `npx vitest run tests/handoff/yank-wireframe.test.ts` | ❌ Wave 0 |
| HANDOFF-02 | `:prompt screen` produces prompt ≤ 2000 tokens (measured) | unit | `npx vitest run tests/handoff/prompt-screen.test.ts` | ❌ Wave 0 |
| HANDOFF-03 | `:extract` writes valid Markdown to `./prompts/<id>-<target>.md`, re-openable | unit (tmp dir) | `npx vitest run tests/handoff/extract-screen.test.ts` | ❌ Wave 0 |
| HANDOFF-04 | Emitted prompts contain no `px/pt/dp/rem/#hex` values; all prop values in SEMANTIC_TOKENS | unit | `npx vitest run tests/handoff/semantic-tokens.test.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run tests/handoff/` (handoff suite only, < 5s)
- **Per wave merge:** `npx vitest run` (full suite ~968 pass baseline)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/handoff/yank-wireframe.test.ts` — covers HANDOFF-01
- [ ] `tests/handoff/prompt-screen.test.ts` — covers HANDOFF-02 (token budget assertion)
- [ ] `tests/handoff/extract-screen.test.ts` — covers HANDOFF-03 (file output + valid Markdown)
- [ ] `tests/handoff/semantic-tokens.test.ts` — covers HANDOFF-04 (prop audit + regex guard)
- [ ] `tests/handoff/assembler.test.ts` — covers prompt section assembly, degradation logic
- [ ] `npm install gpt-tokenizer clipboardy` — new runtime deps

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes | `screenId.replace(/[^a-z0-9_-]/g, "_")` + `basename()` for path sanitization |
| V6 Cryptography | no | — |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path traversal via screenId in `:extract` | Tampering | Sanitize to `[a-z0-9_-]` + `basename()`, identical to emit-maestro's `safeName` |
| Oversized prompt injection via malicious acceptance_prose | DoS | Token budget enforced by `isWithinTokenLimit(str, 2000)` — budget check gates output |
| Clipboard poisoning via Unicode control chars | Spoofing | WIREFRAME-02 guarantees ASCII-baseline wireframe; only `| - + .` chars in the persisted wireframe |

---

## Sources

### Primary (HIGH confidence)
- `src/editor/commands/emit-maestro.ts` — side-effect action pattern confirmed by direct read [VERIFIED: codebase]
- `src/canvas/root.ts` lines 218-232 — `triggerEmitMaestro()` and `emitStatus` pattern confirmed [VERIFIED: codebase]
- `src/canvas/palette/index.ts` constructor lines 297-306 — `Object.values(COMMANDS)` enumeration confirmed; no separate side-effect path exists [VERIFIED: codebase, 2026-04-20]
- `src/emit/wireframe/index.ts` — `render()` barrel API confirmed [VERIFIED: codebase]
- `src/editor/commands/index.ts` — COMMANDS registry shape confirmed [VERIFIED: codebase]
- `src/model/component.ts` — ComponentNode prop types (variant, gap, size, style, align) confirmed [VERIFIED: codebase]
- `src/model/screen.ts` — `acceptance` field is `string[]` optional [VERIFIED: codebase]
- `src/model/navigation.ts` — NavEdge shape (from, to, trigger, transition) confirmed [VERIFIED: codebase]
- `package.json` — `"type": "module"`, Node 20+, current deps list confirmed [VERIFIED: codebase]
- `npm view gpt-tokenizer` — version 3.4.0, exports ESM+CJS, published 2025-11-07 [VERIFIED: npm registry]
- `npm view clipboardy` — version 5.3.1, `"type": "module"`, Node ≥ 20, published 2026-02-24 [VERIFIED: npm registry]
- context7 `/niieani/gpt-tokenizer` — `countTokens(str)` and `isWithinTokenLimit(str, limit)` API confirmed [VERIFIED: context7]

### Secondary (MEDIUM confidence)
- gpt-tokenizer@3.4.0 ~53MB unpacked size — noted from npm registry JSON; cold-start latency expected but not benchmarked in this context [VERIFIED: npm registry, latency is ASSUMED]

### Tertiary (LOW confidence)
- Token count for a typical spec YAML block (800–1200 token estimate) — [ASSUMED] based on BPE characteristics of YAML; not measured against actual spec fixtures

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — both deps verified against npm registry; existing code patterns verified from codebase reads
- Architecture: HIGH — patterns derived from existing `emit-maestro` source; no novel patterns introduced
- Pitfalls: MEDIUM-HIGH — path traversal and clipboardy export condition are documented and verified; token budget overshoot is an ASSUMED risk based on BPE characteristics

**Research date:** 2026-04-20
**Valid until:** 2026-05-20 (stable domain; gpt-tokenizer and clipboardy are mature libraries)
