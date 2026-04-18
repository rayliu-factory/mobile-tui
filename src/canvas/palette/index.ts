// src/canvas/palette/index.ts
// Command palette overlay: filter + arg-prompt two-phase component.
//
// IMPORTANT: Always construct a new CommandPalette() on each open — never
// reuse an instance (RESEARCH.md Pitfall 5).
//
// Analog: scripts/cli-edit.ts (COMMANDS enumeration and arg dispatch).
//
// D-74: Fuzzy-search overlay; typing filters by command name.
// D-75: After selection, sequential arg-prompt flow per required arg.
// D-76: Commands grouped by noun prefix (screen, component, entity, nav, action).
//
// Note: @mariozechner/pi-tui is a peer dependency not installed in devDependencies.
// This module uses inline shims for Input, SelectList, matchesKey, and
// truncateToWidth so that tsc --noEmit and vitest run without the pi-tui install.
// At extension runtime these would be imported from "@mariozechner/pi-tui".

import { z } from "zod";
import { COMMANDS } from "../../editor/commands/index.ts";
import type { Store } from "../../editor/types.ts";

// ── Inline key-matching helper (mirrors matchesKey from @mariozechner/pi-tui) ──

function isEscape(data: string): boolean {
  return data === "\x1b";
}

function isReturn(data: string): boolean {
  return data === "\r" || data === "\n";
}

function isUp(data: string): boolean {
  return data === "\x1b[A" || data === "k";
}

function isDown(data: string): boolean {
  return data === "\x1b[B" || data === "j";
}

// ── Inline truncateToWidth (mirrors @mariozechner/pi-tui) ────────────────────

// Regex to strip SGR ANSI color codes. Built via RegExp constructor to avoid
// biome noControlCharactersInRegex lint rule on regex literals.
const ANSI_SGR = new RegExp("\x1b\\[[0-9;]*m", "g");

function truncateToWidth(str: string, width: number): string {
  if (width <= 0) return "";
  const stripped = str.replace(ANSI_SGR, "");
  if (stripped.length <= width) {
    return str + " ".repeat(width - stripped.length);
  }
  // Truncate: rebuild character-by-character tracking visible position
  let visibleCount = 0;
  let result = "";
  let i = 0;
  while (i < str.length && visibleCount < width) {
    if (str[i] === "\x1b") {
      const start = i;
      i++;
      if (i < str.length && str[i] === "[") {
        i++;
        while (i < str.length && !/[A-Za-z]/.test(str[i] ?? "")) i++;
        if (i < str.length) i++;
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
  if (visibleCount < width) {
    result += " ".repeat(width - visibleCount);
  }
  return result;
}

// ── Inline Input shim (mirrors @mariozechner/pi-tui Input) ───────────────────

class InlineInput {
  private value = "";
  onSubmit?: (value: string) => void;
  onEscape?: () => void;
  focused = false;

  getValue(): string {
    return this.value;
  }

  setValue(v: string): void {
    this.value = v;
  }

  handleInput(data: string): void {
    if (isEscape(data)) {
      this.onEscape?.();
      return;
    }
    if (isReturn(data)) {
      this.onSubmit?.(this.value);
      return;
    }
    // Backspace: DEL or BS
    if (data === "\x7f" || data === "\x08") {
      this.value = this.value.slice(0, -1);
      return;
    }
    // Ignore control sequences (arrow keys, etc.) — only accept printable chars
    if (data.length === 1 && data >= " ") {
      this.value += data;
    }
  }

  render(width: number): string[] {
    const display = this.value + (this.focused ? "_" : "");
    return [truncateToWidth(display, width)];
  }

  invalidate(): void {
    // no cache
  }
}

// ── Inline SelectList shim with setFilter (mirrors @mariozechner/pi-tui) ────

interface SelectItem {
  value: string;
  label: string;
  description?: string;
}

class InlineSelectList {
  private allItems: SelectItem[];
  private filtered: SelectItem[] = [];
  private selectedIndex = 0;
  private filter = "";

  onSelect?: (item: SelectItem) => void;
  onCancel?: () => void;

  constructor(
    items: SelectItem[],
    private readonly maxVisible: number,
  ) {
    this.allItems = [...items];
    this.applyFilter();
  }

  private applyFilter(): void {
    if (!this.filter) {
      this.filtered = [...this.allItems];
    } else {
      const q = this.filter.toLowerCase();
      this.filtered = this.allItems.filter((item) => {
        const label = item.label.toLowerCase();
        // prefix match first, then substring
        return label.startsWith(q) || label.includes(q);
      });
    }
    this.selectedIndex = 0;
  }

  setFilter(query: string): void {
    this.filter = query;
    this.applyFilter();
  }

  getSelectedItem(): SelectItem | null {
    return this.filtered[this.selectedIndex] ?? null;
  }

  setSelectedIndex(n: number): void {
    this.selectedIndex = Math.max(0, Math.min(n, this.filtered.length - 1));
  }

  handleInput(data: string): void {
    if (isUp(data)) {
      if (this.selectedIndex > 0) this.selectedIndex--;
    } else if (isDown(data)) {
      if (this.selectedIndex < this.filtered.length - 1) this.selectedIndex++;
    } else if (isReturn(data)) {
      const item = this.filtered[this.selectedIndex];
      if (item) this.onSelect?.(item);
    } else if (isEscape(data)) {
      this.onCancel?.();
    }
  }

  render(width: number): string[] {
    if (this.filtered.length === 0) {
      return [truncateToWidth("(no matches)", width)];
    }

    const start = Math.max(
      0,
      Math.min(
        this.selectedIndex - Math.floor(this.maxVisible / 2),
        this.filtered.length - this.maxVisible,
      ),
    );
    const end = Math.min(start + this.maxVisible, this.filtered.length);
    const lines: string[] = [];

    for (let i = start; i < end; i++) {
      const item = this.filtered[i];
      if (!item) continue;
      const prefix = i === this.selectedIndex ? "> " : "  ";
      lines.push(truncateToWidth(prefix + item.label, width));
    }

    return lines;
  }

  invalidate(): void {
    // no cache
  }
}

// ── PalettePhase state machine ────────────────────────────────────────────────

type PalettePhase =
  | { kind: "filter" }
  | {
      kind: "arg-prompt";
      commandName: string;
      argKeys: string[];
      argIdx: number;
      // Object.create(null) pattern from T-04-23 — no prototype pollution
      collectedArgs: Record<string, string>;
    };

// ── Command grouping (D-76) ───────────────────────────────────────────────────

const GROUP_ORDER = ["screen", "component", "entity", "nav", "action"];

function groupOf(name: string): number {
  for (let i = 0; i < GROUP_ORDER.length; i++) {
    const prefix = GROUP_ORDER[i];
    if (prefix !== undefined && name.startsWith(prefix)) return i;
  }
  return GROUP_ORDER.length; // others last
}

// ── Required arg detection (Zod v4) ──────────────────────────────────────────

// biome-ignore lint/suspicious/noExplicitAny: Generic Zod shape requires any
function getRequiredArgKeys(command: { argsSchema: z.ZodObject<any> }): string[] {
  const shape = command.argsSchema.shape as Record<string, unknown>;
  return Object.entries(shape)
    .filter(([, field]) => !(field instanceof z.ZodOptional))
    .map(([key]) => key);
}

// ── CanvasTheme interface ─────────────────────────────────────────────────────

interface CanvasTheme {
  fg: (token: string, str: string) => string;
}

// ── Component interface ───────────────────────────────────────────────────────

interface Component {
  render(width: number): string[];
  handleInput?(data: string): void;
  invalidate(): void;
}

// ── CommandPalette ────────────────────────────────────────────────────────────

/**
 * Command palette overlay.
 *
 * Phase 1: filter mode — fuzzy-match commands while typing.
 * Phase 2: arg-prompt mode — collect required args for the selected command.
 *
 * ALWAYS construct a new CommandPalette() on each open — never reuse (Pitfall 5).
 * Calls onClose() when the user commits or cancels, never fires store.apply on Esc.
 *
 * T-05-17: collectedArgs uses Object.create(null) — no prototype pollution.
 * T-05-18: Esc always calls onClose() without store.apply.
 * T-05-20: commandName comes from COMMANDS registry keys (trusted internal data).
 */
export class CommandPalette implements Component {
  private filterInput: InlineInput;
  private commandList: InlineSelectList;
  private argInput: InlineInput;
  private phase: PalettePhase = { kind: "filter" };

  constructor(
    private readonly store: Store,
    private readonly onClose: () => void,
    private readonly _theme: CanvasTheme,
  ) {
    // Build sorted command items per D-76 noun-prefix grouping
    const sortedCommands = Object.values(COMMANDS).sort(
      (a, b) => groupOf(a.name) - groupOf(b.name) || a.name.localeCompare(b.name),
    );

    const items: SelectItem[] = sortedCommands.map((cmd) => ({
      value: cmd.name,
      label: cmd.name,
    }));

    this.commandList = new InlineSelectList(items, 10);
    this.filterInput = new InlineInput();
    this.filterInput.focused = true;
    this.argInput = new InlineInput();
    this.argInput.focused = true;

    // onSelect fires on Enter — delegate to startArgPrompt
    this.commandList.onSelect = (item) => this.startArgPrompt(item.value);
  }

  /**
   * Handle keyboard input.
   * Esc always closes (T-05-18 — no partial store.apply).
   */
  handleInput(data: string): void {
    // Esc always closes — T-05-18
    if (isEscape(data)) {
      this.onClose();
      return;
    }

    if (this.phase.kind === "filter") {
      if (isReturn(data)) {
        // Enter: select current item (triggers startArgPrompt via commandList.onSelect)
        const selected = this.commandList.getSelectedItem();
        if (selected) {
          this.startArgPrompt(selected.value);
        }
        return;
      }
      if (isUp(data) || isDown(data)) {
        // Arrow keys / j/k: navigate the list
        this.commandList.handleInput(data);
        return;
      }
      // Typing: update filter input, then sync to command list
      this.filterInput.handleInput(data);
      this.commandList.setFilter(this.filterInput.getValue());
    } else if (this.phase.kind === "arg-prompt") {
      if (isReturn(data)) {
        const currentArgKey = this.phase.argKeys[this.phase.argIdx];
        if (!currentArgKey) return;

        // Collect current arg value (Object.create(null) — T-05-17)
        const collected: Record<string, string> = Object.create(null);
        Object.assign(collected, this.phase.collectedArgs);
        collected[currentArgKey] = this.argInput.getValue();

        if (this.phase.argIdx + 1 < this.phase.argKeys.length) {
          // Advance to next arg
          this.phase = {
            kind: "arg-prompt",
            commandName: this.phase.commandName,
            argKeys: this.phase.argKeys,
            argIdx: this.phase.argIdx + 1,
            collectedArgs: collected,
          };
          this.argInput.setValue("");
        } else {
          // All args collected — fire store.apply and close
          void this.store.apply(this.phase.commandName, collected);
          this.onClose();
        }
        return;
      }
      // Other keys delegate to argInput
      this.argInput.handleInput(data);
    }
  }

  /**
   * Render the palette.
   * Filter mode: filter input line + command list.
   * Arg-prompt mode: arg label + input prompt.
   * All lines truncated to width (Pitfall 1).
   */
  render(width: number): string[] {
    if (this.phase.kind === "filter") {
      const filterLine = truncateToWidth("> " + (this.filterInput.getValue() || ""), width);
      const listLines = this.commandList.render(width);
      return [filterLine, ...listLines].map((l) => truncateToWidth(l, width));
    }

    // Arg-prompt mode
    const { argKeys, argIdx } = this.phase;
    const currentKey = argKeys[argIdx] ?? "";
    const label = `${currentKey}: `;
    const inputLine = label + (this.argInput.getValue() || "_");
    return [truncateToWidth(inputLine, width)];
  }

  /**
   * Invalidate cached render state for all child inputs.
   */
  invalidate(): void {
    this.filterInput.invalidate();
    this.commandList.invalidate();
    this.argInput.invalidate();
  }

  /**
   * Transition to arg-prompt flow for the given command.
   * If the command has no required args, fires store.apply immediately.
   */
  private startArgPrompt(commandName: string): void {
    const command = COMMANDS[commandName as keyof typeof COMMANDS];
    if (!command) return;

    const requiredKeys = getRequiredArgKeys(command);

    if (requiredKeys.length === 0) {
      // No required args — fire immediately
      void this.store.apply(commandName, {});
      this.onClose();
      return;
    }

    // Transition to arg-prompt mode — T-05-17: Object.create(null) for no prototype
    const collectedArgs: Record<string, string> = Object.create(null);
    this.phase = {
      kind: "arg-prompt",
      commandName,
      argKeys: requiredKeys,
      argIdx: 0,
      collectedArgs,
    };
    this.argInput.setValue("");
    this.argInput.focused = true;
  }
}
