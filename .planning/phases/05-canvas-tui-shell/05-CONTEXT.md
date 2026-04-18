# Phase 5: Canvas TUI Shell — Context

**Gathered:** 2026-04-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Ship the first pi-tui TUI surface: a keyboard-driven 3-pane canvas (`ctx.ui.custom()`) that sits on the Phase 4 editor store. Phase 5 is the first phase where `@mariozechner/pi-tui` `Component`s, `matchesKey()`, and `ctx.ui.custom()` enter the codebase. The canvas lets a developer open an existing spec file and navigate/edit screens, nav, data, and state variants entirely by keyboard, with a live wireframe preview and visible save state.

**In scope (this phase):** `src/canvas/` (root canvas component, 3-pane layout, screens-list pane, property-inspector pane, wireframe-preview pane, command palette overlay, focus FSM, help line, save indicator), `scripts/canvas.ts` (CLI entry: `npm run canvas -- foo.spec.md`), pi-tui peer-dependency install, focus FSM documented with transitions, integration tests asserting focus-cycle, pane output, and chrome-hygiene.

**Explicitly NOT in scope:** Wizard shell (Phase 6), Maestro emission (Phase 7), clipboard/yank commands (Phase 8), `withFileMutationQueue` + `session_start/shutdown` (Phase 9), per-screen body-anchor editing (deferred from Phase 4 D-69), mouse support (PROJECT.md out of scope), alt-buffer takeover.

**Requirements covered:** CANVAS-01, CANVAS-02, CANVAS-03, CANVAS-04, CANVAS-05, CANVAS-06.

</domain>

<decisions>
## Implementation Decisions

### Center Pane: Property Inspector

- **D-70:** **Center pane is a property inspector showing screen-level fields for the currently active screen.** Fields shown: `title`, `back_behavior` (displayed as `—` for root screens), `components` (node count, read-only summary), acceptance criteria prose lines (scrollable, editable), and variant completion status (`content ●  empty ●  loading □  error □` — filled dot = non-null, empty = null). No component-tree navigation in Phase 5; component editing is palette-only.
- **D-71:** **Editing a field uses Enter-to-activate, Esc-to-cancel.** When the inspector pane has focus, `j`/`k` (or arrow keys) navigate between field rows. Pressing `Enter` on an editable field (title, back_behavior, acceptance prose lines) opens a pi-tui `Input` widget in-place. `Enter` commits (fires the corresponding command via `store.apply`); `Esc` cancels without applying. Read-only fields (component count, variant dots) show no cursor and do not activate on `Enter`.
- **D-72:** **Diagnostics surface inline in the inspector.** If `store.subscribe` delivers `diagnostics` with `severity: error`, the affected field row gains a `⚠` marker. A summary line at the bottom of the inspector pane shows the error count. This satisfies CANVAS-01's "live wireframe preview" promise — broken specs are visible without leaving the pane.
- **D-73:** **Wireframe preview always shows the `content` variant** of the currently selected screen. No per-screen variant state is tracked in the canvas shell. Variant switching is a Phase 5 non-goal; the wireframe pane is a read-only observer updated on every `store.subscribe` tick.

### Command Palette

- **D-74:** **Command palette is a fuzzy-search overlay list triggered by `:` or `Ctrl+P`.** When open, the palette overlays the 3-pane layout (drawn over the center/right panes; screens list remains dimmed but visible). The overlay shows a text input at the top and a scrollable list of matching commands below. Typing filters by command name (case-insensitive prefix match, falls back to substring). Arrow keys / `j`/`k` navigate the list; `Enter` selects; `Esc` closes.
- **D-75:** **After selecting a command that requires arguments, the palette transitions to a sequential arg-prompt flow.** Each required arg defined in the command's `argsSchema` is presented as a labeled `Input` prompt in order: `Screen ID: _` then `Screen name: _`. Optional args with defaults are shown as optional fields (user can press `Enter` to accept default). When all args are filled, `Enter` runs `store.apply(commandName, parsedArgs)`. `Esc` at any prompt cancels the whole sequence.
- **D-76:** **Commands in the palette list show their name + description from the registry.** The description is derived from the command file's `name` field (kebab-case expanded to title case as a fallback) or from an optional `description` field the planner may add to the `Command` interface. Commands are grouped by noun prefix (screen, component, entity, nav, action) for readability when browsing unfiltered.

### Focus FSM

- **D-77:** **Tab cycle order: Screens list → Property inspector → Wireframe preview → back to Screens list.** Shift-Tab reverses. All 3 panes are focusable. The wireframe preview pane has focus but is read-only — it receives keyboard events only to support future variant switching (Phase 5 defers this; the pane just highlights its border when focused). Focus state is held in the canvas shell (NOT in the store per D-53).
- **D-78:** **Global keybindings (work regardless of focused pane):**
  - `:` or `Ctrl+P` — open command palette
  - `Ctrl+Z` — undo (calls `store.undo()`)
  - `Ctrl+Y` / `Ctrl+Shift+Z` — redo (calls `store.redo()`)
  - `Ctrl+Q` — quit canvas (calls `store.flush()` then `done()`)
  All other keys are pane-local. The global handler runs before pane `handleInput` — a pane returning `true` for a global key would shadow it; the global handler must capture first.
- **D-79:** **Focus indicator is a highlighted border (Unicode or ASCII depending on mode).** Focused pane shows a bright border; unfocused panes show a dim border. No pane title changes on focus — just border brightness. Matches pi-tui theme conventions (`theme.fg("accent", ...)` for focused border, `theme.fg("muted", ...)` for unfocused).

### Screens List Pane

- **D-80:** **Navigation is immediate: moving the cursor immediately selects the screen.** `j`/`k` (or up/down arrow) moves the cursor; the property inspector and wireframe preview update immediately to reflect the newly selected screen. No separate `Enter` to confirm. Matches pi-tui's `SelectList` behavior pattern.
- **D-81:** **Each list item shows: `> name` for the active item, `  name` for others.** Name is truncated to pane width minus 4 chars. A `⚠` suffix is appended if the screen has active `severity: error` diagnostics. No component count, no variant dots — minimal density for maximum screen count visibility.
- **D-82:** **Screens list shows all screens from `spec.screens` in order.** No sorting, no filtering in v1. The user can reorder screens via the `reorder-screen` command (if it exists in the catalog) or by direct spec file editing. The list re-renders on every `store.subscribe` tick.

### Layout & Pane Proportions

- **D-83:** **Pane width split: 20% screens list / 40% property inspector / 40% wireframe preview**, calculated from the terminal width passed to `root.render(width)`. Minimum widths: screens list 15 chars, property inspector 30 chars, wireframe preview 30 chars. If terminal is too narrow (< 75 cols), collapse wireframe preview and show only screens + inspector.
- **D-84:** **Help line is a single fixed line at the bottom** showing 4–6 context-sensitive keybindings. Contents change when focus changes:
  - Screens list focus: `[j/k] navigate  [tab] next pane  [ctrl+p] palette  [ctrl+z] undo  [ctrl+q] quit`
  - Inspector focus: `[j/k] navigate  [enter] edit  [tab] next pane  [ctrl+p] palette  [ctrl+z] undo  [ctrl+q] quit`
  - Preview pane focus: `[tab] next pane  [ctrl+p] palette  [ctrl+z] undo  [ctrl+q] quit`
  - Palette open: `[↑↓] navigate  [enter] select  [esc] cancel`
- **D-85:** **Save indicator is rendered in the top-right corner of the canvas frame** (or in the help-line area if no top border). Dirty state: `●` (filled dot). Clean state: `✓`. Derived from `snapshot.dirty` on each `store.subscribe` tick; the autosave fires 500ms after last apply, so the indicator flips `●→✓` within 1s of the last edit settling (CANVAS-04).

### CLI Entry

- **D-86:** **`scripts/canvas.ts` entry accepts one positional arg: the `.spec.md` path.** Invocation: `npm run canvas -- path/to/spec.md`. Calls `parseSpecFile(path)` to initialize the store, calls `ctx.ui.custom(rootComponent)` to mount the canvas, and wires `store.flush()` to the `done()` callback. Error if the spec path doesn't exist or fails to parse (exit 1 with diagnostic on stderr).
- **D-87:** **Canvas is headless-testable via snapshot of `root.render(width)` output.** Each pane component exposes a `render(width): string[]` method that can be exercised in vitest without a real terminal. Integration tests assert: (1) focus border changes on simulated Tab events, (2) screen selection updates inspector content, (3) save indicator reflects `dirty` from store snapshot, (4) no raw escape sequences in the rendered output (chrome hygiene — CANVAS-06).

### Claude's Discretion

- **pi-tui component mapping:** Use pi-tui's `SelectList` for the screens list, `Container`/`Box` for pane frames, `Input` for property editing and palette search, `Text` for read-only rows. Planner maps each pane to specific pi-tui primitives after reading the pi-tui API.
- **Palette overlay z-order:** The palette draws on top of the 3-pane layout by returning its lines at the correct positions within `root.render(width)`. It is NOT a separate `ctx.ui.custom()` call — there is only one `custom()` call for the whole canvas.
- **Arg-prompt flow for palette (D-75):** Planner decides whether to reuse a single `Input` component swapped in-place or render a new sub-overlay. Either is acceptable as long as `Esc` cancels cleanly and no partial `store.apply` happens.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents (researcher, planner, executor) MUST read these before planning or implementing.**

### Phase 4 store contract (the canvas sits on top of this)
- `.planning/phases/04-editor-store-commands-undo/04-CONTEXT.md` §decisions — D-50..D-69 (store API, AstHandle opacity, command shape, undo stack, autosave, cli-edit pattern)
- `src/editor/index.ts` — public barrel: `createStore`, `COMMANDS`, `COMMAND_NAMES`, `subscribeDiagnostics`, `Snapshot`, `Store`
- `src/editor/store.ts` — `createStore(initial, commands): Store`; `apply`, `subscribe`, `flush`, `undo`, `redo`, `getState` — canvas wires `subscribe` for pane re-renders
- `src/editor/types.ts` — `Snapshot` shape (spec + diagnostics + dirty + lastWriteResult); canvas save indicator reads `snapshot.dirty` and `snapshot.lastWriteResult`
- `src/editor/commands/index.ts` — `COMMANDS` registry (command name → `{ name, argsSchema, apply, invert }`); palette enumerates this for its list

### Phase 3 wireframe renderer (right pane calls this)
- `src/emit/wireframe/index.ts` — `render(spec, screenId): string` — canvas right pane calls `render(snapshot.spec, activeScreenId)` on every subscribe tick

### Phase 2 serializer (canvas initializes store via parseSpecFile)
- `src/serialize/parse.ts` — `parseSpecFile(path): { spec, astHandle, diagnostics, body }` — canvas.ts entry calls this once at startup
- `src/serialize/ast-handle.ts` — `AstHandle` type (opaque to canvas per D-52)

### Phase 1 model
- `src/model/spec.ts` — `Spec` shape; canvas accesses `spec.screens[]` for the list pane
- `src/model/screen.ts` — `Screen` shape; inspector pane reads `screen.title`, `screen.back_behavior`, `screen.acceptance`, `screen.variants`

### pi-tui API (MUST read before any canvas implementation)
- `CLAUDE.md` §Technology Stack §pi-tui — Component interface, `render(width): string[]`, `handleInput(data): void`, `matchesKey(data, "ctrl+s")`, `ctx.ui.custom()` pattern, theming via `theme.fg()`
- `CLAUDE.md` §pi.dev Extension Shape — `ctx.ui.custom()` is the single "go fullscreen" call; rendering is pull-based; keyboard is opaque strings matched via `matchesKey`
- External: `@mariozechner/pi-tui` package docs — `Component`, `Text`, `Box`, `Container`, `Spacer`, `SelectList`, `Editor`, `Input`, `Markdown`, `TruncatedText`, `matchesKey`, `Key`

### Requirements (v1 spec)
- `.planning/REQUIREMENTS.md` §Canvas mode — CANVAS-01..CANVAS-06 full text
- `.planning/ROADMAP.md` §Phase 5 — goal + 5 success criteria

### Project constraints
- `.planning/PROJECT.md` — keyboard-only (no mouse), git-backed state, no alt-buffer, no external state stores
- `CLAUDE.md` §What NOT to Use — no React Ink, no blessed, no raw alt-buffer escape sequences

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets (from Phases 1–4)

- **`createStore(initial, commands): Store`** (`src/editor/store.ts`) — Canvas initializes the store once with `parseSpecFile(path)` output. Subscribes for pane re-renders via `store.subscribe(snapshot => pane.update(snapshot))`.
- **`COMMANDS` registry** (`src/editor/commands/index.ts`) — Command palette enumerates `Object.values(COMMANDS)` for its list. Each command exposes `name` and `argsSchema` (Zod object) for arg-prompt flow.
- **`render(spec, screenId): string`** (`src/emit/wireframe/index.ts`) — Wireframe preview pane calls this on every subscribe tick. Pure function; no memoization needed for Phase 5 (spec changes are infrequent enough).
- **`parseSpecFile(path)`** (`src/serialize/parse.ts`) — Canvas entry point calls this once. Same pattern as `scripts/cli-edit.ts` (Phase 4's headless harness).
- **Fixture `.spec.md` files** — `fixtures/habit-tracker.spec.md`, `todo.spec.md`, `social-feed.spec.md` are the canvas integration test inputs (spec files with multiple screens, variants, data models).

### Established Patterns (follow, don't invent)

- **Script entry mirrors `scripts/render-wireframe.ts` + `scripts/cli-edit.ts`.** `scripts/canvas.ts` reads one positional arg (spec path), initializes store, mounts `ctx.ui.custom()`.
- **One file per concern.** Canvas adds `src/canvas/{root, panes/screens-list, panes/property-inspector, panes/wireframe-preview, palette, help-line, focus-fsm}.ts`. Each pane is a `Component` with its own file.
- **Snapshot-based rendering.** Every pane's `render(width)` consumes the latest `Snapshot` from the store subscription — no pane holds mutable state beyond its render input.
- **TDD commit pairs.** `test(05-XX): RED` → `feat(05-XX): GREEN` per Phase 1–4 convention.
- **Biome + vitest + tsc zero-error line** continues.

### Integration Points

- **Canvas → Phase 4 store:** Canvas subscribes; panes re-render on every `Snapshot`. Palette dispatches via `store.apply(name, args)`. Undo/redo via `store.undo()` / `store.redo()`. Quit via `store.flush()` + `done()`.
- **Canvas → Phase 6 (Wizard):** Phase 6 adds a wizard shell that shares the same store and command registry. The wizard's graduation to canvas is a mode flip (`ctx.ui.custom()` swaps component, store is unchanged). D-53's "no mode in store" ensures this works.
- **Canvas → Phase 8 (Handoff commands):** `:yank wireframe` and `:prompt screen` will register as commands in the `COMMANDS` registry; Phase 5's palette already handles them by enumeration.
- **Canvas → Phase 9 (pi integration):** Phase 9 wraps the canvas entry in `pi.registerCommand("spec", ...)` and replaces the `scripts/canvas.ts` invocation with `ctx.ui.custom()` from the extension lifecycle. Phase 5 ships the headless `canvas.ts` entry as the testable substrate.

### New Code Layout

- `src/canvas/` (new directory — L6a per ARCHITECTURE):
  - `root.ts` — root `Component`; holds focus state; routes `handleInput` to global handlers then focused pane; calls `store.subscribe` for re-renders
  - `focus-fsm.ts` — focus state type (`'screens' | 'inspector' | 'preview' | 'palette'`), transition function, Tab/Shift-Tab logic
  - `help-line.ts` — single-line help bar; pure function from `FocusState → string`
  - `save-indicator.ts` — pure function from `dirty: boolean → '●' | '✓'`
  - `panes/screens-list.ts` — `ScreensListPane` component; renders screen names with active marker + ⚠ for errors
  - `panes/property-inspector.ts` — `PropertyInspectorPane` component; renders screen fields; holds cursor row + edit-mode state
  - `panes/wireframe-preview.ts` — `WireframePreviewPane` component; calls `render(spec, screenId)` on render tick
  - `palette/index.ts` — `CommandPalette` component; fuzzy filter + arg-prompt flow state machine
- `scripts/canvas.ts` — CLI entry; `parseSpecFile` → `createStore` → `ctx.ui.custom(new RootCanvas(store))` → await `done()`
- Tests:
  - `tests/canvas-focus.test.ts` — Tab/Shift-Tab cycle, global keybinding routing
  - `tests/canvas-render.test.ts` — pane output snapshot against fixture spec; save indicator; help line content per focus state
  - `tests/canvas-chrome.test.ts` — no raw escape sequences in `root.render(width)` output (CANVAS-06)
  - `tests/canvas-integration.test.ts` — open fixture → select screen → edit title → verify wireframe update → quit → re-open → verify persistence

</code_context>

<specifics>
## Specific Ideas

- **Property inspector as the "v1 editing surface"** — The decision to use a property inspector (not a tree navigator) intentionally limits Phase 5 to screen-level metadata editing. Component tree editing remains palette-only. This is the correct v1 bet: the canvas is primarily a *navigator* (choose screen, see wireframe) with light metadata editing layered on top. Full component tree editing can evolve in Phase 5.1 or 6 if user feedback demands it.
- **Palette as the power-user surface** — All commands are reachable via palette, including commands that have no inspector shortcut (add-entity, add-nav-edge, etc.). The palette enumerates `COMMANDS` directly — there's no command filtering per pane. This means even "add-screen" is accessible from any pane, which aligns with the "command palette is always reachable" CANVAS-02 promise.
- **Immediate screen selection (D-80)** — Navigating the screens list immediately updates editor + preview. This requires `store.getState().spec.screens` to be the source of truth (no buffered selection state). The canvas shell holds `activeScreenId: ScreenId` as its only non-store state (besides focus). On subscribe tick, if `activeScreenId` was deleted, auto-select the first screen.
- **Global key precedence (D-78)** — The root component's `handleInput` must intercept global keys BEFORE delegating to focused pane. The implementation guard: root handles `ctrl+z`, `ctrl+y`, `ctrl+q`, `:`, `ctrl+p` first; only unhandled keys propagate to the focused pane. Panes MUST NOT bind these keys locally — convention enforced by review.
- **Chrome hygiene test (CANVAS-06)** — `tests/canvas-chrome.test.ts` asserts `root.render(80).join('\n')` contains no `\x1b[?` sequences (alternative-screen), no `\x1b[?1049h` (alt-buffer enter), no `\x1b[2J` (clear screen). This is the automated gate for the "no raw alt-buffer" constraint.

</specifics>

<deferred>
## Deferred Ideas

- **Variant switching in the wireframe preview pane** — When preview pane has focus, pressing Tab/`v` could cycle through `content → empty → loading → error` variants. Deferred: the preview pane is read-only in Phase 5. Planner should reserve a `Tab`-within-preview hook so Phase 6 can add it without a focus FSM rewrite.
- **Per-screen body-anchor editing** — `<!-- screen:ID --> ... <!-- /screen:ID -->` for editing prose notes in the canvas center pane. Deferred to Phase 5 or 6 when a concrete gesture ("edit this screen's notes in place") is needed. D-69 carries this.
- **Resizable pane splits** — User-draggable or keyboard-adjustable pane widths. Out of scope for v1 (no mouse); keyboard resize would need a new focus mode. Deferred post-v1.
- **Screen reorder in the screens list** — Drag-to-reorder or `Ctrl+Up/Down` to move screens. Deferred: a `reorder-screen` command can land in the Phase 5 command catalog if the planner adds it; the list itself renders `spec.screens` in order and would update automatically.
- **Minimap / nav graph overview pane** — A fourth pane or overlay showing the navigation graph as ASCII. Interesting for orientation in large specs; deferred to v2.
- **Inline diagnostics in wireframe preview** — Overlaying diagnostic markers on the wireframe (e.g., `[! broken sigil ref]` at the affected component). The pure renderer would need a diagnostic-aware render path. Deferred.

</deferred>

---

*Phase: 05-canvas-tui-shell*
*Context gathered: 2026-04-19*
