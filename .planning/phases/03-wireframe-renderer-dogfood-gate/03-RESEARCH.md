# Phase 3: Wireframe Renderer & Dogfood Gate — Research

**Researched:** 2026-04-18
**Domain:** Terminal ASCII layout + snapshot-driven renderer + dogfood evidence gate
**Confidence:** HIGH on algorithm / catalog / test shape; MEDIUM on final composite-fixture selection (resolved in planner pass per D-46); HIGH on tooling (all deps already on disk via Phase 1/2).

## Summary

Phase 3 builds a pure function `render(spec, screenId): string` that walks a `ComponentNode[]` tree from the 18-kind closed catalog and produces a fixed-60-col ASCII block, stacking four variants (content / empty / loading / error) with a header-in-top-border per D-40 and acceptance footer under `content` per D-45. Twenty `.wf.txt` golden fixtures under `fixtures/wireframes/` plus a `SHARED.md` sidecar with ≥3 author-certified paste-into-PR entries gate Phase 4 kickoff per D-49.

The layout engine follows the **recursive-line-concatenation** pattern documented in `.planning/research/ARCHITECTURE.md §Pattern 3`: every emitter returns `string[]` (list of content-width lines), parents compose vertically for Columns and Cards and horizontally for Rows; the outer `layout.ts` frames the completed inner block. This matches CLAUDE.md's "~200 LOC custom renderer" guidance and is the simplest algorithm that handles the catalog at the 60-col fixed width.

No new runtime dependencies. `parseSpecFile` already exists and returns exactly the shape Phase 3 needs. `scripts/render-wireframe.ts` runs via `npx tsx` (same runner already used by Phase 1/2 test harness through Node ESM `import`). Snapshot harness splits into three layers: per-kind `.toMatchSnapshot()` co-located under `src/emit/wireframe/components/*.test.ts`, hand-committed `.wf.txt` golden files in `fixtures/wireframes/` driven by `tests/wireframe-catalog.test.ts` + `tests/dogfood-gate.test.ts`, and an ASCII-baseline regex assertion in `tests/wireframe-ascii-baseline.test.ts`.

**Primary recommendation:** Recursive-line-concat layout algorithm, no new deps, split into 4 waves (W0 layout primitives + text-style / W1 per-kind emitters / W2 variant-block + CLI + fixtures / W3 dogfood gate evidence infrastructure).

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Visual vocabulary — Overall Style**
- **D-33:** Compact mockup style — single outer `+---+` frame at 60-col width; nested `+--+` boxes ONLY for Card, List items, Modal, Sheet; interactables as bracketed glyphs inline. Wireframe reads like a screenshot, not a labeled tree or all-components-boxed diagram.

**Visual vocabulary — Interactable glyphs**
- **D-34:** Per-kind ASCII glyph alphabet:
  - Button: `[[ Save ]]` primary / `[ Cancel ]` secondary (default) / bare `Save` text
  - Toggle: `[ ]` off / `[x]` on, label trails: `[x] Done`
  - TextField: `Label: ________________` (underscore run fills width); if `bindsTo` has value, value appears inline with trailing underscores
  - SegmentedControl: `< Day | Week | Month >`; selected wrapped in asterisks: `< Day | *Week* | Month >`
  - ListItem (tappable): rendered as item row; no extra chevron
- **D-35:** `InteractableBase` triple read from in-memory `{label, action, testID}`, NOT from sigil string. Renderer consumes `component.label` only; action + testID hidden per D-42.

**Visual vocabulary — Container glyphs**
- **D-36:** Containers as plain `+--+` boxes:
  - Card: untitled `+--+ ... +--+` box
  - List: repeated item-boxes with blank-line gap between
  - Modal / Sheet: `+--+` with labeled top border `+-- Modal -----+` / `+-- Sheet -----+`; Modal centers, Sheet bottom-anchors
  - Column / Row: NO glyph — containment via vertical/horizontal arrangement + whitespace
  - Divider: single `-----` run matching content width
  - Spacer: blank line(s) — sm=1, md=2, lg=3

**Visual vocabulary — Nav chrome**
- **D-37:** NavBar = single line `< Title                         [trailing]`, leading `< ` only on non-root; followed by `---` rule. TabBar = `---` rule above, then `[ Home ] | [ Stats ] | [ Settings ]` row. NO device chrome (no status bar, notch, home indicator).

**Page frame & variant block layout**
- **D-38:** Fixed width 60 cols; outer frame at col 60; content pad = 58. No CLI flag to vary width in v1. Predictable diffs; snapshot stability.
- **D-39:** Variant stacking fixed order: `content → empty → loading → error`, blank-line separated. Null variants render as 1-line `(N/A)` marker frame (`+-- screen: home  variant: loading  (N/A) --+` with no body), NOT omitted.
- **D-40:** Block header merges with top border: `+-- screen: <id>  variant: <kind>[  when <key> <pointer>] --+`. No extra heading line above frame, no caption below. If header would exceed 60 cols, trailing `--+` collapses to `-+` and text truncates with `...`.
- **D-41:** `when:` trigger appears ONLY in block header (for empty/loading/error). Format: `when <key-without-braces> <pointer>`. `content` has no trigger.

**Sigil & text-style presentation**
- **D-42:** Sigil metadata hidden in persisted wireframes — only `label` renders. `action` and `testID` stay in spec. `[BROKEN LINK]` marker exception surfaces unresolved action name inline.
- **D-43:** `Text.style` → ASCII mapping:
  - `heading-1` → **ALL CAPS** (no underline): `MY HABITS`
  - `heading-2` → Title Case, no underline: `Drink water` (respect author capitalization if mixed)
  - `body` → plain, as-authored
  - `caption` → wrapped in `(` `)` parens: `(2 of 5 habits complete)`
- **D-44:** Text overflow → truncate with `...` at `width - 3`. Deterministic 1-line rows. No soft-wrap in v1.
- **D-45:** Acceptance prose renders below `content` variant ONLY; never duplicated under empty/loading/error. Format: `acceptance:` footer line + indented `- ` bullets, word-wrapped.

**Dogfood gate — 20-wireframe composition**
- **D-46:** Fixture sourcing: derive from 3 canonicals + 5 composites. Counts: habit-tracker ≈7, todo ≈7, social-feed ≈6, composites/ 5 dedicated. Final count exactly 20 `.wf.txt` files.
- **D-47:** File layout: `fixtures/wireframes/{fixture_slug}/{screen_id}-{variant}.wf.txt`. Plus `README.md` index (20 entries).
- **D-48:** `fixtures/wireframes/SHARED.md` sidecar records dogfood evidence. Structure: ≥3 entries, each listing `screen:{variant}` identifier, paste-target URL, date, author verdict (`shareable` | `needs-work`). Author self-certifies.
- **D-49:** Phase 4 first-plan precondition checks SHARED.md for ≥3 entries marked `shareable`. Enforcement lives inside `/gsd-plan-phase 4`.

### Claude's Discretion

- **Renderer module layout:** `src/emit/wireframe/` split by concern — `layout.ts` / `components/` (18 files) / `variants.ts` / `cli.ts`. One file per concern per Phase-2 pattern.
- **`render-wireframe` CLI form:** plain Node script at `scripts/render-wireframe.ts`, invoked via `npx tsx scripts/render-wireframe.ts <spec-path> <screen-id>`. Also `npm run wireframe -- <spec> <screen>`. No `bin` entry in v1.
- **Text output encoding:** UTF-8, LF line endings (enforced), trailing newline. Snapshot tests normalize via `Buffer.equals`-style comparison.
- **Image placeholder:** `+--IMG---+ / |  alt  | / +--------+` — 3-line box, 10 cols wide default unless parent constrains tighter. Missing alt → `(no alt)` inline.
- **Icon placeholder:** inline `[icon:name]` — 1 line, flows with text.
- **`[BROKEN LINK]` marker:** inline sentinel — when `validateSpec` flagged `SPEC_UNRESOLVED_ACTION` etc. and renderer asked to emit, affected element renders as `[[ Save ]] !!BROKEN: action=save_habit` on same line, truncating other content first.
- **Snapshot harness:** vitest `.toMatchSnapshot()` per component under `src/emit/wireframe/components/*.test.ts`; `tests/wireframe-catalog.test.ts` asserts 18 kinds + 5 composites; `tests/dogfood-gate.test.ts` asserts exactly 20 `.wf.txt` files + SHARED.md ≥3 shareable.
- **Variant frame padding:** 1-line inner padding top/bottom (blank after header, blank before bottom border). Content body gets 2 cols left pad + 2 cols right pad → ~54 cols for rendered children.

### Deferred Ideas (OUT OF SCOPE)

- Unicode BMP box-drawing preview path — `render(spec, screenId, {unicode: true})` overload. Phase 5.
- CLI flag `--width 80` to vary rendering width. Post-v1.
- Soft-wrap instead of truncate-with-ellipsis. Revisit only if real fixtures show truncate loses critical info.
- `render-wireframe --strict` diagnostic mode. Not v1.
- Interactive `render-wireframe --watch`. Phase 5 supersedes.
- Alternative visual styles (labeled-tree, heavy-box, device-frame) as opt-in renderers. Deferred.
- Non-ASCII label support. Phase 1 D-03 locks ASCII.
- Rich `[BROKEN LINK]` variants (different marker per code). v1 uses single marker style.
- Semantic-token-aware rendering (palette swatches, spacing indicators). Phase 8.
- Side-by-side 2×2 variant grid. Rejected v1 per D-39.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| WIREFRAME-01 | Given a Screen's component tree, renderer produces a ~40-line ASCII wireframe at fixed ~60 cols with explicit right borders (copy-paste survives into PRs/Slack/email). | Layout-engine algorithm §Architecture Patterns Pattern 1; D-38 locks 60 cols; D-44 truncate-at-width-3 keeps rows 1-line; content-body 2-col padding + `|` borders defended in §Terminal rendering §Pitfall 1.3 copy-paste mangling. |
| WIREFRAME-02 | Persisted wireframe uses ASCII-baseline character set (`|`, `-`, `+`, `.`); Unicode BMP box-drawing glyphs allowed ONLY in live in-TUI preview. | Architecture Pattern 2 (regex-enforced character class); `tests/wireframe-ascii-baseline.test.ts` asserts `^[|\-+. \x20-\x7E]*$` only per CONTEXT.md code_context. PITFALLS §1.1. |
| WIREFRAME-03 | Renderer supports every v1 catalog component; snapshot test per component + ≥5 composite layouts. | 18-kind emitter decomposition (see §Code Examples); 5 composites identified (nested Column/Row, Card-in-List, NavBar+TabBar, Modal-over-content, Sheet). Catalog walker in `tests/wireframe-catalog.test.ts` asserts all 18 kinds + 5 composites have snapshots. |
| WIREFRAME-04 | Each of 4 state variants (content/empty/loading/error) renders as its own wireframe block — no "empty state as squiggle on top of happy path." | D-39 fixed stack order content→empty→loading→error; null variants render as 1-line `(N/A)` marker frame; variants.ts composition module (see §Architecture Patterns). |
| WIREFRAME-05 | Renderer is a pure function from spec to string; no hidden state, no disk, independently runnable via `render-wireframe <spec> <screen-id>` script. | `render(spec, screenId): string` signature in `src/emit/wireframe/index.ts`; CLI at `scripts/render-wireframe.ts` calls `parseSpecFile` then routes to render; see §Architecture Patterns Pattern 3. |
| WIREFRAME-06 | ≥20 reference wireframes committed as golden fixtures before any TUI work starts ("would a dev paste this in a PR" gate). | D-46 fixture composition (3 canonicals + 5 composites → exactly 20 `.wf.txt` files); D-47 file layout; D-48 SHARED.md evidence (≥3 shareable); D-49 Phase 4 gate enforcement. `tests/dogfood-gate.test.ts` asserts counts + parse. |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Parse spec → in-memory Spec | L3 Serialize (`parseSpecFile`) | — | Owned by Phase 2; Phase 3 is pure consumer. |
| Validate spec + emit diagnostics | L2 Model (`validateSpec`) | L3 surfaces in parse result | Owned by Phase 1; Phase 3 inspects `diagnostics` for `[BROKEN LINK]` markers. |
| Walk ComponentNode tree | L4 Emit (`src/emit/wireframe/`) | — | Pure function reading tree; no store, no disk. |
| Map each kind → `string[]` lines | L4 Emit (`components/*.ts`) | — | One emitter per kind, exhaustive switch gated by `COMPONENT_KINDS`. |
| Compose lines into fixed-width frame | L4 Emit (`layout.ts`) | — | Text primitives (pad, truncate, border glyphs, join). |
| Stack 4 variants + header + acceptance | L4 Emit (`variants.ts`) | — | Block-level composition; reads `spec.screens[].variants` + `spec.screens[].acceptance`. |
| Surface as runnable CLI | Scripts (`scripts/render-wireframe.ts`) | L3 (calls `parseSpecFile`) | Thin shell wrapper; no logic beyond argv parse + stdout write. |
| Fixture storage on disk | Fixture corpus (`fixtures/wireframes/`) | Build-time snapshot harness | Git-tracked ASCII files, not code artefacts. |
| Dogfood evidence | Human author + `SHARED.md` sidecar | `tests/dogfood-gate.test.ts` parses + counts | Self-certification is v1 bar per D-48; test only validates structure, not paste quality. |
| Phase 4 plan-gate enforcement | GSD workflow (`/gsd-plan-phase 4`) | — | Pre-plan precondition check; NOT Phase 3's concern, but Phase 3 must make the signal parseable. |

## Standard Stack

### Core [VERIFIED: already in `package.json` + node_modules]

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `yaml` | `^2.8.3` | Consumed INDIRECTLY via `parseSpecFile` — Phase 3 code never imports `yaml` directly. | Already pinned; renderer is downstream of serializer. |
| `gray-matter` | `^4.0.3` | Same — consumed via `parseSpecFile`. | Already pinned. |
| `zod` | `^4.3.6` | Consumed via `validateSpec`; Phase 3 reads `z.infer<typeof ComponentNodeSchema>` types. | Already pinned. Exhaustive-switch pattern in emitters relies on the discriminated TypeScript union surface. |

### Supporting [VERIFIED: already available]

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vitest` | `^4.1.4` | Unit tests + `.toMatchSnapshot()` + integration tests; already configured. | Per-kind co-located snapshot tests; `tests/wireframe-catalog.test.ts`; `tests/dogfood-gate.test.ts`; `tests/wireframe-ascii-baseline.test.ts`. |
| `@vitest/coverage-v8` | `^4.1.x` | Coverage. | Phase 3 aims to hold current 95% stmts bar on `src/serialize/`; new `src/emit/wireframe/` should land ≥85% stmts (renderer is pure + exhaustive, coverage should be near-total). |
| `@biomejs/biome` | `^2.4.12` | Lint + format. | Green-gate; Phase 3 must keep `npx biome check .` at 0 errors. |
| `typescript` | `^5.6.0` | Types. | `tsc --noEmit` green; exhaustive switch discriminator check on `ComponentNode.kind` catches missing emitters at compile time. |
| `node` | `>=20` | Runtime. | `engines.node >=20` already pinned. |

### New Dependencies — NONE REQUIRED [VERIFIED: exhaustive evaluation against CONTEXT.md constraints]

Phase 3 adds **zero** new runtime dependencies. Specifically NOT added:
- `tsx` — already used transitively via npx; `npx tsx scripts/render-wireframe.ts <args>` works without pinning as a dep. [VERIFIED: `npm view tsx version` → 4.21.0; `npx tsx` invokable without install via npx cache.]
- `clipboardy` — D-Claude mentioned as a Phase 3 quality-of-life import for copy-wireframe, but Phase 3 does NOT ship a `:yank wireframe` command — that's Phase 8 (HANDOFF-01). The CLI outputs to stdout; shell redirection handles file writes. [VERIFIED: `npm view clipboardy version` → 5.3.1, but deferring until Phase 8.]
- `chalk` — would bypass theme; renderer outputs raw ASCII (no color). Phase 5 TUI preview integrates theme via `pi-tui`.
- Any layout / box-drawing library — CLAUDE.md §The Wireframe Rendering Question exhausts the search: `cli-boxes`, `boxen`, `ink`+`ink-box`, `blessed` all fail (they own the screen, impose their own render loop, or lack compose fidelity). Build ~200 LOC ourselves.

**Version verification:** All currently-installed versions verified against the in-repo `package-lock.json` via the existing Phase 1/2 regression gate (425/425 tests green on 2026-04-17). No new `npm install` required for Phase 3.

### Alternatives Considered

| Instead of | Could Use | Why NOT for Phase 3 |
|------------|-----------|---------------------|
| Recursive line-concat algorithm | Constraint-based layout (size-then-position) | Overkill for a fixed 60-col width with no elastic sizing. Recursive concat is ~200 LOC; constraint solver would be >500 LOC and adds test-surface for 0 fidelity gain. |
| Truncate-at-width-3 | Soft-wrap | D-44 locked truncate. Soft-wrap changes vertical layout non-deterministically (row height varies with content) → snapshot instability. |
| Co-located per-kind snapshot tests | Monolithic `render.test.ts` | Per-file snapshots give precise diff locality on catalog changes; matches Phase 2 `src/serialize/*.test.ts` co-location pattern. |
| `.wf.txt` hand-committed fixtures | Vitest `.toMatchSnapshot()` for all | `.wf.txt` files ARE the product artifact (they get pasted into PRs); snapshot files are implementation detail. Hand-committed ASCII files are review-visible in git diffs and serve as authoring-time lookup. |
| Buffer.equals byte comparison | String equality | Handles line-ending / trailing-newline subtlety matching Phase 2 SERDE-05 idiom. |

**Installation:** No new installs. Existing `npm ci` / `node_modules` state from Phase 2 suffices.

## Architecture Patterns

### System Architecture Diagram

```
  CLI entry                    ┌────────────────────────────────┐
  (scripts/render-wireframe.ts)│  argv = [spec-path, screen-id] │
                               └───────────────┬────────────────┘
                                               ▼
                               ┌────────────────────────────────┐
                               │  parseSpecFile(path)           │  ← Phase 2 L3
                               │  returns {spec, diagnostics,   │
                               │           body, astHandle}     │
                               └───────────────┬────────────────┘
                                               ▼
                               ┌────────────────────────────────┐
                               │  render(spec, screenId):string │  ← Phase 3 L4 entry
                               └───────────────┬────────────────┘
                                               ▼
                               ┌────────────────────────────────┐
                               │  variants.ts                   │
                               │  - locate spec.screens[screenId]│
                               │  - stack 4 variants in order   │
                               │  - null → 1-line (N/A) marker  │
                               │  - acceptance footer under     │
                               │    content only                │
                               └───────────────┬────────────────┘
                                               ▼
                               ┌────────────────────────────────┐
                               │  layout.ts                     │
                               │  - compose 60-col frame        │
                               │  - merge header into top border│
                               │  - truncate header at overflow │
                               │  - 2-col content padding       │
                               │  - blank-line variant separator│
                               └───────────────┬────────────────┘
                                               ▼
                               ┌────────────────────────────────┐
                               │  components/<kind>.ts  × 18    │
                               │  renderX(node, width): string[]│
                               │  (recursive for Card, Column,  │
                               │   Row, List, ListItem, NavBar, │
                               │   Modal, Sheet)                │
                               └───────────────┬────────────────┘
                                               ▼
                               ┌────────────────────────────────┐
                               │  text-style.ts + overflow.ts   │
                               │  - heading-1 → UPPERCASE       │
                               │  - heading-2 → Title Case      │
                               │  - caption → (parens)          │
                               │  - truncateWithEllipsis(str,w) │
                               │  - padLine(str, w), fillLine   │
                               └───────────────┬────────────────┘
                                               ▼
                               ┌────────────────────────────────┐
                               │  stdout write                  │
                               │  (fenced code block text)      │
                               └────────────────────────────────┘

  Test driver paths:
    src/emit/wireframe/components/<kind>.test.ts
        → .toMatchSnapshot() per kind (18 snapshots)
    tests/wireframe-catalog.test.ts
        → renders every kind from canonical fixtures
        → renders 5 composites (nested Column/Row, Card-in-List,
           NavBar+TabBar, Modal-over-content, Sheet)
    tests/wireframe-ascii-baseline.test.ts
        → for each fixtures/wireframes/**/*.wf.txt:
            assert contents match /^[|\-+. \x20-\x7E\n]*$/
    tests/dogfood-gate.test.ts
        → count files under fixtures/wireframes/**/*.wf.txt === 20
        → parse fixtures/wireframes/SHARED.md
        → assert ≥3 entries with verdict === "shareable"

  [VERIFIED: file-layout maps to CONTEXT.md code_context §New Code Layout]
```

### Recommended Project Structure

```
src/
├── emit/                          # NEW L4 Emit layer (Phase 3 home)
│   └── wireframe/
│       ├── index.ts               # barrel — exports render(), renderAllVariants()
│       ├── layout.ts              # frame composer, border drawing, content padding
│       ├── variants.ts            # 4-variant stacking, header-in-border, acceptance footer
│       ├── text-style.ts          # heading-1/h2/body/caption ASCII mapping (D-43)
│       ├── overflow.ts            # truncate-with-ellipsis primitive (D-44)
│       ├── components/
│       │   ├── button.ts          # [[ X ]] / [ X ] / X per variant
│       │   ├── toggle.ts          # [ ] / [x] label (D-34)
│       │   ├── text-field.ts      # Label: ________ (D-34)
│       │   ├── segmented-control.ts   # < a | *b* | c > (D-34)
│       │   ├── list-item.ts       # item row; recursive to children
│       │   ├── text.ts            # delegates to text-style.ts per .style
│       │   ├── icon.ts            # [icon:name] inline (D-Claude)
│       │   ├── divider.ts         # ----- (D-36)
│       │   ├── spacer.ts          # blank lines × {1,2,3} (D-36)
│       │   ├── image.ts           # +--IMG--+ / | alt | / +-----+ (D-Claude)
│       │   ├── column.ts          # vertical concat of children (D-36)
│       │   ├── row.ts             # horizontal concat (D-36; gap → spaces)
│       │   ├── card.ts            # +--+ box around child (D-36)
│       │   ├── list.ts            # repeated item boxes, blank line between (D-36)
│       │   ├── nav-bar.ts         # < title [trailing] + --- rule (D-37)
│       │   ├── tab-bar.ts         # --- rule + [ Home ] | [ ... ] row (D-37)
│       │   ├── modal.ts           # +-- Modal -----+ labeled box (D-36)
│       │   └── sheet.ts           # +-- Sheet -----+ labeled box (D-36)
│       └── *.test.ts              # co-located per-kind snapshot tests
│
scripts/                           # NEW directory (no scripts/ exists yet)
└── render-wireframe.ts            # CLI entry: argv → parseSpecFile → render → stdout
│
fixtures/                          # existing
└── wireframes/                    # NEW dogfood corpus
    ├── README.md                  # 20-entry index (D-47)
    ├── SHARED.md                  # evidence sidecar (D-48, ≥3 shareable entries)
    ├── habit-tracker/             # derive from existing fixtures/habit-tracker.spec.md
    │   ├── home-content.wf.txt
    │   ├── home-empty.wf.txt
    │   ├── home-loading.wf.txt       # N/A marker frame
    │   ├── home-error.wf.txt         # N/A marker frame
    │   ├── new_habit-content.wf.txt
    │   ├── new_habit-loading.wf.txt
    │   ├── new_habit-error.wf.txt
    │   └── detail_modal-content.wf.txt   # (≈7 files)
    ├── todo/                      # derive from fixtures/todo.spec.md
    │   └── …  (≈7 files)
    ├── social-feed/               # derive from fixtures/social-feed.spec.md
    │   └── …  (≈6 files)
    └── composites/                # 5 new dedicated fixtures per D-46
        ├── nested-col-row.wf.txt
        ├── card-in-list.wf.txt
        ├── navbar-tabbar.wf.txt
        ├── modal-over-content.wf.txt
        └── sheet.wf.txt
│
tests/                             # existing; add 3 new files
├── wireframe-catalog.test.ts      # per-kind + 5-composite coverage (WIREFRAME-03)
├── wireframe-ascii-baseline.test.ts   # regex /^[|\-+. \x20-\x7E\n]*$/ over all .wf.txt (WIREFRAME-02)
└── dogfood-gate.test.ts           # 20-file count + SHARED.md parse + ≥3 shareable (WIREFRAME-06)
```

### Pattern 1: Recursive Line-Concatenation Layout [CITED: ARCHITECTURE.md §Pattern 3]

**What:** Every emitter returns `string[]` (lines already padded to the assigned width). Parents concatenate children vertically (Column, Card, List, Modal, Sheet, NavBar body) or horizontally (Row). No constraint solver; no two-pass size-then-position; one recursive descent, accumulating lines.

**When to use:** Every 18 emitters + `variants.ts` composition layer.

**Example:**

```typescript
// Source: D-33 (compact mockup) + D-36 (container glyphs) + Phase-2 established patterns

export function renderColumn(
  node: Extract<ComponentNode, { kind: "Column" }>,
  width: number,
): string[] {
  const gapLines = gapToLines(node.gap); // sm→0, md→1, lg→2 blank lines between children
  const lines: string[] = [];
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    const childLines = renderNode(child, width);
    lines.push(...childLines);
    if (i < node.children.length - 1) {
      for (let j = 0; j < gapLines; j++) {
        lines.push(" ".repeat(width));
      }
    }
  }
  return lines;
}

export function renderCard(
  node: Extract<ComponentNode, { kind: "Card" }>,
  width: number,
): string[] {
  const inner = renderNode(node.child, width - 4); // 2 cols L pad + 2 cols R pad, minus 2 cols for `+ +`
  const paddedInner = inner.map((line) => `| ${padRight(line, width - 4)} |`);
  return [
    "+" + "-".repeat(width - 2) + "+",
    ...paddedInner,
    "+" + "-".repeat(width - 2) + "+",
  ];
}
```

### Pattern 2: Variant Block Composition [CITED: D-39, D-40, D-41, D-45]

**What:** `renderScreen(spec, screenId): string` stacks 4 variants in fixed order, each wrapped in a frame with header-in-top-border. Null variants collapse to 1-line `(N/A)` marker frame. `content` variant uniquely appends an acceptance footer (if `screen.acceptance` is non-empty).

**When to use:** Top-level composition module `variants.ts`.

**Example:**

```typescript
// Source: D-39, D-40, D-41, D-45

export function renderScreen(spec: Spec, screenId: string): string {
  const screen = spec.screens.find((s) => s.id === screenId);
  if (!screen) {
    throw new Error(`renderScreen: screen "${screenId}" not in spec.screens`);
  }
  const width = 60;
  const blocks: string[] = [];
  blocks.push(renderVariantBlock(screen, "content", screen.variants.content, width));
  blocks.push(renderVariantBlock(screen, "empty", screen.variants.empty, width));
  blocks.push(renderVariantBlock(screen, "loading", screen.variants.loading, width));
  blocks.push(renderVariantBlock(screen, "error", screen.variants.error, width));
  return blocks.join("\n\n") + "\n";
}

function renderVariantBlock(
  screen: Screen,
  kind: "content" | "empty" | "loading" | "error",
  variant: Variant | null,
  width: number,
): string {
  if (variant === null) {
    const header = buildHeader(screen.id, kind, undefined, width) + "  (N/A)";
    return truncateAndClose(header, width);
  }
  const headerWhen = kind === "content" ? undefined : extractWhen(variant);
  const header = buildHeader(screen.id, kind, headerWhen, width);
  const bodyLines = renderTree(variant.tree, width - 4);
  const padded = bodyLines.map((l) => `| ${padRight(l, width - 4)} |`);
  const block = [header, ...padded, "+" + "-".repeat(width - 2) + "+"];
  if (kind === "content" && screen.acceptance && screen.acceptance.length > 0) {
    block.push(""); // blank line separator
    block.push("acceptance:");
    for (const line of screen.acceptance) {
      block.push(...wrapBullet(line, width));
    }
  }
  return block.join("\n");
}
```

### Pattern 3: Overflow as Deterministic Truncation [CITED: D-44]

**What:** Every text-producing emitter (Text, Button label, Toggle label, TextField label, ListItem) calls `truncate(str, width)` which returns `str` unchanged if `str.length <= width`, otherwise `str.slice(0, width - 3) + "..."`. No soft-wrap; no variable row height.

**Example:**

```typescript
// Source: D-44

export function truncate(str: string, width: number): string {
  if (str.length <= width) return str;
  if (width < 3) return ".".repeat(width); // edge case — never in practice at 60 cols
  return str.slice(0, width - 3) + "...";
}
```

### Pattern 4: Exhaustive-Kind Switch [CITED: Phase 1 D-01, Phase 2 patterns]

**What:** `renderNode(node: ComponentNode, width: number): string[]` switches on `node.kind` with one case per kind in `COMPONENT_KINDS`. TypeScript's exhaustive-switch check (plus a grep gate in plan acceptance) ensures adding a kind forces a renderer update. Matches `walkComponentTree` pattern from Phase 1 cross-reference.ts.

**Example:**

```typescript
export function renderNode(node: ComponentNode, width: number): string[] {
  switch (node.kind) {
    case "Text": return renderText(node, width);
    case "Icon": return renderIcon(node, width);
    case "Divider": return renderDivider(node, width);
    case "Spacer": return renderSpacer(node, width);
    case "Image": return renderImage(node, width);
    case "Button": return renderButton(node, width);
    case "TextField": return renderTextField(node, width);
    case "Toggle": return renderToggle(node, width);
    case "SegmentedControl": return renderSegmentedControl(node, width);
    case "Column": return renderColumn(node, width);
    case "Row": return renderRow(node, width);
    case "Card": return renderCard(node, width);
    case "List": return renderList(node, width);
    case "ListItem": return renderListItem(node, width);
    case "NavBar": return renderNavBar(node, width);
    case "TabBar": return renderTabBar(node, width);
    case "Modal": return renderModal(node, width);
    case "Sheet": return renderSheet(node, width);
    default: {
      const _exhaustive: never = node; // compile error if a kind is missing
      throw new Error(`unreachable: ${(_exhaustive as { kind: string }).kind}`);
    }
  }
}
```

### Pattern 5: `[BROKEN LINK]` Inline Marker [CITED: D-Claude, Phase 1 01-06 decision]

**What:** Renderer reads `parseSpecFile` result's `diagnostics`. If a `SPEC_UNRESOLVED_ACTION` or `SPEC_JSONPTR_UNRESOLVED` or `SPEC_TESTID_COLLISION` diagnostic points at the interactable currently being rendered (match via diagnostic `path` JSON pointer), append ` !!BROKEN: action=<name>` to the interactable's line, truncating other content first.

**When to use:** Each interactable emitter (Button, Toggle, TextField, SegmentedControl, tappable ListItem, TabBar items).

**Note:** Diagnostics are per-render-call; Phase 3 signature becomes `render(spec, screenId, opts?: { diagnostics?: Diagnostic[] })` to accept them without re-running validation. For Phase 3 CLI, `parseSpecFile` already returns diagnostics; CLI passes them through.

### Anti-Patterns to Avoid

- **Reaching for `chalk` / ANSI colors:** Persisted wireframes are raw ASCII. Color belongs to Phase 5 TUI preview via `pi-tui` theme — not to `.wf.txt` files or CLI stdout. [CITED: PITFALLS §1.1, CLAUDE.md §What NOT to Use]
- **Using Unicode BMP box-drawing (`┌─┐│└┘`) in persisted output:** Mangles in GitHub/Slack/email paste targets. Phase 5 preview may use them; Phase 3 file output must not. [CITED: PITFALLS §1.1, WIREFRAME-02]
- **Soft-wrapping long labels:** Changes row count per content → snapshot instability + unpredictable layout. Truncate with `...` per D-44. [CITED: D-44]
- **Trailing whitespace on lines:** Some terminals / paste targets strip trailing whitespace, stripping visible columns. Always pad with spaces THEN append the `|` right-border glyph so stripping can't remove the border. [CITED: PITFALLS §1.3]
- **Re-parsing the spec inside `render(...)`:** Renderer is pure; it takes an already-parsed `Spec`. CLI calls `parseSpecFile` once. [CITED: WIREFRAME-05, ARCHITECTURE §Pattern 3]
- **Rendering device chrome (status bar, notch, home indicator):** D-37 explicitly bans. [CITED: PITFALLS §3.1]
- **Rendering null variants as "omitted" (skipping the slot):** D-39 requires visible 1-line `(N/A)` marker so design decisions stay visible. [CITED: D-39]
- **Having `render()` throw on cross-ref errors:** Phase 1 01-06 decision — renderer emits with `[BROKEN LINK]` markers; throws only on `screenId not in spec.screens` (CLI-caller error). [CITED: D-Claude §`[BROKEN LINK]` marker]
- **Hand-editing the auto-generated `.wf.txt` files to "improve" them:** PITFALLS §3.4 bans auto-regeneration-that-overwrites, but Phase 3 fixtures are regenerated deliberately when layout changes. The dogfood gate is the quality ratchet; any hand-tweak that "looks better" should trigger a renderer fix + re-render, not a manual edit. Snapshot tests enforce this by design. [CITED: PITFALLS §3.4]
- **Node-kind-aware behavior outside emitters:** All kind switches live in `renderNode`. `variants.ts`, `layout.ts`, `overflow.ts`, `text-style.ts` are all kind-agnostic. [CITED: Pattern 4]
- **Mutating `spec` inside `render`:** `render(spec, screenId): string` is a pure function. Never mutates input. [CITED: WIREFRAME-05]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown + YAML parsing | Custom frontmatter splitter | `parseSpecFile` from Phase 2 | Already built; returns `{spec, diagnostics, body, astHandle}`. |
| Spec validation | Cross-ref walk inside renderer | `validateSpec` from Phase 1 + `parseSpecFile` already invokes it | Already built; emits typed `Diagnostic[]`. |
| Component-tree iteration for testID/path mapping | New walker | `walkComponentTree` from `src/model/cross-reference.ts` (if needed for path mapping to diagnostics) | Already built in Phase 1. |
| Schema type narrowing | Manual casts | `Extract<ComponentNode, { kind: "Button" }>` TypeScript utility | Native TS, exhaustive-checked. |
| Test snapshot I/O | Manual file read + assertEquals | Vitest `.toMatchSnapshot()` for per-kind tests; `readFileSync` + `assertEquals` on hand-committed `.wf.txt` golden files for dogfood corpus | Per the CONTEXT.md Claude's Discretion § `Snapshot harness` decision. |
| CLI argv parsing | `yargs` / `commander` | `process.argv.slice(2)` manually (2 args, no flags in v1) | No flags in v1 per D-Claude. Avoids adding a dep just to parse two positional args. |
| Copy-paste wireframe to clipboard | `clipboardy` | Shell redirection + `pbcopy` / `xclip` | Phase 8 HANDOFF-01 owns `:yank wireframe`. Phase 3 CLI outputs to stdout. |
| ASCII box-drawing library | Building on `cli-boxes` / `boxen` | Hand-assemble `+`, `-`, `|`, space per `layout.ts` | CLAUDE.md §The Wireframe Rendering Question exhausts the library search. |
| TUI-style component lib | Ink / Blessed / pi-tui at Phase 3 | Plain string arrays | pi-tui integration is Phase 5. Phase 3 output is stdout-only; adding pi-tui now couples layers that ARCHITECTURE.md §L4 explicitly decouples. |

**Key insight:** Phase 1 + Phase 2 did the heavy lifting. Phase 3 reaches for existing primitives (`parseSpecFile`, `validateSpec`, `ComponentNode` type, `COMPONENT_KINDS` constant) and adds ~500 LOC of pure string-building logic plus fixture corpus. The layout engine bar — "~200 LOC" per CLAUDE.md — is roughly the 4 layout/overflow/text-style/variants modules summed; the 18 per-kind emitters average 15-30 LOC each.

## Common Pitfalls

### Pitfall 1: Trailing whitespace stripped by paste targets [CITED: PITFALLS §1.3]

**What goes wrong:** Render a line with content + `" " * N` padding, then `|` right border. Selecting with the mouse + copying via terminal may strip trailing whitespace; some paste targets (GitHub issue bodies, Slack in plain mode) do further normalization. Result: the `|` on the right edge migrates left, content column widths drift, wireframe looks broken to the pasting reader.

**Why it happens:** Terminal selection hygiene + destination-app normalization.

**How to avoid:** Pad content to exactly `width - 2` chars (content inner width between the two `|` borders), THEN append the `|` — the `|` itself is non-whitespace and survives stripping. Never leave trailing spaces OUTSIDE the `|`. Snapshot test with a regex `/\|$/` on every body line confirms. Fixture fenced-code-block wrapping when sharing (CLAUDE.md convention) preserves inner whitespace in Markdown-rendered surfaces.

**Warning signs:** Diff shows "trailing-whitespace" warnings on commit (`.gitattributes` + Biome will flag these); first paste into a Slack channel has staircased right borders.

### Pitfall 2: LF vs CRLF line-ending drift on Windows [CITED: SERDE-05 idiom; PITFALLS §1.3]

**What goes wrong:** File written with `"\r\n"` joiner → snapshot suite that expects LF fails on macOS CI, or vice-versa. Git auto-conversion via `core.autocrlf` makes `.wf.txt` files differ between checkouts.

**Why it happens:** Node's default is platform-native line endings if not explicit; git normalizes.

**How to avoid:** Explicit `"\n"` joiner in `variants.ts` (`blocks.join("\n\n") + "\n"`). `.gitattributes` already enforces LF on `*.md` (Phase 2 Wave-0); extend to `*.wf.txt`:

```
*.wf.txt text eol=lf
```

Snapshot tests use `readFileSync(path, "utf8")` which preserves embedded newlines as-written. Buffer.equals-style byte comparison, not string-split-by-line equality.

**Warning signs:** Windows contributor sees unexpected diffs; CI reports "expected 40 lines got 80 lines" because `split("\n")` on a CRLF file yields stray `\r` characters.

### Pitfall 3: Snapshot drift from date stamps or machine-dependent content [CITED: PITFALLS §4.3, "no derived fields"]

**What goes wrong:** Emitter accidentally includes `new Date().toISOString()` in a comment, or reads `process.env.USER`, or otherwise embeds machine state. Snapshots pass on dev machine and fail in CI.

**Why it happens:** Pure-function discipline slips.

**How to avoid:** Renderer is a pure function of `(spec, screenId)`. No `Date`, no `process`, no `fs`. Co-located emitter tests pass a synthetic `ComponentNode` and check the output is bytewise deterministic across 10 consecutive calls. Add a test:

```ts
test("renderColumn is deterministic", () => {
  const node = {...};
  const first = renderColumn(node, 60).join("\n");
  const second = renderColumn(node, 60).join("\n");
  expect(first).toBe(second);
});
```

**Warning signs:** Snapshot mysteriously "updates itself"; tests pass locally, fail in CI with "expected string to match snapshot."

### Pitfall 4: Width drift at container nesting [CITED: D-38, D-Claude §Variant frame padding]

**What goes wrong:** Outer frame is 60 cols. Content body gets 2-col left + 2-col right pad → children see 56 cols. Card nested inside gets another 2-col pad → grandchildren see 52. Nested deeper → 48, 44, 40 … At 4 levels of Card nesting, children have ~30 cols to work with; a 40-col label tries to render and the truncate-at-width-3 logic kicks in surprisingly often.

**Why it happens:** Fixed outer width + additive per-container padding compounds.

**How to avoid:** Document the width arithmetic explicitly in `layout.ts` doc comments. Test `renderCard(renderCard(renderCard(...)))` at 60-col outer and assert children see ≥20 cols (floor bar). Composite fixture "deeply-nested-card" (optional, if composites slot has room) exercises the worst-case. Any render result where a child width drops below 20 cols throws a LOW-severity internal signal (dev-time warning, not diagnostic) — but for Phase 3 v1, D-44 truncate is the correctness fallback.

**Warning signs:** A long label renders as all `...`; nested Card bodies look crushed; composite fixtures have empty inner space.

### Pitfall 5: Header-line overflow at D-40's 60-col budget [CITED: D-40]

**What goes wrong:** Header format `+-- screen: very-long-screen-id  variant: loading  when async /Entity/field-with-long-name --+` exceeds 60 cols. D-40 says "trailing `--+` collapses to `-+` and text truncates with `...`" — easy to misimplement: truncate before computing whether `--+` fits.

**Why it happens:** Two overflow dimensions (text truncation AND border char reduction) interact.

**How to avoid:** Two-stage header builder: (1) build the full `-- screen: X  variant: Y  when K P --+` content; (2) if `"+" + content + "+".length > 60`, progressively shrink: first try `-+` instead of `--+`, saving 1 char; if still too long, truncate the text portion with `...` while ensuring at least `screen:` and `variant:` remain visible. Dedicated unit tests for 3 header-overflow scenarios (edge case at 60, 61, 120).

**Warning signs:** Header breaks to 2 lines (never allowed); `...` appears in the middle of `screen:` key; closing `+` missing entirely.

### Pitfall 6: Interactable `[BROKEN LINK]` marker truncation conflict [CITED: D-Claude]

**What goes wrong:** Button with long label + `!!BROKEN: action=save_my_progress_to_cloud` on same line exceeds the assigned width. Implementation truncates the whole composite string at width-3, losing the `!!BROKEN` signal — defeating the debugging purpose.

**Why it happens:** Single `truncate(str, width)` call applied to concatenated string.

**How to avoid:** Two-phase composition: (1) compute `marker = "!!BROKEN: action=" + actionName`, (2) compute `maxLabelWidth = width - marker.length - 1` (space separator), (3) truncate label to `maxLabelWidth`, (4) concatenate. If `marker.length >= width`, truncate marker instead (weird edge case; flag with test). Documented as "the `[BROKEN LINK]` marker is load-bearing; other content gives way first."

**Warning signs:** Broken-link fixture shows `[[ Save m... ]]` with no marker visible; debugging is harder than before the feature existed.

### Pitfall 7: Empty `string[]` from leaf emitters mis-joining [CITED: general pitfall]

**What goes wrong:** `renderDivider` returns `["-----"]` (1 line). `renderSpacer` with `size: "sm"` returns `[""]` (1 blank line). A parent Column joins them and gets `"-----\n"` — but Spacer returning `[]` (empty array) yields just `"-----"`. Inconsistent.

**Why it happens:** Empty-array-vs-single-blank-line-array ambiguity.

**How to avoid:** Contract: every emitter returns `string[]` with `length >= 1`. A "size: sm" Spacer returns exactly one blank line `[" ".repeat(width)]`. Divider returns exactly one dash line `["-".repeat(width)]`. Column children are concatenated; the Column emitter never pushes an extra empty line between consecutive children except when gap > 0. Unit-test per emitter that `result.length >= 1` AND `result.every(l => l.length === width)`.

**Warning signs:** Fixture diffs show Spacer / Divider rendering as inconsistent heights; row counts off by ±1.

### Pitfall 8: TabBar / NavBar interaction with variant body padding [CITED: D-37, D-Claude]

**What goes wrong:** NavBar renders at `width - 4` (after variant frame's 2-col content pad), producing a title line + `---` rule. TabBar renders similarly. Their `---` rule uses `"-".repeat(width - 4)` = 56 dashes, but the outer variant frame already has `| ` + 56 content + ` |` = 60. So the rule renders as `| ---…--- |` — fine. Except when NavBar's trailing interactable pushes the title, there's no guarantee the title+trailing combined stays ≤ `width - 4`. Overflow hits the truncate rule.

**Why it happens:** NavBar layout has three segments (leading `< `, title, trailing widget) each of variable width.

**How to avoid:** NavBar layout algorithm: (a) compute `leading = screen.back_behavior ? "< " : ""`; (b) render `trailingStr = renderNode(node.trailing, ??)` — here use a budget of `max(10, floor((width - 4) / 3))` cols; (c) title gets `width - 4 - leading.length - trailingStr.length - 1` cols; (d) truncate title. Single-line output. Unit-test at multiple widths (60, 40, 30).

**Warning signs:** NavBar title disappears into `...`; NavBar wraps to 2 lines; trailing button pushed off the right edge.

### Pitfall 9: List rendering with `itemTemplate` — determinism [CITED: D-36]

**What goes wrong:** List component binds to an entity collection (`bindsTo: /Habit/title`) but at render time we don't have real data — we render the template N times? Once? With placeholder text?

**Why it happens:** Spec is a schema; wireframes don't have live data.

**How to avoid:** Render List as **exactly one item** rendered from `itemTemplate` with its content nodes intact (Text labels render their spec text verbatim), wrapped in a `+--+` box per D-36. Add an ellipsis marker row below: `   ...  (list bound to /Habit/title)` OR just the single-item box with no "more like this" affordance — the List shape itself is the signal. Recommendation: single-item rendering + 1 subtle indicator line. Composite fixture `card-in-list` demonstrates the canonical look.

**Warning signs:** Wireframe shows 3 identical item boxes with "Task Title" three times — looks cluttered + misleading.

### Pitfall 10: Acceptance-prose wrapping under content variant [CITED: D-45]

**What goes wrong:** A long acceptance line overflows the 60-col width. D-45 says "word-wrapped to width"; implementations that `split(" ")` then greedy-line-build produce lines of varying width — breaking snapshot stability if the word boundary shifts.

**Why it happens:** Word-wrap is deterministic but the `- ` indent + continuation indent convention is easy to get wrong.

**How to avoid:** Word-wrap algorithm: (1) prefix `- ` (2 cols), (2) greedy build: if `currentLine.length + " " + nextWord.length <= width`, append; else emit current, start new with continuation indent `  ` (2 cols, no `- `). Dedicated unit test with 3 wrap scenarios. Keep an ASCII-only charset guarantee (no Unicode space characters in input; input labels are printable ASCII per Phase 1 D-03 so this is already safe).

**Warning signs:** Acceptance bullet indentation inconsistent; snapshot diff shows bullet-level wrapping change from unrelated content edit.

## Runtime State Inventory

Not applicable. Phase 3 is a pure-code additive phase — it adds files, imports existing modules, and does not rename anything. No migration of stored data, service config, OS state, secrets, or build artefacts. This section explicitly answers "nothing found in category" for the 5 categories:

- **Stored data:** None — no database, no cache, no user-id keyed records. Fixtures are just files in git.
- **Live service config:** None — no external service consumes the renderer at Phase 3.
- **OS-registered state:** None — no tasks, no scheduled jobs, no installed binaries.
- **Secrets / env vars:** None — no env lookups, no secrets.
- **Build artefacts:** None — no compiled output at Phase 3 (jiti / tsx handles `.ts` directly; `tsup` is deferred to Phase 9).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All tests + CLI + type-check | ✓ | ≥20 (project `engines.node`) | — |
| `npm` / `npx` | Running CLI + tests | ✓ | `npx --version` → 11.7.0 | — |
| `tsx` (via npx) | CLI script `scripts/render-wireframe.ts` | ✓ | 4.21.0 (npx-installed on demand) | Alternative: compile via `tsup` — deferred to Phase 9. For v1, `npx tsx` works offline after first invocation. |
| `vitest` | Test harness | ✓ | 4.1.4 (in `package.json`) | — |
| `@biomejs/biome` | Lint + format | ✓ | 2.4.12 | — |
| `typescript` | `tsc --noEmit` | ✓ | 5.9.3 (^5.6 pinned) | — |
| `yaml` (indirect) | `parseSpecFile` | ✓ | 2.8.3 | — |
| `zod` (indirect) | `validateSpec` + type narrowing | ✓ | 4.3.6 | — |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `vitest@^4.1.4` (already configured in `vitest.config.ts`) |
| Config file | `vitest.config.ts` (existing — coverage thresholds at stmts 80 / fn 80 / br 75; Phase 3 honors) |
| Quick run command | `npx vitest run src/emit/wireframe` |
| Full suite command | `npx vitest run && npx tsc --noEmit && npx biome check .` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WIREFRAME-01 | 40-line, 60-col ASCII with explicit `|` right borders | integration | `npx vitest run tests/wireframe-catalog.test.ts` | ❌ Wave 2 |
| WIREFRAME-01 | Copy-paste survives — every line ends in `|` or is block boundary `+` line | unit | `npx vitest run tests/wireframe-ascii-baseline.test.ts -t "right border"` | ❌ Wave 2 |
| WIREFRAME-02 | Only `|-+. ` + printable ASCII `\x20-\x7E` characters | regex integration | `npx vitest run tests/wireframe-ascii-baseline.test.ts` | ❌ Wave 2 |
| WIREFRAME-03 | Every 18 kinds has a snapshot + 5 composites have snapshots | snapshot | `npx vitest run tests/wireframe-catalog.test.ts` + `npx vitest run src/emit/wireframe/components` | ❌ Wave 1 |
| WIREFRAME-04 | Every screen renders 4 variant blocks; null variants render as N/A markers, not omitted | snapshot | `npx vitest run src/emit/wireframe/variants.test.ts` | ❌ Wave 2 |
| WIREFRAME-05 | `render(spec, screenId)` is pure; CLI `scripts/render-wireframe.ts` exits 0 against canonical fixture | unit + integration | `npx vitest run src/emit/wireframe/index.test.ts` + `npx tsx scripts/render-wireframe.ts fixtures/habit-tracker.spec.md home` | ❌ Wave 2 |
| WIREFRAME-06 | Exactly 20 `.wf.txt` files under `fixtures/wireframes/` + SHARED.md ≥3 shareable entries | integration | `npx vitest run tests/dogfood-gate.test.ts` | ❌ Wave 3 |

### Sampling Rate

- **Per task commit (RED→GREEN):** `npx vitest run {path-to-new-or-changed-test}` — fast feedback on the single emitter or composite being added.
- **Per wave merge:** `npx vitest run && npx tsc --noEmit && npx biome check .` — full suite green.
- **Phase gate (before `/gsd-verify-work`):** Full suite green + `tests/dogfood-gate.test.ts` passes + `fixtures/wireframes/SHARED.md` contains ≥3 verdicts marked `shareable` + author has pasted ≥3 wireframes into a real PR/Slack/issue.

### Wave 0 Gaps

Wave 0 for Phase 3 is minimal — test infrastructure already exists (Phases 1/2 ship `vitest` + co-located test convention). Phase 3 adds:

- [ ] `tests/wireframe-catalog.test.ts` — covers WIREFRAME-03 (per-kind + 5-composite snapshot coverage)
- [ ] `tests/wireframe-ascii-baseline.test.ts` — covers WIREFRAME-02 (character-class regex assertion on all `.wf.txt`)
- [ ] `tests/dogfood-gate.test.ts` — covers WIREFRAME-06 (20-file count + SHARED.md parse + ≥3 shareable)
- [ ] `src/emit/wireframe/` directory + `index.ts` barrel + co-located `.test.ts` files per emitter

No framework install needed. No shared fixture module needed beyond `parseSpecFile` (Phase 2 provides).

## Component Emitter Details

Specific notes for the kinds where CONTEXT.md Claude's Discretion left room for implementation judgment:

### Image (D-Claude)

- Default 3-line box at 10 cols wide:

  ```
  +--IMG---+
  |  alt   |
  +--------+
  ```

- Inside a Row/Column, width constraint from parent may force shrinkage; minimum 8 cols. Below 8 cols, render as `[img:alt]` inline single-line fallback.
- Missing `alt` (schema violation) → render `(no alt)` as center text. The schema requires `alt` (src/model/component.ts:158 `alt: z.string()`) so missing-alt in a validated spec is a Phase-1 bug; the fallback is defensive.

### Icon (D-Claude)

- Inline `[icon:name]` — always 1 line, flows with surrounding text.
- In a Row with a Button and a Text, emits `[icon:heart] Like  [icon:share] Share` etc. — pure string-concatenation responsibility of the Row emitter.

### Spacer (D-36)

- `size: "sm"` → 1 blank line; `"md"` → 2; `"lg"` → 3. Default is `"md"` if omitted.
- Each blank line is exactly `" ".repeat(width)` (preserves the `|` border via the variant frame's padding wrap).

### SegmentedControl (D-34)

- `< Day | Week | Month >` — each `options[]` entry becomes a segment.
- `bindsTo` field identifies the currently-selected segment value. If `bindsTo` resolves to a value that matches one of the options, wrap that segment in asterisks: `< Day | *Week* | Month >`. If no selection info, no asterisks — render all segments bare.
- D-34 flags asterisks-colliding-with-body-text as Claude's Discretion. Recommendation: use asterisks; if a fixture surfaces collision, switch to `>Week<` or similar. Track as Open Question.

### ListItem (D-34, D-36)

- Tappable ListItem (has sigil triple) renders its child tree inside a `+--+` item box at the List level (not at its own level — avoids double-boxing). The item box is provided by `renderList`; ListItem emitter just returns the child content.
- Container-only ListItem (no sigil) renders identically — the tappable-vs-container distinction is invisible in the persisted wireframe per D-42 (action + testID hidden). Phase 5 TUI preview may highlight differently.

## Composite Fixture Proposals

WIREFRAME-03 requires ≥5 composite fixtures. Each composite targets a specific nesting / container combination that would be underspecified by individual per-kind snapshots. Proposals below are sketches for the planner to flesh out as fixture authoring tasks:

### Composite 1: `nested-col-row.wf.txt`

**Shape:** Column > Row > [Text, Button] | Row > [Icon, Text]. Tests that horizontal layout inside a vertical stack joins correctly; that Row's gap produces horizontal padding; that truncation kicks in when a Row's total width exceeds budget.

### Composite 2: `card-in-list.wf.txt`

**Shape:** List bound to `/Habit/title`, itemTemplate is ListItem with a Card child containing a Row(Text heading-2, Toggle). Tests D-36's "Card in List" double-box pattern; proves List emitter wraps one box around ListItem + Card emits inner box → double `+--+` nesting is intentional here (not accidental).

### Composite 3: `navbar-tabbar.wf.txt`

**Shape:** Column > [NavBar "Home" with trailing Button "+"], List, Column > [..content..], TabBar. Tests D-37's NavBar `---` rule + TabBar `---` rule pair; TabBar always bottom-anchored regardless of Column children length; leading `< ` on NavBar omitted for root screen.

### Composite 4: `modal-over-content.wf.txt`

**Shape:** A spec screen with `kind: overlay`, `content.tree` starts with a Modal wrapping a Column of Text heading-1 + Divider + Spacer + Button. Tests D-36's labeled top border `+-- Modal -----+`; Modal centering within the 60-col frame (body content pad may be different for Modal vs raw content — planner clarifies).

### Composite 5: `sheet.wf.txt`

**Shape:** An overlay screen with `content.tree` = Sheet wrapping Column > [NavBar, TextField, Button]. Tests Sheet's bottom-anchored position (last content block before frame's bottom border); labeled top border `+-- Sheet -----+`; inner body layout preserves row order.

These composites intentionally use synthetic stripped-down specs (minimal screen + minimal nav + minimal data for validateSpec to pass). Planner may choose to author them as standalone `.spec.md` files under `fixtures/composites/` or as programmatic spec literals inside the catalog test.

## Code Examples

### Render a single Button (primary variant)

```typescript
// Source: D-34 glyph alphabet + D-42 sigil metadata hidden

export function renderButton(
  node: Extract<ComponentNode, { kind: "Button" }>,
  width: number,
): string[] {
  const variant = node.variant ?? "secondary";
  const label = node.label;
  let glyph: string;
  switch (variant) {
    case "primary":
      glyph = `[[ ${truncate(label, width - 6)} ]]`;
      break;
    case "secondary":
      glyph = `[ ${truncate(label, width - 4)} ]`;
      break;
    case "text":
      glyph = truncate(label, width);
      break;
  }
  return [padRight(glyph, width)];
}
```

### Render a NavBar line [CITED: D-37]

```typescript
export function renderNavBar(
  node: Extract<ComponentNode, { kind: "NavBar" }>,
  width: number,
  screenIsRoot: boolean,
): string[] {
  const leading = screenIsRoot ? "" : "< ";
  const trailingLines = node.trailing
    ? renderNode(node.trailing, Math.max(10, Math.floor((width - 4) / 3)))
    : [""];
  const trailingStr = trailingLines[0].trim();
  const titleWidth = width - leading.length - trailingStr.length - (trailingStr ? 1 : 0);
  const title = truncate(node.title, Math.max(1, titleWidth));
  const titleLine = `${leading}${title}${trailingStr ? " " + trailingStr : ""}`;
  return [padRight(titleLine, width), "-".repeat(width)];
}
```

### Build a variant block header [CITED: D-40, D-41]

```typescript
export function buildVariantHeader(
  screenId: string,
  kind: VariantKind,
  whenExpr: string | undefined,
  width: number,
): string {
  const whenPart = whenExpr ? `  when ${whenExpr}` : "";
  const content = ` screen: ${screenId}  variant: ${kind}${whenPart} `;
  // Try full double-dash format first: `+-- {content} --+`
  const full = `+--${content}--+`;
  if (full.length <= width) {
    // pad with `-` between `content` and trailing `--+`
    const padLen = width - full.length;
    return `+--${content}${"-".repeat(padLen)}--+`;
  }
  // Overflow: try single-dash closing `+-- ... -+`
  const single = `+--${content}-+`;
  if (single.length <= width) {
    const padLen = width - single.length;
    return `+--${content}${"-".repeat(padLen)}-+`;
  }
  // Overflow even with single-dash: truncate content
  const avail = width - "+--  --+".length;
  const truncated = truncate(content.trim(), avail);
  return `+-- ${truncated} --+`;
}
```

### CLI entry [CITED: D-Claude §CLI form]

```typescript
// scripts/render-wireframe.ts

import { parseSpecFile } from "../src/serialize/index.ts";
import { render } from "../src/emit/wireframe/index.ts";

async function main() {
  const [specPath, screenId] = process.argv.slice(2);
  if (!specPath || !screenId) {
    process.stderr.write("usage: render-wireframe <spec-path> <screen-id>\n");
    process.exit(2);
  }
  const result = await parseSpecFile(specPath);
  if (!result.spec) {
    process.stderr.write(
      `parse failed:\n${result.diagnostics.map((d) => `  ${d.code} @ ${d.path}: ${d.message}`).join("\n")}\n`,
    );
    process.exit(1);
  }
  const out = render(result.spec, screenId, { diagnostics: result.diagnostics });
  process.stdout.write(out);
}

main().catch((err) => {
  process.stderr.write(`error: ${err.message}\n`);
  process.exit(1);
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Unicode box-drawing in persisted ASCII | ASCII-baseline (`|-+. `) in persisted output; Unicode only in Phase 5 preview | 2020s copy-paste reality — GitHub/Slack/Discord mobile clients mangle box-drawing | Drives D-38 60-col width + D-44 truncate + ASCII-only char class. |
| Adaptive-width layouts (re-render to terminal width) | Fixed-width authored artefact | Dogfood-gate reality — shareable wireframe must render same everywhere | D-38 bars CLI `--width` flag in v1. |
| 2×2 variant grid (all 4 states side-by-side) | Vertical stack content→empty→loading→error | Paste-survival — narrow mobile PR viewers can't hold 2-wide grid | D-39 fixed order. |
| Text-based wireframe libraries (`boxen`, `cli-boxes`, `ink-box`) | Hand-rolled ~200 LOC `layout.ts` | Exhaustive library search turned up zero composing at mobile-UI fidelity inside pi-tui | CLAUDE.md §The Wireframe Rendering Question. |

**Deprecated/outdated:**
- `blessed` / `neo-blessed` — abandoned; owns screen.
- `ink` + `ink-box` — requires React/Yoga render loop, breaks inside pi.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | SegmentedControl selection marker uses asterisks `*Week*`; collision risk with body-text asterisks deferred. | Pattern / §Component Emitter Details | Snapshot-visible fixture shows ambiguous rendering; planner swaps to `>Week<` or similar. Low risk — composite fixture exposes early. |
| A2 | List emitter renders exactly ONE template item (not N), with an ellipsis indicator row below. | §Pitfall 9 + §Composite 2 | A user might expect multi-item List rendering; dogfood feedback during SHARED.md collection catches this before Phase 4 depends on the shape. |
| A3 | NavBar trailing-widget width budget is `max(10, floor((width-4)/3))` cols. Arithmetic is not user-locked. | Code Examples §renderNavBar | Wide trailing widgets (long-label Button) truncate aggressively. If a fixture shows cramped trailing, planner widens the allocation. |
| A4 | Image default width is 10 cols unless parent constrains; fallback below 8 cols is inline `[img:alt]`. | §Component Emitter Details | Purely a fidelity decision; easy to tune per fixture feedback. |
| A5 | `render(spec, screenId, opts?)` accepts an optional `{ diagnostics }` so CLI can pipe through pre-computed diagnostics; calling without opts is the Phase-4 store shape. | Pattern 5 | Planner may prefer signature `render(spec, screenId, diagnostics?)` positional. Pure convention. |
| A6 | Per-component test `.toMatchSnapshot()` stores files under `src/emit/wireframe/components/__snapshots__/` (vitest default). | Validation Architecture | Default location per vitest docs; no decision needed. |
| A7 | Trailing newline on `.wf.txt` files (POSIX convention). | Pitfall 2 + D-Claude text-output encoding | Minor diff-noise if absent; enforced via `.gitattributes` + Biome (if configured). |
| A8 | 20-file count precisely hits via 7+7+6+5 = 25 → but D-46 expects ≤7/≤7/≤6 per canonicals = 20 total allowing composites room. Count arithmetic is a **planner decision**, not a research decision. | §Recommended Project Structure fixtures tree | Planner authors the exact breakdown to land on 20; tests count, not arithmetic. |
| A9 | `[BROKEN LINK]` marker format `!!BROKEN: action=<name>` per D-Claude; richer variants for testID collision / JSONptr unresolved are deferred to v2. | Pattern 5 + §Pitfall 6 | D-Claude locks single marker style; no divergence from research. |
| A10 | Per-kind emitters return `string[]` where every line has `line.length === width`. Contract ensures `join("\n")` produces rectangular output. | §Pitfall 7 | Violation produces misaligned right borders; unit test per emitter catches. |

## Open Questions (RESOLVED)

1. **Composite fixture programmatic vs `.spec.md` — author as full fixtures or synthetic spec literals in the catalog test?**
   - What we know: D-47 puts `.wf.txt` files under `fixtures/wireframes/composites/`; D-46 calls for 5 dedicated composites.
   - What's unclear: Do the SOURCE spec files (`.spec.md`) for composites live under `fixtures/composites/` as full round-trippable specs, or do they live as test-local spec literals inside `tests/wireframe-catalog.test.ts`?
   - Recommendation: Full `.spec.md` under `fixtures/composites/`. Keeps Phase 3's "render takes Spec" contract clean and enables re-use by Phase 4+ editor tests. Planner makes final call.
   - **RESOLVED:** Plan 03-09 Task 2 authors 5 on-disk `.spec.md` files under `fixtures/composites/` (nested-col-row, card-in-list, navbar-tabbar, modal-over-content, sheet). Composite wireframes are generated via the standard CLI path against these files — no test-local spec literals.

2. **Does `render()` take optional `{ diagnostics }` to enable `[BROKEN LINK]` markers, or does the caller mutate the spec to encode broken-ness?**
   - What we know: D-Claude specifies inline `!!BROKEN: action=<name>` marker; marker triggered by specific diagnostic codes.
   - What's unclear: Pass signature. Options:
     - (a) `render(spec, screenId, { diagnostics: Diagnostic[] })` — explicit pass-through
     - (b) `render(spec, screenId, diagnostics?: Diagnostic[])` — positional third arg
     - (c) Caller walks diagnostics and annotates spec pre-render — adds spec mutation.
   - Recommendation: (a) — keeps `render` pure, options object accepts future flags.
   - **RESOLVED:** Plan 03-08 implements `render(spec, screenId, opts?: { diagnostics?: Diagnostic[] })` — explicit options object; re-exported through the Plan 03-01 `src/emit/wireframe/index.ts` barrel. `renderSingleVariant` (Plan 03-09 Task 1) follows the same options-object signature.

3. **How does the CLI exit code handle `spec === null` (parse failed hard) vs `diagnostics.severity === 'error'` but spec extractable?**
   - What we know: `parseSpecFile` returns `{ spec: null, diagnostics }` when Stage A fails; `{ spec: Spec, diagnostics: [error, ...] }` when Stage A passes but Stage B flags cross-ref errors.
   - What's unclear: Should the CLI render-with-[BROKEN LINK]-markers even when Stage B has errors? Phase 1's 01-06 decision says yes for the preview path.
   - Recommendation: CLI renders even on Stage B errors, emits `[BROKEN LINK]` markers to stdout, writes diagnostic summary to stderr, exits 0 (rendering succeeded). Exits 1 only on `spec === null` or missing `screenId`.
   - **RESOLVED:** Plan 03-01 `scripts/render-wireframe.ts` renders with `[BROKEN LINK]` markers, writes the diagnostic summary to stderr, and exits 0 on Stage-B errors. Exits 1 only when `parseSpecFile` returns `spec: null`; exits 2 on missing/invalid CLI args. Plan 03-09 Task 1 extends this with the 3rd-positional-arg single-variant form and the same exit-code contract.

4. **Snapshot format: inline in `.test.ts` via `toMatchInlineSnapshot()` vs external `__snapshots__/*.snap` file?**
   - What we know: Vitest supports both; Phase 2 uses external (`tests/__snapshots__/malformed.test.ts.snap`).
   - What's unclear: Per-kind snapshots are small (~5-10 lines each); inline could be more reviewable.
   - Recommendation: External for consistency with Phase 2. Planner may revisit.
   - **RESOLVED:** Plans 03-04/05/06/07 per-kind emitter tests use external `__snapshots__/*.snap` files (vitest default), matching the Phase 2 convention. `.wf.txt` corpus files under `fixtures/wireframes/` are byte-exact goldens, not vitest snapshots — they're covered by file-count + ASCII-baseline assertions rather than `toMatchSnapshot`.

5. **Does the dogfood-gate test parse SHARED.md as Markdown, or as YAML frontmatter + a structured table?**
   - What we know: D-48 specifies entries with `screen:{variant}` identifier, paste-target URL, date, author verdict.
   - What's unclear: Format — a Markdown table? YAML list? Hand-written free-form prose?
   - Recommendation: YAML frontmatter with a `shared:` list + Markdown body for notes/context. Parse via existing `gray-matter + eemeli/yaml` stack. Structure:

     ```yaml
     ---
     schema: mobile-tui/shared/1
     shared:
       - screen: home-content
         target: https://github.com/org/repo/pull/123
         date: 2026-04-22
         verdict: shareable
         notes: "Reviewer called it 'surprisingly legible'"
       - ...
     ---
     ```

   Dogfood-gate test reads via `readFile` + `matter()` + counts entries with `verdict === "shareable"`. Planner can simplify to a plain Markdown table if preferred.
   - **RESOLVED:** Plan 03-09 Task 5 ships SHARED.md with YAML frontmatter (`schema: mobile-tui/shared/1`, `shared: []`) + Markdown body. Plan 03-09 Task 4 parses via `gray-matter` + `eemeli/yaml` (the existing Phase-2 stack, including the prototype-pollution defense) and counts `verdict === "shareable"` entries. No Markdown-table fallback.

## Wave Decomposition (Suggested for Planner)

Phase 3 naturally splits into 4 waves. Planner adjusts per granularity + parallelization config (`.planning/config.json` shows `parallelization: true`, `granularity: fine`).

### Wave 0 — Scaffolding (1 plan)

- Create `src/emit/wireframe/` directory + `index.ts` barrel (exports stubs).
- Write failing `tests/wireframe-ascii-baseline.test.ts` with empty fixtures dir (RED passes because regex on 0 files trivially holds).
- Confirm `npx vitest run`, `npx tsc --noEmit`, `npx biome check .` still green (regression on Phase 1 + 2).
- Purpose: establish layer boundary, barrel-export contract.

### Wave 1 — Layout Primitives + Text-Style + Overflow (2-3 plans in parallel)

- Plan 03-01: `layout.ts` (frame composer, border draw, `buildVariantHeader`, padRight/padLeft, join primitives) + co-located test.
- Plan 03-02: `text-style.ts` (heading-1 UPPERCASE, heading-2 Title-Case, body plain, caption parens) + `overflow.ts` (truncateWithEllipsis) + co-located tests.
- Plan 03-03 (optional parallel): "walker" setup — `renderNode(node, width)` exhaustive switch skeleton with all 18 cases throwing `not implemented`.

### Wave 2 — Per-Kind Emitters (3-5 plans in parallel, grouped by complexity)

- Plan 03-04: Leaf kinds — Text, Icon, Divider, Spacer, Image (5 emitters, simplest).
- Plan 03-05: Interactables — Button, Toggle, TextField, SegmentedControl (4 emitters with glyph logic per D-34).
- Plan 03-06: Containers — Column, Row, Card (3 emitters, recursive).
- Plan 03-07: Lists + Nav — List, ListItem, NavBar, TabBar (4 emitters).
- Plan 03-08: Overlays — Modal, Sheet (2 emitters with labeled top border).
- Each plan ships per-kind snapshot tests + `.toMatchSnapshot()` coverage.

### Wave 3 — Variant Composition + CLI + Fixture Corpus + Dogfood Infrastructure (3-4 plans)

- Plan 03-09: `variants.ts` (4-variant stacking + header-in-border + null N/A marker + acceptance footer) + `src/emit/wireframe/variants.test.ts`.
- Plan 03-10: `render(spec, screenId)` top-level + `scripts/render-wireframe.ts` CLI + `tests/wireframe-catalog.test.ts` (18 kinds + 5 composites).
- Plan 03-11: Fixture authoring — generate 20 `.wf.txt` files under `fixtures/wireframes/{fixture}/` + `fixtures/wireframes/README.md` index + composite source `.spec.md` files under `fixtures/composites/`.
- Plan 03-12: Dogfood gate test + SHARED.md template — `tests/dogfood-gate.test.ts` asserts file count + SHARED.md parse + ≥3 shareable entries. Ship `SHARED.md` as an empty-at-first template (author fills in during dogfood).

### Wave 4 — Dogfood Evidence Collection (non-plan work — human gate)

- **Not a code plan.** Author runs `render-wireframe` against ≥3 screens, pastes into 3 real PR / Slack / issue targets, records evidence in `SHARED.md` with `verdict: shareable`.
- Completion gates Phase 4's first plan per D-49.
- This is the "would a dev paste this in a PR" bar; Phase 3 closes when SHARED.md has ≥3 shareable entries AND `tests/dogfood-gate.test.ts` passes.

## Sources

### Primary (HIGH confidence)

- `.planning/phases/03-wireframe-renderer-dogfood-gate/03-CONTEXT.md` — D-33..D-49 locked user decisions, Claude's Discretion notes, deferred items. [VERIFIED: file contents verbatim]
- `.planning/REQUIREMENTS.md` §WIREFRAME-01..06 — requirement text. [VERIFIED: file contents verbatim]
- `.planning/ROADMAP.md` §Phase 3 — goal, 5 success criteria, dogfood-gate description. [VERIFIED: file contents verbatim]
- `.planning/STATE.md` — current position, accumulated Phase 1+2 decisions. [VERIFIED]
- `.planning/phases/01-spec-model-invariants/01-CONTEXT.md` — D-01..D-17, sigil grammar, 18-kind catalog, variant shape. [VERIFIED]
- `.planning/phases/02-serialization-round-trip/02-CONTEXT.md` — D-18..D-32, `parseSpecFile` contract. [VERIFIED]
- `src/model/component.ts` — authoritative 18-kind `COMPONENT_KINDS`, `ComponentNode` TS union, `InteractableBase`. [VERIFIED]
- `src/model/screen.ts` — `Screen` shape (`kind: "regular" | "overlay"`, optional `back_behavior`, variants wired to `ComponentNodeSchema`, `acceptance: string[]?`). [VERIFIED]
- `src/model/variant.ts` — variant factory + `ScreenVariants` type (content non-null; empty/loading/error nullable). [VERIFIED]
- `src/serialize/parse.ts` — `parseSpecFile` 10-step pipeline, return shape `{spec, astHandle, diagnostics, body}`. [VERIFIED]
- `src/serialize/index.ts` — barrel exports `parseSpecFile`, `writeSpecFile`, types. [VERIFIED]
- `fixtures/habit-tracker.spec.md`, `fixtures/todo.spec.md`, `fixtures/social-feed.spec.md` — canonical inputs Phase 3 renders. [VERIFIED: read and confirmed triple-form with 18-kind coverage]
- `CLAUDE.md` §The Wireframe Rendering Question — library-search negative finding; ~200 LOC custom-renderer recommendation; ASCII `|-+.` baseline reserved for persisted file. [VERIFIED]
- `.planning/research/ARCHITECTURE.md` §L4 Emit layer, §Pattern 3 Pure Emitters — `renderWireframe` signature, dependency rule. [VERIFIED]
- `.planning/research/PITFALLS.md` §1.1 Unicode breakage, §1.3 copy-paste mangling, §3.1 no device chrome, §3.4 no auto-regeneration. [VERIFIED]
- `.planning/research/SUMMARY.md` §Phase 3 — dogfood gate rationale, catalog-coverage note. [VERIFIED]
- `package.json`, `vitest.config.ts`, `.planning/config.json` — current tooling + workflow flags. [VERIFIED]
- `npm view tsx version` → 4.21.0 (2026-04-18). [VERIFIED via Bash]
- `npm view clipboardy version` → 5.3.1 (2026-04-18). [VERIFIED via Bash]

### Secondary (MEDIUM confidence)

- Unicode Box Drawing block reference (U+2500–U+257F) — documented but unused in Phase 3 persisted output; reserved for Phase 5 TUI preview. [CITED: Unicode standard]
- Markdown fenced code block behavior on GitHub PR descriptions / Slack / Discord — empirical evidence for 60-col width survival. [CITED: CLAUDE.md + PITFALLS §1.3]

### Tertiary (LOW confidence — FLAG FOR VALIDATION)

- Specific NavBar trailing-widget width budget formula `max(10, floor((width-4)/3))` — heuristic; not derived from authoritative source. Flag A3 in Assumptions Log.
- Image default width of 10 cols — arbitrary; tune against real composite fixture output. Flag A4 in Assumptions Log.
- SegmentedControl asterisks for selection — from D-34 Claude's Discretion, not a hard decision. Flag A1 in Assumptions Log.

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — zero new dependencies; existing `yaml`, `gray-matter`, `zod`, `vitest`, `biome`, `typescript` all verified present at pinned versions via package.json and Phase 1/2 regression gate.
- Architecture: **HIGH** — recursive line-concat pattern directly matches ARCHITECTURE.md §Pattern 3; 18-kind exhaustive switch matches Phase 1 `walkComponentTree` precedent; variant stacking matches Phase 1 D-06/D-07 + CONTEXT.md D-39.
- Pitfalls: **HIGH** — aggregated from PITFALLS.md §1, §3, §4 (all relevant terminal + wireframe + round-trip sections), plus novel Phase-3-specific pitfalls (header overflow, nested-width drift, BROKEN LINK truncation conflict) derived from close reading of CONTEXT.md D-40 and D-Claude `[BROKEN LINK]` marker.
- Fixture composition: **MEDIUM** — D-46 specifies the 3 canonicals + 5 composites shape; exact per-canonical screen-variant count to land on 20 is a planner arithmetic decision. Assumption A8 flags this.
- CLI + test harness: **HIGH** — standard Node/tsx pattern; mirrors Phase 2 CLI approach conventions.
- Composite fixture shapes: **MEDIUM** — 5 proposed fixtures target specific nesting behaviors; exact content is planner decision.

**Research date:** 2026-04-18
**Valid until:** 2026-05-18 (30 days — stable stack, stable CONTEXT.md decisions; re-verify if `parseSpecFile` contract changes or if new kinds join `COMPONENT_KINDS`)
