// renderList per D-36 + RESEARCH Pitfall 9:
//   - Render exactly ONE item from itemTemplate (no live data at render
//     time; multi-item rendering would fabricate content, see T-03-09
//     mitigation).
//   - Wrap in `+--+` box via drawFrame (same inner-width math as Card:
//     child region = width - 4).
//   - Append a subtle footer line `(list bound to <JsonPointer>)` so the
//     reader can distinguish "List" from "Card" without the emitter
//     fabricating fake list data.
//
// Width arithmetic (RESEARCH Pitfall 4): itemTemplate sees `width - 4`
// (same as Card — the `+--+` frame overhead). Footer is emitted at the
// outer `width` via padRight + truncate.
//
// THREAT T-03-09 (arbitrary N-item rendering could mislead): explicitly
// render 1 item + footer indicator — a dogfood-reader sees "this is a
// List" without a fake 3-item render implying real data.
// THREAT T-03-04 (snapshot drift): pure function; no Date, no random.
import type { ComponentNode } from "../../../model/component.ts";
import { renderNode } from "../dispatch.ts";
import { drawFrame, padRight } from "../layout.ts";
import { truncate } from "../overflow.ts";

export function renderList(
  node: Extract<ComponentNode, { kind: "List" }>,
  width: number,
): string[] {
  const innerWidth = Math.max(1, width - 4);
  const itemLines = renderNode(node.itemTemplate, innerWidth);
  const boxed = drawFrame(itemLines, width);
  const footer = `   (list bound to ${node.bindsTo})`;
  boxed.push(padRight(truncate(footer, width), width));
  return boxed;
}
