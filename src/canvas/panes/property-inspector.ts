// src/canvas/panes/property-inspector.ts
// Middle pane: field-level editor for the active screen's properties.
//
// CRITICAL: Implements Focusable so pi-tui can propagate keyboard focus to
// the embedded Input widget (RESEARCH.md Pitfall 3).
//
// D-70: Fields shown in inspector (in order):
//   1. title        — editable string
//   2. back_behavior — editable string; root screens show "—", non-editable when root
//   3. components   — read-only: "N components" (count of component nodes)
//   4. acceptance   — editable list of prose lines (joined for single-Input edit)
//   5. variants     — read-only: "content ● empty ● loading □ error □"
//
// D-71: Edit semantics:
//   - Enter on editable field → opens Input in-place with current value
//   - Enter while editing → store.apply(command, args)
//   - Esc while editing → cancel, no store.apply
//
// D-72: Diagnostics:
//   - ⚠ prefix on field rows where diagnostics has severity:error at that path
//   - Error count summary at bottom when errors present
//
// T-05-12: cursorRow clamped to [0, fields.length-1]
// T-05-13: diagnostic path exact segment match (split("/").includes) not substring
// T-05-15: Focusable implemented; focus propagated to editInput.focused (Pitfall 3)
//
// Analog: src/editor/store.ts (Snapshot consumption);
//         RESEARCH.md Pattern 6 (Input focus propagation).

import type { Snapshot, Store } from "../../editor/types.ts";
import type { Screen } from "../../model/screen.ts";
import { truncateToWidth } from "../tui-utils.ts";

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
 * Minimal Focusable interface (mirrors @mariozechner/pi-tui).
 * REQUIRED: Container with embedded Input MUST implement Focusable (Pitfall 3).
 */
interface Focusable {
  focused: boolean;
}

/**
 * Minimal theme interface — subset of pi-tui Theme used by this pane.
 * Stored but only used if/when theme-based rendering is added.
 */
export interface CanvasTheme {
  fg: (token: string, str: string) => string;
}

/**
 * Inline Input widget that mirrors @mariozechner/pi-tui Input API.
 * Used for in-place field editing. At extension runtime, the real
 * @mariozechner/pi-tui Input would be used; this inline implementation
 * allows vitest to run without the pi-tui host install (Rule 3 deviation).
 */
class InlineInput {
  private value = "";
  private cursorPos = 0;

  /** Set by the containing Focusable component (Pitfall 3). */
  focused = false;

  getValue(): string {
    return this.value;
  }

  setValue(initial: string): void {
    this.value = initial;
    this.cursorPos = initial.length;
  }

  handleInput(data: string): void {
    // Backspace
    if (data === "\x7f" || data === "\b") {
      if (this.cursorPos > 0) {
        this.value = this.value.slice(0, this.cursorPos - 1) + this.value.slice(this.cursorPos);
        this.cursorPos--;
      }
      return;
    }
    // Printable characters only (ignore control chars handled above)
    if (data.length === 1 && data.charCodeAt(0) >= 32) {
      this.value = this.value.slice(0, this.cursorPos) + data + this.value.slice(this.cursorPos);
      this.cursorPos++;
    }
  }

  render(width: number): string[] {
    // Show value with a trailing cursor indicator
    const display = this.value + (this.focused ? "█" : "");
    return [truncateToWidth(display, width)];
  }

  invalidate(): void {
    // No internal cache
  }
}

/**
 * Field definition for the inspector's field list (D-70).
 */
interface FieldDef {
  key: string;
  label: string;
  editable: boolean;
  getValue: (screen: Screen) => string;
  /** Command to issue when committing an edit. Undefined for read-only fields. */
  commandName?: string;
  /** Build the args object for store.apply from screenId + edited value. */
  argsBuilder?: (screenId: string, value: string) => unknown;
}

/**
 * Variant dot display (D-70): ● = non-null, □ = null.
 */
function variantDots(screen: Screen): string {
  const dot = (v: unknown) => (v !== null ? "●" : "□");
  return [
    `content ${dot(screen.variants.content)}`,
    `empty ${dot(screen.variants.empty)}`,
    `loading ${dot(screen.variants.loading)}`,
    `error ${dot(screen.variants.error)}`,
  ].join("  ");
}

/**
 * Count all component nodes in the content variant tree (top-level only).
 */
function countComponents(screen: Screen): number {
  // content variant is always non-null (D-06)
  const tree = screen.variants.content.tree;
  return Array.isArray(tree) ? tree.length : 0;
}

/**
 * Render back_behavior as a display string.
 * Returns em dash for root screens (back_behavior === undefined).
 */
function backBehaviorDisplay(screen: Screen): string {
  if (screen.back_behavior === undefined) return "\u2014";
  if (typeof screen.back_behavior === "string") return screen.back_behavior;
  // Object form: { kind: "replace", screen: ScreenId }
  return JSON.stringify(screen.back_behavior);
}

/**
 * Field definitions (D-70 order: title, back_behavior, components, acceptance, variants).
 */
const FIELD_DEFS: FieldDef[] = [
  {
    key: "title",
    label: "title",
    editable: true,
    getValue: (s) => s.title,
    commandName: "set-screen-title",
    argsBuilder: (screenId, value) => ({ id: screenId, title: value }),
  },
  {
    key: "back_behavior",
    label: "back_behavior",
    editable: true, // guarded at activateField() for root screens (back_behavior === undefined)
    getValue: backBehaviorDisplay,
    commandName: "set-back-behavior",
    argsBuilder: (screenId, value) => ({ id: screenId, behavior: value || null }),
  },
  {
    key: "components",
    label: "components",
    editable: false,
    getValue: (s) => `${countComponents(s)} components`,
  },
  {
    key: "acceptance",
    label: "acceptance",
    editable: true,
    getValue: (s) =>
      s.acceptance && s.acceptance.length > 0 ? `${s.acceptance.length} line(s)` : "(none)",
    commandName: "set-acceptance-prose",
    argsBuilder: (screenId, value) => ({
      id: screenId,
      lines: value.split("\n").filter(Boolean),
    }),
  },
  {
    key: "variants",
    label: "variants",
    editable: false,
    getValue: variantDots,
  },
];

/**
 * Middle pane: shows editable fields for the currently-selected screen.
 *
 * Implements Focusable to propagate focus correctly to the embedded
 * Input widget when a field is being edited (D-71, Pitfall 3).
 *
 * T-05-12: cursorRow clamped to [0, FIELD_DEFS.length - 1].
 * T-05-13: diagnostic path uses exact segment match (split("/").includes).
 * T-05-15: Focusable interface implemented and focus propagated.
 */
export class PropertyInspectorPane implements Component, Focusable {
  private snapshot: Snapshot | null = null;
  private editInput = new InlineInput();
  private _focused = false;
  private editingField: string | null = null;
  private cursorRow = 0;

  constructor(
    private readonly store: Store,
    private readonly getActiveScreenId: () => string | null,
    readonly _theme: CanvasTheme,
  ) {}

  // ── Focusable implementation (Pitfall 3) ──────────────────────────────────

  get focused(): boolean {
    return this._focused;
  }

  set focused(value: boolean) {
    this._focused = value;
    // Propagate focus to child Input when editing (T-05-15)
    if (this.editingField !== null) {
      this.editInput.focused = value;
    }
  }

  // ── Snapshot update ───────────────────────────────────────────────────────

  update(snapshot: Snapshot): void {
    this.snapshot = snapshot;
    // Cancel any in-progress edit when snapshot is refreshed
  }

  // ── Render ────────────────────────────────────────────────────────────────

  render(width: number): string[] {
    if (!this.snapshot) {
      return [truncateToWidth("(loading...)", width)];
    }

    const screenId = this.getActiveScreenId();
    if (!screenId) {
      return [truncateToWidth("(no screen selected)", width)];
    }

    const screen = this.snapshot.spec.screens.find((s) => s.id === screenId);
    if (!screen) {
      return [truncateToWidth("(no screen selected)", width)];
    }

    // Collect error paths for this screen (T-05-13: exact segment match)
    const errorPaths = new Set<string>();
    let errorCount = 0;
    for (const d of this.snapshot.diagnostics) {
      if (d.severity === "error") {
        // T-05-13: use exact segment match, not substring — prevents "s1" matching "s10"
        const segments = d.path.split("/").filter(Boolean);
        if (segments.includes(screenId)) {
          errorPaths.add(d.path);
          errorCount++;
        }
      }
    }

    const lines: string[] = [];

    for (let i = 0; i < FIELD_DEFS.length; i++) {
      const field = FIELD_DEFS[i];
      if (!field) continue;

      const isCursor = i === this.cursorRow && this._focused;
      const isEditing = this.editingField === field.key;

      if (isEditing) {
        // Replace field row with inline Input widget
        const inputLines = this.editInput.render(width - 2);
        for (const inputLine of inputLines) {
          lines.push(truncateToWidth(`> ${inputLine}`, width));
        }
        continue;
      }

      const value = field.getValue(screen);

      // Check if this field has an error diagnostic (D-72)
      const fieldHasError =
        errorPaths.size > 0 && this.fieldHasError(field.key, errorPaths, screenId);
      const warningPrefix = fieldHasError ? "⚠ " : "  ";

      // Cursor indicator
      const cursorPrefix = isCursor ? "> " : "  ";

      const row = `${cursorPrefix}${warningPrefix}${field.label}: ${value}`;
      lines.push(truncateToWidth(row, width));
    }

    // Error count summary (D-72)
    if (errorCount > 0) {
      lines.push(truncateToWidth(`  ${errorCount} error(s)`, width));
    }

    return lines;
  }

  /**
   * Check if a field has an error diagnostic.
   * Maps field keys to spec path segments for matching.
   * T-05-13: Uses exact segment inclusion, not substring match.
   */
  private fieldHasError(fieldKey: string, errorPaths: Set<string>, screenId: string): boolean {
    for (const path of errorPaths) {
      const segments = path.split("/").filter(Boolean);
      // If path references this screen and includes the field key (or is at screen level)
      if (segments.includes(screenId)) {
        if (fieldKey === "title" && segments.includes("title")) return true;
        if (fieldKey === "back_behavior" && segments.includes("back_behavior")) return true;
        if (fieldKey === "acceptance" && segments.includes("acceptance")) return true;
        if (fieldKey === "variants" && segments.includes("variants")) return true;
        // If path only goes to screen level, show warning on title row (first field)
        if (fieldKey === "title" && segments[segments.length - 1] === screenId) return true;
        if (segments.length === 2 && segments[1] === screenId) return true;
      }
    }
    return false;
  }

  // ── Input handling ────────────────────────────────────────────────────────

  handleInput(data: string): void {
    if (this.editingField !== null) {
      // Delegate to Input widget; handle Esc and Enter directly (D-71)
      if (data === "\x1b") {
        // Esc: cancel without store.apply
        this.editingField = null;
        this.editInput.focused = false;
        return;
      }
      if (data === "\r" || data === "\n") {
        // Enter: commit via store.apply
        void this.commitEdit();
        return;
      }
      this.editInput.handleInput(data);
      return;
    }

    // Navigation when not editing (D-71)
    if (data === "j" || data === "\x1b[B") {
      // Down
      this.cursorRow = Math.min(this.cursorRow + 1, FIELD_DEFS.length - 1);
    } else if (data === "k" || data === "\x1b[A") {
      // Up
      this.cursorRow = Math.max(this.cursorRow - 1, 0);
    } else if (data === "\r" || data === "\n") {
      // Enter: activate editable field
      this.activateField();
    }
  }

  /**
   * Activate the field at cursorRow for editing.
   * Only editable fields are activated; read-only fields are silently ignored.
   * T-05-12: cursorRow is already clamped; guard against undefined.
   */
  private activateField(): void {
    if (!FIELD_DEFS[this.cursorRow]?.editable) return;

    const field = FIELD_DEFS[this.cursorRow];
    if (!field) return;

    const screenId = this.getActiveScreenId();
    if (!screenId || !this.snapshot) return;

    const screen = this.snapshot.spec.screens.find((s) => s.id === screenId);
    if (!screen) return;

    // For back_behavior: root screens are non-editable (back_behavior undefined)
    if (field.key === "back_behavior" && screen.back_behavior === undefined) return;

    // Set up the Input with the current value
    const currentValue =
      field.key === "acceptance" ? (screen.acceptance ?? []).join("\n") : field.getValue(screen);

    this.editInput.setValue(currentValue === "\u2014" ? "" : currentValue);
    this.editInput.focused = this._focused;
    this.editingField = field.key;
  }

  /**
   * Commit the current edit by calling store.apply with the correct command.
   * D-71: Enter while editing → store.apply(commandName, args).
   */
  private async commitEdit(): Promise<void> {
    const fieldKey = this.editingField;
    if (!fieldKey) return;

    const field = FIELD_DEFS.find((f) => f.key === fieldKey);
    if (!field?.commandName || !field.argsBuilder) {
      this.editingField = null;
      return;
    }

    const screenId = this.getActiveScreenId();
    if (!screenId) {
      this.editingField = null;
      return;
    }

    const value = this.editInput.getValue();
    const args = field.argsBuilder(screenId, value);

    this.editingField = null;
    this.editInput.focused = false;

    // T-05-11: store.apply validates via argsSchema.safeParse before command.apply
    await this.store.apply(field.commandName, args);
  }

  invalidate(): void {
    // No internal line cache in this implementation
  }
}
