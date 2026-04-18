// src/emit/wireframe/components/image.ts
// renderImage — D-Claude "Image placeholder":
//   +--IMG---+
//   | <alt>  |
//   +--------+
// Default box width = 10 cols (RESEARCH Assumption A4). Code paths:
//   1. Missing/empty alt (defense-in-depth; Phase-1 schema requires alt) →
//      `(no alt)` inline single line, padded to width.
//   2. width < 8 cols → fallback to inline `[img:alt]` single line. The
//      `[img:` prefix is load-bearing per RESEARCH Pitfall 6 — we reserve
//      it and truncate the alt tail, not the marker.
//   3. Otherwise → 3-line box at min(10, width), padded right to width.
// Every output line has length === width (rectangular contract).
//
// THREAT T-03-04 (snapshot drift): pure function; no Date, no random.
// THREAT T-03-07 (alt-PII): accepted — rendering author content is intended.
import type { ComponentNode } from "../../../model/component.ts";
import { padRight } from "../layout.ts";
import { truncate } from "../overflow.ts";

const DEFAULT_IMG_WIDTH = 10;
const INLINE_FALLBACK_THRESHOLD = 8;
const INLINE_PREFIX = "[img:";
const INLINE_SUFFIX = "]";

export function renderImage(
  node: Extract<ComponentNode, { kind: "Image" }>,
  width: number,
): string[] {
  const hasAlt = node.alt && node.alt.length > 0;

  // Path 1: missing alt → `(no alt)` inline, single line, padded to width.
  // (Phase-1 schema requires alt; this is a defense-in-depth path.)
  if (!hasAlt) {
    return [padRight(truncate("(no alt)", width), width)];
  }

  const alt = node.alt;

  // Path 2: narrow widths → inline `[img:alt]` with load-bearing prefix.
  // Reserve PREFIX + SUFFIX, truncate alt into remaining budget so the
  // marker stays visible on the left edge (RESEARCH Pitfall 6).
  if (width < INLINE_FALLBACK_THRESHOLD) {
    const overhead = INLINE_PREFIX.length + INLINE_SUFFIX.length; // 6
    if (width <= INLINE_PREFIX.length) {
      // Extreme degenerate: truncate the marker itself.
      return [padRight(truncate(INLINE_PREFIX, width), width)];
    }
    const altBudget = Math.max(0, width - overhead);
    const altPart = truncate(alt, altBudget);
    // If alt fits and there's room for the closing bracket, include it.
    const assembled =
      altPart.length + overhead <= width
        ? `${INLINE_PREFIX}${altPart}${INLINE_SUFFIX}`
        : `${INLINE_PREFIX}${altPart}`;
    return [padRight(truncate(assembled, width), width)];
  }

  // Path 3: default 3-line box at min(10, width) cols.
  const boxWidth = Math.min(DEFAULT_IMG_WIDTH, width);
  const innerLen = boxWidth - 2; // minus two `+` corners
  const marker = "IMG";
  const leftDashes = Math.max(0, Math.floor((innerLen - marker.length) / 2));
  const rightDashes = Math.max(0, innerLen - marker.length - leftDashes);
  const top = `+${"-".repeat(leftDashes)}${marker}${"-".repeat(rightDashes)}+`;
  const bottom = `+${"-".repeat(Math.max(0, boxWidth - 2))}+`;

  // Alt row: `| <altText> |` — inner budget = boxWidth - 4 (pipes + spaces).
  const altInner = boxWidth - 4;
  const altLine = `| ${padRight(truncate(alt, altInner), altInner)} |`;

  // Pad each line rightward to full width if boxWidth < width.
  return [padRight(top, width), padRight(altLine, width), padRight(bottom, width)];
}
