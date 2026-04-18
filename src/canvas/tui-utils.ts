// src/canvas/tui-utils.ts
// Local shims for @mariozechner/pi-tui utilities needed by canvas components.
//
// At runtime inside pi, these functions are provided by @mariozechner/pi-tui
// (a peer dependency resolved by the pi host process). In tests and local
// development, pi-tui is not installed — these shims provide compatible
// implementations for plain strings (no ANSI escape codes in test output).
//
// IMPORTANT: These shims do NOT handle ANSI escape codes. When real pi-tui is
// available at runtime, import directly from "@mariozechner/pi-tui" instead.
// These shims are for use ONLY in canvas modules that run headlessly in tests.

/**
 * Truncate a string to at most `width` visible characters.
 * If `pad` is true, also pads with spaces to exact `width`.
 *
 * Shim: assumes no ANSI escape codes. Real pi-tui version is ANSI-aware.
 */
export function truncateToWidth(str: string, width: number, _ellipsis = "", pad = false): string {
  if (width <= 0) return "";
  // Trim to width
  const trimmed = str.length > width ? str.slice(0, width) : str;
  // Pad to exact width if requested
  if (pad && trimmed.length < width) {
    return trimmed + " ".repeat(width - trimmed.length);
  }
  return trimmed;
}

/**
 * Return the visible width of a string (number of terminal columns).
 *
 * Shim: assumes no ANSI escape codes, returns str.length.
 * Real pi-tui version strips ANSI sequences before measuring.
 */
export function visibleWidth(str: string): number {
  return str.length;
}
