// src/emit/wireframe/components/spacer.ts
// renderSpacer — blank line(s) per D-36: size → line-count mapping
//   sm → 1 line
//   md → 2 lines (DEFAULT; applies when size omitted)
//   lg → 3 lines
// Each line is a run of spaces at width (rectangular contract).
//
// THREAT T-03-04 (snapshot drift): pure function; no Date, no random.
import type { ComponentNode } from "../../../model/component.ts";

export function renderSpacer(
  node: Extract<ComponentNode, { kind: "Spacer" }>,
  width: number,
): string[] {
  const count = node.size === "sm" ? 1 : node.size === "lg" ? 3 : 2;
  const blank = " ".repeat(Math.max(0, width));
  const out: string[] = [];
  for (let i = 0; i < count; i++) out.push(blank);
  return out;
}
