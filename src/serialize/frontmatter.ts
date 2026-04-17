// src/serialize/frontmatter.ts
// `findFrontmatterBounds(origBytes)` — authoritative producer of
// frontmatterStart, frontmatterEnd, and closingDelimiterTerminator.
// Implemented in Plan 02-02. Walks raw bytes once; does NOT use regex for
// delimiter detection (per RESEARCH §Pitfall 3 — regex misclassifies
// "---" inside nested flow style). Returns null if no delimiter pair found.
export {};
