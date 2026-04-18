// src/emit/wireframe/variants.ts
// Top-level renderer composition — stacks 4 variants per D-39; null
// variants render as 1-line (N/A) marker frames per D-39; acceptance
// footer appends under content only per D-45.
//
// Implementation lands in Plan 03-08.
import type { Spec } from "../../model/index.ts";
import type { Diagnostic } from "../../primitives/diagnostic.ts";

export interface RenderOptions {
  diagnostics?: Diagnostic[];
}

export function render(spec: Spec, screenId: string, opts?: RenderOptions): string {
  void spec;
  void screenId;
  void opts;
  throw new Error("NYI: Plan 03-08 render");
}

export function renderAllVariants(spec: Spec, screenId: string, opts?: RenderOptions): string {
  // Alias / convenience — same shape as render for v1. Plan 03-08 may
  // unify these into a single export.
  return render(spec, screenId, opts);
}
