// src/emit/wireframe/components/text.ts
// renderText — D-43 style mapping (heading-1 ALL CAPS, heading-2 identity,
// body plain, caption wrapped in parens) + D-44 truncate-with-`...`.
// Returns exactly one line of length === width (rectangular contract per
// RESEARCH Pitfall 7).
//
// THREAT T-03-04 (snapshot drift): pure function; no Date, no random.
import type { ComponentNode } from "../../../model/component.ts";
import { padRight } from "../layout.ts";
import { truncate } from "../overflow.ts";
import { applyTextStyle } from "../text-style.ts";

export function renderText(
  node: Extract<ComponentNode, { kind: "Text" }>,
  width: number,
): string[] {
  const styled = applyTextStyle(node.text, node.style);
  const sized = truncate(styled, width);
  return [padRight(sized, width)];
}
