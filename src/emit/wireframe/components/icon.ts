// src/emit/wireframe/components/icon.ts
// renderIcon — inline `[icon:name]` per D-Claude "Icon placeholder".
// Single line of length === width; truncates to fit via D-44 primitive.
//
// THREAT T-03-04 (snapshot drift): pure function; no Date, no random.
import type { ComponentNode } from "../../../model/component.ts";
import { padRight } from "../layout.ts";
import { truncate } from "../overflow.ts";

export function renderIcon(
  node: Extract<ComponentNode, { kind: "Icon" }>,
  width: number,
): string[] {
  const glyph = `[icon:${node.name}]`;
  const sized = truncate(glyph, width);
  return [padRight(sized, width)];
}
