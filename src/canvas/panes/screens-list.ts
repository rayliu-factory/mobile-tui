// src/canvas/panes/screens-list.ts
// Left pane: list of screens in the active spec.
// Analog: src/editor/store.ts (subscription pattern) +
//         tests/autosave-debounce.test.ts (stub-store pattern).
//
// Implementation plan 05-03.
//
// Note: @mariozechner/pi-tui is a peer dependency (not installed in devDependencies).
// The SelectList component and truncateToWidth utility are implemented inline here
// to allow tsc --noEmit and vitest to work without the runtime pi-tui install.
// At extension runtime, these would normally be imported from "@mariozechner/pi-tui".
// Rule 3 deviation: inline implementation required because pi-tui is not installed.
//
// D-80: immediate selection — cursor move via j/k calls onSelectionChange, NOT onSelect
// D-81: "> name" (active), "  name" (others), ⚠ suffix for error screens
// D-82: all screens from spec.screens in order

import type { Snapshot } from "../../editor/types.ts";

/**
 * Minimal Component interface (mirrors @mariozechner/pi-tui).
 * Used as a local type alias so stubs compile without importing pi-tui.
 */
interface Component {
  render(width: number): string[];
  handleInput?(data: string): void;
  invalidate(): void;
}

/**
 * Minimal theme interface — subset of pi-tui Theme used by this pane.
 */
interface CanvasTheme {
  fg: (token: string, str: string) => string;
}

/**
 * Inline SelectItem shape (mirrors @mariozechner/pi-tui SelectList item).
 */
interface SelectItem {
  value: string;
  label: string;
}

/**
 * Truncate a string to a maximum visible width (stripping ANSI codes for measurement).
 * This mirrors truncateToWidth from @mariozechner/pi-tui.
 * ANSI escape sequences are transparent to visible-width counting.
 */
// Regex to strip SGR ANSI color codes (ESC [ ... m). Built via RegExp constructor
// to avoid the biome noControlCharactersInRegex lint rule on regex literals.
const ANSI_SGR = new RegExp("\x1b\\[[0-9;]*m", "g");

function truncateToWidth(str: string, width: number): string {
  if (width <= 0) return "";
  // Measure visible width (strip ANSI codes for counting)
  const stripped = str.replace(ANSI_SGR, "");
  if (stripped.length <= width) {
    // Pad to exact width with spaces (after the visible content)
    return str + " ".repeat(width - stripped.length);
  }
  // Need to truncate — work on the raw string but count visible chars
  // Simple approach: rebuild character-by-character, tracking visible position
  let visibleCount = 0;
  let result = "";
  let i = 0;
  while (i < str.length && visibleCount < width) {
    if (str[i] === "\x1b") {
      // ANSI sequence — copy entirely without counting
      const start = i;
      i++; // skip ESC
      if (i < str.length && str[i] === "[") {
        i++; // skip [
        while (i < str.length && !/[A-Za-z]/.test(str[i] ?? "")) i++;
        if (i < str.length) i++; // skip terminator
      }
      result += str.slice(start, i);
    } else {
      if (visibleCount < width) {
        result += str[i];
        visibleCount++;
      }
      i++;
    }
  }
  // Pad remaining if short
  if (visibleCount < width) {
    result += " ".repeat(width - visibleCount);
  }
  return result;
}

/**
 * Inline mini SelectList that mirrors @mariozechner/pi-tui SelectList API.
 * Provides: immediate j/k selection (D-80), "> " active prefix, "  " inactive prefix,
 * truncated labels per D-81.
 */
class InlineSelectList {
  private items: SelectItem[] = [];
  private selectedIndex = 0;

  /** Fires on j/k navigation (D-80 immediate selection) */
  onSelectionChange?: (item: SelectItem) => void;
  /** Fires on Enter */
  onSelect?: (item: SelectItem) => void;
  /** Fires on Escape */
  onCancel?: () => void;

  constructor(
    items: SelectItem[],
    private readonly maxVisible: number,
    private readonly theme: CanvasTheme,
  ) {
    this.items = [...items];
    if (this.items.length > 0) {
      // Fire initial selection so the caller has an activeScreenId immediately
      const first = this.items[0];
      if (first) {
        // Don't fire in constructor — caller calls update() which triggers this
      }
    }
  }

  setItems(items: SelectItem[]): void {
    const prevId = this.getSelectedItem()?.value;
    this.items = [...items];
    // Preserve selection if the previous ID is still in the new list
    if (prevId !== undefined) {
      const newIdx = this.items.findIndex((i) => i.value === prevId);
      this.selectedIndex = newIdx >= 0 ? newIdx : 0;
    } else {
      this.selectedIndex = 0;
    }
  }

  getSelectedItem(): SelectItem | null {
    return this.items[this.selectedIndex] ?? null;
  }

  setSelectedIndex(n: number): void {
    this.selectedIndex = Math.max(0, Math.min(n, this.items.length - 1));
  }

  setFilter(_query: string): void {
    // No-op for ScreensListPane (no fuzzy filter on screen list)
  }

  handleInput(data: string): void {
    if (data === "j" || data === "\x1b[B") {
      // Down arrow or j
      if (this.selectedIndex < this.items.length - 1) {
        this.selectedIndex++;
        const item = this.items[this.selectedIndex];
        if (item) this.onSelectionChange?.(item);
      }
    } else if (data === "k" || data === "\x1b[A") {
      // Up arrow or k
      if (this.selectedIndex > 0) {
        this.selectedIndex--;
        const item = this.items[this.selectedIndex];
        if (item) this.onSelectionChange?.(item);
      }
    } else if (data === "\r" || data === "\n") {
      // Enter
      const item = this.items[this.selectedIndex];
      if (item) this.onSelect?.(item);
    } else if (data === "\x1b") {
      // Escape
      this.onCancel?.();
    }
  }

  render(width: number): string[] {
    if (this.items.length === 0) {
      return [truncateToWidth("(no screens)", width)];
    }

    const lines: string[] = [];
    // Windowing: show maxVisible items around selected index
    const start = Math.max(
      0,
      Math.min(
        this.selectedIndex - Math.floor(this.maxVisible / 2),
        this.items.length - this.maxVisible,
      ),
    );
    const end = Math.min(start + this.maxVisible, this.items.length);

    for (let i = start; i < end; i++) {
      const item = this.items[i];
      if (!item) continue;
      const isSelected = i === this.selectedIndex;
      const prefix = isSelected ? "> " : "  ";

      // Apply theme accent for selected item (D-81)
      const styledPrefix = isSelected ? this.theme.fg("accent", prefix) : prefix;
      const styledLabel = isSelected ? this.theme.fg("accent", item.label) : item.label;

      const line = styledPrefix + styledLabel;
      lines.push(truncateToWidth(line, width));
    }

    return lines;
  }

  invalidate(): void {
    // No internal cache in this minimal implementation
  }
}

/**
 * Left pane: renders an interactive list of spec screens.
 *
 * Selection changes are reported immediately via `onSelect` (D-80:
 * immediate selection on j/k via onSelectionChange, NOT onSelect).
 *
 * Error screens (those with severity="error" diagnostics whose path
 * includes the screen id) show a ⚠ suffix per D-81.
 *
 * T-05-09: Escape sequence injection via screen title is mitigated by the
 * CANVAS-06 chrome test gate (root.render(80).join('\n') must not match \x1b[?).
 */
export class ScreensListPane implements Component {
  private list: InlineSelectList;

  constructor(
    onSelect: (screenId: string) => void,
    readonly theme: CanvasTheme,
  ) {
    // Initialize with empty items — update() populates on first snapshot
    this.list = new InlineSelectList([], 20, theme);
    // D-80: immediate selection on j/k navigation (onSelectionChange, NOT onSelect)
    this.list.onSelectionChange = (item) => onSelect(item.value);
  }

  /**
   * Push a new snapshot into the pane.
   * Rebuilds SelectList items from spec.screens in order (D-82).
   * Checks diagnostics for severity === "error" per screen id; appends " ⚠" to label if found.
   * T-05-10: if activeScreenId missing from spec.screens on subscribe tick,
   *           root canvas should auto-select first screen (handled at root level).
   */
  update(snapshot: Snapshot): void {
    const items: SelectItem[] = snapshot.spec.screens.map((s) => {
      const hasError = snapshot.diagnostics.some(
        (d) => d.severity === "error" && d.path.includes(s.id),
      );
      return {
        value: s.id,
        // D-81: ⚠ suffix for screens with error diagnostics
        label: hasError ? `${s.title} ⚠` : s.title,
      };
    });
    this.list.setItems(items);
  }

  /**
   * Render the screens list.
   * Every line passes through truncateToWidth for pi-tui line-width safety (Pitfall 1).
   */
  render(width: number): string[] {
    // truncateToWidth is called inside InlineSelectList.render()
    return this.list.render(width).map((line) => truncateToWidth(line, width));
  }

  handleInput(data: string): void {
    this.list.handleInput(data);
  }

  invalidate(): void {
    this.list.invalidate();
  }
}
