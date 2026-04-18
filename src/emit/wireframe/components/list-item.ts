// src/emit/wireframe/components/list-item.ts
// renderListItem — tappable or container item row per D-34.
// Implementation lands in Plan 03-06.
import type { ComponentNode } from "../../../model/component.ts";

export function renderListItem(
  node: Extract<ComponentNode, { kind: "ListItem" }>,
  width: number,
): string[] {
  void node;
  void width;
  throw new Error("NYI: Plan 03-06 renderListItem (scaffolded in 03-01)");
}
