// src/serialize/sigil.ts
// Sigil `[Label →action test:id]` ↔ `{label,action,testID}` triple normalizer
// (D-22..D-24). Implemented in Plan 02-02 (parse) + Plan 02-04 (emit).
// Carries per-node origin via AstHandle.sigilOrigins (WeakMap) so round-trip
// can re-emit in the same form the author wrote.
export {};
