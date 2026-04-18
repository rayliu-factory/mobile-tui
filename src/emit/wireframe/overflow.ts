// src/emit/wireframe/overflow.ts
// truncateWithEllipsis per D-44. Deterministic 1-line rows; no soft-wrap.
// The `[BROKEN LINK]` marker is load-bearing per RESEARCH Pitfall 6 —
// other content gives way first.
// Implementation lands in Plan 03-03.

export function truncate(str: string, width: number): string {
  void str;
  void width;
  throw new Error("NYI: Plan 03-03 truncate");
}
