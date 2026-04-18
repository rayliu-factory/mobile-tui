---
status: complete
phase: 03-wireframe-renderer-dogfood-gate
source:
  - 03-01-SUMMARY.md
  - 03-02-SUMMARY.md
  - 03-03-SUMMARY.md
  - 03-04-SUMMARY.md
  - 03-05-SUMMARY.md
  - 03-06-SUMMARY.md
  - 03-07-SUMMARY.md
  - 03-08-SUMMARY.md
  - 03-09-SUMMARY.md
started: 2026-04-18T07:11:46Z
updated: 2026-04-18T07:20:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: |
  From a fresh terminal, run:
  `npm run wireframe -- fixtures/habit-tracker.spec.md home`
  Output: ~23 lines of ASCII; exits 0; shows 4 stacked variant blocks
  (content / empty / loading / error) at 60 cols wide. Catches any
  startup/parse regression on a clean process.
result: pass
note: |
  Initial run failed with `sh: tsx: command not found` (exit 127) — Plan 03-09
  documented the npm script as broken because `tsx` is not a devDependency.
  Fixed inline during UAT by changing `package.json` script from
  `tsx scripts/render-wireframe.ts` → `npx tsx scripts/render-wireframe.ts`.
  Re-run produced full 4-variant render at exit 0 (27 lines incl. npm noise).

### 2. Render Single Variant via CLI
expected: |
  Run:
  `npm run wireframe -- fixtures/habit-tracker.spec.md home content`
  Output: just the content variant (~5-8 lines), not the full 4-variant
  stack. Exit 0. Plan 03-09 added the optional 3rd argv to support pasting
  ONE focused variant rather than the full block.
result: pass

### 3. Browse the 20 Golden Wireframe Fixtures
expected: |
  `fixtures/wireframes/` contains 20 `.wf.txt` files across 4 dirs
  (habit-tracker × 5, todo × 5, social-feed × 5, composites × 5).
  README.md indexes all 20. Open any 2-3 of them in your editor — each
  reads as a recognizable mobile mockup at 60 cols (NavBar at top,
  primary content area, optional TabBar at bottom). No mojibake, no
  ragged right edges.
result: pass

### 4. Composite Fixtures Show Deep Recursion Working
expected: |
  Open these 5 composite wireframes:
  - `fixtures/wireframes/composites/nested-col-row.wf.txt`
  - `fixtures/wireframes/composites/card-in-list.wf.txt`
  - `fixtures/wireframes/composites/navbar-tabbar.wf.txt`
  - `fixtures/wireframes/composites/modal-over-content.wf.txt`
  - `fixtures/wireframes/composites/sheet.wf.txt`
  Each shows the intended structure — Card-in-List shows a double-box
  (outer list frame + inner card frame), Modal shows `+-- Modal -----+`
  labeled top border, Sheet shows `+-- Sheet -----+`, NavBar+TabBar
  shows chrome at top AND bottom. Boxes line up at fixed 60 cols, no
  width drift.
result: pass

### 5. Dogfood — Paste a Wireframe Into a Real Surface
expected: |
  This is the CORE VALUE TEST per CLAUDE.md ("ASCII wireframes are good
  enough that a developer would share them"). Pick one of the 3
  shareable-tagged wireframes from `fixtures/wireframes/SHARED.md`:
  - `habit-tracker/home-content.wf.txt`
  - `todo/inbox-content.wf.txt`
  - `social-feed/feed-content.wf.txt`
  Copy its contents and paste into a real monospace surface (GitHub PR
  comment preview, Slack message, Discord, Linear issue, or even iMessage).
  Does it survive — i.e. does the right `|` border line up, do the box
  glyphs render as a UI mockup rather than garbled text? Would you
  actually send it to a teammate as "here's what the screen should
  look like"?
result: pass

### 6. All 18 Component Kinds Visible Across the Corpus
expected: |
  Across the 20 golden wireframes, the glyph alphabet for every
  ComponentKind appears at least once and reads as the intended
  component:
  - Button: `[[ ... ]]` (primary), `[ ... ]` (secondary)
  - Toggle: `[ ] label`
  - TextField: `label: ___________`
  - SegmentedControl: `< opt1 | opt2 | opt3 >`
  - Icon: `[icon:name]`
  - Image: `+--IMG--+ / | alt | / +--------+`
  - List: ends with `(list bound to /<JsonPointer>)` footer
  - Modal: `+-- Modal -----+`
  - Sheet: `+-- Sheet -----+`
  - NavBar: `< Title` (or trimmed on root screens)
  - TabBar: `[ Tab1 ] | [ Tab2 ] | [ Tab3 ]`
  - Text/Divider/Spacer/Card/Column/Row/ListItem: structural — visible
    via composition, no own glyph required.
  Spot-check 4-5 wireframes; flag anything where a glyph reads wrong.
result: pass

### 7. Null Variants Render as Single-Line Markers
expected: |
  Open `fixtures/wireframes/habit-tracker/home-loading.wf.txt` and
  `fixtures/wireframes/habit-tracker/home-error.wf.txt`. Both should
  show a single-line marker frame:
  `+-- screen: home  variant: loading  (N/A) --+`
  inside the 4-variant block (not omitted, not blank). Confirms D-39
  null-marker contract — missing variants are EXPLICITLY shown so
  reviewers know they were considered, not forgotten.
result: pass

### 8. CLI Error Handling
expected: |
  Run these three commands and confirm exit codes / messages:
  - `npm run wireframe`  → usage line on stderr, exit 2
  - `npm run wireframe -- fixtures/habit-tracker.spec.md does_not_exist`
    → error message on stderr, exit 1
  - `npm run wireframe -- fixtures/habit-tracker.spec.md home garbage`
    (Plan 03-09 4th arg) → invalid-variant error, exit 2
  No stack traces leak; messages are human-readable.
result: pass

## Summary

total: 8
passed: 8
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
