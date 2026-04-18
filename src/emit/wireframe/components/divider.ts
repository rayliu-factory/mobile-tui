// src/emit/wireframe/components/divider.ts
// renderDivider — single ----- run at content width per D-36.
// Implementation lands in Plan 03-04.
import type { ComponentNode } from "../../../model/component.ts";

export function renderDivider(
  node: Extract<ComponentNode, { kind: "Divider" }>,
  width: number,
): string[] {
  void node;
  void width;
  throw new Error("NYI: Plan 03-04 renderDivider (scaffolded in 03-01)");
}
