// renderCard per D-36: untitled `+--+` box wrapping a single child.
//
// Width arithmetic (RESEARCH Pitfall 4): outer `width` → child sees
// `width - 4`. Breakdown: drawFrame in layout.ts composes each body row
// as `| ${inner} |` where `inner = padRight(childLine, width - 4)`, i.e.
// 1 col `|` + 1 col space + content + 1 col space + 1 col `|` = 4 overhead.
// Nested Cards compound: depth-2 child sees width-8, depth-3 sees width-12.
//
// Delegation: drawFrame handles the top/bottom borders + inner-pad geometry;
// this emitter's only responsibility is the child-width subtraction and
// passing the child's line array through renderNode (dispatch recursion).
//
// THREAT T-03-04 (snapshot drift): pure function; no Date, no random.
import type { ComponentNode } from "../../../model/component.ts";
import { renderNode } from "../dispatch.ts";
import { drawFrame } from "../layout.ts";

export function renderCard(
  node: Extract<ComponentNode, { kind: "Card" }>,
  width: number,
): string[] {
  const innerWidth = Math.max(1, width - 4);
  const childLines = renderNode(node.child, innerWidth);
  return drawFrame(childLines, width);
}
