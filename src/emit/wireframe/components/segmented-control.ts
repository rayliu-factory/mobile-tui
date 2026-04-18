// src/emit/wireframe/components/segmented-control.ts
// renderSegmentedControl per D-34: `< opt1 | opt2 | opt3 >` — angle endcaps
// with space-pipe-space separators between options.
//
// Phase-3 v1 renders NO selection marking. The asterisk-wrapping form
// `*opt2*` described in 03-CONTEXT.md D-34 requires a resolved selection,
// which `bindsTo` (a JsonPointer to author-land state) cannot provide at
// render time. Phase-5 may parameterize `render(spec, screenId, {state})`
// per Assumption A1 in 03-RESEARCH.md §Component Emitter Details.
//
// D-42: action + testID NEVER appear in persisted output. The top-level
// `label` is the SIGIL GROUPING — it names the control in the spec but is
// NOT part of the visible glyph; only `options` render.
//
// Overflow handling (RESEARCH Pattern 3 — marker-first endcap preservation):
//   1. Reserve endcap budget: `< ` (2) + ` >` (2) = 4 structural cols.
//   2. Truncate the joined options to the remaining inner budget via
//      overflow.ts (emits `...` per D-44 when needed).
//   3. Recompose `< ${truncated} >` so both `<` and `>` survive at any
//      width ≥ endcap overhead + D-44 floor.
//   4. Outer `truncate(glyph, width)` + `padRight` cover pathological widths
//      below the endcap floor (falls through to `.`.repeat per D-44).
//
// THREAT T-03-01 (option-string escape-sequence smuggling): Phase-1
//   PRINTABLE_ASCII (options pass the same label-character validator).
// THREAT T-03-08 (D-42 leak): never reads node.action or node.testID; top-
//   level `label` also omitted from visible glyph.
// THREAT T-03-04 (snapshot drift): pure function; no Date, no random.
import type { ComponentNode } from "../../../model/component.ts";
import { padRight } from "../layout.ts";
import { truncate } from "../overflow.ts";

const ENDCAP_OPEN = "< ";
const ENDCAP_CLOSE = " >";
const ENDCAP_OVERHEAD = ENDCAP_OPEN.length + ENDCAP_CLOSE.length; // 4

export function renderSegmentedControl(
  node: Extract<ComponentNode, { kind: "SegmentedControl" }>,
  width: number,
): string[] {
  const joined = node.options.join(" | ");
  // Marker-first: reserve endcap budget, truncate only the inner payload.
  const innerBudget = Math.max(1, width - ENDCAP_OVERHEAD);
  const inner = truncate(joined, innerBudget);
  const glyph = `${ENDCAP_OPEN}${inner}${ENDCAP_CLOSE}`;
  // Outer truncate guards the pathological width < ENDCAP_OVERHEAD case.
  return [padRight(truncate(glyph, width), width)];
}
