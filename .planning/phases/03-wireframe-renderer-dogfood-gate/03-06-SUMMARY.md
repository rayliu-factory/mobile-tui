---
phase: 03-wireframe-renderer-dogfood-gate
plan: 06
subsystem: ui
tags: [wireframe, ascii, emit, structural, column, row, card, list, list-item, recursion, d-36, d-42]

# Dependency graph
requires:
  - phase: 03-wireframe-renderer-dogfood-gate
    plan: 01
    provides: "NYI stubs for renderColumn/renderRow/renderCard/renderList/renderListItem under src/emit/wireframe/components/, each imported by dispatch.ts exhaustive switch + the renderNode recursion target"
  - phase: 03-wireframe-renderer-dogfood-gate
    plan: 02
    provides: "drawFrame + padRight primitives from src/emit/wireframe/layout.ts (Card+List wrap child output via drawFrame; Row absorbs join slack via padRight)"
  - phase: 03-wireframe-renderer-dogfood-gate
    plan: 03
    provides: "truncate from overflow.ts (Row final-join truncate guard)"
  - phase: 03-wireframe-renderer-dogfood-gate
    plan: 04
    provides: "5 leaf emitters (Text/Icon/Divider/Spacer/Image) — the RECURSION ENDPOINTS for every Column/Row/Card/List/ListItem test fixture in this plan"
  - phase: 03-wireframe-renderer-dogfood-gate
    plan: 05
    provides: "4 interactable emitters (Button/Toggle/TextField/SegmentedControl) — additional recursion endpoints now reachable from Column/Row/ListItem nests"

provides:
  - "renderColumn(node, width): string[] — vertical concat via renderNode recursion + gap-sized blank lines (sm=0, md=1 DEFAULT, lg=2) per D-36; no container glyph"
  - "renderRow(node, width): string[] — Phase-3 v1 horizontal single-line join; each child budgeted at floor(width/N); first line only; final truncate+padRight against outer width"
  - "renderCard(node, width): string[] — `+--+` box via drawFrame wrapping single child at width-4; dispatch recursion into child"
  - "renderList(node, width): string[] — single-item box (itemTemplate rendered ONCE) + `(list bound to <JsonPointer>)` footer per RESEARCH Pitfall 9 / T-03-09 mitigation"
  - "renderListItem(node, width): string[] — vertical concat of children; no glyph (D-36 — List parent provides the box); D-42 tappable-vs-container invisible"
affects: [03-07 chrome/overlay emitters (may nest Column/Row), 03-08 variant composition, 03-09 dogfood gate]

# Tech tracking
tech-stack:
  added: []  # Zero new runtime deps
  patterns:
    - "Recursive descent via dispatch: every structural emitter imports `renderNode` from `../dispatch.ts` and calls it on every child. The exhaustive-switch fallthrough in dispatch.ts guarantees compile-time coverage — adding a new kind breaks the switch until a case is added (RESEARCH §Pattern 4). Mirror of `walkComponentTree` pattern from `src/model/cross-reference.ts:52-62`."
    - "Width-arithmetic discipline (RESEARCH Pitfall 4): Column/Row/ListItem add ZERO structural overhead — children see full `width`. Card+List subtract 4 cols (`+-+` corners + `| ... |` inner pad via drawFrame) — children see `width - 4`. Nested Cards compound linearly (depth-2 → width-8, depth-3 → width-12). Depth-3 nested-Card test is the canary for width drift."
    - "Sparse-array guard (`if (!child) continue`) mirrors `src/model/cross-reference.ts:59` precedent. Zod-validated ComponentNode arrays are dense, but the guard costs nothing and stays robust against hand-crafted ComponentNodes in tests."
    - "Rectangular contract preservation through recursion: every structural emitter output is the union of its children's rectangular outputs + (optional) frame borders + (optional) gap blank-lines. Row additionally forces rectangularity via `padRight(truncate(joined, width), width)` to absorb floor-division slack."

key-files:
  created:
    - src/emit/wireframe/components/column.test.ts
    - src/emit/wireframe/components/row.test.ts
    - src/emit/wireframe/components/card.test.ts
    - src/emit/wireframe/components/list.test.ts
    - src/emit/wireframe/components/list-item.test.ts
    - src/emit/wireframe/components/__snapshots__/column.test.ts.snap
    - src/emit/wireframe/components/__snapshots__/row.test.ts.snap
    - src/emit/wireframe/components/__snapshots__/card.test.ts.snap
    - src/emit/wireframe/components/__snapshots__/list.test.ts.snap
  modified:
    - src/emit/wireframe/components/column.ts
    - src/emit/wireframe/components/row.ts
    - src/emit/wireframe/components/card.ts
    - src/emit/wireframe/components/list.ts
    - src/emit/wireframe/components/list-item.ts

key-decisions:
  - "Column gap mapping locked to sm=0/md=1/lg=2 blank lines between siblings (per D-36). Default `gap=md` yields 1 blank line — matches the plan's explicit `gap=md produces 1 blank line` test and is the most visually-parseable default for dogfood wireframe reading."
  - "Row v1 = horizontal single-line join. Each child rendered at `floor(width / N)` budget; only its FIRST line is concatenated. Multi-line children (e.g., Image's 3-line box) render only their first line when inside a Row. This is a DOCUMENTED compromise in `row.ts` header (Phase-5 may expand to multi-line row support with per-column alignment per RESEARCH §Pitfall 8 NavBar prototype). Final `padRight(truncate(joined, width), width)` guarantees the rectangular contract under both floor-division under-shoot and child-line over-shoot."
  - "Card delegates ALL frame geometry to `drawFrame` from layout.ts. The emitter's only responsibility is the `width - 4` subtraction and passing the child's line array through `renderNode`. Keeps glyph consistency with Phase-1 D-40/D-41 variant headers (same `+---+` / `| ... |` alphabet) since both compose via drawFrame."
  - "List v1 = single-item box + `(list bound to <JsonPointer>)` footer (RESEARCH Pitfall 9 / T-03-09). Rendering N items without live data would fabricate content — the footer indicator lets the reader distinguish 'List' from 'Card' without misleading output. `itemTemplate` sees the same `width - 4` as a Card's child (drawFrame frame math)."
  - "ListItem = non-boxed vertical concat of children. The `tappable-vs-container` distinction (presence of `label`/`action`/`testID`) is INVISIBLE in persisted output per D-42. Dedicated `container === tappable` equality test + `not.toContain(action_zzz, testID_yyy)` leak gate enforce this at BOTH the emitter boundary (never reads node.action/testID/label) AND the test boundary."
  - "Sparse-array-guard pattern reused: `if (!child) continue` appears in column.ts + row.ts + list-item.ts, mirroring cross-reference.ts:59. Pattern is idiomatic for the project; no special casing needed."

metrics:
  duration: "~5m"
  completed: "2026-04-18T06:18:05Z"
  tasks: 4
  tdd_commits: 3  # 3 RED+GREEN pairs
  files: 14  # 5 emitters modified + 5 test files created + 4 snapshot files created
  assertions_new: 28
  nyi_stubs_remaining: 4
---

# Phase 3 Plan 06: Structural emitters (Column/Row/Card/List/ListItem) Summary

5 structural (recursive) emitters implemented — they close the recursion path through the dispatch switch by calling `renderNode` on every child. Card + List wrap content in `+--+` boxes per D-36; Column/Row/ListItem are invisible containers (no glyph). 14 of 18 component kinds now real (5 leaves from 03-04 + 4 interactables from 03-05 + 5 structural from this plan); 4 NYI stubs remain (NavBar, TabBar, Modal, Sheet — Plan 03-07).

## What Shipped

- **`renderColumn`** (`src/emit/wireframe/components/column.ts`): D-36 vertical-concat container with gap-sized blank lines between siblings. `gap=sm` → 0 blanks, `gap=md` (DEFAULT) → 1 blank, `gap=lg` → 2 blanks. Every child rendered via `renderNode(child, width)` at full parent width (Column adds zero structural overhead per RESEARCH Pitfall 4). Empty children → `[]` (degenerate case documented). Single child → no trailing gap lines (gap only between siblings).

- **`renderRow`** (`src/emit/wireframe/components/row.ts`): D-36 horizontal single-line join (Phase-3 v1 simplification). Each child budgeted at `floor(width / N)` and rendered via `renderNode(child, childBudget)`; only the first output line is concatenated. Multi-line children render only their first line in a Row — documented compromise, Phase-5 may expand per RESEARCH §Pitfall 8. Final `padRight(truncate(joined, width), width)` absorbs both floor-division under-shoot and child over-shoot, preserving the rectangular contract.

- **`renderCard`** (`src/emit/wireframe/components/card.ts`): D-36 untitled `+--+` box wrapping a single child. Child rendered via `renderNode(node.child, width - 4)` (drawFrame's `+-+` corners + `| ... |` inner pads consume 4 cols). Delegates all frame geometry to `drawFrame` from layout.ts. Nested Cards compound: depth-2 child sees width-8, depth-3 sees width-12. The depth-3 nested-Card test is the width-drift canary.

- **`renderList`** (`src/emit/wireframe/components/list.ts`): D-36 `+--+` box around ONE instance of `itemTemplate` (RESEARCH Pitfall 9 / T-03-09) + subtle `(list bound to <JsonPointer>)` footer so the reader can distinguish List from Card without the emitter fabricating fake list data. `itemTemplate` sees `width - 4` (same frame math as Card). Footer is padded to outer `width` via `padRight(truncate(footer, width), width)`.

- **`renderListItem`** (`src/emit/wireframe/components/list-item.ts`): D-36 non-boxed container — vertical concat of children; no glyph (the List parent provides the `+--+` box around each item). D-42 tappable-vs-container distinction INVISIBLE in persisted output: emitter never reads `node.action`, `node.testID`, or `node.label`. `container === tappable` equality assertion + `not.toContain(action_zzz, testID_yyy)` leak gate enforce both sides.

## Width Arithmetic Summary

| Kind | Structural overhead | Child width | Rationale |
|---|---|---|---|
| Column | 0 | `width` | Positional container only; gap blank-lines are full-width padded spaces |
| Row | 0 (per-child budget = floor(width/N)) | `floor(width/N)` | Horizontal partition; floor-div slack absorbed by outer `padRight(truncate(joined, width), width)` |
| Card | 4 | `width - 4` | `+-+` corners + `| ... |` inner pads via drawFrame (matches Phase-1 D-40/D-41 variant header alphabet) |
| List | 4 | `width - 4` | Same frame math as Card; plus +1 footer line appended outside the box |
| ListItem | 0 | `width` | No glyph — box provided by parent List |

At depth-4 Card nesting (Card > Card > Card > Card > Text), the innermost Text sees `width - 16`. At the plan's target outer 60 cols, depth-4 gives children 44 cols — well above the `truncate` degenerate floor of 3 cols per D-44.

## Test Coverage

| Emitter | Assertions | Snapshot | Notable tests |
|---|---|---|---|
| Column | 7 (gap=md default / gap=sm / gap=lg / empty children / nested Column recursion / rectangular across width 40 / single-child no-trailing-gap) | 1 | Nested Column proves width propagates at full value; single-child test guards against off-by-one in gap-insertion loop |
| Row | 5 (2-child join / empty children / rectangular across widths 10/20/40/60 / 3-child distribution / determinism) | 1 | Multi-width rectangular loop; 3-child distribution proves floor-div budget path |
| Card | 5 (basic box shape / Column-child / depth-2 nested-Card **width-drift canary** / depth-3 nested-Card / rectangular across widths 20/40/60) | 1 | Depth-3 test proves width arithmetic compounds correctly; rectangular loop proves drawFrame survives at 20-col narrow width |
| List | 5 (single-item box + footer basic / ListItem itemTemplate / Card itemTemplate box-in-box / verbatim JsonPointer propagation / narrow-width rectangular at 30 cols) | 1 | Box-in-box (List > Card > Text) proves multi-level width-4 compounding at the List boundary |
| ListItem | 6 (container basic / tappable === container equality **D-42** / multi-child vertical concat / rectangular / empty children / action+testID leak gate) | 0 (none needed — equality test covers shape) | `container.toEqual(tappable)` is the D-42 enforcement; leak gate catches accidental action/testID interpolation |

**Total: 28 new assertions across 5 co-located test files + 4 accepted snapshots.**

## Gate Status

| Check | Status | Notes |
|---|---|---|
| `npx vitest run` | 548 pass / 3 skip across 49 files | Baseline 520/3 → +28 active assertions, 0 skipped-delta |
| `npx tsc --noEmit` | 0 errors | `noUncheckedIndexedAccess` clean via `firstLine()` helper + explicit `[l0, l1, l2]` destructure-or-throw pattern in column.test.ts |
| `npx biome check .` | 0 errors, 1 info | The 1 info is the pre-existing Phase-2 `write.ts:254` useTemplate suggestion already logged to `deferred-items.md` — out of scope |

## Commits

| Hash | Type | Message |
|---|---|---|
| 03e02bf | test | `test(03-06): RED — structural column/row` |
| a803540 | feat | `feat(03-06): GREEN — structural column/row` |
| 75b7510 | test | `test(03-06): RED — structural card/list-item` |
| 9677829 | feat | `feat(03-06): GREEN — structural card/list-item` |
| 52c63d6 | test | `test(03-06): RED — structural list` |
| 50e4eb9 | feat | `feat(03-06): GREEN — structural list` |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking issue] Biome single-line children[] formatter convention**

- **Found during:** Post-GREEN biome check on Task 1 (`column.test.ts`) and Task 2 (`list-item.test.ts`)
- **Issue:** Biome's formatter (biome.json `lineWidth=100` default) collapses short multi-line `children: [ ... ]` arrays onto single lines. Two test files tripped the rule after initial hand-authoring.
- **Fix:** `npx biome check --write` on the affected test files — pure formatting change, no logic touched. Same pattern as Plan 03-04's Rule-3 fix (commit 8150f69) and Plan 03-05's Rule-3 fix.
- **Commits:** a803540 (column/row GREEN bundled the fix), 9677829 (card/list-item GREEN bundled the fix)

**2. [Rule 3 — Blocking issue] Biome single-line function-signature convention in row.ts**

- **Found during:** Post-GREEN biome check on Task 1
- **Issue:** Biome collapses short function signatures onto one line (same convention as `row.ts` STUB: `export function renderRow(node: Extract<..., { kind: "Row" }>, width: number): string[] {`). Initial hand-authored multi-line signature in row.ts tripped the rule.
- **Fix:** Inline edit to single-line signature — matches the existing stub pattern and adjacent button.ts (48 chars) / divider.ts / spacer.ts shape.
- **Commit:** a803540 (column/row GREEN bundled the fix)

No architectural deviations. No auth gates encountered. No Rule-1 or Rule-2 fixes needed — the plan's action blocks were correct as-written.

## V1 Simplifications (documented for Phase-5)

| Component | v1 render | Phase-5 hook | Rationale |
|---|---|---|---|
| Row | Single-line horizontal join (first line of each child only) | Multi-line row support with per-column alignment | No live data at render time; complex multi-line alignment (NavBar, TabBar) deferred to dedicated emitters or to a `render(..., {layout})` parameter |
| List | One item + `(list bound to <ptr>)` footer | `render(spec, screenId, {liveData: [...]})` could render N items from resolved state | Fabricating N items without resolved bindsTo would lie to the reader; footer indicator is honest |

Documented in each emitter's header comment so future developers see the Phase-5 target at the site.

## Known Stubs

None in this plan's surface. 4 NYI stubs remain: `NavBar`, `TabBar`, `Modal`, `Sheet` — wired by Plan 03-07 (chrome + overlays). Component coverage: 14 of 18 kinds now real.

## Threat Flags

None. No new surface introduced beyond the plan's `<threat_model>` register:

- **T-03-03 (deeply nested recursion stack overflow):** accepted — Phase-1 Zod schema recursion limits equivalent input. Worst-case width contraction at depth-14 Card nesting → child width hits `Math.max(1, width - 56) = 4`, which still yields a non-degenerate truncate per overflow.ts D-44. No separate depth guard needed.
- **T-03-04 (width drift violating rectangular contract):** mitigated — depth-3 nested-Card test in `card.test.ts` asserts every output line === outer width 60, across the compounding `width-4 → width-8 → width-12` cascade. If width drift breaks the contract, the test fails immediately.
- **T-03-09 (List arbitrary N-item rendering could mislead):** mitigated — v1 explicitly renders ONE item + `(list bound to ...)` footer. Box-in-box test (`List > Card > Text`) proves the itemTemplate path composes correctly without inflating to multi-item fabrication.

## Self-Check: PASSED

- src/emit/wireframe/components/column.ts — FOUND
- src/emit/wireframe/components/column.test.ts — FOUND
- src/emit/wireframe/components/row.ts — FOUND
- src/emit/wireframe/components/row.test.ts — FOUND
- src/emit/wireframe/components/card.ts — FOUND
- src/emit/wireframe/components/card.test.ts — FOUND
- src/emit/wireframe/components/list.ts — FOUND
- src/emit/wireframe/components/list.test.ts — FOUND
- src/emit/wireframe/components/list-item.ts — FOUND
- src/emit/wireframe/components/list-item.test.ts — FOUND
- src/emit/wireframe/components/__snapshots__/column.test.ts.snap — FOUND
- src/emit/wireframe/components/__snapshots__/row.test.ts.snap — FOUND
- src/emit/wireframe/components/__snapshots__/card.test.ts.snap — FOUND
- src/emit/wireframe/components/__snapshots__/list.test.ts.snap — FOUND
- commit 03e02bf — FOUND
- commit a803540 — FOUND
- commit 75b7510 — FOUND
- commit 9677829 — FOUND
- commit 52c63d6 — FOUND
- commit 50e4eb9 — FOUND
