---
phase: 05-canvas-tui-shell
reviewed: 2026-04-19T00:00:00Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - src/canvas/focus-fsm.ts
  - src/canvas/help-line.ts
  - src/canvas/save-indicator.ts
  - src/canvas/horizontal-layout.ts
  - src/canvas/tui-utils.ts
  - src/canvas/panes/screens-list.ts
  - src/canvas/panes/property-inspector.ts
  - src/canvas/panes/wireframe-preview.ts
  - src/canvas/palette/index.ts
  - src/canvas/root.ts
  - scripts/canvas.ts
  - tests/canvas-focus.test.ts
  - tests/canvas-render.test.ts
  - tests/canvas-chrome.test.ts
  - tests/canvas-integration.test.ts
findings:
  critical: 0
  warning: 4
  info: 4
  total: 8
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-04-19
**Depth:** standard
**Files Reviewed:** 15
**Status:** issues_found

## Summary

Reviewed 11 source files and 4 test files implementing the canvas TUI shell (Phase 5). The architecture is clean: pure-function FSM, pull-based rendering pipeline, explicit placeholder returns, and correct `void` on fire-and-forget async calls in most places. No security vulnerabilities or data-loss risks found.

Four warnings require attention before Phase 9 wires this to a real pi terminal: a stale-width line cache bug in `WireframePreviewPane`, a silent unhandled rejection in `PropertyInspectorPane.commitEdit`, a dual-focus construction bug in `CommandPalette`, and an unsafe cast that bypasses readonly in `RootCanvas.render`. One test has a structural defect that always passes regardless of whether `apply` was called.

The most impactful issue for correctness is the wireframe cache width mismatch (WR-01) — it will produce visually wrong output at any terminal width other than the one used for the first render call.

---

## Warnings

### WR-01: WireframePreviewPane line cache ignores render width — stale lines at different widths

**File:** `src/canvas/panes/wireframe-preview.ts:117-131`
**Issue:** The line cache (`this.lineCache`) is populated on the first `render(width)` call and reused for all subsequent calls until `invalidate()` or `update()` is called. The cache key is simply "non-null", with no record of which `width` it was built for. If the terminal is resized, or if `render(40)` is called and then `render(60)` is called in the same tick (e.g. during a test comparing widths), the second call returns lines truncated to 40 characters padded to 40 — not to 60. This produces visually wrong wireframe output at any width other than the first-render width.

**Fix:**
```typescript
// Track the width at which the cache was computed
private lineCacheWidth: number | null = null;

render(width: number): string[] {
  if (!this.snapshot || !this.activeScreenId) {
    return [truncateToWidth("(no screen selected)", width)];
  }

  if (!this.lineCache || this.lineCacheWidth !== width) {
    try {
      const text = renderSingleVariant(this.snapshot.spec, this.activeScreenId, "content", {
        diagnostics: this.snapshot.diagnostics,
      });
      this.lineCache = text.split("\n").map((l) => truncateToWidth(l, width));
      this.lineCacheWidth = width;
    } catch {
      this.lineCache = [truncateToWidth("(wireframe unavailable)", width)];
      this.lineCacheWidth = width;
    }
  }

  return this.lineCache;
}

invalidate(): void {
  this.lineCache = null;
  this.lineCacheWidth = null;
}
```

---

### WR-02: PropertyInspectorPane.commitEdit — unhandled async rejection silently swallowed

**File:** `src/canvas/panes/property-inspector.ts:351-352`
**Issue:** `commitEdit()` is `async` and called via `void this.commitEdit()` inside the synchronous `handleInput`. If `store.apply` rejects (e.g. network error, store throws), the rejection propagates out of `commitEdit` and is swallowed by `void` with no error surface — no diagnostic, no UI feedback, no crash. The user sees nothing; the edit silently fails. In a TUI where all feedback is rendered output, silent failures are particularly harmful because there is no console visible to the user.

**Fix:** Add a `.catch` to the `void` call to surface errors as a diagnostic or pane message:
```typescript
// In handleInput, replace:
void this.commitEdit();

// With:
void this.commitEdit().catch((err) => {
  // Surface to a visible error state, e.g. set a transient error message
  this._lastError = err instanceof Error ? err.message : String(err);
});
```
Or make `handleInput` itself `async` and `await this.commitEdit()` — however that requires the caller to also await, which may not be compatible with the pi-tui `handleInput` interface. The `.catch` approach is the minimal fix.

---

### WR-03: CommandPalette constructor sets argInput.focused = true before arg-prompt phase begins

**File:** `src/canvas/palette/index.ts:308-310`
**Issue:** In the `CommandPalette` constructor, both `filterInput.focused = true` and `argInput.focused = true` are set unconditionally. The `argInput` cursor indicator (`_`) will appear in any render call that displays `argInput` even during the filter phase — but more importantly, both inputs are logically "focused" simultaneously at construction, which is incorrect. While `argInput` is not rendered during the filter phase, setting `focused = true` on it at construction before it is needed is a state correctness bug that could cause confusing render output if the render logic changes.

**Fix:**
```typescript
// In constructor, only focus the filterInput:
this.filterInput.focused = true;
// argInput starts unfocused — focused only when arg-prompt phase begins:
this.argInput.focused = false;

// In startArgPrompt(), already correctly sets:
this.argInput.focused = true;  // line 433 — this is correct
```
Remove `this.argInput.focused = true` from the constructor (line 310).

---

### WR-04: RootCanvas.render bypasses readonly via unsafe cast to mutate layout panes every frame

**File:** `src/canvas/root.ts:314`
**Issue:** `HorizontalLayout` is constructed with an empty `panes` array in the constructor (line 118), then every `render()` call overwrites the `private readonly panes` field using an unsafe cast:
```typescript
(this.layout as unknown as { panes: typeof paneSpecs }).panes = paneSpecs;
```
This defeats TypeScript's `readonly` guarantee, is fragile (a rename of the private field breaks it silently at runtime), and makes the `layout` field pointless as a cached object since its state is reset every frame. The `readonly` modifier on `HorizontalLayout.panes` implies it should not change after construction.

**Fix:** Remove the `HorizontalLayout` caching entirely for panes that vary per-render, and instead construct a fresh `HorizontalLayout` per render, or add a `setPanes()` method to `HorizontalLayout`:
```typescript
// Option A — remove the cached layout field; construct inline in render():
render(width: number): string[] {
  const [w1, w2, w3] = calcPaneWidths(width);
  const paneSpecs = [
    { component: this.screensPane as Component, width: w1 },
    { component: this.inspectorPane as Component, width: w2 },
    ...(w3 > 0 ? [{ component: this.previewPane as Component, width: w3 }] : []),
  ];
  const layout = new HorizontalLayout(paneSpecs, this.theme);
  const bodyLines = layout.render(width, focusedIndex);
  // ...
}

// Option B — add to HorizontalLayout:
setPanes(panes: PaneSpec[]): void {
  (this as unknown as { panes: PaneSpec[] }).panes = panes; // move cast here
}
```
Option A is simpler since `HorizontalLayout` has no render cache of its own.

---

## Info

### IN-01: Test structural defect — vi.spyOn() inside expect() never catches prior calls

**File:** `tests/canvas-render.test.ts:245`
**Issue:** The assertion `expect(vi.spyOn(store, "apply")).not.toHaveBeenCalled()` creates a brand-new spy at the moment of the `expect()` call. A spy created at assertion time has zero calls recorded by definition — this assertion always passes regardless of whether `store.apply` was actually called before. The intent is to verify `apply` was not called during arg selection, but the test does not actually verify this.

**Fix:** Create the spy before the action under test:
```typescript
it("selecting a command with required args enters arg-prompt flow", () => {
  const store = makeStubStore();
  const onClose = vi.fn();
  const applySpy = vi.spyOn(store, "apply"); // spy created BEFORE actions
  const palette = new CommandPalette(store, onClose, mockTheme);
  // ... perform actions ...
  palette.handleInput("\r");
  // Now the assertion is meaningful:
  expect(applySpy).not.toHaveBeenCalled();
});
```

---

### IN-02: ANSI-aware truncateToWidth duplicated verbatim across three files

**File:** `src/canvas/panes/screens-list.ts:54-91`, `src/canvas/panes/wireframe-preview.ts:40-76`, `src/canvas/palette/index.ts:46-78`
**Issue:** The ANSI-aware `truncateToWidth` implementation (including the `ANSI_SGR` regex and the character-by-character ANSI-skip loop) is copy-pasted identically across three source files. The simpler version in `tui-utils.ts` is explicitly not ANSI-aware. Any bug fix or improvement (e.g., handling OSC sequences, multi-byte emoji) would need to be applied in three places.

**Fix:** Move the ANSI-aware implementation into `tui-utils.ts` alongside the existing shim, or into a dedicated `src/canvas/ansi-utils.ts`, and import it from the three consumers:
```typescript
// src/canvas/tui-utils.ts — replace the simple shim with the ANSI-aware version:
const ANSI_SGR = new RegExp("\x1b\\[[0-9;]*m", "g");

export function truncateToWidth(str: string, width: number, _ellipsis = "", pad = false): string {
  // ... ANSI-aware implementation ...
}
```

---

### IN-03: ScreensListPane.render double-truncates every line

**File:** `src/canvas/panes/screens-list.ts:262-264`
**Issue:** `ScreensListPane.render(width)` calls `this.list.render(width)` which already calls `truncateToWidth(line, width)` on every line internally (screens-list.ts lines 176, 200). The outer `render()` then applies `truncateToWidth` again on the already-padded-and-truncated result. This is harmless but redundant — it causes double-padding which wastes one string allocation per line per frame.

**Fix:** Remove the outer map since `InlineSelectList.render()` already guarantees all lines are truncated to `width`:
```typescript
render(width: number): string[] {
  // InlineSelectList.render() already calls truncateToWidth internally
  return this.list.render(width);
}
```

---

### IN-04: nextFocus ignores the reverse parameter when state is "palette"

**File:** `src/canvas/focus-fsm.ts:26`
**Issue:** When `state === "palette"`, `nextFocus` always returns `"screens"` regardless of the `reverse` argument. This is documented and intentional per the comment, but the `reverse` parameter is silently ignored, which could surprise a caller who expects `nextFocus("palette", true)` to behave differently from `nextFocus("palette", false)`. Currently `root.ts` only calls `nextFocus` on non-palette states (Tab is intercepted before the palette guard), so this has no runtime impact. However it makes the function's contract slightly inconsistent.

**Fix:** Either document the behavior explicitly in the JSDoc, or if palette should restore to the pre-palette pane on Tab (which `root.ts` handles via `prePaletteFocus`), simply keep the current behavior but note it in the doc:
```typescript
/**
 * Advance (or reverse) the focus cycle (D-77).
 * If the current state is "palette", always returns "screens" regardless of
 * the `reverse` flag — palette collapse always goes to the cycle start.
 * (Palette restoration to prePaletteFocus is handled at the RootCanvas level.)
 */
export function nextFocus(state: FocusState, reverse = false): FocusState {
```

---

_Reviewed: 2026-04-19_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
