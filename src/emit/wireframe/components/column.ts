// renderColumn per D-36: vertical concat of children with gap-sized blank
// lines between siblings (sm=0, md=1 DEFAULT, lg=2). No container glyph
// (contrast Card, which DOES add a `+--+` box). Width passes unchanged to
// children (no structural overhead; Column is a positional container only).
//
// Width arithmetic (RESEARCH Pitfall 4): Column adds ZERO overhead — every
// child sees the full parent `width`. Rectangular contract is the union of
// children's rectangular contracts + gap blank-lines (` `.repeat(width)).
//
// Sparse-array guard (`if (!child) continue`) mirrors the precedent in
// src/model/cross-reference.ts:59 — children arrays from Zod-validated specs
// are dense, but defensive array walk costs nothing and stays robust against
// hand-crafted ComponentNodes in tests.
//
// THREAT T-03-04 (snapshot drift): pure function; no Date, no random.
import type { ComponentNode } from "../../../model/component.ts";
import { renderNode } from "../dispatch.ts";

export function renderColumn(
  node: Extract<ComponentNode, { kind: "Column" }>,
  width: number,
): string[] {
  const gap = node.gap ?? "md";
  const gapLines = gap === "sm" ? 0 : gap === "lg" ? 2 : 1;
  const lines: string[] = [];
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    if (!child) continue;
    const childLines = renderNode(child, width);
    lines.push(...childLines);
    if (i < node.children.length - 1) {
      for (let j = 0; j < gapLines; j++) lines.push(" ".repeat(width));
    }
  }
  return lines;
}
