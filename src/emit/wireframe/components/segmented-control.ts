// src/emit/wireframe/components/segmented-control.ts
// renderSegmentedControl — < Day | *Week* | Month > per D-34.
// Implementation lands in Plan 03-05.
import type { ComponentNode } from "../../../model/component.ts";

export function renderSegmentedControl(
  node: Extract<ComponentNode, { kind: "SegmentedControl" }>,
  width: number,
): string[] {
  void node;
  void width;
  throw new Error("NYI: Plan 03-05 renderSegmentedControl (scaffolded in 03-01)");
}
