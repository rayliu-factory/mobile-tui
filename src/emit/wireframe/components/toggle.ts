// src/emit/wireframe/components/toggle.ts
// renderToggle — [ ] off / [x] on + label trailing per D-34.
// Implementation lands in Plan 03-05.
import type { ComponentNode } from "../../../model/component.ts";

export function renderToggle(
  node: Extract<ComponentNode, { kind: "Toggle" }>,
  width: number,
): string[] {
  void node;
  void width;
  throw new Error("NYI: Plan 03-05 renderToggle (scaffolded in 03-01)");
}
