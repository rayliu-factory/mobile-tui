---
phase: 08-llm-handoff-commands
plan: "03"
subsystem: editor/commands + tests/handoff
tags:
  - handoff
  - commands
  - io-layer
  - clipboard
  - file-write
  - tdd
  - security

dependency_graph:
  requires:
    - "08-01 (semantic-tokens, token-budget infrastructure)"
    - "08-02 (assemblePrompt pure function)"
    - "src/emit/wireframe/index.ts (renderSingleVariant)"
  provides:
    - "src/editor/commands/yank-wireframe.ts (runYankWireframe)"
    - "src/editor/commands/prompt-screen.ts (runPromptScreen)"
    - "src/editor/commands/extract-screen.ts (runExtractScreen)"
    - "tests/handoff/*.test.ts — all four files passing (HANDOFF-01 through HANDOFF-04)"
  affects:
    - "08-04 (RootCanvas wires triggerYankWireframe, triggerPromptScreen, triggerExtractScreen)"

tech_stack:
  added: []
  patterns:
    - "Runner pattern: pure call → IO side-effect → return { ok, message } (mirrors emit-maestro.ts)"
    - "clipboardy vi.mock in yank-wireframe.test.ts — avoid real OS clipboard in CI"
    - "mkdtemp/rm tmp-dir pattern in extract-screen.test.ts (from maestro-emitter.test.ts)"
    - "T-8-01 path sanitization: /[^a-z0-9_-]/g replace + basename() (belt-and-suspenders)"

key_files:
  created:
    - path: "src/editor/commands/yank-wireframe.ts"
      role: "runYankWireframe IO runner — renderSingleVariant('content') → clipboardy.write"
    - path: "src/editor/commands/prompt-screen.ts"
      role: "runPromptScreen IO runner — assemblePrompt → returns prompt in result"
    - path: "src/editor/commands/extract-screen.ts"
      role: "runExtractScreen IO runner — assemblePrompt → mkdir + writeFile to prompts/<id>-<target>.md"
  modified:
    - path: "tests/handoff/yank-wireframe.test.ts"
      role: "HANDOFF-01: 3 tests — clipboard mock, ASCII-only regex, unknown screenId error"
    - path: "tests/handoff/extract-screen.test.ts"
      role: "HANDOFF-03: 5 tests — file write, Markdown check, path sanitization, overwrite"
    - path: "tests/handoff/prompt-screen.test.ts"
      role: "HANDOFF-02: +4 runPromptScreen tests (token budget, actions section, error case)"
    - path: "tests/handoff/semantic-tokens.test.ts"
      role: "HANDOFF-04: +4 prop audit tests (pixel values, SEMANTIC_TOKENS membership)"

decisions:
  - "Used renderSingleVariant(spec, screenId, 'content') NOT render() in yank-wireframe — content variant only per RESEARCH Pitfall 6"
  - "extract-screen.ts sanitizes with /[^a-z0-9_-]/g (hyphen included in allowlist) + basename() for T-8-01 path traversal"
  - "prompt-screen.ts returns prompt in result.prompt field for downstream consumers (display, clipboard)"
  - "Test for traversal attempt 'sanitizes traversal attempt' uses the error path (nonexistent screen) to confirm the sanitize code runs without panicking"

metrics:
  duration: "3m 19s"
  completed: "2026-04-19"
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 4
---

# Phase 08 Plan 03: Handoff Command Runners + Test Unskip Summary

Three IO runner files wiring pure assembler/emitter outputs to OS clipboard and filesystem, with all four handoff test files converted from `.todo` stubs to passing test cases covering HANDOFF-01 through HANDOFF-04.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Three command runner files | 1c7bb09 | yank-wireframe.ts, prompt-screen.ts, extract-screen.ts |
| 2 | Unskip all four handoff test files | a020653 | yank-wireframe.test.ts, extract-screen.test.ts, prompt-screen.test.ts, semantic-tokens.test.ts |

## What Was Built

### Runner Layer (src/editor/commands/)

Three files following the exact emit-maestro.ts runner pattern:

**`yank-wireframe.ts`** — `runYankWireframe(spec, screenId)` calls `renderSingleVariant(spec, screenId, "content")` (not `render()`) then writes to clipboard via clipboardy. Returns `{ ok: true, message: "Wireframe yanked ✓" }` on success or `{ ok: false, message: "Screen not found: ..." }` on unknown screenId.

**`prompt-screen.ts`** — `runPromptScreen(spec, screenId, target)` calls `assemblePrompt` and returns the prompt in `result.prompt` for display or further processing. No file I/O. Returns `{ ok: true, message: "Prompt ready (swiftui) ✓", prompt }`.

**`extract-screen.ts`** — `runExtractScreen(spec, specFilePath, screenId, target)` calls `assemblePrompt`, sanitizes `screenId` via `/[^a-z0-9_-]/g` + `basename()`, then writes to `{specDir}/prompts/{safeName}-{target}.md`. T-8-01 path traversal mitigation applied.

### Test Files (tests/handoff/)

All four files converted from `it.todo` stubs to passing tests:

- **yank-wireframe.test.ts**: 3 tests — clipboard mock (vi.mock), ASCII regex assertion, error for unknown screenId
- **extract-screen.test.ts**: 5 tests — file write, Markdown check, sanitization (traversal attempt), overwrite
- **prompt-screen.test.ts**: +4 tests via runPromptScreen runner — token budget, actions section gating, error path
- **semantic-tokens.test.ts**: +4 HANDOFF-04 prop audit tests — pixel value regex, SEMANTIC_TOKENS membership, multi-screen audit

**Result: 66 tests passing in tests/handoff/; full suite 1050 passing, 1 skipped.**

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. All runner functions are fully implemented with real IO.

## Threat Flags

No new security surface introduced beyond what is in the plan's threat model (T-8-01, T-8-03, T-8-06 all addressed).

## Self-Check: PASSED

- `src/editor/commands/yank-wireframe.ts` — exists, exports `runYankWireframe` and `YankWireframeResult`
- `src/editor/commands/prompt-screen.ts` — exists, exports `runPromptScreen` and `PromptScreenResult`
- `src/editor/commands/extract-screen.ts` — exists, exports `runExtractScreen` and `ExtractScreenResult`
- Commits: `1c7bb09` (feat), `a020653` (test) — both present in git log
- `npx vitest run tests/handoff/` — 66 passing, 0 failing
- `npx tsc --noEmit` — 0 errors in runner files
- `grep -rh 'it.todo' tests/handoff/` — empty (no remaining stubs)
- Full suite: 1050 passing, 1 skipped, 0 failures
