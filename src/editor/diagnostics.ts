// src/editor/diagnostics.ts
// Phase 4 diagnostic code registry. AUGMENTS Phase 1's SPEC_* and Phase 2's
// SERDE_* codes. All codes SCREAMING_SNAKE_CASE per primitives/diagnostic.ts.
//
// SCOPE:
//   - EDITOR_CODES — const registry of Phase-4-specific diagnostic codes
//   - EditorCode — keyof-typeof type derived from EDITOR_CODES
//   - subscribeDiagnostics — sugared filter over store.subscribe that only
//     fires when diagnostics.length > 0 (convenience for diagnostics pane)
//   - Re-export: Diagnostic, error, info, warning from primitives
//
// RELATED: D-50 (hand-rolled signal), D-57 (argsSchema.safeParse → EDITOR_COMMAND_ARG_INVALID),
//          D-58 (ref-cascade → EDITOR_REF_CASCADE_INCOMPLETE), research §9.9 (exhaustiveness).
import type { Diagnostic } from "../primitives/diagnostic.ts";
import type { Store } from "./types.ts";

export const EDITOR_CODES = {
  // Dispatched when store.apply receives a commandName not found in the COMMANDS registry.
  // Exit 1 for cli-edit per D-68.
  EDITOR_COMMAND_NOT_FOUND: "EDITOR_COMMAND_NOT_FOUND",
  // Dispatched when argsSchema.safeParse(args) returns failure. One per ZodIssue.
  // T-04-01 mitigation: args never reach command.apply without passing Zod parse.
  EDITOR_COMMAND_ARG_INVALID: "EDITOR_COMMAND_ARG_INVALID",
  // Dispatched when rename/delete command cannot fully cascade all ref sites.
  // Indicates a ref is left unresolved; save-gate catches the resulting error diagnostic.
  EDITOR_REF_CASCADE_INCOMPLETE: "EDITOR_REF_CASCADE_INCOMPLETE",
} as const;

export type EditorCode = (typeof EDITOR_CODES)[keyof typeof EDITOR_CODES];

/**
 * Sugared filter over store.subscribe that only calls `fn` when diagnostics
 * are non-empty. Phase-5 diagnostics pane uses this instead of subscribing
 * to every tick.
 *
 * Returns an unsubscribe function matching store.subscribe's contract.
 */
export function subscribeDiagnostics(
  store: Store,
  fn: (d: Diagnostic[]) => void,
): () => void {
  return store.subscribe(({ diagnostics }) => {
    if (diagnostics.length > 0) fn(diagnostics);
  });
}

// Re-export Phase-1 factory + type for single-module ergonomics.
// Callers who want everything Diagnostic-related from one editor module.
export { type Diagnostic, error, info, warning } from "../primitives/diagnostic.ts";
