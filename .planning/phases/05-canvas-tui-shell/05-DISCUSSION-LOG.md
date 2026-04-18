# Phase 5: Canvas TUI Shell — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-19
**Phase:** 05-canvas-tui-shell
**Areas discussed:** Center pane UX, Command palette style, Focus FSM & keybindings, Screens list interaction

---

## Center pane UX

| Option | Description | Selected |
|--------|-------------|----------|
| Property inspector | Scrollable form: title, back_behavior, acceptance prose, component count, variant status dots. Editing via Enter-to-activate Input. Commands (add-component etc.) are palette-only. | ✓ |
| Component tree navigator | Tree view of component tree for selected screen/variant. Keyboard-navigable nodes; side-panel for props. | |
| Overview + palette-only editing | Read-only center pane showing screen summary + diagnostics. All editing via command palette. | |

**User's choice:** Property inspector
**Notes:** Selected the recommended option with visual preview confirming the layout.

---

### Center pane follow-up: field editing model

| Option | Description | Selected |
|--------|-------------|----------|
| Enter opens inline Input | Press Enter on a focused field row → in-place pi-tui Input. Enter commits (fires command), Esc cancels. | ✓ |
| Tab into editable field directly | Tabbing into a row activates its Input immediately. | |
| You decide | Claude picks based on pi-tui Input conventions. | |

**User's choice:** Enter opens inline Input (recommended default)

---

### Center pane follow-up: wireframe preview default variant

| Option | Description | Selected |
|--------|-------------|----------|
| content variant always | Preview always shows 'content' variant. Explicit variant switching deferred. | ✓ |
| Last-viewed variant per screen | Canvas remembers which variant was last viewed per screen. | |
| Cycle with Tab within preview pane | Tab while preview pane focused cycles through 4 variants. | |

**User's choice:** content variant always (recommended default)

---

## Command palette style

| Option | Description | Selected |
|--------|-------------|----------|
| Fuzzy-search overlay list | Overlay over 3 panes; typing filters commands by name; arrow keys navigate; Enter invokes; Esc closes. | ✓ |
| Vim-style command bar (bottom line) | ':' opens command line at bottom; user types full command + args; Tab completes command names. | |

**User's choice:** Fuzzy-search overlay list (recommended default)
**Notes:** Selected with visual preview confirming the overlay layout.

---

### Palette follow-up: argument handling

| Option | Description | Selected |
|--------|-------------|----------|
| Arg prompt sequence | After command selection, palette transitions to sequential Input prompts per required arg. | ✓ |
| Inline arg entry in palette | Palette shows command + arg fields inline; user fills all then presses Enter. | |
| Command bar opens for that command | Selecting from overlay list opens vim-bar pre-filled with command name. | |

**User's choice:** Arg prompt sequence (recommended default)

---

## Focus FSM & keybindings

### Tab cycle order

| Option | Description | Selected |
|--------|-------------|----------|
| Screens → Editor → Preview (left to right) | Tab: screens list → property inspector → wireframe preview → back to screens. Shift-Tab reverses. | ✓ |
| Screens → Editor only (Preview passive) | Wireframe preview never receives focus; Tab cycles only between two panes. | |
| You decide | Claude picks based on CANVAS-01 and pi-tui conventions. | |

**User's choice:** Screens → Editor → Preview (left to right) (recommended default)

---

### Global keybindings

| Option | Description | Selected |
|--------|-------------|----------|
| Palette + Undo/Redo + Quit | Global: `:`, Ctrl+P, Ctrl+Z, Ctrl+Y/Ctrl+Shift+Z, Ctrl+Q. Everything else pane-local. | ✓ |
| Palette + Undo/Redo + Quit + Save + Refresh | Adds Ctrl+S (force save/flush) and Ctrl+R (reload from disk). | |
| Palette only global — rest pane-local | Only `:` / Ctrl+P is global; undo/redo/quit are pane-local. | |

**User's choice:** Palette + Undo/Redo + Quit (recommended default)

---

## Screens list interaction

### Navigation model

| Option | Description | Selected |
|--------|-------------|----------|
| j/k or arrows to move, auto-selects | Moving cursor immediately updates editor + preview. No Enter step required. | ✓ |
| Arrow keys to highlight, Enter to select | Two-step: move to highlight, Enter to open. Editor/preview update only on Enter. | |

**User's choice:** j/k or arrows to move, auto-selects (recommended default)

---

### Information density per item

| Option | Description | Selected |
|--------|-------------|----------|
| Name only + active indicator | `> name` for active, `  name` for others. `⚠` suffix for screens with errors. | ✓ |
| Name + component count | E.g. `home  (12)`. | |
| Name + variant status dots | E.g. `home  ●●□□` for variant completion. | |

**User's choice:** Name only + active indicator (recommended default)

---

## Claude's Discretion

- pi-tui component mapping (SelectList, Container, Box, Input, Text) — planner decides exact mapping after reading pi-tui API
- Palette overlay z-order implementation (same `ctx.ui.custom()` call, not a nested one)
- Arg-prompt flow: whether to reuse a single swapped Input or a sub-overlay
- Whether to add an optional `description` field to the `Command` interface for palette display

## Deferred Ideas

- Variant switching in wireframe preview pane (Tab/`v` to cycle variants) — deferred to Phase 6
- Per-screen body-anchor editing — D-69 carry-forward, Phase 5 or 6
- Resizable pane splits — post-v1 (no mouse support)
- Screen reorder in list — could land as `reorder-screen` command in Phase 5 catalog
- Minimap / nav graph overview pane — v2
- Inline diagnostic markers in wireframe preview — deferred
