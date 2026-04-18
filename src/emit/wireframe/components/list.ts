// src/emit/wireframe/components/list.ts
// renderList — repeated item-boxes with a blank-line gap between items per
// D-36. Implementation lands in Plan 03-06.
import type { ComponentNode } from "../../../model/component.ts";

export function renderList(
  node: Extract<ComponentNode, { kind: "List" }>,
  width: number,
): string[] {
  void node;
  void width;
  throw new Error("NYI: Plan 03-06 renderList (scaffolded in 03-01)");
}
