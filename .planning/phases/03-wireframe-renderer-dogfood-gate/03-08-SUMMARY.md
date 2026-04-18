---
phase: 03-wireframe-renderer-dogfood-gate
plan: 08
subsystem: ui
tags: [wireframe, ascii, emit, render, variants, composition, d-37, d-39, d-40, d-41, d-45]

# Dependency graph
requires:
  - phase: 03-wireframe-renderer-dogfood-gate
    plan: 01
    provides: "NYI stubs for variants.render/renderAllVariants + RenderOptions interface + barrel re-export shape (scripts/render-wireframe.ts + barrel already import render from variants.ts)"
  - phase: 03-wireframe-renderer-dogfood-gate
    plan: 02
    provides: "PHONE_WIDTH=60 + buildVariantHeader (3-stage overflow cascade preserving screen: + variant: metadata) + padRight + VariantKind type from layout.ts"
  - phase: 03-wireframe-renderer-dogfood-gate
    plan: 03
    provides: "truncate from overflow.ts (used by buildNullMarker stage-3 fallback for pathological-length null markers)"
  - phase: 03-wireframe-renderer-dogfood-gate
    plan: 04
    provides: "renderText/renderIcon/renderDivider/renderSpacer/renderImage leaf emitters (reached via renderNode recursion through dispatch.ts)"
  - phase: 03-wireframe-renderer-dogfood-gate
    plan: 05
    provides: "renderButton/renderToggle/renderTextField/renderSegmentedControl interactable emitters (D-42 label-only contract verified end-to-end via ASCII-baseline test — no action/testID leaks)"
  - phase: 03-wireframe-renderer-dogfood-gate
    plan: 06
    provides: "renderColumn/renderRow/renderCard/renderList/renderListItem structural emitters (recursive composition reaches depth-3+ in habit-tracker List→Card→Row snapshot)"
  - phase: 03-wireframe-renderer-dogfood-gate
    plan: 07
    provides: "renderNavBar (always emits `< Title`; root-trim centralized HERE in variants.ts), renderTabBar, renderModal, renderSheet — all 18-kind dispatch table complete"
  - phase: 02-serialization-round-trip
    plan: 05
    provides: "parseSpecFile(path) returning { spec, astHandle, diagnostics, body } — tests + CLI smoke consume spec directly"

provides:
  - "render(spec, screenId, opts?: RenderOptions): string — top-level public API composing 4-variant stack + acceptance footer + trailing newline deterministically"
  - "renderAllVariants — v1 alias for render (reserved for potential future API shape divergence; currently identical)"
  - "buildNullMarker helper — 3-stage overflow cascade for `+-- screen: X  variant: K  (N/A) --+` single-line marker frames per D-39"
  - "extractWhenExpr helper — `kind → variant.when.{collection|async|field_error}` → formatted trigger string for D-41 header placement"
  - "renderAcceptance + wrapBullet — greedy word-wrap bullet list for SPEC-10 acceptance prose under the content frame only (D-45)"
  - "NavBar root-trim centralization — first `| < ` line rewritten in-place to `|   ` when screen.back_behavior === undefined (D-37); per-kind emitter signature stays pure"
  - "Full public barrel (src/emit/wireframe/index.ts) contract pinned — PHONE_WIDTH + render + renderAllVariants + types, with identity assertion barrel === direct-import"
  - "End-to-end renderable: `npx tsx scripts/render-wireframe.ts fixtures/habit-tracker.spec.md home` exits 0 with 23-line 4-variant wireframe"
affects:
  - "03-09 (dogfood gate): render() ready to generate the 20-file .wf.txt corpus + SHARED.md sidecar"
  - "Phase 4 (editor store): render() is the preview-pane producer; pure-function + deterministic contract satisfies the debounced-reparse loop"
  - "Phase 5 (canvas): same render() function feeds live canvas preview pane"
  - "Phase 8 (:yank wireframe): same render() function; trailing-newline contract clean for clipboard paste into PR/Slack"
  - "Phase 9 (pi extension): barrel export surface stable; tsup-bundle target is deterministic"

# Tech tracking
tech-stack:
  added: []  # Zero new runtime deps
  patterns:
    - "Numbered-step pipeline docblock analog (variants.ts → parse.ts shape): top-of-file docblock lists 5 numbered steps the body implements in order; each step maps to 1-2 lines of code + inline `// Step N —` anchor comments. Mirrors src/serialize/parse.ts and matches PATTERNS.md §variants.ts guidance. Makes the pure-function pipeline readable at a glance without stepping through helpers."
    - "Centralized-trim caller-strip pattern (D-37): when per-kind emitter policy is context-dependent (e.g., NavBar `< ` only when non-root), the emitter emits the unconditional default and the COMPOSER strips context-dependent segments during frame assembly. Keeps per-kind emitter signatures pure `(node, width) => string[]`. First materialized here by Plan 03-07's nav-bar.ts → variants.ts handoff; reusable pattern for future context-dependent chrome."
    - "In-place column-preserving trim: replacing N fixed chars with N spaces (rather than dropping + right-padding) preserves column alignment including the right `|` border. Rectangular contract stays intact without extra padRight invocation. Used for NavBar root-trim (`| < ` → `|   `)."
    - "Dedicated null-marker helper vs hack-through-existing-API: buildNullMarker is a separate function parallel to buildVariantHeader rather than `buildVariantHeader(id, kind, '(N/A)')`. Rationale: `(N/A)` is semantically not a when-expression; piggybacking confuses future readers. Same 3-stage overflow cascade pattern as buildVariantHeader — duplication is small (~15 LOC) and the API call-sites stay legible."
    - "Fingerprint-table catalog coverage: wireframe-catalog.test.ts asserts each of the 18 kinds surfaces at least one per-kind glyph fragment (`[[ `, `+-- Modal`, `[icon:`, `---`, etc.) in the combined render output across 3 canonical fixtures. Structural containers (Column/Row/ListItem/Spacer) have no own-glyph → marked null and skipped. Exhaustive check: `undefined` entries throw explicitly, forcing future kinds to declare a fingerprint on creation."

key-files:
  created:
    - "src/emit/wireframe/variants.test.ts — 15 it() assertions across 6 describe blocks: D-39 stacking + null markers + trailing newline; D-40/D-41 header format + when-trigger placement (content/empty/loading/error); D-45 acceptance-under-content; D-37 NavBar root-trim root/non-root; WIREFRAME-05 determinism + throw-on-unknown; WIREFRAME-02 ASCII-baseline across 3 canonicals × every screen"
    - "src/emit/wireframe/__snapshots__/variants.test.ts.snap — 1 golden snapshot for habit-tracker/home 4-variant full render (27 lines including acceptance footer + 2 N/A markers)"
    - "src/emit/wireframe/index.test.ts — 3 barrel-contract assertions: PHONE_WIDTH === 60, render/renderAllVariants are functions, barrel-render identity with direct-variants-import"
  modified:
    - "src/emit/wireframe/variants.ts — replaced NYI stub with 5-step render() pipeline: locate screen → screenIsRoot determine → 4-block compose (renderVariantBlock × 4) → acceptance footer (under content only) → join + trailing newline. Internal helpers: renderVariantBlock, extractWhenExpr, buildNullMarker, renderAcceptance, wrapBullet. ~200 LOC total"
    - "tests/wireframe-catalog.test.ts — unskipped the 03-01 placeholder; live 18-kind fingerprint-coverage assertion walks 3 canonicals × every screen through render(), combines output, checks per-kind glyph fragments. Structural containers (Column/Row/ListItem/Spacer) excluded via `null` table entries"
    - "tests/wireframe-ascii-baseline.test.ts — added 2nd describe block `wireframe ASCII-baseline via render() — all fixtures`; it.each over 3 canonicals × every screen through render() asserting ASCII-baseline regex match. Original .wf.txt corpus describe unchanged (empty at this plan's close; 03-09 populates)"

key-decisions:
  - "Centralize NavBar root-trim in variants.ts — not a renderNavBar parameter"
  - "Replace `| < ` with `|   ` in-place (column-preserving) rather than drop + right-pad (column-shifting)"
  - "Dedicated buildNullMarker helper parallel to buildVariantHeader"
  - "extractWhenExpr returns undefined for content variant → buildVariantHeader's existing undefined branch handles it, no special-casing needed"
  - "Acceptance footer is plain-text (no frame) under the content block only — cleanest paste-into-PR shape; matches D-45 intent"
  - "opts.diagnostics reserved but unused in v1 — [BROKEN LINK] marker deferred to follow-up plan; documented in-source"

patterns-established:
  - "Numbered-step pipeline analog pattern — variants.ts now the 2nd invocation of the parse.ts shape (5-step sequential pipeline, each step ≤ 2 lines of code + inline anchor)"
  - "Caller-strip policy for context-dependent chrome — per-kind emitters stay pure; composer applies context-specific transforms"
  - "Column-preserving replacement — preferred over drop+pad when the caller needs to strip fixed-width content without disturbing adjacent column alignment"
  - "Exhaustive fingerprint table — every kind entry mandatory (null OR array); undefined throws"

requirements-completed: [WIREFRAME-01, WIREFRAME-02, WIREFRAME-03, WIREFRAME-04, WIREFRAME-05]

# Metrics
duration: 7min
completed: 2026-04-18
---

# Phase 03 Plan 08: Variant Composition + Public render() Summary

**Pure-function render(spec, screenId) composing 4 variant blocks (content → empty → loading → error) with null (N/A) markers, acceptance footer under content, and centralized NavBar root-trim — 592-test gate green end-to-end through the CLI.**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-04-18T06:37:21Z
- **Completed:** 2026-04-18T06:44:00Z
- **Tasks:** 3
- **Files modified:** 3 (variants.ts + 2 integration test files)
- **Files created:** 3 (variants.test.ts + variants.test.ts.snap + index.test.ts)

## Accomplishments

- `render(spec, screenId): string` lands as the Phase-3 public API — deterministic, pure, throws only on unknown screenId
- 4-variant stacking order fixed content → empty → loading → error per D-39; null variants render as 1-line `+-- screen: X  variant: K  (N/A) --+` markers (not omitted)
- Block headers merge into top borders per D-40; `when collection|async|field_error <pointer>` trigger appears in header only per D-41
- Acceptance prose word-wrapped bullets appear under content variant only per D-45
- NavBar root-trim centralized in variants.ts — emitter stays pure; root screen's first `| < ` line rewritten in-place to `|   ` (column-preserving)
- Integration tests unskipped: wireframe-catalog.test.ts walks all 18 kinds via live render(); wireframe-ascii-baseline.test.ts gains a direct-render() suite; src/emit/wireframe/index.test.ts pins the public barrel contract
- End-to-end CLI smoke test GREEN: `npx tsx scripts/render-wireframe.ts fixtures/habit-tracker.spec.md home` produces a 23-line 4-variant wireframe and exits 0

## Task Commits

Each task committed atomically:

1. **Task 1: RED — variants.test.ts covering D-39/D-40/D-41/D-45/D-37/determinism** — `1fd0c15` (test)
2. **Task 2: GREEN — render() 5-step pipeline + helpers** — `e6af655` (feat)
3. **Task 3: UNSKIP catalog + extend ASCII-baseline + barrel contract** — `41dfe2b` (test)

_TDD pair for render(): `1fd0c15` (test RED, 16 fail / 1 pass) → `e6af655` (feat GREEN, 17 / 17 pass)._

## Files Created/Modified

### Created
- `src/emit/wireframe/variants.test.ts` — 15 it() assertions across 6 describe blocks (D-39 + D-40/D-41 + D-45 + D-37 + WIREFRAME-05 + WIREFRAME-02)
- `src/emit/wireframe/__snapshots__/variants.test.ts.snap` — 1 golden snapshot for habit-tracker/home full render
- `src/emit/wireframe/index.test.ts` — barrel contract (PHONE_WIDTH, render, renderAllVariants, barrel === direct)

### Modified
- `src/emit/wireframe/variants.ts` — NYI stub replaced with 5-step render() pipeline + 5 helpers (renderVariantBlock, extractWhenExpr, buildNullMarker, renderAcceptance, wrapBullet); ~200 LOC
- `tests/wireframe-catalog.test.ts` — `.skip` placeholder removed; live 18-kind fingerprint coverage via render()
- `tests/wireframe-ascii-baseline.test.ts` — added second describe block exercising render() × 3 canonicals × every screen

## render() Pipeline (5-Step)

```
1. Locate screen in spec.screens by id                → throws Error on miss
2. screenIsRoot = (screen.back_behavior === undefined) → D-37 trigger
3. Render 4 variant blocks: content → empty → loading → error (D-39)
   │ null variant           → buildNullMarker(screenId, kind, width)
   │ non-null variant       → buildVariantHeader(…) + renderNode(tree) + bottom border
   │                        │   D-41 whenExpr extracted via extractWhenExpr()
   │                        │   D-37 root-trim: first `| < ` → `|   ` in content variant only
4. Acceptance footer (D-45) → appended to blocks[0] (content) only if screen.acceptance
                             → "acceptance:" label + greedy word-wrapped `- bullets`
5. Join blocks with "\n\n" + trailing "\n"            → rectangular-contract output
```

## Key Design Rationales

### Why `buildNullMarker` as a dedicated helper (not reuse buildVariantHeader)?

`buildVariantHeader(id, kind, whenExpr, width)` has a 4th arg for the optional `when` expression. Piggybacking `(N/A)` there would read as "(N/A) is a when-expression", which it isn't — it's a null-slot sentinel, semantically orthogonal to `when`. A separate function makes the two cases legible at the call-site:
- `buildVariantHeader("home", "empty", "collection /Habit/title", 60)` — real trigger
- `buildNullMarker("home", "loading", 60)` — null slot

Duplication is ~15 LOC (same 3-stage overflow cascade copied); the clarity win outweighs the DRY cost for this particular pair.

### NavBar root-trim: variants.ts post-process vs thread `screenIsRoot` into renderNavBar

Options:
- **(A) Thread the flag:** `renderNavBar(node, width, screenIsRoot)` — changes per-kind emitter signature + every renderNode call-site needs the flag forwarded.
- **(B) Centralize in composer:** renderNavBar always emits `< Title`; variants.ts strips `< ` for root screens only.

Chose (B) — the per-kind emitter layer stays pure `(node, width) => string[]`, mirroring all other 17 emitters. Context-dependent chrome is a composition concern; keep it with the composer. Implementation: first line starting with `| < ` has its `< ` replaced with 2 spaces (column-preserving). Net cost: ~10 LOC in variants.ts; zero cost in renderNavBar's signature.

### Why "replace with spaces" (not "drop and right-pad")?

Dropping `| < ` → `| ` + right-padding by 2 spaces moves the closing `|` from column 59 to column 57 (misalignment). Replacing `| < ` → `|   ` keeps the closing `|` at column 59, preserving the rectangular contract across the frame. Visually: every other row's right `|` lines up; the root-trimmed row does too. Snapshot stays clean.

### Acceptance prose wrapping (wrapBullet)

Per RESEARCH Pitfall 10 (acceptance-overflow word-wrap). Implementation:
- First line starts with `- ` (2-col bullet prefix)
- Greedy: add word if `current + " " + word <= width`, else emit current line + start continuation `  ` (2-col indent, no bullet)
- Each emitted line is subsequently padded to width for frame-adjacent rectangular contract

Example (habit-tracker/home):
```
acceptance:
- User sees a list of habits with their daily-complete state
- Tapping a habit toggles its completion
- Tapping a habit row opens the detail modal
```

No wrapping triggered at 60-col for these particular bullets — the wrap code path is exercised by the word-count logic but doesn't materialize in the canonical fixture. Wrap behavior documented in wrapBullet's body; pathological-width test left for Plan 03-09 corpus generation if composite fixtures hit it.

### [BROKEN LINK] marker v1-deferred

`RenderOptions.diagnostics` is passed through render() but currently unused. v1 deferral rationale: the marker shape requires a cross-ref resolution pass (match Stage-B error diagnostics to the affected interactable node) — research Pitfall 6 specifies "marker-width reserved FIRST, then truncate with reduced budget", implying the marker overlays at the per-kind emitter level. That's a non-trivial diagnostic-to-node correlation that warrants its own plan. Tracked as a follow-up (Plan 03-09 or later); docblock + `void opts;` placeholder in source.

## Decisions Made

- **NavBar root-trim policy:** Centralized in variants.ts (composer-level), not threaded into renderNavBar. Keeps per-kind emitter signature pure.
- **Trim mechanism:** In-place char-replacement (`| < ` → `|   `), not drop-and-right-pad. Preserves column alignment.
- **buildNullMarker:** Dedicated helper with 3-stage cascade — NOT a reuse-by-hack of buildVariantHeader.
- **Acceptance footer placement:** Under content block only, plain text (no frame), greedy word-wrapped.
- **opts.diagnostics:** Pass-through in v1; `[BROKEN LINK]` inline markers deferred. Documented.
- **renderAllVariants === render (v1):** Both exports kept for downstream-API stability; if/when they diverge, change is a single-file edit here.

## Deviations from Plan

None — plan executed exactly as written. One minor inline refinement during Task 2:

**Inline refinement (not a deviation):** Initial implementation of NavBar root-trim was `"| ${line.slice(4)}"` + `padRight(stripped, width)` — drop + right-pad. Self-observed during snapshot review: this shifts the right `|` border from col 59 → col 57 (breaks rectangular column alignment; snapshot visually wrong). Fixed before the GREEN commit to `"|   ${line.slice(4)}"` (in-place space-replacement). Snapshot regenerated and checked. No deviation rule triggered — this was within the Task 2 iteration before its commit landed.

## Issues Encountered

None — three-task TDD flow proceeded cleanly. One snapshot was updated (not a deviation) when the root-trim was refined to be column-preserving.

## Self-Check: PASSED

Verification (all exit 0):
- `test -f src/emit/wireframe/variants.ts` → exists
- `test -f src/emit/wireframe/variants.test.ts` → exists
- `test -f src/emit/wireframe/index.test.ts` → exists
- `test -f src/emit/wireframe/__snapshots__/variants.test.ts.snap` → exists
- `git log --oneline --all | grep 1fd0c15` → Task 1 RED commit found
- `git log --oneline --all | grep e6af655` → Task 2 GREEN commit found
- `git log --oneline --all | grep 41dfe2b` → Task 3 commit found
- `npx vitest run` → 592 pass / 2 skip (baseline 568/3 → +24 active, -1 skip)
- `npx tsc --noEmit` → 0 errors
- `npx biome check .` → 1 info (pre-existing Phase-2 `src/serialize/write.ts:254` — in deferred-items.md)
- `npx tsx scripts/render-wireframe.ts fixtures/habit-tracker.spec.md home` → exit 0 with 23-line stdout

## Next Phase Readiness

Plan 03-09 (dogfood gate) ready to start:
- render() is the generator for the 20-file `.wf.txt` corpus under `fixtures/wireframes/`
- The existing `tests/wireframe-ascii-baseline.test.ts` already walks `fixtures/wireframes/**/*.wf.txt`; Plan 03-09 populates those files and the existing test runs against them automatically
- `[BROKEN LINK]` inline marker is the remaining optional v1 feature — can land in Plan 03-09 or be pushed to a v1.1 plan

Phase 3 status: 7 of 9 plans complete. Remaining: 03-09 (dogfood gate — 20 fixtures + SHARED.md).

---
*Phase: 03-wireframe-renderer-dogfood-gate*
*Completed: 2026-04-18*
