---
status: partial
phase: 08-llm-handoff-commands
source: [08-VERIFICATION.md]
started: 2026-04-20T09:40:00.000Z
updated: 2026-04-20T09:40:00.000Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Ctrl+W clipboard write
expected: Press Ctrl+W with a screen focused in canvas. Paste into a plain-text editor — output must be ASCII-only wireframe text (no Unicode box glyphs if ASCII fallback selected, no trailing control chars).
result: [pending]

### 2. Palette discovery — yank-wireframe
expected: Open palette (: or Ctrl+P), "yank-wireframe" appears as a selectable entry. Selecting it triggers the arg-prompt, fires runYankWireframe, and shows a 3s emitStatus confirmation in the status line.
result: [pending]

### 3. prompt-screen palette flow
expected: Open palette, select "prompt-screen". Arg-prompt asks for screen ID and target (swiftui/compose/tests). Fires runPromptScreen, prints prompt under 2k tokens to stdout/clipboard, shows 3s emitStatus.
result: [pending]

### 4. extract-screen palette flow
expected: Open palette, select "extract-screen". Arg-prompt asks for screen ID and target. Fires runExtractScreen — writes ./prompts/<sanitized-id>-<target>.md next to the spec file. Status line confirms file path. File is valid Markdown.
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
