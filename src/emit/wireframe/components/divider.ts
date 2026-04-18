// src/emit/wireframe/components/divider.ts
// renderDivider — single `-----` run at content width per D-36.
// Single line of length === width.
//
// THREAT T-03-04 (snapshot drift): pure function; no Date, no random.
import type { ComponentNode } from "../../../model/component.ts";

export function renderDivider(
  node: Extract<ComponentNode, { kind: "Divider" }>,
  width: number,
): string[] {
  void node;
  return ["-".repeat(Math.max(0, width))];
}
