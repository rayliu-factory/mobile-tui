// src/serialize/body.ts
// Opaque-string body extract/splice (D-18). Implemented in Plan 02-02.
// NEVER parses body as Markdown AST; body is a byte slab passed through
// from file.orig (NOT file.content — see RESEARCH §Pitfall 7).
export {};
