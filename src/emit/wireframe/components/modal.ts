// src/emit/wireframe/components/modal.ts
// renderModal per D-36: labeled `+-- Modal -----+` top border + child body
// in `| ... |` rows + plain `+---+` bottom border. Modal centering within
// the variant frame is Plan 03-08's variants.ts composer concern.
//
// Width arithmetic (RESEARCH Pitfall 4): outer `width` → child sees
// `width - 4`. Mirrors renderCard's geometry; the only difference is the
// labeled top border `+-- Modal -----+` in place of Card's plain `+---+`.
//
// The shared `renderOverlayBox(child, width, label)` helper is exported so
// sheet.ts can reuse the same box geometry with a different label. Keeping
// both overlays DRY: a single helper controls the top-border label + body-
// row wrapping + bottom-border geometry; per-kind emitters pick the label.
//
// THREAT T-03-04 (snapshot drift): pure function; no Date, no random.
import type { ComponentNode } from "../../../model/component.ts";
import { renderNode } from "../dispatch.ts";
import { padRight } from "../layout.ts";

export function renderModal(
  node: Extract<ComponentNode, { kind: "Modal" }>,
  width: number,
): string[] {
  return renderOverlayBox(node.child, width, "Modal");
}

// Exported so sheet.ts can reuse with label="Sheet".
export function renderOverlayBox(child: ComponentNode, width: number, label: string): string[] {
  const innerWidth = Math.max(1, width - 4);
  const childLines = renderNode(child, innerWidth);

  // Top border: `+-- {label} ` + `-` fill + trailing `+`.
  // Example at width 60, label "Modal": `+-- Modal --...--+`
  const labelSegment = `+-- ${label} `;
  const bottomBorder = `+${"-".repeat(Math.max(0, width - 2))}+`;
  const topFillLen = Math.max(0, width - labelSegment.length - 1); // 1 for trailing "+"
  const topBorder = `${labelSegment}${"-".repeat(topFillLen)}+`;

  const bodyRows = childLines.map((l) => `| ${padRight(l, width - 4)} |`);
  return [padRight(topBorder, width), ...bodyRows, bottomBorder];
}
