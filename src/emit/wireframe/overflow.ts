// src/emit/wireframe/overflow.ts
// Deterministic 1-line truncation per D-44. No soft-wrap; no variable row
// height; predictable snapshot diffs.
//
// Scope:
//   - truncate(str, width): string — returns str when str.length ≤ width,
//     else `str.slice(0, width-3) + "..."`. Degenerate width (< 3) returns
//     `.`.repeat(width) per RESEARCH Pattern 3.
//
// The `[BROKEN LINK]` marker is load-bearing per RESEARCH Pitfall 6 —
// its caller (interactable emitters in Plans 03-05/03-07) must compute
// the marker width FIRST, then call truncate with a reduced budget, so
// the marker stays visible.
//
// THREAT T-03-04 (snapshot drift): pure function; no Date, no random.

export function truncate(str: string, width: number): string {
  if (str.length <= width) return str;
  if (width < 3) return ".".repeat(Math.max(0, width));
  return `${str.slice(0, width - 3)}...`;
}
