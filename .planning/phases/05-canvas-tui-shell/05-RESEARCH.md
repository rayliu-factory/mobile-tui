# Phase 5: Canvas TUI Shell — Research

**Researched:** 2026-04-19
**Domain:** pi-tui Component system, multi-pane TUI layout, focus FSM, overlay/palette patterns
**Confidence:** HIGH (pi-tui API verified via Context7 + official docs + pi-mono GitHub source)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Center Pane: Property Inspector**
- D-70: Center pane is a property inspector showing screen-level fields (title, back_behavior, components count, acceptance criteria, variant completion status)
- D-71: Enter-to-activate, Esc-to-cancel editing. j/k navigate field rows. Enter on editable field opens pi-tui Input in-place.
- D-72: Diagnostics surface inline in inspector; ⚠ marker on affected row + error-count summary line
- D-73: Wireframe preview always shows content variant; no variant switching in Phase 5

**Command Palette**
- D-74: Fuzzy-search overlay triggered by `:` or `Ctrl+P`; overlays center+right panes; screens list stays dimmed but visible
- D-75: After command selection, sequential arg-prompt flow per required arg in argsSchema
- D-76: Commands show name + description; grouped by noun prefix

**Focus FSM**
- D-77: Tab cycle: screens → inspector → preview → screens; Shift-Tab reverses; all 3 panes focusable
- D-78: Global keybindings (`:`, Ctrl+P, Ctrl+Z, Ctrl+Y/Ctrl+Shift+Z, Ctrl+Q) handled BEFORE pane dispatch
- D-79: Focus indicator is highlighted border (accent) vs dim border (unfocused)

**Screens List Pane**
- D-80: Immediate selection — cursor move immediately updates inspector + preview
- D-81: `> name` (active), `  name` (others), ⚠ suffix for error screens; name truncated to pane width - 4
- D-82: All screens from spec.screens in order; re-renders on every store.subscribe tick

**Layout & Pane Proportions**
- D-83: 20% screens list / 40% inspector / 40% wireframe preview; min 15/30/30 chars; collapse preview if < 75 cols
- D-84: Single fixed help line at bottom, context-sensitive per focus state
- D-85: Save indicator in top-right corner: `●` dirty / `✓` clean, from snapshot.dirty

**CLI Entry**
- D-86: scripts/canvas.ts accepts one positional arg: .spec.md path; parseSpecFile → createStore → ctx.ui.custom(rootComponent) → handle.close on quit
- D-87: Headless-testable via root.render(width) in vitest; tests: focus-cycle, pane snapshot, save indicator, no-raw-escapes (CANVAS-06)

### Claude's Discretion

- pi-tui component mapping (SelectList, Container, Box, Input, Text) — planner decides after reading pi-tui API
- Palette overlay z-order implementation (same ctx.ui.custom() call, not nested)
- Arg-prompt flow: single swapped Input or sub-overlay
- Whether to add optional description field to Command interface for palette display

### Deferred Ideas (OUT OF SCOPE)

- Variant switching in wireframe preview pane
- Per-screen body-anchor editing (D-69)
- Resizable pane splits
- Screen reorder in list
- Minimap / nav graph overview pane
- Inline diagnostic markers in wireframe preview
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CANVAS-01 | 3-pane layout: screens list / editor / wireframe preview; keyboard-only navigation with explicit focus FSM | Multi-pane via custom horizontal compositor; focus via FocusState enum + root handleInput dispatch |
| CANVAS-02 | Command palette always reachable via `:` or `Ctrl+P`; lists every command with current keybindings | Palette as TUI overlay via tui.showOverlay(); COMMANDS enumeration via Object.values(COMMANDS) |
| CANVAS-03 | Persistent single-line help line at bottom showing 4-6 most relevant bindings per focus | Pure function FocusState → string; appended as last child of root Container |
| CANVAS-04 | Save indicator (● dirty → ✓ clean) reflecting debounced write-through state | snapshot.dirty from store.subscribe(); rendered in top-right corner of header line |
| CANVAS-05 | Canvas is useful standalone against existing spec file — not wizard-gated | scripts/canvas.ts entry: parseSpecFile → createStore → mount canvas independently |
| CANVAS-06 | Canvas renders only within ctx.ui.custom() region; no raw alt-buffer escape sequences | Chrome hygiene test: root.render(80).join('\n') must not contain \x1b[?1049h or \x1b[2J |
</phase_requirements>

---

## Summary

Phase 5 builds the first pi-tui surface in the codebase. The core pattern is: one `ctx.ui.custom(component)` call mounts a root `Component` object; pi-tui then calls `root.render(width)` on every tick and diffs against the previous frame. There is no JSX, no virtual DOM, no second render loop.

The key architectural discovery is that **pi-tui's built-in `Container` only stacks children vertically**. A horizontal 3-pane layout requires a custom `HorizontalLayout` component that calls each pane's `render(paneWidth)` at reduced widths and concatenates their lines side-by-side using `sliceByColumn` and `visibleWidth` from pi-tui utilities. This is approximately 60-80 LOC of pure, testable code.

For the command palette overlay, pi-tui's `tui.showOverlay(component, options)` (available via the `tui` param in the ctx.ui.custom callback) handles z-ordering automatically. The palette component renders on top of the 3-pane base layout without manual line compositing. This is the right tool; hand-rolling overlay compositing would duplicate engine internals.

Focus routing in pi-tui is explicit: the TUI maintains one `focusedComponent` and routes all `handleInput` calls to it. For multi-pane layouts where the root owns focus routing, the root component receives `handleInput`, checks global keys first, then delegates to the appropriate pane component's `handleInput` based on the current `FocusState`. This is the established pi-tui pattern.

**Primary recommendation:** Build `RootCanvas` as a single `Component` that owns a `FocusState` enum, a `HorizontalLayout` helper for 3-pane rendering, and a `CommandPalette` overlay launched via `tui.showOverlay()`. Every pane is a pure-function renderer that consumes a `Snapshot` and returns `string[]`. Input flows: global guards in root → pane dispatch. No pane binds global keys.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| TUI rendering and diffing | pi-tui (host) | — | pi-tui owns the terminal; we only produce string[] |
| 3-pane horizontal layout | Canvas (custom HorizontalLayout) | — | pi-tui Container is vertical-only; we must compositor |
| Focus state machine | Canvas root (FocusState enum + transitions) | — | D-53 prohibits focus in store; root component owns it |
| Global key interception | Canvas root (handleInput first pass) | — | D-78: must capture before pane dispatch |
| Pane rendering | Per-pane Component (screens/inspector/preview) | — | Pure function: Snapshot + focused boolean → string[] |
| Command palette overlay | pi-tui tui.showOverlay() | Canvas CommandPalette component | Engine handles z-order; we write the palette Component |
| Arg prompt flow | CommandPalette state machine | Input component (pi-tui) | Palette transitions internal state; Input renders prompts |
| Store subscription | Canvas root (subscribe once) | All panes receive snapshot | Root propagates Snapshot to panes on every tick |
| Disk I/O | Phase 4 Store (flush/autosave) | — | Canvas calls store.flush() on quit; autosave is Phase 4 |
| Wireframe rendering | Phase 3 renderSingleVariant() | WireframePreviewPane | Pure function, called on each subscribe tick |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@mariozechner/pi-tui` | `^0.67.6` | Component interface, SelectList, Input, Container, Box, Text, matchesKey, Key, visibleWidth, truncateToWidth, sliceByColumn | The ONLY TUI toolkit for pi extensions; any alternative fights the host renderer |
| `@mariozechner/pi-coding-agent` | `^0.67.6` | ExtensionAPI peer dep; provides ctx.ui.custom(), DynamicBorder | Host runtime; declared peer, not bundled |

### Supporting (already in codebase)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vitest` | `^4.1.4` | Unit + snapshot tests for Component.render() output | All pane tests; no real terminal needed |
| `zod` | `^4.3.6` | Arg parsing in palette flow (command.argsSchema) | Already used in COMMANDS; palette reuses same schemas |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom HorizontalLayout | pi-tui Container | Container only stacks vertically; HorizontalLayout required |
| tui.showOverlay() for palette | Manual line compositing in root.render() | showOverlay() is correct API; manual compositing duplicates engine internals and is harder to test |
| TUI-owned focus (tui.setFocus) | Root-managed FocusState enum | For 3-pane focus cycle, root FSM is simpler and headless-testable; tui.setFocus is for Focusable Input children only |

**Installation:** Phase 5 does not add new runtime dependencies. `@mariozechner/pi-tui` and `@mariozechner/pi-coding-agent` are peer deps resolved by the host pi process at runtime. No `npm install` step for canvas work.

---

## Architecture Patterns

### System Architecture Diagram

```
                         scripts/canvas.ts (CLI entry)
                                   │
                          parseSpecFile(path)
                                   │
                          createStore(initial)
                                   │
                    ctx.ui.custom(rootCanvas) ──► handle
                                   │
                    ┌──────────────▼───────────────────────────────┐
                    │              RootCanvas (Component)            │
                    │  ┌─────────────────────────────────────────┐  │
                    │  │ store.subscribe(snapshot => {           │  │
                    │  │   this.snapshot = snapshot              │  │
                    │  │   handle.requestRender()               │  │
                    │  │ })                                      │  │
                    │  └─────────────────────────────────────────┘  │
                    │                                               │
                    │  handleInput(data):                           │
                    │    1. Global guards (ctrl+z, ctrl+q, :, ...)  │
                    │    2. FocusState dispatch → pane.handleInput  │
                    │                                               │
                    │  render(width) → string[]:                    │
                    │    header (save indicator)                    │
                    │    HorizontalLayout.render(width, height-2)   │
                    │    ├── ScreensListPane.render(w1)             │
                    │    ├── PropertyInspectorPane.render(w2)       │
                    │    └── WireframePreviewPane.render(w3)        │
                    │    helpLine (FocusState → string)             │
                    └───────────────────────────────────────────────┘
                                         │
                              tui.showOverlay() on : or Ctrl+P
                                         │
                              ┌──────────▼──────────┐
                              │  CommandPalette       │
                              │  (overlay component)  │
                              │  ┌─────────────────┐  │
                              │  │ Input (filter)  │  │
                              │  │ SelectList      │  │
                              │  │ (commands)      │  │
                              │  └─────────────────┘  │
                              │  ArgPromptFlow state   │
                              │  └─ Input per arg      │
                              └───────────────────────┘
                                         │
                                store.apply(name, args)
                                         │
                              Phase 4 Store (undo/redo/save)
```

### Recommended Project Structure

```
src/
└── canvas/
    ├── root.ts                        # RootCanvas: Component, owns FocusState + subscription
    ├── focus-fsm.ts                   # FocusState type + transition function
    ├── help-line.ts                   # Pure: FocusState → string (help text)
    ├── save-indicator.ts              # Pure: dirty: boolean → '●' | '✓'
    ├── horizontal-layout.ts           # HorizontalLayout: renders 3 panes side-by-side
    ├── panes/
    │   ├── screens-list.ts            # ScreensListPane: Component
    │   ├── property-inspector.ts      # PropertyInspectorPane: Component + input mode
    │   └── wireframe-preview.ts       # WireframePreviewPane: Component (read-only)
    └── palette/
        └── index.ts                   # CommandPalette: Component (overlay, arg-prompt FSM)
scripts/
└── canvas.ts                          # CLI entry: parseSpecFile → createStore → ctx.ui.custom
tests/
├── canvas-focus.test.ts               # Tab/Shift-Tab cycle, global key routing
├── canvas-render.test.ts              # Pane snapshot, save indicator, help line
├── canvas-chrome.test.ts              # No raw escape sequences (CANVAS-06)
└── canvas-integration.test.ts         # Open fixture → select → edit → quit → reopen
```

### Pattern 1: ctx.ui.custom() — Two Forms

**Simple form** (for non-promise extensions):
```typescript
// Source: https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/tui.md
const handle = ctx.ui.custom(myComponent);
// handle.requestRender() — trigger re-render after state change
// handle.close() — restore normal UI
```

**Callback form** (for awaitable result):
```typescript
// Source: https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/extensions.md
const result = await ctx.ui.custom<boolean>((tui, theme, keybindings, done) => {
  const component = { /* render, invalidate, handleInput */ };
  return component;
});
```

**For scripts/canvas.ts:** use the simple form with an explicit `await new Promise()` wrapper so `store.flush()` can be called before `handle.close()`:
```typescript
// Source: [ASSUMED — pattern derived from MySelector example in pi-tui docs]
const canvas = new RootCanvas(store);
await new Promise<void>((resolve) => {
  canvas.onQuit = async () => {
    await store.flush();
    handle.close();
    resolve();
  };
  const handle = ctx.ui.custom(canvas);
});
```

### Pattern 2: Component Interface (Exact Signatures)

```typescript
// Source: https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/tui.md
interface Component {
  render(width: number): string[];
  handleInput?(data: string): void;
  wantsKeyRelease?: boolean;
  invalidate(): void;
}

// Focusable — implement when component contains Input or Editor children
// (required for IME cursor positioning)
interface Focusable {
  focused: boolean;  // set by TUI when focus changes
}
```

**CRITICAL:** Every line in `render(width)` MUST NOT exceed `width` visible columns. pi-tui THROWS if any line is too wide. Use `truncateToWidth(line, width)`.

### Pattern 3: Horizontal 3-Pane Layout

There is NO built-in horizontal container in pi-tui. `Container.render(width)` stacks children vertically. The horizontal layout requires a custom compositor:

```typescript
// Source: Pattern derived from pi-tui's compositeLineAt internal + sliceByColumn utility
// [VERIFIED: tui.ts source confirms Container is vertical-only]
class HorizontalLayout implements Component {
  constructor(
    private panes: Array<{ component: Component; widthFn: (total: number) => number }>
  ) {}

  render(width: number): string[] {
    const widths = this.panes.map(p => p.widthFn(width));
    const lineArrays = this.panes.map((p, i) => p.component.render(widths[i]!));

    const maxLines = Math.max(...lineArrays.map(a => a.length));
    const result: string[] = [];

    for (let row = 0; row < maxLines; row++) {
      let line = "";
      for (let col = 0; col < this.panes.length; col++) {
        const paneLines = lineArrays[col]!;
        const paneLine = paneLines[row] ?? " ".repeat(widths[col]!);
        // Use truncateToWidth to ensure exact width (ANSI-aware)
        line += truncateToWidth(paneLine, widths[col]!, "", true); // pad=true
      }
      result.push(line);
    }
    return result;
  }

  invalidate(): void {
    for (const p of this.panes) p.component.invalidate();
  }
}
```

**Width calculation for D-83 (20% / 40% / 40%):**
```typescript
function calcPaneWidths(total: number): [number, number, number] {
  if (total < 75) {
    // Collapse preview: screens=20%, inspector=80%
    const screens = Math.max(15, Math.floor(total * 0.2));
    return [screens, total - screens, 0];
  }
  const screens = Math.max(15, Math.floor(total * 0.2));
  const preview = Math.max(30, Math.floor(total * 0.4));
  const inspector = Math.max(30, total - screens - preview);
  return [screens, inspector, preview];
}
```

### Pattern 4: Focus FSM

```typescript
// Source: Derived from D-77, D-78, D-79
// [ASSUMED: specific TypeScript shape; implementation details at planner's discretion]
type FocusState = "screens" | "inspector" | "preview" | "palette";

const FOCUS_CYCLE: FocusState[] = ["screens", "inspector", "preview"];

function nextFocus(state: FocusState, reverse = false): FocusState {
  if (state === "palette") return "screens"; // palette close → restore prior focus
  const idx = FOCUS_CYCLE.indexOf(state);
  if (idx === -1) return "screens";
  const next = reverse
    ? (idx - 1 + FOCUS_CYCLE.length) % FOCUS_CYCLE.length
    : (idx + 1) % FOCUS_CYCLE.length;
  return FOCUS_CYCLE[next]!;
}
```

**Root handleInput dispatch (D-78 — global keys first):**
```typescript
// Source: D-78 decision + pi-tui handleInput docs
handleInput(data: string): void {
  // Step 1: global guards (always win, regardless of focused pane)
  if (matchesKey(data, Key.ctrlShift("z")) || matchesKey(data, Key.ctrl("y"))) {
    void store.redo(); return;
  }
  if (matchesKey(data, Key.ctrl("z"))) {
    void store.undo(); return;
  }
  if (matchesKey(data, Key.ctrl("q"))) {
    this.onQuit?.(); return;
  }
  if (data === ":" || matchesKey(data, Key.ctrl("p"))) {
    this.openPalette(); return;
  }
  if (matchesKey(data, Key.tab)) {
    this.focus = nextFocus(this.focus); return;
  }
  if (matchesKey(data, Key.shift("tab"))) {
    this.focus = nextFocus(this.focus, true); return;
  }

  // Step 2: delegate to focused pane
  switch (this.focus) {
    case "screens":   this.screensPane.handleInput?.(data); break;
    case "inspector": this.inspectorPane.handleInput?.(data); break;
    case "preview":   /* read-only in Phase 5 */ break;
  }
}
```

### Pattern 5: SelectList API (for ScreensListPane and CommandPalette)

```typescript
// Source: https://github.com/badlogic/pi-mono/blob/main/packages/tui/src/components/select-list.ts
// [VERIFIED via Context7 + GitHub source]
interface SelectItem {
  value: string;
  label: string;
  description?: string;
}

interface SelectListTheme {
  selectedPrefix?: (t: string) => string;
  selectedText?: (t: string) => string;
  description?: (t: string) => string;
  scrollInfo?: (t: string) => string;
  noMatch?: (t: string) => string;
}

const list = new SelectList(items, maxVisible, theme, layoutOptions?);
list.onSelect = (item: SelectItem) => { /* handle selection */ };
list.onCancel = () => { /* handle escape */ };
list.onSelectionChange = (item: SelectItem) => { /* handle j/k navigation */ };
list.setFilter(query: string);  // for palette fuzzy filtering
list.setSelectedIndex(0);
list.getSelectedItem();         // → SelectItem | null
// Built-in: up/down arrows, enter (onSelect), escape/ctrl+c (onCancel)
```

**D-80 immediate selection:** Use `onSelectionChange` to update `activeScreenId` immediately on j/k navigation. Do NOT use `onSelect` for screen switching — that fires on Enter.

### Pattern 6: Input API (for property-inspector editing and palette search)

```typescript
// Source: https://github.com/badlogic/pi-mono/blob/main/packages/tui/src/components/input.ts
// [VERIFIED via Context7 + GitHub source]
const input = new Input();
input.focused = true;                    // Must set for IME cursor positioning
input.onSubmit = (value: string) => { /* enter key */ };
input.onEscape = () => { /* esc key */ };
input.getValue();    // → string
input.setValue("initial");
input.handleInput(data);  // delegate from parent's handleInput
input.render(width);      // → string[]
input.invalidate();
```

**Focus propagation for containers with embedded Input (CRITICAL):**
```typescript
// Source: https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/tui.md
// Container with embedded Input MUST implement Focusable and propagate focus to child.
class PropertyInspectorPane extends Container implements Focusable {
  private editInput = new Input();
  private _focused = false;

  get focused(): boolean { return this._focused; }
  set focused(value: boolean) {
    this._focused = value;
    if (this.editingField) this.editInput.focused = value;
  }
}
```

### Pattern 7: Overlay via tui.showOverlay()

The `tui` object is only available in the `ctx.ui.custom` callback form. For the canvas, we need to capture `tui` and store it:

```typescript
// Source: https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/tui.md
// [VERIFIED: tui.showOverlay() API confirmed in pi-mono source]
let capturedTui: typeof tui;

await ctx.ui.custom<void>((tui, theme, keybindings, done) => {
  capturedTui = tui;
  const rootCanvas = new RootCanvas(store, { tui, theme, done });
  return rootCanvas;
});

// Inside RootCanvas.openPalette():
openPalette(): void {
  const palette = new CommandPalette({
    commands: Object.values(COMMANDS),
    theme: this.theme,
    onApply: (name, args) => { void this.store.apply(name, args); },
    onClose: () => paletteHandle.hide(),
  });
  const paletteHandle = this.tui.showOverlay(palette, {
    anchor: "top-center",
    width: "80%",
    maxHeight: "60%",
  });
}
```

**Alternative:** Keep canvas as simple form (`ctx.ui.custom(component)`) and implement the palette overlay by post-processing lines in `root.render()`. This avoids needing the `tui` reference but requires manual z-order compositing. **RECOMMENDED: use the callback form to get `tui`** so `showOverlay()` handles compositing correctly.

### Pattern 8: store.subscribe() + requestRender()

```typescript
// Source: store.ts (verified in codebase)
// Pattern: subscribe once in constructor, call handle.requestRender() on each snapshot
class RootCanvas implements Component {
  private snapshot: Snapshot;
  private unsubscribe: () => void;

  constructor(store: Store, handle: { requestRender: () => void }) {
    this.snapshot = { spec: store.getState().spec, diagnostics: [], dirty: false };
    this.unsubscribe = store.subscribe((snap) => {
      this.snapshot = snap;
      this.invalidate();
      handle.requestRender();
    });
  }
}
```

### Pattern 9: CommandPalette — Two-Form Component Object

Per the SelectList example, components returned from the ctx.ui.custom callback can be plain objects:

```typescript
// Source: [CITED: pi-tui SelectList example in tui.md]
return {
  render: (w) => container.render(w),
  invalidate: () => container.invalidate(),
  handleInput: (data) => {
    input.handleInput(data);
    selectList.handleInput(data);
    tui.requestRender();
  },
};
```

This is equivalent to a class implementing Component. Use whichever is cleaner per module.

### Anti-Patterns to Avoid

- **Pre-baking theme colors at construction time:** `new Text(theme.fg("accent", message), ...)` in a constructor breaks on theme change. Instead, apply theme in `render()`.
- **Long lines in render():** Any line exceeding `width` chars throws. Always use `truncateToWidth(line, width)`.
- **Pane binding global keys (`:`, `Ctrl+Z`, etc.):** Root must capture these BEFORE delegating. Panes must not shadow globals.
- **Calling `store.apply()` synchronously inside a `store.subscribe()` callback:** The store's re-entrancy guard queues this via `queueMicrotask`, which is safe, but any apply-in-subscribe pattern needs careful tracing. Avoid it; fire apply() from handleInput only.
- **Creating new palette instances without closing the old one:** Per pi-tui docs, overlays are disposed when closed. Never stash a reference for reuse; always `new CommandPalette()` on each open.
- **Omitting `handle.requestRender()` after state change:** pi-tui only re-renders when explicitly requested. After any state mutation (focus change, selection change), call `handle.requestRender()` — or inside the callback form, call `tui.requestRender()`.
- **Using `Container.render(width)` for horizontal layout:** Container stacks vertically. Side-by-side panes require the custom `HorizontalLayout` compositor.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fuzzy filter matching in palette | Custom Levenshtein/substring | `selectList.setFilter(query)` — SelectList has built-in filtering | Built-in prefix+substring; tested; avoids off-by-one bugs |
| ANSI-aware string width calculation | `str.length` | `visibleWidth(str)` from pi-tui | ANSI codes are zero-width; naive length over-counts |
| ANSI-aware string truncation | Slice by character index | `truncateToWidth(str, width)` from pi-tui | Naive slice corrupts mid-code; truncateToWidth closes open escapes |
| ANSI-aware column slicing | Custom regex | `sliceByColumn(line, start, len)` from pi-tui | Required for HorizontalLayout row compositing |
| Text input with cursor, kill ring, undo | Custom input widget | `Input` from pi-tui | Input has grapheme-aware cursor, kill ring, undo stack, bracketed paste — ~400 LOC of edge cases |
| Selection list with scroll, filter, themes | Custom list widget | `SelectList` from pi-tui | SelectList handles wrapping, scroll indicators, filter, onSelect/onCancel/onSelectionChange callbacks |
| Overlay z-order compositing | Post-process root.render() lines | `tui.showOverlay(component, options)` | Engine handles position calculation, focus capture, resize responsiveness |
| Key pattern matching | Raw string comparison | `matchesKey(data, Key.ctrl("z"))` or string `"ctrl+z"` | matchesKey handles Kitty protocol + legacy terminal sequences both |

**Key insight:** pi-tui provides complete implementations of the hardest TUI primitives (input with cursor, selection with scroll, ANSI text utilities). The canvas layer builds structure (layout, focus routing, store wiring) — it does not re-implement these low-level concerns.

---

## Common Pitfalls

### Pitfall 1: Line Width Throws
**What goes wrong:** pi-tui throws at render time if any line from `render(width)` exceeds `width` visible columns.
**Why it happens:** Developers forget that ANSI codes make `str.length` larger than visible width.
**How to avoid:** End every `render(width)` line with `truncateToWidth(line, width)` or `truncateToWidth(line, width, "", true)` (pad=true) for exact-width lines.
**Warning signs:** `Error: line exceeds width` at runtime; only visible with a real or mocked terminal width.

### Pitfall 2: No requestRender() After State Mutation
**What goes wrong:** State changes (focus cycle, screen selection) appear to have no effect — the screen doesn't update.
**Why it happens:** pi-tui is pull-based; it only re-renders when told to. `invalidate()` clears caches but doesn't trigger a render pass.
**How to avoid:** After every state mutation in `handleInput`, call `handle.requestRender()` (simple form) or `tui.requestRender()` (callback form). Wire `store.subscribe` to call `handle.requestRender()` too.
**Warning signs:** Keyboard events are handled (no errors) but display doesn't change.

### Pitfall 3: Focus Not Propagated to Input Children (IME Cursor)
**What goes wrong:** The hardware cursor appears at position (0,0) instead of inside the Input field; CJK IME windows open in the wrong place.
**Why it happens:** Container components with embedded Input children must implement `Focusable` and set `this.editInput.focused = value` in the focus setter.
**How to avoid:** Any component containing `Input` or `Editor` must implement `Focusable` with a getter/setter that propagates focus to the active child.
**Warning signs:** Cursor appears at top-left; IME broken for non-Latin input.

### Pitfall 4: Pre-Baked Theme Colors Stale After Theme Change
**What goes wrong:** Component renders with wrong colors after user switches pi theme.
**Why it happens:** If `theme.fg("accent", text)` is called in the constructor and the result stored, the cached ANSI codes become wrong after theme update.
**How to avoid:** Apply `theme.fg()` inside `render()`, not in constructors or field initializers. Receive `theme` as a constructor arg and store it for `render()` use.
**Warning signs:** Colors don't change when user runs `/theme <name>`; `invalidate()` doesn't fix it.

### Pitfall 5: Palette Overlay Using Stale Component Reference
**What goes wrong:** Second palette open shows content from the first open (stale state, wrong filter).
**Why it happens:** Reusing an old `CommandPalette` instance after `paletteHandle.hide()` — overlays are disposed.
**How to avoid:** Always `new CommandPalette()` on each open. Per pi-tui docs: "Overlay components are disposed when closed. Do not reuse references."
**Warning signs:** Palette search field pre-filled with previous query; command list not re-filtered.

### Pitfall 6: Raw Escape Sequences Failing CANVAS-06
**What goes wrong:** `tests/canvas-chrome.test.ts` fails because a component emits `\x1b[?1049h` (alt-buffer) or `\x1b[2J` (clear screen).
**Why it happens:** Using `process.stdout.write` directly, or using a third-party library (blessed, ink) that takes over the terminal.
**How to avoid:** Only produce string arrays from `render()`; use theme.fg() for color; use box-drawing chars for borders. Never `process.stdout.write` from component code.
**Warning signs:** Screen flickers or goes blank; chrome test fails with assertion on escape sequence content.

### Pitfall 7: Applying Commands During subscribe() Notification
**What goes wrong:** Unexpected sequencing; apply() gets queued via queueMicrotask, creating non-obvious async ordering.
**Why it happens:** store.apply() inside a store.subscribe() callback triggers the re-entrancy guard (T-04-04).
**How to avoid:** Only call store.apply() from handleInput() flows, never from subscribe() callbacks. The canvas should treat subscribe() as read-only.
**Warning signs:** Undo stack has unexpected entries; apply result diagnostics arrive out of order.

### Pitfall 8: HorizontalLayout Width Sum Overflow
**What goes wrong:** The total of pane widths exceeds terminal width, causing line-too-wide throws.
**Why it happens:** Floating-point floor rounding leaves slack or overflow in the 20/40/40 split.
**How to avoid:** Use the `calcPaneWidths` function from this research (D-83 logic) which distributes remainder to the inspector pane. The last pane gets `total - screens - preview` to absorb rounding.
**Warning signs:** Intermittent throws on specific terminal widths (e.g., 79, 119).

---

## Code Examples

### Verified patterns from official sources

#### Minimal Component That Passes Chrome Gate (CANVAS-06)

```typescript
// Source: [CITED: tui.md Component interface docs]
class SafeComponent implements Component {
  private cache: { width: number; lines: string[] } | null = null;

  render(width: number): string[] {
    if (this.cache?.width === width) return this.cache.lines;
    const lines = [
      truncateToWidth("Hello canvas", width),  // MUST use truncateToWidth
    ];
    this.cache = { width, lines };
    return lines;
  }

  handleInput(_data: string): void { /* no process.stdout.write ever */ }

  invalidate(): void { this.cache = null; }
}
```

#### SelectList for ScreensListPane

```typescript
// Source: [CITED: select-list.ts source + tui.md SelectList example]
const screenItems: SelectItem[] = spec.screens.map(s => ({
  value: s.id,
  label: s.title,
}));

const list = new SelectList(screenItems, 20, {
  selectedPrefix: (t) => theme.fg("accent", t),
  selectedText: (t) => theme.fg("accent", t),
});

// D-80: immediate selection on navigation
list.onSelectionChange = (item) => {
  activeScreenId = item.value;
  handle.requestRender();
};

// onSelect fires on Enter — use for palette confirmation, not screen switching
list.onSelect = (item) => {
  activeScreenId = item.value;
};
```

#### Arg-Prompt Flow in CommandPalette

```typescript
// Source: [ASSUMED: derived from Input API + D-75 decision]
// Sequential arg prompts using a state machine over argsSchema.shape entries
type PalettePhase =
  | { kind: "filter" }
  | { kind: "arg-prompt"; commandName: string; argKeys: string[]; argIdx: number; collectedArgs: Record<string, string> };

// In handleInput:
if (phase.kind === "arg-prompt" && matchesKey(data, Key.enter)) {
  const currentArg = phase.argKeys[phase.argIdx]!;
  const collected = { ...phase.collectedArgs, [currentArg]: input.getValue() };
  if (phase.argIdx + 1 < phase.argKeys.length) {
    // More args: advance
    this.phase = { ...phase, argIdx: phase.argIdx + 1, collectedArgs: collected };
    this.input.setValue("");
  } else {
    // All args collected: apply command
    void store.apply(phase.commandName, collected);
    this.close();
  }
}
```

#### Header Line with Save Indicator (D-85)

```typescript
// Source: [ASSUMED: derived from D-85 + truncateToWidth docs]
function renderHeader(width: number, dirty: boolean, theme: Theme): string {
  const indicator = dirty ? theme.fg("warning", "●") : theme.fg("success", "✓");
  const title = "mobile-tui canvas";
  const label = `${title} ${indicator}`;
  // Pad to full width; indicator goes right
  const visible = visibleWidth(label);
  return label + " ".repeat(Math.max(0, width - visible));
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `ctx.ui.custom(cb)` awaitable | `ctx.ui.custom(component)` returns handle | pi 0.67.x | Both forms exist; handle form is simpler for non-async use |
| Manual overlay compositing | `tui.showOverlay(component, options)` | pi 0.67.x | Engine handles z-order; no hand-rolling required |
| `isFocusable(component)` guard | Implement `Focusable` interface directly | Current | Components with Input children must implement Focusable |

**Deprecated/outdated:**
- Using `process.stdout.write` in components: replaced entirely by `render(width): string[]` return
- Blessed/Ink: never valid inside pi; documented as incompatible in CLAUDE.md

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | scripts/canvas.ts uses `const handle = ctx.ui.custom(component)` simple form (not callback form) for Phase 9 compatibility | Pattern 1 | If Phase 9 needs the callback form, canvas.ts must be rewritten; low risk since both forms produce a handle |
| A2 | `tui.showOverlay()` is accessible inside the ctx.ui.custom callback as the `tui` parameter | Pattern 7 | If `tui` is a different type without showOverlay, palette must be hand-composited; medium risk |
| A3 | Sequential arg-prompt flow implemented as a state machine inside CommandPalette | Code Examples | Alternative: one Input per arg shown simultaneously; either works |
| A4 | `Key.ctrlShift("z")` is the correct pattern for Ctrl+Shift+Z (redo) | Pattern 4 | Check against matchesKey docs if this key pattern fails; use `"ctrl+shift+z"` string form as fallback |
| A5 | `DynamicBorder` is imported from `@mariozechner/pi-coding-agent`, not pi-tui | Pattern 9 / Standard Stack | If wrong import path, adjust; confirmed by SelectList example in tui.md |
| A6 | `handle.requestRender()` is the correct method name on the handle returned by `ctx.ui.custom(component)` | Pattern 8 | Verified in tui.md docs: "handle.requestRender() - trigger re-render"; LOW risk |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed.
All entries above are ASSUMED or derived. The confirmed/verified claims are in Standard Stack and Code Examples.

---

## Open Questions (RESOLVED)

1. **Does `tui.showOverlay()` require the callback form of `ctx.ui.custom()`?**
   **RESOLVED:** The callback form is required. `ctx.ui.custom<void>((tui, theme, _kb, done) => {...})` is the only path that exposes the `tui` parameter with its `showOverlay()` method. The simple form `ctx.ui.custom(component)` returns a handle but does not provide a `tui` reference — overlay compositing would require manual line-level merging in `root.render()`. Plan 06 already uses the callback form; assumption A2 confirmed correct.

2. **What is `DynamicBorder`'s exact constructor signature?**
   **RESOLVED by non-use.** The plans do not use `DynamicBorder`. D-79 focus borders are implemented via a `drawBorderedPane(lines, focused, theme)` pure function in `horizontal-layout.ts` that prepends/appends Unicode box-drawing rows colored with `theme.fg("accent", ...)` (focused) or `theme.fg("muted", ...)` (unfocused). No `DynamicBorder` import needed; no constructor signature risk.

3. **Does `SelectListTheme` require all fields or are they optional?**
   **RESOLVED by safe mitigation.** All 5 theme fields (`selectedPrefix`, `selectedText`, `description`, `scrollInfo`, `noMatch`) are provided in all SelectList instantiations. If the type marks them optional, providing all 5 is harmless. If it requires all 5, we comply. Either way, no runtime error.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 5 is a code/config-only addition. No external tools, CLIs, databases, or services required beyond the existing Node 20+ runtime. `@mariozechner/pi-tui` and `@mariozechner/pi-coding-agent` are peer deps already in the project's peerDependencies (or will be added). No `npm install` of net-new packages needed.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest ^4.1.4 |
| Config file | vitest.config.ts (existing) |
| Quick run command | `npx vitest run tests/canvas-*.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CANVAS-01 | Tab/Shift-Tab cycle through 3 panes; focus border changes | unit | `npx vitest run tests/canvas-focus.test.ts` | ❌ Wave 0 |
| CANVAS-01 | Pane content snapshot matches fixture spec | unit (snapshot) | `npx vitest run tests/canvas-render.test.ts` | ❌ Wave 0 |
| CANVAS-02 | Palette opens on `:` and `Ctrl+P`; lists COMMANDS | unit | `npx vitest run tests/canvas-focus.test.ts` | ❌ Wave 0 |
| CANVAS-03 | Help line shows correct keybindings per focus state | unit | `npx vitest run tests/canvas-render.test.ts` | ❌ Wave 0 |
| CANVAS-04 | Save indicator shows `●` when dirty, `✓` when clean | unit | `npx vitest run tests/canvas-render.test.ts` | ❌ Wave 0 |
| CANVAS-05 | scripts/canvas.ts loads fixture without wizard | smoke/manual | `npx tsx scripts/canvas.ts fixtures/todo.spec.md` | ❌ Wave 0 |
| CANVAS-06 | No raw alt-buffer escape sequences in render output | unit (assertion) | `npx vitest run tests/canvas-chrome.test.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run tests/canvas-focus.test.ts tests/canvas-render.test.ts tests/canvas-chrome.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/canvas-focus.test.ts` — covers CANVAS-01, CANVAS-02
- [ ] `tests/canvas-render.test.ts` — covers CANVAS-01, CANVAS-03, CANVAS-04
- [ ] `tests/canvas-chrome.test.ts` — covers CANVAS-06
- [ ] `tests/canvas-integration.test.ts` — covers CANVAS-05 (integration smoke)
- [ ] `src/canvas/` directory — all canvas module stubs

*(Existing test infrastructure in `tests/` covers Phases 1-4 fully; canvas tests are net-new.)*

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes | command args validated by `command.argsSchema.safeParse()` (Phase 4 Store — T-04-01) |
| V6 Cryptography | no | — |

### Known Threat Patterns for Canvas TUI

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Arg injection via palette Input | Tampering | Store.apply() validates args through argsSchema.safeParse() before reaching command.apply() — T-04-01 |
| Path traversal in specPath CLI arg | Tampering | Inherited from parseSpecFile security posture (T-04-22); Phase 9 pi sandbox will restrict fs |
| Prototype pollution via user-typed arg keys | Tampering | Object.create(null) pattern in parseFlagsAgainstSchema (T-04-23); palette also uses argsSchema — same protection |
| Raw escape sequence injection from spec content | Tampering | CANVAS-06 chrome test catches this; spec content rendered through wireframe pure function, not raw |

---

## Sources

### Primary (HIGH confidence)

- Context7 `/badlogic/pi-mono` — Component interface, SelectList API, Input API, Container, Box, matchesKey, Key, visibleWidth, truncateToWidth, sliceByColumn, showOverlay, Focusable interface, ctx.ui.custom() both forms, DynamicBorder usage, caching patterns
- `https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/tui.md` — Complete TUI component docs including overlay, focus, theming pitfalls
- `https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/extensions.md` — ctx.ui.custom() callback form, theme.fg() color tokens
- `https://github.com/badlogic/pi-mono/blob/main/packages/tui/src/tui.ts` — Container vertical-only render confirmed, showOverlay API, compositeLineAt logic
- `https://github.com/badlogic/pi-mono/blob/main/packages/tui/src/components/select-list.ts` — SelectList constructor, callbacks, keyboard handling
- `https://github.com/badlogic/pi-mono/blob/main/packages/tui/src/components/input.ts` — Input focused, onSubmit, onEscape
- `https://github.com/badlogic/pi-mono/blob/main/packages/tui/src/components/box.ts` — Box padding-only, no border/title
- `https://github.com/badlogic/pi-mono/blob/main/packages/tui/src/utils.ts` — visibleWidth, truncateToWidth, sliceByColumn
- `src/editor/store.ts` (local codebase) — Store.subscribe(), Store.apply(), flush(), re-entrancy guard
- `src/editor/types.ts` (local codebase) — Snapshot shape, Store interface
- `src/editor/commands/index.ts` (local codebase) — COMMANDS registry shape (34 commands)
- `scripts/cli-edit.ts` (local codebase) — Established entry pattern: parseSpecFile → createStore → explicit flush

### Secondary (MEDIUM confidence)

- `https://deepwiki.com/badlogic/pi-mono/5-pi-tui:-terminal-ui-library` — TUI architecture overview; confirmed Container is vertical-only; confirmed Focusable interface shape

### Tertiary (LOW confidence)

- `https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/themes.md` — 51 theme color tokens documented; borderAccent token useful for focused pane borders

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — pi-tui API fully verified via Context7 + GitHub source; no new deps needed
- Architecture: HIGH — Component interface, HorizontalLayout pattern, overlay via showOverlay() all verified
- Focus routing: HIGH — root-dispatch pattern confirmed by pi-tui docs (focusedComponent is TUI-internal; panes use root dispatch)
- Pitfalls: HIGH — pre-baking theme, missing requestRender, line-width throws all documented in official tui.md
- SelectList/Input API: HIGH — constructor signatures, callbacks, keyboard handling all verified from source
- HorizontalLayout implementation: MEDIUM — pattern derived from tui internals (compositeLineAt); exact Column-compositing code is [ASSUMED] but based on verified sliceByColumn + visibleWidth utilities
- Overlay capture of `tui` reference: MEDIUM — callback form clearly exposes `tui`; whether simple form can also access it is ASSUMED

**Research date:** 2026-04-19
**Valid until:** 2026-07-19 (stable — pi-tui API is unlikely to break between 0.67.x patch versions)
