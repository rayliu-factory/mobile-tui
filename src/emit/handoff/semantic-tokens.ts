// src/emit/handoff/semantic-tokens.ts
// Hardcoded allowlist of semantic prop values permitted in emitted LLM prompts.
// Derived from ComponentNodeSchema prop value unions (D-204).
// HANDOFF-04: assembler's <!-- spec-props: {...} --> comment block is validated
// against this set in tests/handoff/semantic-tokens.test.ts.

export const SEMANTIC_TOKENS = new Set([
  // Text.style (from src/model/component.ts)
  "heading-1",
  "heading-2",
  "body",
  "caption",
  // Column.gap, Row.gap, Spacer.size (from src/model/component.ts)
  "sm",
  "md",
  "lg",
  // Button.variant (from src/model/component.ts)
  "primary",
  "secondary",
  "text",
  // Column.align, Row.align (from src/model/component.ts)
  "start",
  "center",
  "end",
  // Screen.kind (from src/model/screen.ts)
  "regular",
  "overlay",
  // NavEdge.transition (from src/model/navigation.ts)
  "push",
  "modal",
  "sheet",
  "replace",
  "none",
  // BackBehavior (from src/model/back-behavior.ts / screen.ts)
  "pop",
  "dismiss",
]);
