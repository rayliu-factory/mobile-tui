// src/emit/handoff/index.ts
// Public barrel for the handoff emitter layer.
// EXPLICIT-NAMED exports only (never `export *` per established barrel pattern).
export { type AssembleResult, type Target, assemblePrompt } from "./assembler.ts";
export { SEMANTIC_TOKENS } from "./semantic-tokens.ts";
export { countTokens, isWithinBudget } from "./token-budget.ts";
