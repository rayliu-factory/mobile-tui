---
phase: 03-wireframe-renderer-dogfood-gate
plan: 04
subsystem: ui
tags: [wireframe, ascii, emit, leaves, text, icon, divider, spacer, image, d-36, d-43, d-44, d-claude]

# Dependency graph
requires:
  - phase: 03-wireframe-renderer-dogfood-gate
    plan: 01
    provides: "NYI stubs for renderText/renderIcon/renderDivider/renderSpacer/renderImage under src/emit/wireframe/components/, each imported by dispatch.ts exhaustive switch"
  - phase: 03-wireframe-renderer-dogfood-gate
    plan: 02
    provides: "padRight primitive from src/emit/wireframe/layout.ts (leaves compose padRight(truncate(...)) for rectangular-contract outputs)"
  - phase: 03-wireframe-renderer-dogfood-gate
    plan: 03
    provides: "truncate from overflow.ts + applyTextStyle + TextStyle from text-style.ts (renderText consumes both; renderIcon/renderImage consume truncate)"

provides:
  - "renderText(node, width): string[] — D-43 style mapping composed with D-44 truncation, rectangular 1-line output"
  - "renderIcon(node, width): string[] — inline `[icon:${name}]` marker per D-Claude, rectangular 1-line output with truncation"
  - "renderDivider(node, width): string[] — single `-`.repeat(width) line per D-36"
  - "renderSpacer(node, width): string[] — size → blank-line count (sm=1, md=2 default, lg=3) per D-36"
  - "renderImage(node, width): string[] — 3-line `+--IMG---+ / | alt | / +--------+` box at min(10, width); inline `[img:alt]` fallback below 8 cols; defensive `(no alt)` inline literal for empty alt"
affects: [03-05 interactable emitters, 03-06 structural emitters, 03-07 chrome+overlay emitters, 03-08 variants composition, 03-09 dogfood gate]

# Tech tracking
tech-stack:
  added: []  # Zero new runtime deps
  patterns:
    - "Pure leaf emitter: `(node, width) => string[]` composing padRight + truncate + (optional) applyTextStyle. Deterministic, ASCII-only, no IO."
    - "Load-bearing marker preservation (RESEARCH Pitfall 6): renderImage's `[img:` prefix and renderText's style transforms are computed FIRST, then truncated into remaining budget — so the marker never gets shaved off. Mirrors Plan 03-03's layout.ts stage-3 allocator."
    - "Defense-in-depth for schema-guaranteed fields: image.alt is `z.string()` (non-empty not enforced by schema) so renderImage implements an inline `(no alt)` literal fallback rather than trusting upstream. Phase-1 regex guarantees printable-ASCII; empty-string is the only residual edge."
    - "Destructure-with-throw for `noUncheckedIndexedAccess`: test helpers `firstLine(r)` / `requireAt(r, i)` narrow `string | undefined` → `string` before property access. Same pattern as `src/emit/wireframe/layout.test.ts` (drawFrame tests) and `src/serialize/body.test.ts`."

key-files:
  created:
    - src/emit/wireframe/components/text.test.ts
    - src/emit/wireframe/components/icon.test.ts
    - src/emit/wireframe/components/divider.test.ts
    - src/emit/wireframe/components/spacer.test.ts
    - src/emit/wireframe/components/image.test.ts
    - src/emit/wireframe/components/__snapshots__/text.test.ts.snap
    - src/emit/wireframe/components/__snapshots__/icon.test.ts.snap
    - src/emit/wireframe/components/__snapshots__/divider.test.ts.snap
    - src/emit/wireframe/components/__snapshots__/spacer.test.ts.snap
    - src/emit/wireframe/components/__snapshots__/image.test.ts.snap
    - .planning/phases/03-wireframe-renderer-dogfood-gate/deferred-items.md
  modified:
    - src/emit/wireframe/components/text.ts
    - src/emit/wireframe/components/icon.ts
    - src/emit/wireframe/components/divider.ts
    - src/emit/wireframe/components/spacer.ts
    - src/emit/wireframe/components/image.ts

key-decisions:
  - "renderImage has THREE code paths, not two: (1) missing/empty alt → `(no alt)` inline single line (defense-in-depth), (2) width < 8 → `[img:alt]` inline with load-bearing `[img:` prefix preserved, (3) default → 3-line box at min(10, width). Plan <behavior> enumerated all three; my initial test for empty-alt asserted a 3-line shape in error — corrected before GREEN commit."
  - "renderImage inline fallback preserves the `[img:` marker via a dedicated budget path rather than blind `truncate(glyph, width)`. At width=6, naive truncation produces `[im...` (marker gone); marker-first allocation produces `[img:]` or `[img:…` depending on alt size — the [img: prefix remains visible so the artifact type is still self-describing. RESEARCH Pitfall 6 pattern."
  - "renderDivider ignores the node entirely (typed-receiver, unused body) — Divider has no payload per schema. Used `void node;` to appease no-unused-vars without changing the stable exported signature."
  - "renderSpacer default (size omitted) maps to md=2 lines, matching `component.ts` SpacerNode schema where `size` is optional and D-36 names md the default density. Computed via `node.size === 'sm' ? 1 : node.size === 'lg' ? 3 : 2` (ternary-over-switch keeps it 1-line)."
  - "renderText returns `[padRight(truncate(applyTextStyle(node.text, node.style), width), width)]` — strict composition order: style transforms FIRST (heading-1 → UPPER), THEN truncate (can shorten), THEN padRight (can pad). Truncate after applyTextStyle is correct because caption wrap `(hint)` increases length by 2 — truncation must account for the wrapped form, not the raw."

patterns-established:
  - "Leaf-emitter test structure: co-located `.test.ts` with describe-per-emitter, it-per-behavior; each test asserts `toHaveLength(n)` for line count + `.length === width` for rectangular contract + `.toMatchSnapshot()` for byte-level stability + a dedicated determinism assertion (two calls byte-equal). Matches the test-shape pattern stabilized by Plan 03-03 overflow.test.ts and text-style.test.ts."
  - "Load-bearing marker budget allocation: when a fixed prefix must survive truncation, compute `overhead = PREFIX.length + SUFFIX.length`, then `budget = width - overhead`, then truncate the variable segment into `budget`. Applied in renderImage narrow-width path; will likely recur in Plan 03-05 interactable emitters (sigil triples have load-bearing `[ → ... test:...]` shape)."

requirements-completed: [WIREFRAME-01, WIREFRAME-02, WIREFRAME-03]
# Plan 03-04's contribution to each:
#   - WIREFRAME-01 (18-kind render catalog): 5 of 18 kinds (Text, Icon, Divider, Spacer, Image) now have real emitters replacing NYI stubs. Remaining 13 kinds (Button, TextField, Toggle, SegmentedControl, Column, Row, Card, List, ListItem, NavBar, TabBar, Modal, Sheet) stay NYI — wired by parallel Wave-3 plans 03-05/06/07.
#   - WIREFRAME-02 (persisted-wireframe ASCII contract): all 5 leaves emit ASCII-only output with every line length === width (rectangular contract tested explicitly). tests/wireframe-ascii-baseline.test.ts from Plan 03-01 continues to protect the output-time invariant.
#   - WIREFRAME-03 (Phase 1 integration): all 5 leaves consume only Phase-1 schema-validated ComponentNode branches via `Extract<ComponentNode, { kind: ... }>` — no runtime validation needed, types guarantee shape.

# Metrics
duration: ~5min
completed: 2026-04-18
---

# Phase 03 Plan 04: Leaf Emitters (Text, Icon, Divider, Spacer, Image) Summary

**5 of 18 component emitters landed as pure `(node, width) => string[]` leaves composing Plan 03-02/03 primitives (padRight + truncate + applyTextStyle). Full vitest suite 491 pass (+27 from 464 baseline); tsc + biome exit 0.**

## Performance

- **Duration:** ~5 minutes
- **Started:** 2026-04-18T05:49:04Z (vitest baseline timestamp)
- **Completed:** 2026-04-18T05:55:03Z
- **Tasks:** 3 (5 commits: 2 TDD RED→GREEN pairs + 1 Rule-3 fix for TSC narrowing + biome format)
- **Files modified:** 11 created (5 test + 5 snapshot + 1 deferred-items.md) + 5 modified (5 emitter bodies replacing NYI stubs)

## Accomplishments

- `renderText` replaces NYI stub: `applyTextStyle(node.text, node.style)` → `truncate(..., width)` → `padRight(..., width)` — 8 assertions (heading-1 CAPS, heading-2 identity, body identity, caption parens, undefined-default, overlong-truncation, determinism, 4-width rectangular matrix). All GREEN.
- `renderIcon` replaces NYI stub: `padRight(truncate('[icon:${name}]', width), width)` — 4 assertions (marker visible, overlong truncation, determinism, 3-width rectangular matrix). All GREEN.
- `renderDivider` replaces NYI stub: single `-`.repeat(Math.max(0, width)) line — 4 assertions (width-60, width-20, determinism, 4-width rectangular matrix). All GREEN.
- `renderSpacer` replaces NYI stub: size → line-count ternary (sm=1 / md=2 default / lg=3), `' '.repeat(width)` per line — 6 assertions (each size + omitted-default + determinism + rectangular contract). All GREEN.
- `renderImage` replaces NYI stub with 3-path implementation: (1) empty-alt → `(no alt)` inline single line; (2) width<8 → `[img:alt]` inline with load-bearing `[img:` prefix preserved via marker-first budget allocation; (3) default → 3-line `+--IMG---+ / | alt | / +--------+` box at min(10, width) cols — 5 assertions (default 3-line box, narrow-width fallback, empty-alt defensive, 5-width rectangular matrix, determinism). All GREEN.
- 5 snapshots committed under `src/emit/wireframe/components/__snapshots__/` — byte-level stable references for regression detection.
- Full vitest suite: 491 pass / 3 skipped (baseline 464/3 → **+27 active assertions**, -0 skipped). `npx tsc --noEmit` exits 0. `npx biome check .` exits 0.
- Phase 1/2 regression intact: zero existing tests changed; 13 NYI stubs remain (Button, TextField, Toggle, SegmentedControl, Column, Row, Card, List, ListItem, NavBar, TabBar, Modal, Sheet) — Wave-3 parallel plans 03-05/06/07.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - TSC strict-mode narrowing] `noUncheckedIndexedAccess` on test array access**

- **Found during:** Task 3 (full gate verification after Task 2 GREEN commit)
- **Issue:** `tsconfig.json` enables `noUncheckedIndexedAccess: true` (Phase 01-01 decision). Test assertions like `expect(result[0]).toHaveLength(60)` failed with `TS2532: Object is possibly 'undefined'` because `result[0]` has type `string | undefined`, not `string`.
- **Fix:** Added `firstLine(lines)` / `requireAt(lines, i)` narrowing helpers at the top of each test file — destructure-or-throw pattern mirroring `src/emit/wireframe/layout.test.ts` drawFrame tests (`const [top, body, bottom] = frame; if (top === undefined) throw new Error(...)`). Established codebase idiom; STATE.md explicitly references this pattern from Plan 03-02 execution.
- **Files modified:** text.test.ts, icon.test.ts, divider.test.ts, spacer.test.ts, image.test.ts (all 5 test files converted).
- **Commit:** 8150f69

**2. [Rule 3 - Biome formatter] Multi-line renderIcon call flagged by format check**

- **Found during:** Task 3 (post-GREEN `npx biome check .` run)
- **Issue:** `src/emit/wireframe/components/icon.test.ts:15-18` had a 4-line `renderIcon(...)` call; biome's formatter preferred a single-line form at the applicable line length.
- **Fix:** Collapsed to `const result = renderIcon({ kind: "Icon", name: "very-long-icon-name-that-wont-fit" }, 10);`.
- **Commit:** 8150f69 (same commit as the TSC narrowing fix, since both surfaced in the same verify pass and both are biome/tsc correctness).

**3. [Rule 1 - Test correction] Empty-alt test shape mismatched plan `<behavior>`**

- **Found during:** Task 2 GREEN — image GREEN run initially failed the empty-alt test.
- **Issue:** My RED-phase image.test.ts empty-alt test asserted `toHaveLength(3)` (3-line box) + `r[1]` contains `(no alt)`. Plan 03-04 `<behavior>` line 295 explicitly specifies: "Missing `alt` (defensive — Phase-1 schema requires alt so this should be unreachable in validated specs): render `(no alt)` inline, single line, padded to width." My test contradicted the plan. I corrected the test to match the plan's documented single-line inline behavior (and preserved the assertion that `(no alt)` appears + starts-with literal). No source-logic change from the plan spec; source implements the plan-intended 3-path branch.
- **Commit:** eb93cd8 (test correction bundled with the feat(03-04): GREEN — leaves spacer/image commit, with commit-message note explaining the test alignment).

### Out-of-Scope Items Logged (not fixed)

- **`src/serialize/write.ts:254` `lint/style/useTemplate` info-level suggestion** — pre-existing Phase-2 code (introduced in commits 09ec9a9 / efd5e52). Biome treats as `info` (not error; exit 0 stays green). Logged to `.planning/phases/03-wireframe-renderer-dogfood-gate/deferred-items.md`. Not a Plan-03-04-caused regression.

## Commits (this plan)

| # | Commit | Message |
|---|--------|---------|
| 1 | f7570d1 | test(03-04): RED — leaves text/icon/divider |
| 2 | 853d2d4 | feat(03-04): GREEN — leaves text/icon/divider |
| 3 | e283669 | test(03-04): RED — leaves spacer/image |
| 4 | eb93cd8 | feat(03-04): GREEN — leaves spacer/image |
| 5 | 8150f69 | fix(03-04): Rule 3 — narrow array access + biome format on leaf tests |

Two TDD RED→GREEN pairs visible. Acceptance criterion "TDD commit pair visible" satisfied for both test/feat groupings. Commit 5 is the Rule-3 auto-fix for TSC strict + biome formatter noise that only surfaced during Task-3 full-gate verification.

## Snapshots Accepted

- `__snapshots__/text.test.ts.snap` — heading-1 `MY HABITS` padded to 60
- `__snapshots__/icon.test.ts.snap` — `[icon:heart]` padded to 60
- `__snapshots__/divider.test.ts.snap` — `-`.repeat(60)
- `__snapshots__/spacer.test.ts.snap` — single space-run of 60
- `__snapshots__/image.test.ts.snap` — 3-line `+--IMG---+ / | icon   | / +--------+` padded to 60

All snapshots committed as part of the GREEN commits; they become the byte-level reference for downstream regression detection (wireframe-dogfood-gate in Plan 03-09).

## Gate Results

```
npx vitest run         → 491 pass / 3 skip (baseline 464/3 → +27 active)
npx tsc --noEmit       → 0 errors
npx biome check .      → exit 0 (1 info on pre-existing Phase-2 write.ts line 254)
```

## Remaining NYI Stubs

13 of 18 kinds still NYI — expected per Wave-3 parallelization strategy:

- **Interactable (Plan 03-05):** Button, TextField, Toggle, SegmentedControl
- **Structural (Plan 03-06):** Column, Row, Card, List, ListItem
- **Chrome + Overlay (Plan 03-07):** NavBar, TabBar, Modal, Sheet

These plans can start in parallel with this summary — their dependencies (Plan 03-01/02/03 primitives) are all shipped.

## Self-Check: PASSED

- [x] `src/emit/wireframe/components/text.ts` — exists, has `renderText`, uses `applyTextStyle`
- [x] `src/emit/wireframe/components/icon.ts` — exists, has `renderIcon`, has `[icon:` literal
- [x] `src/emit/wireframe/components/divider.ts` — exists, has `renderDivider`, uses `"-".repeat`
- [x] `src/emit/wireframe/components/spacer.ts` — exists, has `renderSpacer`
- [x] `src/emit/wireframe/components/image.ts` — exists, has `renderImage`, has `(no alt)` and `[img:` literals
- [x] `__snapshots__/{text,icon,divider,spacer,image}.test.ts.snap` — all 5 present
- [x] Commits f7570d1, 853d2d4, e283669, eb93cd8, 8150f69 all in `git log --oneline` main
- [x] No NYI stubs remain for the 5 kinds (text/icon/divider/spacer/image)
- [x] 13 NYI stubs remain across components/ (expected for Wave-3 parallel plans)
