// src/emit/wireframe/components/sheet.ts
// renderSheet per D-36: labeled `+-- Sheet -----+` top border + child body
// + plain `+---+` bottom border. Sheet bottom-anchoring within the variant
// frame is Plan 03-08's variants.ts composer concern.
//
// Shares renderOverlayBox with modal.ts — the only difference between the
// two overlay kinds at the per-kind emitter level is the top-border label
// ("Modal" vs "Sheet"). Centering (Modal) vs bottom-anchoring (Sheet)
// happens in the variant-frame composer, not here.
//
// THREAT T-03-04 (snapshot drift): pure function; no Date, no random.
import type { ComponentNode } from "../../../model/component.ts";
import { renderOverlayBox } from "./modal.ts";

export function renderSheet(
  node: Extract<ComponentNode, { kind: "Sheet" }>,
  width: number,
): string[] {
  return renderOverlayBox(node.child, width, "Sheet");
}
