---
phase: 03-wireframe-renderer-dogfood-gate
plan: 05
subsystem: ui
tags: [wireframe, ascii, emit, interactables, button, toggle, text-field, segmented-control, d-34, d-42]

# Dependency graph
requires:
  - phase: 03-wireframe-renderer-dogfood-gate
    plan: 01
    provides: "NYI stubs for renderButton/renderToggle/renderTextField/renderSegmentedControl under src/emit/wireframe/components/, each imported by dispatch.ts exhaustive switch"
  - phase: 03-wireframe-renderer-dogfood-gate
    plan: 02
    provides: "padRight primitive from src/emit/wireframe/layout.ts (all 4 interactables compose padRight(truncate(...)) for the rectangular-contract output)"
  - phase: 03-wireframe-renderer-dogfood-gate
    plan: 03
    provides: "truncate from overflow.ts (4 interactables compose budget-first truncate; segmented-control relies on D-44 `...` fallback inside the endcap-preserving allocator)"

provides:
  - "renderButton(node, width): string[] — D-34 three-variant glyph alphabet (primary [[ label ]] / secondary [ label ] / text bare); label-budget allocator reserves 6/4/0 structural cols respectively"
  - "renderToggle(node, width): string[] — D-34 `[ ] label` off-state; Phase-3 v1 always renders off (bindsTo unresolvable at render time)"
  - "renderTextField(node, width): string[] — D-34 `label: _____` form with MIN_UNDERSCORES=4 visible-field floor; bindsTo + placeholder ignored in v1"
  - "renderSegmentedControl(node, width): string[] — D-34 `< opt1 | opt2 | opt3 >` endcap form; no asterisk-selection marking in v1 (bindsTo unresolvable); marker-first endcap-budget allocator preserves `<` and `>` under overflow"
affects: [03-06 structural emitters (Column/Row/Card), 03-07 chrome emitters (NavBar/TabBar wrap these), 03-08 variant composition, 03-09 dogfood gate]

# Tech tracking
tech-stack:
  added: []  # Zero new runtime deps
  patterns:
    - "Marker-first budget allocator (RESEARCH Pattern 3): reserve structural-glyph overhead FIRST, then truncate the label/payload into the remaining budget. Button primary → 6 col reservation; secondary → 4; TextField → `: ` (2) + MIN_UNDERSCORES (4) = 6; SegmentedControl → `< ` + ` >` (4). Guarantees the brackets/endcaps survive any non-pathological width."
    - "v1 no-live-data contract: Toggle/TextField/SegmentedControl all declare bindsTo in-memory but render the STRUCTURAL shape only (off / empty field / no selection). Phase-5 hook documented in all three files — `render(spec, screenId, {state: ...})` parameterization per RESEARCH Assumption A1."
    - "D-42 metadata-hiding enforced by the emitter itself (never reads node.action or node.testID) AND by a dedicated per-emitter test assertion (`not.toContain(actionValue)` + `not.toContain(testIDValue)` with distinctive zzz/yyy suffixes). SegmentedControl also omits top-level `label` since the sigil grouping is not part of the visible glyph."
    - "firstLine() destructure-or-throw helper (already established in Plan 03-04 text.test.ts + layout.test.ts): satisfies tsconfig `noUncheckedIndexedAccess` by narrowing `string | undefined` → `string` at the test boundary."

key-files:
  created:
    - src/emit/wireframe/components/button.test.ts
    - src/emit/wireframe/components/toggle.test.ts
    - src/emit/wireframe/components/text-field.test.ts
    - src/emit/wireframe/components/segmented-control.test.ts
    - src/emit/wireframe/components/__snapshots__/button.test.ts.snap
    - src/emit/wireframe/components/__snapshots__/toggle.test.ts.snap
    - src/emit/wireframe/components/__snapshots__/text-field.test.ts.snap
    - src/emit/wireframe/components/__snapshots__/segmented-control.test.ts.snap
  modified:
    - src/emit/wireframe/components/button.ts
    - src/emit/wireframe/components/toggle.ts
    - src/emit/wireframe/components/text-field.ts
    - src/emit/wireframe/components/segmented-control.ts

key-decisions:
  - "Button `variant=text` is a BARE label — zero structural overhead. Tests assert `line.startsWith('[')` is FALSE for text variant so a future regression that accidentally wraps the text variant in brackets (matching secondary) fails loud."
  - "Toggle Phase-3 v1 unconditionally renders `[ ]` off. GLYPH_ON=`[x]` is carried as a commented-out constant in toggle.ts documenting the Phase-5 parameterization target — so the glyph alphabet is discoverable in-source without being live code."
  - "TextField ignores `placeholder` in v1 — not only because there is no live data, but because placeholder is authored more loosely than label (schema places weaker constraints on it in the broader spec) and pass-through would create a D-42-style information-disclosure vector. Documented in text-field.ts header. Phase-5 may lift this once state-parameterized render is scoped."
  - "SegmentedControl endcap preservation uses a marker-first allocator (reserve `< ` + ` >` = 4, truncate inner, recompose) rather than the naive `truncate(glyph, width)`. At width=30 with 3 × 22-char options the naive form dropped `>` (the plan's acceptance literally asserts `trimEnd().endsWith('>')` at width=30). Same pattern as Plan 03-04's image.ts `[img:` marker preservation and Plan 03-03's layout.ts stage-3 `variant:` marker preservation."
  - "SegmentedControl label is hidden from visible glyph — the top-level `label` is the sigil GROUPING (what the control is named in author-facing surfaces like sigil triples and future a11y mappings) while `options[]` are the rendered payload. Dedicated test assertion `expect(line).not.toContain('PeriodLabel')` enforces the distinction."

metrics:
  duration: "5m 43s"
  completed: "2026-04-18T06:05:46Z"
  tasks: 3
  tdd_commits: 2  # RED+GREEN pairs
  files: 12  # 4 emitters modified + 4 test files created + 4 snapshot files created
  assertions_new: 29
  nyi_stubs_remaining: 9
---

# Phase 3 Plan 05: Interactable emitters (Button/Toggle/TextField/SegmentedControl) Summary

4 interactable emitters implemented per D-34 glyph alphabet; D-42 metadata-hiding enforced at emitter + test boundary. 9 of 18 component kinds now real (5 leaves from Plan 03-04 + 4 interactables from this plan); 9 NYI stubs remain for structural/chrome/overlay plans 03-06 and 03-07.

## What Shipped

- **`renderButton`** (`src/emit/wireframe/components/button.ts`): D-34 three-variant glyph alphabet. `variant=primary` → `[[ label ]]` (6 structural cols); `variant=secondary` (default) → `[ label ]` (4 cols); `variant=text` → bare `label` (0 cols). Label-budget allocator truncates the LABEL into the remaining width so brackets always survive; outer `truncate(glyph, width)` guards the degenerate width < overhead case via overflow.ts D-44 `.`.repeat fallback. Rectangular contract: `[padRight(line, width)]`.

- **`renderToggle`** (`src/emit/wireframe/components/toggle.ts`): D-34 `[ ] label` off-form (Phase-3 v1 always renders off — wireframes show STRUCTURE, not a particular state). 3-col glyph + 1-col separator → `width - 4` label budget. `GLYPH_ON = "[x]"` carried as a commented-out constant documenting the Phase-5 `render(spec, screenId, {state})` parameterization target.

- **`renderTextField`** (`src/emit/wireframe/components/text-field.ts`): D-34 `label: ________________` form. Marker-first budget: `": "` (2) + `MIN_UNDERSCORES` (4) reserved for the visible-field floor → truncate label into remainder → stretch underscores to `width - prefix.length` so short labels pad naturally while long labels still show ≥4 underscores at the tail. bindsTo + placeholder are IGNORED in v1 (no live data resolution; placeholder pass-through would be a D-42-style leak vector).

- **`renderSegmentedControl`** (`src/emit/wireframe/components/segmented-control.ts`): D-34 `< opt1 | opt2 | opt3 >` endcap form. Marker-first allocator reserves `< ` + ` >` (4 cols) → truncates joined inner payload via D-44 → recomposes, so both `<` and `>` endcaps survive any width above the floor. No asterisk-selection marking in v1 (bindsTo unresolvable at render time; Phase-5 parameterization deferred per Assumption A1). Top-level `label` is the sigil grouping only — it does NOT appear in the visible glyph.

## Test Coverage

| Emitter | Assertions | Snapshot | D-42 test |
|---|---|---|---|
| Button | 9 (3 variants + 2 truncation paths + D-42 + determinism + rectangular contract + explicit secondary) | `[[ Save ]]                                                  ` | yes (action=`save_habit_completed`, testID=`save_btn_test_id_zzz`) |
| Toggle | 6 (default off + bindsTo-present-off + D-42 + overlong-truncate + determinism + rectangular) | `[ ] Done                                                    ` | yes (action=`toggle_x_habit_weekly`, testID=`x_tog_test_id_zzz`) |
| TextField | 7 (basic + exact-bytes `Name: ______________` @ 20 cols + bindsTo/placeholder ignored + D-42 + overlong-truncate + determinism + rectangular) | `Title: _____________________________________________________` | yes (action=`edit_title_action_zzz`, testID=`title_input_id_yyy`) |
| SegmentedControl | 7 (3-option default + 2-option + D-42-with-label + endcap preservation under overflow + bindsTo-no-asterisk + determinism + rectangular) | `< Day | Week | Month >                                      ` | yes (action=`set_period_action_zzz`, testID=`period_ctrl_id_yyy`, label=`PeriodLabel`) |

**Total: 29 new assertions across 4 co-located test files + 4 accepted snapshots.**

## Gate Status

| Check | Status | Notes |
|---|---|---|
| `npx vitest run` | 520 pass / 3 skip across 45 files | Baseline 491/3 → +29 active assertions, 0 skipped-delta |
| `npx tsc --noEmit` | 0 errors | `noUncheckedIndexedAccess` clean via `firstLine()` helper in all 4 test files |
| `npx biome check .` | 0 errors, 1 info | The 1 info is the pre-existing Phase-2 `write.ts:254` useTemplate suggestion already logged to `deferred-items.md` — out of scope |

## Commits

| Hash | Type | Message |
|---|---|---|
| 299d3a5 | test | `test(03-05): RED — interactables button/toggle` |
| 396de79 | feat | `feat(03-05): GREEN — interactables button/toggle` |
| e93dcd7 | test | `test(03-05): RED — interactables text-field/segmented-control` |
| 0ecbe51 | feat | `feat(03-05): GREEN — interactables text-field/segmented-control` |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 — Missing critical functionality] SegmentedControl endcap preservation**

- **Found during:** Task 2 GREEN run (the "truncates overlong options while preserving `<` and `>` endcaps" test failed)
- **Issue:** The plan's `<action>` block suggested a naive `truncate(\`< ${joined} >\`, width)` implementation. At width=30 with 3 × 22-char options (total ~73 chars), the naive form truncates to `< very-long-option-one | v...` (30 chars) — the `>` endcap is GONE, contradicting the plan's own `<behavior>` spec "truncation preserves `< ... >` structural chars" and its own acceptance test `line.trimEnd().endsWith('>')`.
- **Fix:** Replaced with marker-first endcap-budget allocator: reserve `< ` (2) + ` >` (2) = 4 structural cols → truncate the joined inner payload to `width - 4` via D-44 → recompose `< ${truncated} >`. Both endcaps now survive any non-pathological width. Same pattern as Plan 03-04's `image.ts [img:` marker preservation and Plan 03-03's `layout.ts` stage-3 `variant:` marker preservation — consistent with RESEARCH Pitfall 6.
- **Files modified:** `src/emit/wireframe/components/segmented-control.ts` (GREEN commit included the fix inline)
- **Commit:** 0ecbe51

**2. [Rule 3 — Blocking issue] Biome single-line formatter convention**

- **Found during:** Post-test biome check on Task 1 + Task 2
- **Issue:** Biome's formatter (width=100 in biome.json) collapses short multi-line function-call arguments onto single lines. `toggle.test.ts` rectangular-contract loop + 2 `text-field.test.ts` call-sites exceeded no config setting but tripped the formatter's aesthetic rule.
- **Fix:** Task 1 — manual edit. Task 2 — `npx biome format --write` on the two test files (auto-fix acceptable since no logic change).
- **Commits:** 396de79 (button/toggle GREEN bundled the fix), 0ecbe51 (text-field/segmented-control GREEN bundled the fix)

No architectural deviations. No auth gates encountered.

## Known Stubs

None in this plan's surface. The 9 remaining NYI stubs (Column, Row, Card, List, ListItem, NavBar, TabBar, Modal, Sheet) are out of scope — wired by Plans 03-06 (structural) and 03-07 (chrome + overlays).

## Decisions on v1-vs-Phase-5 State Parameterization

All three state-aware interactables (Toggle, TextField, SegmentedControl) render the STRUCTURAL shape in Phase-3 v1:

| Component | v1 render | Phase-5 hook | Rationale |
|---|---|---|---|
| Toggle | always `[ ]` off | `{state}` param could flip to `[x]` | `bindsTo` is a JsonPointer to author-land state; wireframes show what the user CAN DO (tap to toggle), not any particular state |
| TextField | always empty (`label: _____`) | `{state}` param could splice a value into the underscore run | same — no live data at render time; placeholder pass-through also a D-42-style leak vector |
| SegmentedControl | no asterisks; all options bare | `{state}` param could wrap the matching option in `*...*` | asterisk wrapping per D-34/RESEARCH Assumption A1 requires resolved selection |

This is aligned with the plan's `<context>`/`<interfaces>` notes ("Phase 3 v1 renders the STRUCTURAL shape only — downstream phases may add a `state` options parameter"). Documented in each emitter's header comment so future developers see the Phase-5 target at the site.

## Threat Flags

None. No new surface introduced beyond the plan's `<threat_model>` register:

- **T-03-01 (label escape smuggling):** mitigated — Phase-1 PRINTABLE_ASCII bounds labels/options upstream; emitters never re-assemble outside the validated string.
- **T-03-08 (D-42 leak):** mitigated — each emitter never reads `node.action` or `node.testID`; each test file asserts `not.toContain(actionValue)` + `not.toContain(testIDValue)` with distinctive suffixes (`_zzz`, `_yyy`) so a future refactor accidentally interpolating either field fails loud.
- **T-03-04 (snapshot drift):** mitigated — all 4 emitters are pure functions (no Date, no `Math.random`, no `process.env`); determinism test in each file.

## Self-Check: PASSED

- src/emit/wireframe/components/button.ts — FOUND
- src/emit/wireframe/components/button.test.ts — FOUND
- src/emit/wireframe/components/toggle.ts — FOUND
- src/emit/wireframe/components/toggle.test.ts — FOUND
- src/emit/wireframe/components/text-field.ts — FOUND
- src/emit/wireframe/components/text-field.test.ts — FOUND
- src/emit/wireframe/components/segmented-control.ts — FOUND
- src/emit/wireframe/components/segmented-control.test.ts — FOUND
- src/emit/wireframe/components/__snapshots__/button.test.ts.snap — FOUND
- src/emit/wireframe/components/__snapshots__/toggle.test.ts.snap — FOUND
- src/emit/wireframe/components/__snapshots__/text-field.test.ts.snap — FOUND
- src/emit/wireframe/components/__snapshots__/segmented-control.test.ts.snap — FOUND
- commit 299d3a5 — FOUND
- commit 396de79 — FOUND
- commit e93dcd7 — FOUND
- commit 0ecbe51 — FOUND
