// src/emit/wireframe/components/button.ts
// renderButton per D-34 three-variant glyph alphabet:
//   variant=primary   → `[[ label ]]`   (6-char structural overhead)
//   variant=secondary → `[ label ]`      (4-char structural overhead; DEFAULT)
//   variant=text      → `label`           (0-char structural overhead)
//
// Budget allocation (RESEARCH Pattern 3 — marker-first): label is truncated
// to `width - structuralOverhead` so the glyph brackets stay visible at
// degenerate widths; outer `truncate(glyph, width)` guards against the
// degenerate case where width < structuralOverhead itself (falls through to
// overflow.ts's `.`.repeat(width) fallback per D-44).
//
// D-42: action + testID are NEVER rendered in persisted output; only the
// `label` reaches the glyph. The `action` string is retained in the in-memory
// ComponentNode (used by downstream test-flow emission) but is dropped at the
// wireframe boundary.
//
// THREAT T-03-01 (label escape-sequence smuggling): labels are Phase-1
// PRINTABLE_ASCII-validated at schema time; downstream re-enforcement runs in
// tests/wireframe-ascii-baseline.test.ts.
// THREAT T-03-08 (D-42 leak): renderButton never reads node.action or
// node.testID — enforced by dedicated `not.toContain(action)` assertion.
// THREAT T-03-04 (snapshot drift): pure function; no Date, no random.
import type { ComponentNode } from "../../../model/component.ts";
import { padRight } from "../layout.ts";
import { truncate } from "../overflow.ts";

export function renderButton(
  node: Extract<ComponentNode, { kind: "Button" }>,
  width: number,
): string[] {
  const variant = node.variant ?? "secondary";
  let glyph: string;
  if (variant === "primary") {
    // `[[ ` (3) + ` ]]` (3) = 6 structural cols.
    const labelBudget = Math.max(1, width - 6);
    const label = truncate(node.label, labelBudget);
    glyph = `[[ ${label} ]]`;
  } else if (variant === "text") {
    // No structural overhead — bare label.
    glyph = truncate(node.label, Math.max(0, width));
  } else {
    // secondary (default): `[ ` (2) + ` ]` (2) = 4 structural cols.
    const labelBudget = Math.max(1, width - 4);
    const label = truncate(node.label, labelBudget);
    glyph = `[ ${label} ]`;
  }
  return [padRight(truncate(glyph, width), width)];
}
