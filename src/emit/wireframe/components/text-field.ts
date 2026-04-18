// src/emit/wireframe/components/text-field.ts
// renderTextField — "Label: ____________" colon-separator + underscore run to
// width per D-34. Implementation lands in Plan 03-05.
import type { ComponentNode } from "../../../model/component.ts";

export function renderTextField(
  node: Extract<ComponentNode, { kind: "TextField" }>,
  width: number,
): string[] {
  void node;
  void width;
  throw new Error("NYI: Plan 03-05 renderTextField (scaffolded in 03-01)");
}
