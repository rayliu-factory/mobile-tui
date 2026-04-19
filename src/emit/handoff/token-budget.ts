// src/emit/handoff/token-budget.ts
// Thin wrappers around gpt-tokenizer for HANDOFF-02 budget enforcement.
// Import gpt-tokenizer once at module level — vocabulary load (~53MB) is a
// one-time cold-start cost (RESEARCH Pitfall 2).

import { countTokens as _countTokens, isWithinTokenLimit } from "gpt-tokenizer";

/** Returns exact BPE token count for a string (cl100k_base encoding). */
export function countTokens(str: string): number {
  return _countTokens(str);
}

/**
 * Returns true if str is within the token budget.
 * Uses isWithinTokenLimit for early-exit efficiency (no wasted encoding).
 */
export function isWithinBudget(str: string, limit: number): boolean {
  return isWithinTokenLimit(str, limit) !== false;
}
