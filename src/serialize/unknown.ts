// src/serialize/unknown.ts
// Top-level `_unknown:` partition — strip on parse, re-inject on save
// (SPEC-08, D-26/D-27). Implemented in Plan 02-02 + Plan 02-04.
// Keeps the Spec model layer structurally closed (.strict()) while the
// on-disk file can carry forward-compat keys we don't yet understand.
export {};
