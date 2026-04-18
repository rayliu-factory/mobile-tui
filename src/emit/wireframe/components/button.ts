// src/emit/wireframe/components/button.ts
// renderButton — D-34 glyph alphabet (primary [[ ]], secondary [ ], text bare).
// Implementation lands in Plan 03-05.
import type { ComponentNode } from "../../../model/component.ts";

export function renderButton(
  node: Extract<ComponentNode, { kind: "Button" }>,
  width: number,
): string[] {
  void node;
  void width;
  throw new Error("NYI: Plan 03-05 renderButton (scaffolded in 03-01)");
}
