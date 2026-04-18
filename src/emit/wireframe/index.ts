// src/emit/wireframe/index.ts — public barrel for the L4 Emit layer
// (wireframe sub-module). Consumers: scripts/render-wireframe.ts (Phase 3
// CLI), Phase 4 editor-store preview pane, Phase 5 canvas preview pane,
// Phase 8 :yank wireframe handler.
//
// Implementation details (dispatch.renderNode, per-kind emitters,
// layout primitives, text-style, overflow) are INTERNAL and imported
// directly from leaf modules by co-located tests.
//
// Barrel follows the EXPLICIT-NAMED pattern per src/model/index.ts +
// src/serialize/index.ts (NOT `export *`).
export { PHONE_WIDTH, type VariantKind } from "./layout.ts";
export { type RenderOptions, render, renderAllVariants } from "./variants.ts";
