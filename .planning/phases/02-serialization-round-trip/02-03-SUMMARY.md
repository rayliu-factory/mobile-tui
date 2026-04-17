---
phase: 02-serialization-round-trip
plan: 03
subsystem: serialize
tags: [yaml, sigil, schema-injection, weakmap, round-trip, ast]

requires:
  - phase: 02-serialization-round-trip
    provides: ParsedFrontmatter.doc from splitFrontmatter (02-02); KNOWN_TOP_LEVEL_KEYS + partitionTopLevel (02-02); ast-handle AstHandle.sigilOrigins WeakMap type (02-01); SCHEMA_VERSION from model/version.ts (Phase 1)

provides:
  - src/serialize/sigil.ts (SIGIL_REGEX + INTERACTABLE_KINDS + parseSigil + createSigilOriginsMap + normalizeSigilsOnDoc)
  - src/serialize/schema-inject.ts (idempotent injectSchemaIfAbsent)
  - D-23 origin-tracking mechanism (WeakMap keyed by YAMLMap node) ready for Plan 02-04 emit direction
  - D-28 first-save blank-line convention verified across absent / present / empty-doc / re-parse cases

affects: [02-04, 02-05, 04-editor-store, 07-maestro-emitter]

tech-stack:
  added: []
  patterns:
    - "SIGIL_REGEX anchored + non-backtracking (T-01-01 safe on 100KB adversarial input)"
    - "WeakMap<YAMLMap, 'sigil' | 'triple'> origin side-channel (no Spec-type leak per D-23)"
    - "Idempotent AST transform via doc.has(key) early-return + createPair + items.unshift + spaceBefore on items[1]"
    - "AST walk via isMap/isSeq/isScalar type guards — no property access on unguarded nodes"

key-files:
  created:
    - src/serialize/sigil.ts
    - src/serialize/sigil.test.ts
    - src/serialize/schema-inject.test.ts
  modified:
    - src/serialize/schema-inject.ts (stub → real implementation)

key-decisions:
  - "[02-03] SIGIL_REGEX inlines the SNAKE_CASE class (`[a-z][a-z0-9_]*`) rather than importing from primitives/ids.ts — keeps the regex a single literal constant + avoids the runtime cost of RegExp composition. Accept-case tests against canonical snake_case values (`save`, `open_detail`, `add_habit`, `habit_row`) cover the parity."
  - "[02-03] `createSigilOriginsMap` returns a fresh WeakMap per call (not a module-level singleton) — one handle per parsed Document, so multiple concurrent parseSpecFile calls don't share state. Consumers allocate via `createSigilOriginsMap()` + pass into `normalizeSigilsOnDoc` + park on astHandle.sigilOrigins."
  - "[02-03] `normalizeSigilsOnDoc` walks ONLY the `screens` subtree (not `actions`, not top-level `data`). Actions + data are schema-defined maps with no component nodes; widening the walk would add traversal cost with zero behavioral change. Adding nested-walk coverage is trivial if a future kind carries components outside screens."
  - "[02-03] Interactable with missing / non-scalar label → classified as 'triple' origin (still recorded in WeakMap). Downstream Plan 02-04 emit path thereby always finds an origin entry for every interactable node in the tree, closing the D-24 'sigil partial drop' surface at the walker level rather than the emit level."
  - "[02-03] `injectSchemaIfAbsent` guards on `doc.has('schema')` (not iteration over items) — yaml@^2.8.3's Document has(key) is O(1) for top-level via YAMLMap internal lookup, and is more semantically correct than a manual items.find scan."
  - "[02-03] Pitfall 6 confirmed: `spaceBefore` must be set on items[1].key (not items[0]) AFTER the unshift, otherwise blank-line semantics land on the wrong pair. Verified by the `^schema: mobile-tui\\/1\\n\\nscreens:` emit assertion. Noted in schema-inject.ts header for Plan 02-04 emit-time debugging."

patterns-established:
  - "Pure regex + branded triple constructor: single literal SIGIL_REGEX exported + pure parseSigil(str): Triple | null helper — consumers use the regex directly for raw lex checks OR the helper when they need the structured triple. Matches Plan 01-02 SNAKE_CASE + ActionIdSchema split discipline."
  - "WeakMap side-channel for AST metadata: keyed by the AST node itself (YAMLMap), GCs when the Document is released. No parallel structure to keep in sync with the AST's lifecycle. Plan 04 emit path looks up via the same WeakMap passed into normalizeSigilsOnDoc."
  - "Idempotent AST transform: guard check → early return false; mutation path → return true. Same signature as migrations/v1_to_v2.ts's same-in-same-out semantics. Every transform module in src/serialize/ that mutates the doc returns a boolean `didMutate` so callers can short-circuit re-work. schema-inject.ts is the first one; write.ts (Plan 04) will follow the same shape."

requirements-completed: [SPEC-08]

duration: 3m 14s
completed: 2026-04-18
---

# Phase 2 Plan 03: Wave 2 Transforms (Sigil Normalizer + Schema Injection) Summary

**Sigil `[Label →action test:id]` ↔ `{label, action, testID}` triple normalizer with WeakMap origin tracking (D-22/D-23), plus idempotent first-save `schema: mobile-tui/1` injection at items[0] + spaceBefore-on-items[1] blank-line convention (D-28).**

## Performance

- **Duration:** 3m 14s
- **Started:** 2026-04-18T09:36:56+12:00 (21:36:56 UTC)
- **Completed:** 2026-04-18T09:40:10+12:00 (21:40:10 UTC)
- **Tasks:** 2 (4 TDD commits: 2 × test RED + 2 × feat GREEN)
- **Files modified:** 3 (sigil.ts, schema-inject.ts; sigil.test.ts + schema-inject.test.ts created)
- **Tests:** 374 total (was 340; +34 this plan — 26 sigil + 8 schema-inject)

## Accomplishments

- **Sigil normalizer with full AST walk**: `normalizeSigilsOnDoc(doc, wm)` walks `doc[screens]` recursively via isMap/isSeq type guards, classifies every interactable (Button / TextField / Toggle / SegmentedControl / ListItem) as `'sigil'` or `'triple'` origin, and splits sigil-form label strings into triple fields on the AST. Non-interactables are skipped (no WeakMap entry).
- **Closed INTERACTABLE_KINDS vocabulary**: 5-element set verified against src/model/component.ts InteractableBase consumers (Plan 01-04 authority). TabBar excluded per 01-04 decision (inline-extended items cannot carry a YAML string-scalar shorthand).
- **Idempotent `schema: mobile-tui/1` injection**: items.unshift at position 0 + spaceBefore=true on items[1].key produces `schema: mobile-tui/1\n\n{rest}`; double-call + re-parse cycles confirmed no-op. Empty-document edge case handled via `doc.createNode({schema: SV}, {flow: false})`.
- **ReDoS-safe grammar**: SIGIL_REGEX is anchored + non-backtracking (non-greedy `.+?` bounded by literal ` →` then character-class `[a-z][a-z0-9_]*`). 100KB adversarial input test completes in <100ms (T-01-01 carryover mitigation verified).
- **SCHEMA_VERSION single-source-of-truth preserved**: schema-inject.ts imports from `../model/index.ts`; grep gate `! grep -c '"mobile-tui/1"' src/serialize/schema-inject.ts` = 0 confirms no inline.
- **Full Wave-2 gate GREEN**: `npx vitest run` 374/374 across 26 files (was 340/24); `npx tsc --noEmit` 0 errors; `npx biome check .` 0 errors. Phase-1 + Wave-0 + Wave-1 regression intact.

## Task Commits

1. **Task 1 (sigil.ts)**
   - RED: `638f73b` — `test(02-03): RED — sigil.ts grammar + INTERACTABLE_KINDS + normalization tests` (26 failing tests)
   - GREEN: `4e3f79f` — `feat(02-03): GREEN — parseSigil + normalizeSigilsOnDoc + WeakMap origin tracking`

2. **Task 2 (schema-inject.ts)**
   - RED: `97cb7f1` — `test(02-03): RED — schema-inject idempotent + blank-line tests` (8 failing tests)
   - GREEN: `60e1a5b` — `feat(02-03): GREEN — injectSchemaIfAbsent via createPair + unshift + spaceBefore`

## Files Created/Modified

- `src/serialize/sigil.ts` — 172 lines; exports SIGIL_REGEX, INTERACTABLE_KINDS, SigilTriple, parseSigil, createSigilOriginsMap, normalizeSigilsOnDoc. Internal `visitMap` recursive walker.
- `src/serialize/sigil.test.ts` — 26 tests across 4 describe blocks: parseSigil grammar (accept + reject + anchor + ReDoS), INTERACTABLE_KINDS (5-element + TabBar exclusion + non-interactable exclusion), createSigilOriginsMap (freshness), normalizeSigilsOnDoc (sigil split + triple no-mutation + habit-tracker fixture D-25 triple classification + sigil ListItem + non-interactable skip + defensive no-ops).
- `src/serialize/schema-inject.ts` — 50 lines; exports injectSchemaIfAbsent. Imports SCHEMA_VERSION from `../model/index.ts`. doc.has('schema') idempotent guard; non-map doc handled via createNode; map doc handled via createPair + items.unshift + spaceBefore-on-items[1].
- `src/serialize/schema-inject.test.ts` — 8 tests: returns-true-on-absent, items[0]-top-position, blank-line, idempotent-when-present, double-call, empty-doc, imported-constant parity, re-parse round-trip preservation.

## Decisions Made

Documented in frontmatter `key-decisions` — highlights:

- **SIGIL_REGEX inlines SNAKE_CASE class** rather than composing via `ids.ts` regex — keeps the regex a single literal + avoids the RegExp composition cost. Parity tested against canonical snake_case values (`save`, `open_detail`, `add_habit`, `habit_row`).
- **Fresh WeakMap per call** from `createSigilOriginsMap()` — one handle per parsed Document; no module-level singleton cross-contamination.
- **Walk restricted to `screens` subtree** — components are schema-defined to live only inside `screens[].variants.*.tree`. Widening the walk to `actions`/`data` adds traversal cost with zero behavioral change.
- **Missing-label interactables classified as 'triple'** — walker always records an origin for every interactable node, so Plan 02-04's emit path never encounters a "no-entry" surface for D-24's partial-sigil-drop logic.
- **`doc.has('schema')` idempotency guard** — O(1) lookup on Document, semantically cleaner than scanning items. Matches migrations/v1_to_v2.ts's same-in-same-out pattern.

## Quirk: `doc.toString(opts)` has no `version` parameter in yaml@^2.8.3

`parseDocument(str, {version: '1.2', keepSourceTokens: true})` is the correct call, but `doc.toString({version: '1.2'})` is TYPE-ERROR: `ToStringOptions` does not include `version`. The parse options are one-shot — once parsed, the resulting Document carries its version internally and `toString()` takes only emit-time formatting options (`indent`, `defaultKeyType`, etc.). Found while writing the triple-origin byte-identical test; fixed in-file to `doc.toString()` (no args). Recorded here as a Pitfall-6-adjacent note for Plan 02-04 emit-time debugging.

## Deviations from Plan

None — plan executed exactly as written. Two minor acceptance-criteria observations:

1. **`grep -cE 'Button.*TextField.*Toggle.*SegmentedControl.*ListItem' src/serialize/sigil.ts` returns 0** (plan expected ≥1). Biome reformatted the 5-element `INTERACTABLE_KINDS` set across multiple lines, so no single line contains all 5 kinds as a substring. All 5 kinds are present (confirmed by `[...INTERACTABLE_KINDS].sort()` test assertion); this is a grep-gate-vs-formatter mismatch, not a semantic regression. Matches the Plan 01-04 / 01-05 grep-gate precedent where plan-pattern micro-adjustments are expected.
2. **`! grep -n "TabBar" src/serialize/sigil.ts` fails** (plan expected no matches). TabBar appears in 2 explanatory comments explaining why it's excluded from INTERACTABLE_KINDS. The spirit of the gate — "TabBar is not in the INTERACTABLE_KINDS set literal" — is preserved: the set definition on lines 52-56 contains only the 5 real interactables. Matches the Plan 01-04 "NOT z.discriminatedUnion" comment precedent (documented in that plan's decisions).

Both observations are grep-gate pattern specificity issues, not semantic ones. No auto-fixes applied. No scope creep.

## Issues Encountered

- **TS2353 on `doc.toString({ version: "1.2" })`** — caught by `npx tsc --noEmit` in the full gate. `ToStringOptions` in yaml@^2.8.3 doesn't accept `version`. Fix: remove the arg. Documented as a Pitfall-6-adjacent quirk above so Plan 02-04 (write.ts emit path) doesn't repeat the mistake.
- **Biome formatted sigil.test.ts getIn paths onto single lines** — mechanical adjustment; no semantic change. Matches prior plans' observed Biome behavior.
- **Biome reformatted the 5-element INTERACTABLE_KINDS set across multiple lines** — noted as acceptance-criteria observation above.

## Next Phase Readiness

- **Plan 02-04 (write direction) is unblocked.** Wave 2 primitives are complete:
  - `astHandle.sigilOrigins` WeakMap is populated by `normalizeSigilsOnDoc` at parse time — Plan 02-04 `write.ts` looks up each interactable node's origin to decide sigil-string vs triple-pairs emission.
  - `injectSchemaIfAbsent(doc)` is the first call in Plan 02-04's write sequence after the save-gate. Idempotency contract verified (double-call + re-parse tests).
- **Plan 02-05 (real parser)** will wire `parseSpecFile` through `splitFrontmatter` → `partitionTopLevel` → `normalizeSigilsOnDoc` → `validateSpec`, replacing the Wave-0 `.spec.json` stub. All L1/L2 primitives are now in place.
- **No blockers.** Phase 2 Plans 2/5 complete (Waves 0+1+2). Plans 02-04 and 02-05 can proceed in sequence.

## Self-Check: PASSED

All files created exist on disk:
- `src/serialize/sigil.ts` — FOUND
- `src/serialize/sigil.test.ts` — FOUND
- `src/serialize/schema-inject.ts` — FOUND (overwritten from stub)
- `src/serialize/schema-inject.test.ts` — FOUND

All commits exist in git log:
- `638f73b` — RED sigil — FOUND
- `4e3f79f` — GREEN sigil — FOUND
- `97cb7f1` — RED schema-inject — FOUND
- `60e1a5b` — GREEN schema-inject — FOUND

Full gate GREEN:
- `npx vitest run` → 374/374 tests passing across 26 files
- `npx tsc --noEmit` → 0 errors
- `npx biome check .` → 0 errors

---

*Phase: 02-serialization-round-trip*
*Completed: 2026-04-18*
