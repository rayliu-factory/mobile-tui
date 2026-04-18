// src/emit/wireframe/components/row.ts
// renderRow — horizontal arrangement of children with gap per D-36.
// Implementation lands in Plan 03-06.
import type { ComponentNode } from "../../../model/component.ts";

export function renderRow(node: Extract<ComponentNode, { kind: "Row" }>, width: number): string[] {
  void node;
  void width;
  throw new Error("NYI: Plan 03-06 renderRow (scaffolded in 03-01)");
}
