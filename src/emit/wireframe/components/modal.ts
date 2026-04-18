// src/emit/wireframe/components/modal.ts
// renderModal — "+-- Modal -----+" box centered in frame per D-36.
// Implementation lands in Plan 03-07.
import type { ComponentNode } from "../../../model/component.ts";

export function renderModal(
  node: Extract<ComponentNode, { kind: "Modal" }>,
  width: number,
): string[] {
  void node;
  void width;
  throw new Error("NYI: Plan 03-07 renderModal (scaffolded in 03-01)");
}
