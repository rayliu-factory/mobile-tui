// renderRow per D-36 (no container glyph). Phase-3 v1 simplification:
// each child rendered at budget `floor(width / children.length)`; first
// output line of each child concatenated horizontally. Multi-line children
// (e.g., Image's 3-line box) render only their first line in a Row —
// documented compromise; Phase-5 may expand to multi-line row support
// with per-column alignment (see RESEARCH §Common Pitfall 8 NavBar).
//
// Width arithmetic (RESEARCH Pitfall 4): the join can leave under-shoot
// (floor-division slack) OR over-shoot (children that fail to fill their
// slot). Both are absorbed by a final `truncate + padRight` against the
// outer `width`, preserving the rectangular contract.
//
// THREAT T-03-04 (snapshot drift): pure function; no Date, no random.
import type { ComponentNode } from "../../../model/component.ts";
import { renderNode } from "../dispatch.ts";
import { padRight } from "../layout.ts";
import { truncate } from "../overflow.ts";

export function renderRow(node: Extract<ComponentNode, { kind: "Row" }>, width: number): string[] {
  if (node.children.length === 0) return [];
  const count = node.children.length;
  const childBudget = Math.max(1, Math.floor(width / count));
  const segments: string[] = [];
  for (let i = 0; i < count; i++) {
    const child = node.children[i];
    if (!child) continue;
    const childLines = renderNode(child, childBudget);
    const firstLine = childLines.length > 0 ? childLines[0] : " ".repeat(childBudget);
    segments.push(firstLine ?? " ".repeat(childBudget));
  }
  const joined = segments.join("");
  return [padRight(truncate(joined, width), width)];
}
