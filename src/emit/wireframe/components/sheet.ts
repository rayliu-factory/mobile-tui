// src/emit/wireframe/components/sheet.ts
// renderSheet — "+-- Sheet -----+" box anchored to bottom per D-36.
// Implementation lands in Plan 03-07.
import type { ComponentNode } from "../../../model/component.ts";

export function renderSheet(
  node: Extract<ComponentNode, { kind: "Sheet" }>,
  width: number,
): string[] {
  void node;
  void width;
  throw new Error("NYI: Plan 03-07 renderSheet (scaffolded in 03-01)");
}
