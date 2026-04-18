// src/emit/wireframe/components/toggle.ts
// renderToggle per D-34: `[ ] label` off / `[x] label` on — glyph leads,
// label trails with a single-space separator.
//
// Phase-3 v1 ALWAYS renders `[ ]` (off). Wireframes display STRUCTURE, not
// a particular state; bindsTo is a JsonPointer to author-land state that is
// not resolvable at render time. Phase-5 may introduce
// `render(spec, screenId, {state: ...})` to parameterize the selection glyph
// per Assumption A1 in 03-RESEARCH.md §Component Emitter Details.
//
// D-42: action + testID NEVER appear in persisted output; only `label`
// reaches the glyph. The in-memory shape still carries them — they are
// dropped at the wireframe boundary only.
//
// THREAT T-03-01 (label escape-sequence smuggling): Phase-1 PRINTABLE_ASCII.
// THREAT T-03-08 (D-42 leak): never reads node.action or node.testID.
// THREAT T-03-04 (snapshot drift): pure function; no Date, no random.
import type { ComponentNode } from "../../../model/component.ts";
import { padRight } from "../layout.ts";
import { truncate } from "../overflow.ts";

const GLYPH_OFF = "[ ]";
// const GLYPH_ON = "[x]"; // Phase-5 — state-parameterized render.

export function renderToggle(
  node: Extract<ComponentNode, { kind: "Toggle" }>,
  width: number,
): string[] {
  // v1: unconditionally off.
  const glyph = GLYPH_OFF;
  // Glyph (3) + 1-space separator = 4 structural cols reserved for the label.
  const labelBudget = Math.max(1, width - glyph.length - 1);
  const label = truncate(node.label, labelBudget);
  const line = `${glyph} ${label}`;
  return [padRight(truncate(line, width), width)];
}
