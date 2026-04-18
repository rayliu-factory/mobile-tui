// src/emit/wireframe/components/spacer.ts
// renderSpacer — blank line(s) per D-36: sm=1, md=2, lg=3.
// Implementation lands in Plan 03-04.
import type { ComponentNode } from "../../../model/component.ts";

export function renderSpacer(
  node: Extract<ComponentNode, { kind: "Spacer" }>,
  width: number,
): string[] {
  void node;
  void width;
  throw new Error("NYI: Plan 03-04 renderSpacer (scaffolded in 03-01)");
}
