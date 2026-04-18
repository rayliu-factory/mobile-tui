// src/emit/wireframe/components/image.ts
// renderImage — 3-line +--IMG---+ / |  alt  | / +--------+ box per
// D-Claude "Image placeholder". Implementation lands in Plan 03-04.
import type { ComponentNode } from "../../../model/component.ts";

export function renderImage(
  node: Extract<ComponentNode, { kind: "Image" }>,
  width: number,
): string[] {
  void node;
  void width;
  throw new Error("NYI: Plan 03-04 renderImage (scaffolded in 03-01)");
}
