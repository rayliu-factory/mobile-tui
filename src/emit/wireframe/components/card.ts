// src/emit/wireframe/components/card.ts
// renderCard — plain +--+ box around its child per D-36.
// Implementation lands in Plan 03-06.
import type { ComponentNode } from "../../../model/component.ts";

export function renderCard(
  node: Extract<ComponentNode, { kind: "Card" }>,
  width: number,
): string[] {
  void node;
  void width;
  throw new Error("NYI: Plan 03-06 renderCard (scaffolded in 03-01)");
}
