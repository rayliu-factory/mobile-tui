// src/emit/wireframe/components/icon.ts
// renderIcon — inline [icon:name] per D-Claude "Icon placeholder".
// Implementation lands in Plan 03-04.
import type { ComponentNode } from "../../../model/component.ts";

export function renderIcon(
  node: Extract<ComponentNode, { kind: "Icon" }>,
  width: number,
): string[] {
  void node;
  void width;
  throw new Error("NYI: Plan 03-04 renderIcon (scaffolded in 03-01)");
}
