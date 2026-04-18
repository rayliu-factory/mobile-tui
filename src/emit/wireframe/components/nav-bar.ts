// src/emit/wireframe/components/nav-bar.ts
// renderNavBar — "< Title [trailing]" + "---" rule per D-37.
// Implementation lands in Plan 03-07.
import type { ComponentNode } from "../../../model/component.ts";

export function renderNavBar(
  node: Extract<ComponentNode, { kind: "NavBar" }>,
  width: number,
): string[] {
  void node;
  void width;
  throw new Error("NYI: Plan 03-07 renderNavBar (scaffolded in 03-01)");
}
