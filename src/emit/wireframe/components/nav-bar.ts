// src/emit/wireframe/components/nav-bar.ts
// renderNavBar per D-37:
//   - Single-line `< Title                         [trailing]` + `---` rule.
//   - Leading `< ` assumed (non-root default); Plan 03-08's variants.ts
//     strips it when composing root screens (per PATTERNS.md guidance and
//     Plan 03-07 header note).
//   - Trailing widget budget: max(10, floor((width-4)/3)) per RESEARCH
//     Pitfall 8 heuristic — prevents oversized trailing from crowding the
//     title when the caller passes an arbitrary ComponentNode.
//   - NO device chrome (no status bar, notch, home indicator) per D-37.
//
// THREAT T-03-03 (DoS via trailing-widget recursion depth): accepted —
// trailing budget collapses any subtree to a single line regardless of depth.
// THREAT T-03-04 (snapshot drift): pure function; no Date, no random.
import type { ComponentNode } from "../../../model/component.ts";
import { renderNode } from "../dispatch.ts";
import { padRight } from "../layout.ts";
import { truncate } from "../overflow.ts";

export function renderNavBar(
  node: Extract<ComponentNode, { kind: "NavBar" }>,
  width: number,
): string[] {
  const leading = "< ";
  let trailingStr = "";
  if (node.trailing) {
    const trailingBudget = Math.max(10, Math.floor((width - 4) / 3));
    const trailingLines = renderNode(node.trailing, trailingBudget);
    trailingStr = trailingLines.length > 0 ? (trailingLines[0]?.trimEnd() ?? "") : "";
  }
  const titleBudget = Math.max(
    1,
    width - leading.length - (trailingStr ? trailingStr.length + 1 : 0),
  );
  const title = truncate(node.title, titleBudget);
  const titleLine = trailingStr ? `${leading}${title} ${trailingStr}` : `${leading}${title}`;
  return [padRight(truncate(titleLine, width), width), "-".repeat(width)];
}
