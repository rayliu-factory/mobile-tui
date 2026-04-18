// renderListItem per D-36 + D-42:
//   - Vertical concatenation of children (no glyph — container, not box).
//   - The tappable-vs-container distinction is INVISIBLE in persisted
//     output per D-42. List (parent) provides the `+--+` box around each
//     ListItem; ListItem just emits its children's lines.
//   - Width passes unchanged to children (zero structural overhead); same
//     positional-container shape as Column with gap=sm (no blank lines).
//
// D-42 leak gate: this emitter never reads node.action / node.testID /
// node.label — only node.children. Enforced by dedicated
// `not.toContain(action)` + `not.toContain(testID)` assertion with distinctive
// `_zzz`/`_yyy` suffixes.
//
// THREAT T-03-04 (snapshot drift): pure function; no Date, no random.
import type { ComponentNode } from "../../../model/component.ts";
import { renderNode } from "../dispatch.ts";

export function renderListItem(
  node: Extract<ComponentNode, { kind: "ListItem" }>,
  width: number,
): string[] {
  const lines: string[] = [];
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    if (!child) continue;
    lines.push(...renderNode(child, width));
  }
  return lines;
}
