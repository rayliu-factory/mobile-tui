// src/serialize/atomic.ts
// `atomicWrite(path, bytes)` primitive + orphan-`.tmp` detector (D-29, D-30).
// Implemented in Plan 02-04. Single-shot write-tmp-then-rename; debounce is
// Phase 4. Orphan detection surfaces SPEC_ORPHAN_TEMP_FILE at parse time.
export {};
