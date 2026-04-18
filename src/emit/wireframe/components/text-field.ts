// src/emit/wireframe/components/text-field.ts
// renderTextField per D-34: `label: _________________` — `: ` colon+space
// separator, underscore run fills to `width`.
//
// Phase-3 v1 IGNORES `bindsTo` and `placeholder` — wireframes show structure,
// not a particular state, and there is no live author-land data to resolve
// against at render time. An unchecked pass-through of `placeholder` would
// also create a D-42-style leak vector (placeholders can be authored more
// loosely than labels). Phase-5 may parameterize `render(spec, screenId,
// {state})` to render filled values.
//
// Budget allocation (RESEARCH Pattern 3 — marker-first):
//   1. Reserve `": ".length` (2) + `minUnderscores` (4) for the field floor.
//   2. Truncate `label` to the remaining budget so the field is always
//      readable as a field (at least 4 underscores at the tail).
//   3. Outer `truncate(line, width)` + `padRight` cover the degenerate case
//      where even the floor does not fit (falls through to overflow.ts's
//      `.`.repeat fallback per D-44).
//
// D-42: action + testID NEVER appear in persisted output.
//
// THREAT T-03-01 (label escape-sequence smuggling): Phase-1 PRINTABLE_ASCII.
// THREAT T-03-08 (D-42 leak): never reads node.action or node.testID.
// THREAT T-03-04 (snapshot drift): pure function; no Date, no random.
import type { ComponentNode } from "../../../model/component.ts";
import { padRight } from "../layout.ts";
import { truncate } from "../overflow.ts";

const SEPARATOR = ": ";
const MIN_UNDERSCORES = 4; // visible-field floor

export function renderTextField(
  node: Extract<ComponentNode, { kind: "TextField" }>,
  width: number,
): string[] {
  const labelBudget = Math.max(1, width - SEPARATOR.length - MIN_UNDERSCORES);
  const label = truncate(node.label, labelBudget);
  const prefix = `${label}${SEPARATOR}`;
  // underscoreCount = max(floor, remaining); when label got truncated to the
  // budget, `remaining === MIN_UNDERSCORES`; when label is short, the tail
  // underscores stretch to fill the width.
  const underscoreCount = Math.max(MIN_UNDERSCORES, width - prefix.length);
  const line = prefix + "_".repeat(underscoreCount);
  return [padRight(truncate(line, width), width)];
}
