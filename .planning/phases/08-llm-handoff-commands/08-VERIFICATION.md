---
phase: 08-llm-handoff-commands
verified: 2026-04-20T09:41:00Z
status: human_needed
score: 4/4 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Open the canvas against a fixture spec. Press Ctrl+W on a screen with a wireframe. Paste the clipboard content into a text editor."
    expected: "Only ASCII characters (|, -, +, ., spaces, alphanumeric) appear. No Unicode box-drawing glyphs."
    why_human: "clipboardy.write is mocked in tests; the real OS clipboard interaction with pi's terminal session cannot be verified programmatically without running the live extension."
  - test: "Open palette (: or Ctrl+P) and type 'yank'. Select 'yank-wireframe', enter a screen ID when prompted."
    expected: "'yank-wireframe' appears as a selectable palette entry; arg-prompt collects screenId; after selection, 'Wireframe yanked ✓' appears in the header status line for 3 seconds."
    why_human: "Palette overlay interaction and emitStatus display require a running pi TUI session; not exercised by unit tests."
  - test: "Open palette and select 'prompt-screen'. Enter a screen ID and target 'swiftui'."
    expected: "'Prompt ready (swiftui) ✓' appears in the status line for 3 seconds."
    why_human: "Same reason — live TUI session required to verify palette arg-prompt flow and status line rendering."
  - test: "Open palette and select 'extract-screen'. Enter a screen ID and target 'compose'. Confirm a file appears at ./prompts/<id>-compose.md next to the spec."
    expected: "File is created, starts with '## Task', contains Jetpack Compose preamble. Status line shows 'Prompted → ./prompts/...' for 3 seconds."
    why_human: "Requires live session to exercise the full palette → arg-prompt → file-write → status-line round-trip."
---

# Phase 8: LLM Handoff Commands Verification Report

**Phase Goal:** A developer can extract a screen, its wireframe, or a framework-targeted prompt from any spec and paste it straight into an LLM of their choice — the handoff the product exists to enable.
**Verified:** 2026-04-20T09:41:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `runYankWireframe` writes ASCII-only wireframe text to OS clipboard | ✓ VERIFIED | `yank-wireframe.ts` calls `renderSingleVariant(spec, screenId, "content")` then `clipboardy.write(text)`. 3 tests pass including ASCII regex `/^[|\-+. \x20-\x7E\n]*$/` assertion. |
| 2 | `assemblePrompt` returns a prompt under 2000 BPE tokens with correct section order | ✓ VERIFIED | `assembler.ts` uses `isWithinBudget(full, 2000)` via `gpt-tokenizer`; section order Task→Screen Spec→Acceptance Criteria→Nav Neighbors→Data Entities→Actions→spec-props confirmed by 15 assembler tests. All habit-tracker screens pass the 2000-token budget across all 3 targets. |
| 3 | `runExtractScreen` writes `./prompts/<sanitized-id>-<target>.md` next to the spec file | ✓ VERIFIED | `extract-screen.ts` sanitizes with `/[^a-z0-9_-]/g` + `basename()`, then calls `mkdir(promptsDir, {recursive:true})` + `writeFile`. 5 tests pass including path traversal and overwrite tests. |
| 4 | All prop values in `<!-- spec-props: {...} -->` are SEMANTIC_TOKENS members; no pixel values in output | ✓ VERIFIED | `SEMANTIC_TOKENS` covers all ComponentNode prop value unions (Button.variant, Text.style, Column/Row gap/align, Spacer.size, Screen.kind, NavEdge.transition, BackBehavior). 34 tests across `semantic-tokens.test.ts` and `assembler.test.ts` verify membership and pixel-free output. |
| 5 | Commands are palette-discoverable: yank-wireframe, prompt-screen, extract-screen appear in COMMANDS | ✓ VERIFIED | All three registered in `src/editor/commands/index.ts` COMMANDS object. `yankWireframeCommand`, `promptScreenCommand`, `extractScreenCommand` exports confirmed in their respective files. |
| 6 | Ctrl+W triggers yank-wireframe for the active screen | ✓ VERIFIED | `handleInput` in `root.ts` checks `data === "\x17"` and calls `triggerYankWireframe(screenId)`. Confirmed `\x17` is free (existing: `\x05`=Ctrl+E, `\x10`=Ctrl+P, `\x11`=Ctrl+Q, `\x19`=Ctrl+Y, `\x1a`=Ctrl+Z). |
| 7 | `emitStatus` 3s auto-clear pattern applied to all three handoff trigger methods | ✓ VERIFIED | `triggerYankWireframe`, `triggerPromptScreen`, `triggerExtractScreen` all follow the exact pattern from `triggerEmitMaestro`: clear timer, set emitStatus, requestRender, setTimeout 3000 to null. |
| 8 | No existing canvas keybindings broken | ✓ VERIFIED | Canvas tests: 81 tests pass across `canvas-integration.test.ts`, `canvas-focus.test.ts`, `canvas-render.test.ts`. |

**Score:** 4/4 required HANDOFF must-haves verified (HANDOFF-01 through HANDOFF-04)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/emit/handoff/semantic-tokens.ts` | SEMANTIC_TOKENS Set covering all prop value unions | ✓ VERIFIED | Exports `SEMANTIC_TOKENS` (Set of 23 values covering Button.variant, Text.style, gap/align/size, Screen.kind, NavEdge.transition, BackBehavior). |
| `src/emit/handoff/token-budget.ts` | countTokens + isWithinBudget wrappers over gpt-tokenizer | ✓ VERIFIED | Exports `countTokens` and `isWithinBudget`. Delegates to `gpt-tokenizer`'s `countTokens` and `isWithinTokenLimit`. No string-length heuristics. |
| `src/emit/handoff/assembler.ts` | assemblePrompt pure function with degradation logic | ✓ VERIFIED | Exports `assemblePrompt`, `AssembleResult`, `Target`. Implements D-201 (never truncate spec+acceptance), D-203 (section order), D-205 (spec-props comment), D-206 (target preambles). |
| `src/emit/handoff/index.ts` | Public barrel, explicit-named exports only | ✓ VERIFIED | Exports `assemblePrompt`, `AssembleResult`, `Target`, `SEMANTIC_TOKENS`, `countTokens`, `isWithinBudget`. No `export *`. |
| `src/editor/commands/yank-wireframe.ts` | runYankWireframe + yankWireframeCommand | ✓ VERIFIED | Exports both. Uses `renderSingleVariant(..., "content")` not `render()`. `yankWireframeCommand` has `_onResult` slot. |
| `src/editor/commands/prompt-screen.ts` | runPromptScreen + promptScreenCommand | ✓ VERIFIED | Exports both. Calls `assemblePrompt`. Returns `prompt` in result. `promptScreenCommand` has `_onResult` slot. |
| `src/editor/commands/extract-screen.ts` | runExtractScreen + extractScreenCommand | ✓ VERIFIED | Exports both. Path sanitization: `/[^a-z0-9_-]/g` + `basename()`. `extractScreenCommand` has `_onResult` and `_specFilePath` slots. |
| `src/editor/commands/index.ts` | COMMANDS registry with all three handoff entries | ✓ VERIFIED | `"yank-wireframe"`, `"prompt-screen"`, `"extract-screen"` all registered. |
| `src/canvas/root.ts` | triggerYankWireframe/PromptScreen/ExtractScreen + notifySideEffectResult + Ctrl+W | ✓ VERIFIED | All 4 methods present. `_onResult` callbacks wired in constructor. `_specFilePath` wired from `store.getState().filePath`. |
| `tests/handoff/*.test.ts` (5 files) | 66 passing tests with no it.todo stubs | ✓ VERIFIED | 66 passing, 0 failing, 0 todo. `grep -rh 'it.todo' tests/handoff/` returns empty. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `src/emit/handoff/assembler.ts` | `src/emit/handoff/token-budget.ts` | `import isWithinBudget` | ✓ WIRED | `isWithinBudget` imported and called twice in `assemblePrompt`. |
| `src/emit/handoff/assembler.ts` | `src/model/index.ts` | `import type Spec` | ✓ WIRED | `import type { Spec } from "../../model/index.ts"` confirmed. |
| `src/emit/handoff/assembler.ts` | `yaml` | `import * as YAML` | ✓ WIRED | `YAML.stringify` used in `buildSpecSection`. Plain JS objects constructed before YAML.stringify per T-8-05. |
| `src/editor/commands/yank-wireframe.ts` | `src/emit/wireframe/index.ts` | `renderSingleVariant` | ✓ WIRED | `renderSingleVariant(spec, screenId, "content")` called in `runYankWireframe`. |
| `src/editor/commands/extract-screen.ts` | `src/emit/handoff/assembler.ts` | `assemblePrompt` | ✓ WIRED | `assemblePrompt(spec, screenId, target)` called in `runExtractScreen`. |
| `src/editor/commands/index.ts` | `src/editor/commands/yank-wireframe.ts` | `import yankWireframeCommand` | ✓ WIRED | Import and COMMANDS registration both confirmed. |
| `src/canvas/root.ts` | `src/editor/commands/yank-wireframe.ts` | `import runYankWireframe` | ✓ WIRED | Both `runYankWireframe` and `yankWireframeCommand` imported; used in `triggerYankWireframe` and constructor callback. |
| `src/canvas/palette/index.ts` | `src/editor/commands/index.ts` | `Object.values(COMMANDS)` | ✓ WIRED | Canvas palette already enumerates COMMANDS; confirmed by 81 passing canvas tests including palette tests. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `assembler.ts` — `buildSpecSection` | `screen` from `spec.screens.find(...)` | Spec passed from caller (store state) | Yes — builds plain JS object from real screen fields | ✓ FLOWING |
| `assembler.ts` — `buildActionsSection` | `spec.actions` (Record) | Corrected in Plan 02 to use `Object.entries()` (not array) | Yes — iterates real action registry | ✓ FLOWING |
| `yank-wireframe.ts` — `runYankWireframe` | `text` from `renderSingleVariant(spec, screenId, "content")` | Wireframe renderer (Phase 3) | Yes — pure function producing real ASCII art | ✓ FLOWING |
| `extract-screen.ts` — `runExtractScreen` | `prompt` from `assemblePrompt(...)` | assembler.ts pure function | Yes — full prompt string written to file | ✓ FLOWING |

### Behavioral Spot-Checks

Step 7b: SKIPPED for palette/keybinding/clipboard interactions — no runnable entry point for live pi TUI. Unit-level spot-checks confirmed via vitest.

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| 66 handoff tests pass | `npx vitest run tests/handoff/` | 5 test files, 66 tests passed | ✓ PASS |
| No TypeScript errors in phase 8 files | `npx tsc --noEmit 2>&1 | grep -E 'emit/handoff|commands/(yank|prompt|extract)|canvas/root'` | No output (0 errors) | ✓ PASS |
| Canvas regression tests pass | `npx vitest run tests/canvas-integration.test.ts tests/canvas-focus.test.ts tests/canvas-render.test.ts` | 81 tests passed | ✓ PASS |
| gpt-tokenizer and clipboardy in dependencies | `node -e "..."` checking package.json | `^3.4.0` and `^5.3.1` found in dependencies | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| HANDOFF-01 | 08-01, 08-03, 08-04 | `:yank wireframe <screen-id>` copies ASCII wireframe to OS clipboard | ✓ SATISFIED | `runYankWireframe` + `yankWireframeCommand` implemented; Ctrl+W binding in root.ts; 3 passing tests including ASCII regex |
| HANDOFF-02 | 08-02, 08-03, 08-04 | `:prompt screen <id> <target>` emits <2k-token self-contained prompt | ✓ SATISFIED | `assemblePrompt` with BPE budget enforcement; `runPromptScreen` runner; 34+ passing tests confirming token budget across all screens × targets |
| HANDOFF-03 | 08-02, 08-03, 08-04 | `:extract --screen <id>` writes prompt fragment to file | ✓ SATISFIED | `runExtractScreen` with path sanitization + file write; 5 passing tests including traversal mitigation |
| HANDOFF-04 | 08-02, 08-03 | Prompt uses semantic tokens, not pixel values | ✓ SATISFIED | `SEMANTIC_TOKENS` set covers all prop value unions; `<!-- spec-props: {...} -->` block in all prompts; 30+ tests verifying no px/pt/dp/rem/#hex in output |

**Note:** REQUIREMENTS.md traceability table still shows HANDOFF-01..04 as "Pending" — this is a documentation state that was not updated in Phase 8 plans. The implementations fully satisfy the requirements. The traceability update is a minor doc task.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/emit/handoff/assembler.ts` | multiple | `// biome-ignore lint/suspicious/noExplicitAny` | ℹ️ Info | Tree walkers use `any[]` for recursive unknown component shapes — documented with rationale comments, not a bug. |
| `src/editor/commands/*.ts` | all three | `_onResult?: ...` module-level mutable slots | ℹ️ Info | Intentional design per Plan 08-04 to avoid circular import canvas/ → editor/commands/ → canvas/. Set once in constructor. |
| None | — | No stubs, no TODO/FIXME, no empty return null, no placeholder comments | — | Clean. |

### Human Verification Required

The following require a live pi TUI session and cannot be verified programmatically:

#### 1. Ctrl+W Clipboard Write (Live Session)

**Test:** Open the canvas against any fixture spec (e.g., `fixtures/habit-tracker.spec.md`). Press Ctrl+W on a screen that has a wireframe.
**Expected:** The OS clipboard receives the ASCII wireframe text. Paste into any text editor — only ASCII characters (`|`, `-`, `+`, `.`, alphanumeric, spaces) should appear. No Unicode box-drawing characters.
**Why human:** `clipboardy.write` is mocked in all tests to avoid real clipboard interaction. The live OS clipboard write path is not exercised by vitest.

#### 2. Palette Discovery (Live Session)

**Test:** Open palette (`:` or `Ctrl+P`) in the canvas. Type "yank".
**Expected:** "yank-wireframe" appears as a selectable entry. Select it; the palette arg-prompt collects a screen ID. After entering a valid screen ID, "Wireframe yanked ✓" appears in the header status line for approximately 3 seconds.
**Why human:** Palette overlay and `emitStatus` display require the pi TUI's `showOverlay` and `requestRender` pipeline. Unit tests exercise only the headless focus-FSM and COMMANDS enumeration, not the full overlay lifecycle.

#### 3. prompt-screen Palette Flow (Live Session)

**Test:** Open palette, select "prompt-screen", enter a screen ID and target "swiftui".
**Expected:** "Prompt ready (swiftui) ✓" appears in the status line for 3 seconds. No file is written to disk.
**Why human:** Same as above — live pi session required.

#### 4. extract-screen Palette Flow (Live Session)

**Test:** Open palette, select "extract-screen", enter a screen ID and target "compose". After the command completes, check the directory containing the spec file.
**Expected:** A file exists at `./prompts/<screenId>-compose.md` (relative to the spec). Opening it shows it starts with `## Task` and contains Jetpack Compose instructions. Status line shows "Prompted → ./prompts/..." for 3 seconds.
**Why human:** The full palette → arg-prompt → file-write → status-line round-trip requires the live extension runtime.

### Gaps Summary

No automated gaps found. All 4 HANDOFF requirements are satisfied by the implementation with full test coverage. Phase goal is mechanically achieved.

Status is `human_needed` solely because 4 live-session checks (clipboard write, palette discovery for 3 commands) cannot be exercised without a running pi TUI instance. These are expected for any TUI feature and do not indicate implementation defects.

---

_Verified: 2026-04-20T09:41:00Z_
_Verifier: Claude (gsd-verifier)_
