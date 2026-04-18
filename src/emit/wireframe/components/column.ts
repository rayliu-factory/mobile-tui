// src/emit/wireframe/components/column.ts
// renderColumn — vertical stack of children with gap-lines per D-36.
// Implementation lands in Plan 03-06.
import type { ComponentNode } from "../../../model/component.ts";

export function renderColumn(
  node: Extract<ComponentNode, { kind: "Column" }>,
  width: number,
): string[] {
  void node;
  void width;
  throw new Error("NYI: Plan 03-06 renderColumn (scaffolded in 03-01)");
}
