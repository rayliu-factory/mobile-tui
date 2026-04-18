// src/canvas/panes/wireframe-preview.ts
// Right pane: live wireframe preview for the active screen.
// Analog: src/emit/wireframe/index.ts (renderSingleVariant call site) +
//         scripts/render-wireframe.ts (call pattern).
//
// Implementation plan 05-03.
//
// D-73: Always shows the "content" variant; no variant switching in Phase 5.
// Line cache is invalidated on every update() call.
//
// Note: @mariozechner/pi-tui is a peer dependency (not installed in devDependencies).
// truncateToWidth is implemented inline here to allow tsc --noEmit and vitest to work
// without the runtime pi-tui install.
// Rule 3 deviation: inline implementation required because pi-tui is not installed.
//
// T-05-08: renderSingleVariant errors are caught and shown as placeholder string.
// Output is returned via render() only — no raw terminal writes.

import type { Snapshot } from "../../editor/types.ts";
import { renderSingleVariant } from "../../emit/wireframe/index.ts";

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
 * Truncate a string to a maximum visible width (ANSI-aware).
 * This mirrors truncateToWidth from @mariozechner/pi-tui.
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
 * Right pane: renders the wireframe for the currently-selected screen.
 *
 * Read-only in Phase 5. Always shows the "content" variant (D-73).
 * Line cache is invalidated on every `update()` call.
 *
 * T-05-08: renderSingleVariant errors are wrapped — a placeholder string is
 * returned if the renderer throws (e.g. unknown screenId per T-05-10).
 */
export class WireframePreviewPane implements Component {
  private snapshot: Snapshot | null = null;
  private activeScreenId: string | null = null;
  private lineCache: string[] | null = null;

  /**
   * Push a new snapshot + active screen into the pane.
   * Clears the line cache so render() recomputes on next tick.
   */
  update(snapshot: Snapshot, screenId: string): void {
    this.snapshot = snapshot;
    this.activeScreenId = screenId;
    this.lineCache = null; // invalidate cache on snapshot update
  }

  /**
   * Render the wireframe for the active screen.
   *
   * If no snapshot or no screen is selected, returns the placeholder.
   * Otherwise calls renderSingleVariant with "content" variant (D-73).
   * Lines are truncated to pane width (Pitfall 1 guard).
   * Result is cached until invalidate() or update() is called.
   *
   * T-05-08: renderSingleVariant errors are caught; error placeholder returned.
   */
  render(width: number): string[] {
    if (!this.snapshot || !this.activeScreenId) {
      return [truncateToWidth("(no screen selected)", width)];
    }

    if (!this.lineCache) {
      try {
        // D-73: always render content variant; read-only in Phase 5
        const text = renderSingleVariant(this.snapshot.spec, this.activeScreenId, "content", {
          diagnostics: this.snapshot.diagnostics,
        });
        this.lineCache = text.split("\n").map((l) => truncateToWidth(l, width));
      } catch {
        // T-05-08: wrap renderSingleVariant errors — expose message not stack
        this.lineCache = [truncateToWidth("(wireframe unavailable)", width)];
      }
    }

    return this.lineCache;
  }

  /**
   * Invalidate the line cache.
   * Called by root canvas after any store snapshot update.
   */
  invalidate(): void {
    this.lineCache = null;
  }

  /**
   * handleInput is intentionally empty — WireframePreviewPane is read-only in Phase 5 (D-73).
   */
  handleInput(_data: string): void {
    // Read-only in Phase 5 — no keyboard handling
  }
}
