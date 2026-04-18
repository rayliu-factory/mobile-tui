---
phase: 03-wireframe-renderer-dogfood-gate
plan: 07
subsystem: ui
tags: [wireframe, ascii, emit, chrome, overlay, nav-bar, tab-bar, modal, sheet, d-36, d-37, d-42]

# Dependency graph
requires:
  - phase: 03-wireframe-renderer-dogfood-gate
    plan: 01
    provides: "NYI stubs for renderNavBar/renderTabBar/renderModal/renderSheet under src/emit/wireframe/components/, each imported by dispatch.ts exhaustive switch"
  - phase: 03-wireframe-renderer-dogfood-gate
    plan: 02
    provides: "padRight primitive from src/emit/wireframe/layout.ts (every chrome/overlay output row passes through padRight to enforce rectangular contract)"
  - phase: 03-wireframe-renderer-dogfood-gate
    plan: 03
    provides: "truncate from overflow.ts (NavBar title + trailing widget budget; TabBar per-item label budget; final-line width guards on every emitter)"
  - phase: 03-wireframe-renderer-dogfood-gate
    plan: 05
    provides: "renderButton (reached via NavBar trailing-widget recursion through dispatch.renderNode)"
  - phase: 03-wireframe-renderer-dogfood-gate
    plan: 06
    provides: "renderColumn / renderCard (reached via Modal/Sheet child recursion; Modal-in-Card nested-box width-drift canary)"

provides:
  - "renderNavBar(node, width): string[] — 2-line output: `< Title                         [trailing]` + `-`-fill rule per D-37; leading `< ` always-on (root-strip deferred to Plan 03-08 variants.ts); trailing-widget budget max(10, floor((width-4)/3)) per RESEARCH Pitfall 8"
  - "renderTabBar(node, width): string[] — 2-line output: `-`-fill rule + `[ Home ] | [ Stats ] | [ Settings ]` row per D-37; per-item label budget floor((width - separatorChars)/items.length) - 4; D-42 enforced — only item.label reaches output"
  - "renderModal(node, width): string[] — 3+ line output: `+-- Modal -----+` labeled top border + `| body |` rows + plain `+---+` bottom border per D-36; child sees width-4 via shared renderOverlayBox helper"
  - "renderSheet(node, width): string[] — 3+ line output: `+-- Sheet -----+` labeled top border + `| body |` rows + plain `+---+` bottom border per D-36; reuses renderOverlayBox from modal.ts"
  - "renderOverlayBox(child, width, label): string[] — shared helper exported from modal.ts; parameterizes the top-border label so Modal and Sheet stay DRY"
  - "Completed Wave-3 chrome/overlay catalog — all 18 emitters in src/emit/wireframe/components/ now have real implementations (zero NYI stubs)"
affects: [03-08 variants.ts composition (Modal centering + Sheet bottom-anchoring + NavBar root-screen leading-strip all happen in the variant composer), 03-09 dogfood gate]

# Tech tracking
tech-stack:
  added: []  # Zero new runtime deps
  patterns:
    - "Labeled top-border helper pattern (renderOverlayBox): when two recursive emitters differ ONLY by a literal string inside the top border, extract a shared helper that takes `(child, width, label)` and parameterizes the label. Sheet's entire module becomes a 1-line delegation to Modal's helper. Mirrors Card's drawFrame reuse, one level up."
    - "Budget-cap for unbounded subtree recursion (NavBar trailing): when a node accepts an arbitrary ComponentNode that must collapse to a single line, call renderNode with a hard-capped width (max(10, floor((width-4)/3))) and take only `[0]`. Collapses any subtree shape to ≤1 line regardless of depth. Threat T-03-03 mitigation by construction."
    - "D-42 hide-action-and-testID at emitter boundary: TabBar reads only `item.label`. Dedicated `not.toContain(actionValue)` + `not.toContain(testIDValue)` assertions catch regressions at the string-output boundary, not at the read-site (defense in depth for threat T-03-08)."
    - "Leading-glyph caller-strip pattern (NavBar root-screen `< `): per-kind emitter always emits `< Title` (non-root default); the variant-frame composer (Plan 03-08 variants.ts) strips the leading `< ` when the screen is marked root. Keeps renderNavBar's signature stable at `(node, width) => string[]` — no extra arg leaks into the per-kind emitter layer."

key-files:
  created:
    - "src/emit/wireframe/components/nav-bar.test.ts — 6 assertions covering D-37 format, trailing-widget recursion, truncation, rectangular contract, determinism"
    - "src/emit/wireframe/components/tab-bar.test.ts — 5 assertions covering D-37 format, D-42 action+testID hiding (threat T-03-08), rectangular contract, determinism"
    - "src/emit/wireframe/components/modal.test.ts — 5 assertions covering D-36 labeled top border, column-child, Modal-in-Card nesting, rectangular contract, determinism"
    - "src/emit/wireframe/components/sheet.test.ts — 4 assertions covering D-36 labeled top border, rectangular contract, determinism"
    - "src/emit/wireframe/components/__snapshots__/{nav-bar,tab-bar,modal,sheet}.test.ts.snap — 4 new golden snapshots"
  modified:
    - "src/emit/wireframe/components/nav-bar.ts — replaced NYI stub with real renderNavBar (D-37)"
    - "src/emit/wireframe/components/tab-bar.ts — replaced NYI stub with real renderTabBar (D-37, D-42)"
    - "src/emit/wireframe/components/modal.ts — replaced NYI stub with real renderModal + shared renderOverlayBox export (D-36)"
    - "src/emit/wireframe/components/sheet.ts — replaced NYI stub with real renderSheet delegating to renderOverlayBox (D-36)"

key-decisions:
  - "Shared renderOverlayBox helper exported from modal.ts: Modal and Sheet differ only in the top-border label. A single shared helper parameterizes the label so sheet.ts becomes a 2-line delegation; future overlay kinds (e.g. `Toast`) plug in the same way. Alternative considered: duplicate the geometry per file — rejected as trivially out of sync risk."
  - "Leading `< ` always-on in per-kind renderNavBar; root-screen strip deferred to Plan 03-08 variants.ts composer: keeps the emitter signature stable at `(node, width) => string[]` (no `screenIsRoot` arg leaking into 17 other emitters) and centralizes screen-context-aware behavior in the composer layer where it belongs."
  - "Trailing-widget budget heuristic max(10, floor((width-4)/3)) per RESEARCH Pitfall 8: floor-of-third gives the trailing widget a fair share of phone-width, max(10) guarantees minimum legibility at degenerate widths. Hard cap collapses any arbitrary-depth subtree to single-line output (threat T-03-03 mitigation by construction)."

patterns-established:
  - "Labeled-box helper reuse (renderOverlayBox): emit a labeled top border + child body rows + plain bottom border once; parameterize the label for per-kind variants. Extended variant of Card's drawFrame pattern."
  - "Caller-side screen-context strip: per-kind emitters stay context-unaware (signature `(node, width) => string[]`); screen-context-dependent output (e.g. NavBar `< ` leading based on root-vs-deep) is handled by the composer that owns the screen context (variants.ts)."

requirements-completed: [WIREFRAME-01, WIREFRAME-02, WIREFRAME-03]

# Metrics
duration: 6min
completed: 2026-04-18
---

# Phase 03 Plan 07: Chrome + Overlay Emitters Summary

**Closed the final 4 catalog kinds — NavBar + TabBar chrome (D-37) and Modal + Sheet overlays (D-36) — reaching 18/18 real emitters with zero NYI stubs in src/emit/wireframe/components/.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-04-18T06:27:54Z
- **Completed:** 2026-04-18T06:33:00Z
- **Tasks:** 3 (Task 3 is verification-only — no separate commit)
- **Files modified:** 8 (4 emitters replaced + 4 test files created + 4 snapshot files created)
- **Test delta:** +20 assertions (548 → 568 passing); 3 skipped remain (unchanged — Plan 03-08 and integration placeholders)

## Accomplishments

- **NavBar emitter (D-37):** 2-line output — `< Title                         [trailing]` + `-`-fill rule. Trailing-widget recursion via dispatch.renderNode with `max(10, floor((width-4)/3))` budget cap (RESEARCH Pitfall 8). Leading `< ` always-on (root-strip deferred to variants.ts).
- **TabBar emitter (D-37, D-42):** 2-line output — `-`-fill rule + `[ Home ] | [ Stats ] | [ Settings ]` row. Per-item label budget `floor((width - separatorChars) / items.length) - 4` with 4-char `[ ]` overhead. D-42 enforced: `item.action` and `item.testID` never read at the emitter boundary (dedicated `not.toContain` assertions).
- **Modal emitter (D-36):** Labeled `+-- Modal -----+` top border + `| body |` rows + plain `+---+` bottom border. Width arithmetic mirrors renderCard (child sees width-4).
- **Sheet emitter (D-36):** 1-line delegation to `renderOverlayBox` with label="Sheet". The two overlay kinds now share a single geometry implementation.
- **Shared renderOverlayBox helper:** exported from modal.ts; parameterizes the top-border label. Sheet reuses it verbatim.
- **Full catalog closure:** 18/18 emitters in src/emit/wireframe/components/ now have real implementations. ZERO `throw new Error("NYI")` stubs remain in any components/*.ts. Only `src/emit/wireframe/variants.ts` (Plan 03-08) and `scripts/render-wireframe.ts` (Plan 03-08) retain NYI markers — those are the expected next-plan work.

## Task Commits

Each task committed atomically with RED→GREEN pairs for TDD tasks:

1. **Task 1 RED: chrome nav-bar/tab-bar tests** — `be536fa` (test)
2. **Task 1 GREEN: chrome nav-bar/tab-bar impls** — `f234f09` (feat)
3. **Task 2 RED: overlays modal/sheet tests** — `bdd363b` (test)
4. **Task 2 GREEN: overlays modal/sheet impls** — `86f6dd4` (feat)
5. **Task 3: Full gate verification** — no separate commit (verification-only task)

**Plan metadata commit:** to follow (docs).

_TDD gate compliance: each task landed a `test(...)` RED commit followed by a `feat(...)` GREEN commit in strict sequence, verified via `git log --oneline`._

## Files Created/Modified

### Created (6)
- `src/emit/wireframe/components/nav-bar.test.ts` — renderNavBar D-37 assertions
- `src/emit/wireframe/components/tab-bar.test.ts` — renderTabBar D-37/D-42 assertions
- `src/emit/wireframe/components/modal.test.ts` — renderModal D-36 assertions
- `src/emit/wireframe/components/sheet.test.ts` — renderSheet D-36 assertions
- `src/emit/wireframe/components/__snapshots__/nav-bar.test.ts.snap` — NavBar golden
- `src/emit/wireframe/components/__snapshots__/tab-bar.test.ts.snap` — TabBar golden
- `src/emit/wireframe/components/__snapshots__/modal.test.ts.snap` — Modal golden
- `src/emit/wireframe/components/__snapshots__/sheet.test.ts.snap` — Sheet golden

### Modified (4)
- `src/emit/wireframe/components/nav-bar.ts` — NYI stub → real renderNavBar (D-37 single-line + rule; leading `< ` always-on; trailing-widget budget)
- `src/emit/wireframe/components/tab-bar.ts` — NYI stub → real renderTabBar (D-37 rule-above + `[ label ] | [ label ]` row; D-42 action/testID hidden)
- `src/emit/wireframe/components/modal.ts` — NYI stub → real renderModal + exported shared renderOverlayBox helper (D-36 labeled top border)
- `src/emit/wireframe/components/sheet.ts` — NYI stub → real renderSheet delegating to renderOverlayBox with label="Sheet"

## Decisions Made

1. **Shared renderOverlayBox helper** — exported from modal.ts, reused by sheet.ts. Modal and Sheet differ only in the top-border label at the emitter level; centering (Modal) vs bottom-anchoring (Sheet) is Plan 03-08's variant-composer concern, not the per-kind emitter's. Keeps the two overlays DRY.
2. **Leading `< ` always-on in renderNavBar** — root-screen stripping deferred to Plan 03-08's variants.ts composer. Keeps the per-kind emitter signature stable at `(node, width) => string[]` across all 18 emitters; screen-context-aware behavior lives in the composer layer where it belongs.
3. **Trailing-widget budget `max(10, floor((width-4)/3))`** — per RESEARCH Pitfall 8. Hard cap collapses any arbitrary-depth subtree to single-line output (threat T-03-03 mitigation by construction) while preserving legible minimum width for small widths.
4. **TabBar reads only `item.label`** — `item.action` and `item.testID` are never referenced at the emitter boundary. Dedicated `not.toContain(actionValue)` + `not.toContain(testIDValue)` assertions catch regressions at the string-output seam (defense in depth for threat T-03-08 / D-42).

## Deviations from Plan

None — plan executed exactly as written. All 3 tasks landed in strict RED→GREEN sequence; acceptance grep gates all returned exit 0; the full gate (vitest + tsc + biome + NYI-free grep) returned 0 on first full run after Task 2 GREEN.

Biome applied formatter-only auto-fixes (unmerged-lines collapse) on the newly-written emitter files — these are style-only corrections, not behavior changes, and left the 4 snapshots + 20 assertions byte-equal.

## Issues Encountered

None.

## Next Phase Readiness

- **All 18 emitters implemented.** `dispatch.renderNode(node, width)` now routes every ComponentKind to a real per-kind emitter. The exhaustive `never` fallback in dispatch.ts compiles cleanly across all 18 cases.
- **Only variants.ts + scripts/render-wireframe.ts retain NYI markers** — both are Plan 03-08's scope (end-to-end `render()` composition, screen→variant frame, Modal centering / Sheet bottom-anchoring / NavBar root-screen leading-strip).
- **Catalog-coverage test (`tests/wireframe-catalog.test.ts`) `.skip` stanza intentionally NOT unskipped** — per the in-test comment, that skip unblocks after Plan 03-08 ships `render()`. Unskipping here would require calling into the variant composer which does not yet exist.
- **Test suite state:** 568 passed, 3 skipped (unchanged from Plan 03-06 end state + the +20 new assertions this plan added).

## Self-Check: PASSED

Verified claims post-summary:

- `src/emit/wireframe/components/nav-bar.ts` — FOUND
- `src/emit/wireframe/components/tab-bar.ts` — FOUND
- `src/emit/wireframe/components/modal.ts` — FOUND
- `src/emit/wireframe/components/sheet.ts` — FOUND
- `src/emit/wireframe/components/nav-bar.test.ts` — FOUND
- `src/emit/wireframe/components/tab-bar.test.ts` — FOUND
- `src/emit/wireframe/components/modal.test.ts` — FOUND
- `src/emit/wireframe/components/sheet.test.ts` — FOUND
- Commits `be536fa`, `f234f09`, `bdd363b`, `86f6dd4` — all FOUND via `git log --oneline`
- Zero NYI stubs in `src/emit/wireframe/components/` — VERIFIED via `! grep -rE 'throw new Error.*NYI' src/emit/wireframe/components/` returning exit 0

---
*Phase: 03-wireframe-renderer-dogfood-gate*
*Completed: 2026-04-18*
