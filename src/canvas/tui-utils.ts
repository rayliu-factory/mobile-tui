// src/canvas/tui-utils.ts
// Shared ANSI-aware TUI utilities for canvas components.
//
// These implementations handle ANSI SGR escape sequences correctly:
// - truncateToWidth measures visible width by stripping escape codes
// - visibleWidth strips escape codes before measuring
//
// Compatible with @mariozechner/pi-tui's API surface so components can
// import from here during tests (pi-tui is a peer dep, not installed).

// Regex strips SGR ANSI color codes (ESC [ ... m). RegExp constructor used
// to avoid the biome noControlCharactersInRegex lint rule on regex literals.
// biome-ignore lint/complexity/useRegexLiterals: must use constructor to avoid noControlCharactersInRegex
const ANSI_SGR = new RegExp("\x1b\\[[0-9;]*m", "g");

/**
 * Truncate a string to at most `width` visible characters (ANSI-aware).
 * If `pad` is true, pads with spaces to exact `width` visible columns.
 *
 * ANSI SGR escape sequences are counted as zero-width and are preserved
 * intact in the output — they are never sliced mid-sequence.
 */
export function truncateToWidth(str: string, width: number, _ellipsis = "", pad = false): string {
  if (width <= 0) return "";
  const stripped = str.replace(ANSI_SGR, "");
  if (stripped.length <= width) {
    if (pad && stripped.length < width) {
      return str + " ".repeat(width - stripped.length);
    }
    return str;
  }
  // Walk character-by-character, copying ANSI sequences wholesale without counting them
  let visibleCount = 0;
  let result = "";
  let i = 0;
  while (i < str.length && visibleCount < width) {
    if (str[i] === "\x1b") {
      const start = i;
      i++; // skip ESC
      if (i < str.length && str[i] === "[") {
        i++; // skip [
        while (i < str.length && !/[A-Za-z]/.test(str[i] ?? "")) i++;
        if (i < str.length) i++; // skip terminator
      }
      result += str.slice(start, i);
    } else {
      result += str[i];
      visibleCount++;
      i++;
    }
  }
  if (pad && visibleCount < width) {
    result += " ".repeat(width - visibleCount);
  }
  return result;
}

/**
 * Return the visible width of a string (number of terminal columns).
 * Strips ANSI SGR sequences before measuring.
 */
export function visibleWidth(str: string): number {
  return str.replace(ANSI_SGR, "").length;
}
