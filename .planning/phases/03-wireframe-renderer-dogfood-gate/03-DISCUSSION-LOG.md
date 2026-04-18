# Phase 3: Wireframe Renderer & Dogfood Gate — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-18
**Phase:** 03-wireframe-renderer-dogfood-gate
**Areas discussed:** Visual vocabulary, Page frame + variant block layout, Sigil & text-style presentation, Dogfood gate composition

---

## Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Visual vocabulary (component glyphs) | Glyph alphabet for all 18 kinds — Button, TextField, Toggle, Card, NavBar, TabBar, Image, Icon, etc. THE core 'shareable-good' determinant. | ✓ |
| Page frame + variant block layout | Device-chrome (bare ~60-col vs. simulated phone) + how 4 variants stack per page: block headers, `when:` trigger placement, null-variant handling. | ✓ |
| Sigil & text-style presentation | Show full sigil vs label only; how heading-1/2, body, caption render in ASCII. | ✓ |
| Dogfood gate — 20-fixture composition | Source strategy for 20 reference wireframes; who judges 'shareable'; how 3-PR-paste evidence is recorded. | ✓ |

---

## Visual Vocabulary

### Q1: Overall rendering style

| Option | Description | Selected |
|--------|-------------|----------|
| Compact mockup | Single ~60-col outer frame. Cards nested as boxes; interactables in brackets/parens. Reads like a screenshot. | ✓ (Recommended) |
| Labeled tree | Indented text tree, each node prefixed by its component kind. | |
| Explicit boxes everywhere | Every component kind wrapped in a `+-kind-+` box. | |
| Hybrid (labels on containers only) | Compact layout, containers carry kind label in top border. | |

**User's choice:** Compact mockup (Recommended)
**Notes:** Screenshot-like compact frame with Card nesting. Minor preview inconsistency — the Compact preview showed `( )` toggles, but the interactable-glyph answer locks `[ ] / [x]`; the interactable answer is authoritative.

### Q2: Interactable glyphs

| Option | Description | Selected |
|--------|-------------|----------|
| Brackets + checkbox toggles | `[[ Save ]]` primary / `[ Cancel ]` secondary / `Cancel` text; `[ ]`/`[x]` toggles; `Label: ________` TextField. | ✓ (Recommended) |
| Parens + round toggles | `( Save )` button; `( ) / (x)` toggles; `[____ Email ____]` TextField. | |
| Angle brackets + slider toggles | `<< Save >>` button; `[OFF]/[ON]` toggles; `Email \|________\|` TextField. | |
| Bordered buttons + explicit states | Full `+-Save-+` box buttons; `[ ]/[x]` toggles; full `+-Email-+` box TextField. | |

**User's choice:** Brackets + checkbox toggles (Recommended)
**Notes:** Primary vs secondary distinguished by double `[[ ]]` vs single `[ ]`; text variant is bare label.

### Q3: Container glyphs

| Option | Description | Selected |
|--------|-------------|----------|
| Plain box with gap lines | `+--+` for Card; repeated item boxes for List; Modal/Sheet labeled box; `-----` Divider. | ✓ (Recommended) |
| Dotted boundaries | `.` for Card; `=` double-line for Modal/Sheet. | |
| Labeled containers | `+-- Card --+` etc. — always labeled. | |
| Indentation-only (no boxes) | Containers signal via indentation; no box glyphs. | |

**User's choice:** Plain box with gap lines (Recommended)
**Notes:** Modal/Sheet get labeled top border for overlay intent; Card/List unlabeled (compact).

### Q4: Nav chrome

| Option | Description | Selected |
|--------|-------------|----------|
| ASCII rule + labeled back | NavBar `< title … [trailing]` + `---` rule; TabBar `---` rule + `[ Home ] \| [ Stats ] \| [ Settings ]`. | ✓ (Recommended) |
| Double-border nav regions | `=` double-line separators for NavBar/TabBar; body stays `-`. | |
| Device-frame chrome | Status bar `09:41 …… 100%` + home indicator `_____`. | |
| Minimal — just title and tabs | Bare title, bare TabBar items, no rule lines. | |

**User's choice:** ASCII rule + labeled back (Recommended)
**Notes:** Explicitly rejected device chrome per PITFALLS §3.1. Back arrow renders only for non-root screens.

---

## Page Frame + Variant Block Layout

### Q1: Rendering width

| Option | Description | Selected |
|--------|-------------|----------|
| 60 cols, fixed | Matches WIREFRAME-01 baseline; no CLI flag. | ✓ (Recommended) |
| 42 cols (narrow, phone-ish) | Tighter phone feel; less label room. | |
| 80 cols (terminal-standard) | Maximum label room; loses phone cue. | |
| Configurable via CLI flag | `--width N` default 60; snapshot variance. | |

**User's choice:** 60 cols, fixed (Recommended)

### Q2: Variant stacking

| Option | Description | Selected |
|--------|-------------|----------|
| content / empty / loading / error, blank line between | Fixed order; null variants as short `(N/A)` marker line. | ✓ (Recommended) |
| Only non-null variants rendered | Skip null variants silently. | |
| All 4 with ~40-line `N/A` shell | Inflates page to ~160 lines when variants null. | |
| Side-by-side 2×2 grid | Horizontal layout; breaks paste. | |

**User's choice:** content / empty / loading / error, blank line between (Recommended)
**Notes:** Null variants render as 1-line marker frame, not full shell.

### Q3: Block header

| Option | Description | Selected |
|--------|-------------|----------|
| Header bar inside frame | First line `screen: <id>  variant: <kind>` (+ `when` if present). Preview rendered as title-in-border. | ✓ (Recommended) |
| Markdown-style `## variant: empty` above frame | Heading preceding each frame. | |
| Caption line below frame | Label after content. | |
| No labels — 4 frames stacked blind | Rely on fixed-order convention. | |

**User's choice:** Header bar inside frame (Recommended)
**Notes:** Implementation form — title merged into top border: `+-- screen: home  variant: content --+`. Preview showed this form; carried forward into D-40.

### Q4: `when:` trigger visibility

| Option | Description | Selected |
|--------|-------------|----------|
| In the block header only | Appears once: `variant: empty  when collection /Habit/title`. | ✓ (Recommended) |
| Header + caption above content | Repeated inside frame as top caption. | |
| Not shown in wireframe at all | Trigger lives in spec only. | |
| Only when ambiguous | Conditional on multiple variants colliding. | |

**User's choice:** In the block header only (Recommended)

---

## Sigil & Text-Style Presentation

### Q1: Sigil visibility

| Option | Description | Selected |
|--------|-------------|----------|
| Label only — hide action/testID | Render `[[ Save ]]`, `[x] Done`; metadata in spec file. | ✓ (Recommended) |
| Label + sigil inline | Full sigil `[[ Save →save_habit #save_btn ]]`. | |
| Label + testID only | `[[ Save ]] #save_btn`. | |
| Label in wireframe + sigil legend below | Clean wireframe + footer legend. | |

**User's choice:** Label only — hide action/testID (Recommended)
**Notes:** `[BROKEN LINK]` marker (Claude's Discretion) is explicit exception — surfaces unresolved action inline.

### Q2: Text-style mapping

| Option | Description | Selected |
|--------|-------------|----------|
| UPPERCASE headings + `(caption)` italics | h1 ALL CAPS, h2 Title Case, body plain, caption in parens. | ✓ (Recommended) |
| Markdown-style underlines | h1 followed by `===`, h2 by `---`, caption `> ` blockquote. | |
| Prefix markers | h1 `# `, h2 `## `, caption `~ `. | |
| Typographic weight markers | h1 `*bold*`, h2 `_underscore_`, caption `-- --`. | |

**User's choice:** UPPERCASE headings + `(caption)` italics (Recommended)
**Notes:** Rejected `===`/`---` underlines to save lines in ~40-line budget. Rejected `# / ##` prefixes to avoid markdown-rendering collision on paste.

### Q3: Text overflow

| Option | Description | Selected |
|--------|-------------|----------|
| Truncate with ellipsis | Cut at `width - 3`, append `...`. Deterministic 1-line rows. | ✓ (Recommended) |
| Word-wrap to next line | Preserves full text; variable row heights. | |
| Shrink frame to fit longest label | Dynamic width; breaks fixed-width contract. | |
| Fail loudly via diagnostic | Refuse to emit on overflow. | |

**User's choice:** Truncate with ellipsis (Recommended)

### Q4: Acceptance prose rendering

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — below the content variant only | `acceptance:` footer block under `content` frame; not under empty/loading/error. | ✓ (Recommended) |
| Yes — at top of screen page, before variants | Contract shown before wireframes. | |
| No — wireframe shows tree only | Acceptance stays in spec + prompts only. | |
| CLI flag `--with-acceptance` | Opt-in at emit time. | |

**User's choice:** Yes — below the content variant only (Recommended)

---

## Dogfood Gate — 20-Fixture Composition

### Q1: Fixture sourcing

| Option | Description | Selected |
|--------|-------------|----------|
| Derive from canonical 3 + add composite fixtures | habit-tracker + todo + social-feed expanded; add ≥5 composites. | ✓ (Recommended) |
| Hand-draft 20 new reference wireframes from scratch | Reverse-engineer authoring approach. | |
| Generate from canonicals only, skip composites | Yields ~12-15; fails literal count. | |
| Dedicated synthetic fixtures designed to exercise catalog | 5 new fixtures × 4 variants = 20; ignores prior canonicals. | |

**User's choice:** Derive from canonical 3 + add composite fixtures (Recommended)

### Q2: File layout

| Option | Description | Selected |
|--------|-------------|----------|
| One `.wf.txt` per screen-variant | `fixtures/wireframes/{fixture}/{screen}-{variant}.wf.txt`; literal 20-file count. | ✓ (Recommended) |
| One `.wf.md` per fixture | All variants stacked per fixture; fewer files. | |
| Single consolidated CATALOG.wf.md | One file, all 20 wireframes. | |
| Per-screen `.wf.txt` (all variants per screen) | Fewer files; breaks "one wireframe = one file" literal count. | |

**User's choice:** One `.wf.txt` per screen-variant (Recommended)

### Q3: Shareability evidence

| Option | Description | Selected |
|--------|-------------|----------|
| SHARED.md sidecar with URLs + dates + verdicts | Structured file; auditable; Phase 4 can parse. | ✓ (Recommended) |
| Git-log only | Commit note like `docs: dogfood 3 wireframes posted to X/Y/Z`. | |
| Open 3 real GitHub issues / PRs on this repo with wireframes embedded | Self-dogfood via own repo; public artifacts. | |
| External survey / Discord feedback | Community vote; slow; out of v1 scope. | |

**User's choice:** SHARED.md sidecar with URLs + dates + verdicts (Recommended)

### Q4: Gate enforcement

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 4 first plan explicitly checks fixtures/wireframes/SHARED.md ≥ 3 | Precondition inside GSD workflow. | ✓ (Recommended) |
| CI test counts files + parses SHARED.md | Automated; every commit enforces. | |
| Convention only — track in STATE.md | Lightest; easy to bypass. | |
| Manual /gsd-verify-work checkpoint between Phase 3 and 4 | Standard GSD verification gate. | |

**User's choice:** Phase 4 first plan explicitly checks fixtures/wireframes/SHARED.md ≥ 3 (Recommended)

---

## Claude's Discretion

Captured in CONTEXT.md under `Claude's Discretion`:

- Renderer module layout (`src/emit/wireframe/{layout, components/*, variants, cli, text-style, overflow}.ts`)
- `render-wireframe` CLI form (`scripts/render-wireframe.ts` via `npx tsx`; `npm run wireframe` alias; no `bin` entry for v1)
- Output encoding (UTF-8, LF, newline-at-EOF)
- Image placeholder (3-line box, 10 cols wide, centered alt)
- Icon placeholder (inline `[icon:name]`)
- `[BROKEN LINK]` marker (inline `!!BROKEN: action=foo` next to affected component)
- Snapshot harness (vitest `.toMatchSnapshot()` per kind + `tests/wireframe-catalog.test.ts` + `tests/dogfood-gate.test.ts`)
- Variant frame padding (1-line inner top/bottom, 2-col inner left/right)
- SegmentedControl selected-segment marker (`*Week*` by default)
- Spacer sizing (sm=1 line, md=2, lg=3)
- Ascii-baseline regex check (`tests/wireframe-ascii-baseline.test.ts`)

---

## Deferred Ideas

Captured in CONTEXT.md under `<deferred>`:

- Unicode BMP box-drawing preview path (Phase 5)
- CLI flag to vary rendering width (post-v1)
- Soft-wrap instead of truncate (post-v1 if fixtures need it)
- `--strict` diagnostic mode (post-v1)
- Interactive `--watch` (superseded by Phase 5 canvas)
- Alternative visual styles as opt-in renderers (post-v1)
- Non-ASCII label support (Phase 1 deferred)
- Rich `[BROKEN LINK]` variants (post-v1 if needed)
- Semantic-token-aware rendering (Phase 8 territory)
- Side-by-side 2×2 variant grid (post-v1)
