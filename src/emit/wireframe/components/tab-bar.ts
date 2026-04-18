// src/emit/wireframe/components/tab-bar.ts
// renderTabBar — "---" rule above + "[ Home ] | [ Stats ] | [ Settings ]" per
// D-37, bottom-anchored. Implementation lands in Plan 03-07.
import type { ComponentNode } from "../../../model/component.ts";

export function renderTabBar(
  node: Extract<ComponentNode, { kind: "TabBar" }>,
  width: number,
): string[] {
  void node;
  void width;
  throw new Error("NYI: Plan 03-07 renderTabBar (scaffolded in 03-01)");
}
