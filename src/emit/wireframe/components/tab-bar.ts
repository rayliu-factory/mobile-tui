// src/emit/wireframe/components/tab-bar.ts
// renderTabBar per D-37: `---` rule above + `[ label ] | [ label ] | ...` row.
// Bottom-anchoring within the variant frame is Plan 03-08's variants.ts
// composer concern; this emitter only produces the 2-line output.
//
// D-42 / threat T-03-08: only `item.label` reaches the glyph. `item.action`
// and `item.testID` are NEVER read, let alone rendered. Dedicated assertion
// in tab-bar.test.ts enforces this at the string-output boundary.
//
// Per-item label budget: `floor((width - separatorChars) / items.length) - 4`
// where separatorChars = (items.length - 1) * 3 (for ` | ` between items) and
// 4 is the `[ ` + ` ]` structural overhead per item.
//
// THREAT T-03-04 (snapshot drift): pure function; no Date, no random.
import type { ComponentNode } from "../../../model/component.ts";
import { padRight } from "../layout.ts";
import { truncate } from "../overflow.ts";

export function renderTabBar(
  node: Extract<ComponentNode, { kind: "TabBar" }>,
  width: number,
): string[] {
  const items = node.items;
  const separatorCount = Math.max(0, items.length - 1);
  const separatorChars = separatorCount * 3; // " | " per separator
  const perItemBudget = Math.max(
    1,
    Math.floor((width - separatorChars) / Math.max(1, items.length)) - 4,
  );
  const segments = items.map((item) => `[ ${truncate(item.label, perItemBudget)} ]`);
  const line = segments.join(" | ");
  return ["-".repeat(width), padRight(truncate(line, width), width)];
}
