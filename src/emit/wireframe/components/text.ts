// src/emit/wireframe/components/text.ts
// renderText — D-43 style mapping (heading-1 ALL CAPS, heading-2 Title Case,
// body plain, caption wrapped in parens). Implementation lands in Plan 03-04.
import type { ComponentNode } from "../../../model/component.ts";

export function renderText(
  node: Extract<ComponentNode, { kind: "Text" }>,
  width: number,
): string[] {
  void node;
  void width;
  throw new Error("NYI: Plan 03-04 renderText (scaffolded in 03-01)");
}
