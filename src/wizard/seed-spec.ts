// src/wizard/seed-spec.ts
// Factory: produces a minimal valid Spec for new-wizard file creation.
//
// The seed spec satisfies SpecSchema:
//   - screens: one placeholder (min(1) still enforced on screens)
//   - data.entities: [] (min(0) after Phase-6 schema relaxation)
//   - navigation.root: "placeholder" (references the sole placeholder screen)
//   - actions: {} (empty — valid per ActionsRegistrySchema)
//
// Wizard steps (Phase-6, Plans 02-05) replace placeholder data as the user
// advances through the intake flow. The seed is a structurally-valid starting
// point, not a meaningful spec — hence the "TODO" title.
//
// IMPORTANT: Each call returns a fresh object — callers must NOT share
// references between wizard instances.
import type { Spec } from "../model/index.ts";

export function createSeedSpec(): Spec {
  return {
    schema: "mobile-tui/1",
    screens: [
      {
        id: "placeholder" as Spec["screens"][number]["id"],
        title: "TODO",
        kind: "regular",
        variants: {
          content: { kind: "content", tree: [] },
          empty: null,
          loading: null,
          error: null,
        },
      },
    ],
    actions: {},
    data: { entities: [] },
    navigation: {
      root: "placeholder" as Spec["navigation"]["root"],
      edges: [],
    },
  };
}
