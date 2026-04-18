// src/editor/commands/update-nav-edge.ts
// update-nav-edge command per D-54 + D-56.
// Applies a partial patch to an existing NavEdge by index.
//
// APPLY:
//   - Merge patch into edges[index]; setScalarPreserving for each changed field
//   - inverseArgs: { index, prevEdge: { ...edge } }
//
// INVERT:
//   - Restore prevEdge fields (setScalarPreserving for each)
//
// THREAT T-04-ArgInjection: ScreenIdSchema + ActionIdSchema + z.enum(TRANSITIONS).
import { z } from "zod";
import type { NavEdge } from "../../model/navigation.ts";
import { TRANSITIONS } from "../../model/navigation.ts";
import { ActionIdSchema, ScreenIdSchema } from "../../primitives/ids.ts";
import { setScalarPreserving } from "../../serialize/write.ts";
import type { Command } from "../types.ts";

export const updateNavEdgeArgs = z.object({
  index: z.coerce.number().int().min(0),
  patch: z.object({
    from: ScreenIdSchema.optional(),
    to: ScreenIdSchema.optional(),
    trigger: ActionIdSchema.optional(),
    transition: z.enum(TRANSITIONS).optional(),
  }),
});

type UpdateNavEdgeArgs = z.infer<typeof updateNavEdgeArgs>;

interface UpdateNavEdgeInverse {
  index: number;
  prevEdge: NavEdge;
}

export const updateNavEdge: Command<typeof updateNavEdgeArgs> = {
  name: "update-nav-edge",
  argsSchema: updateNavEdgeArgs,

  apply(spec, astHandle, args: UpdateNavEdgeArgs) {
    const edge = spec.navigation.edges[args.index];
    if (!edge) {
      return { spec, inverseArgs: { index: args.index, prevEdge: null as unknown as NavEdge } };
    }

    // Capture prevEdge (plain JS copy, T-04-14)
    const prevEdge = { ...edge };

    // Apply patch fields
    const { patch } = args;
    const updatedEdge = { ...edge };

    if (patch.from !== undefined) {
      setScalarPreserving(astHandle.doc, ["navigation", "edges", args.index, "from"], patch.from);
      updatedEdge.from = patch.from;
    }
    if (patch.to !== undefined) {
      setScalarPreserving(astHandle.doc, ["navigation", "edges", args.index, "to"], patch.to);
      updatedEdge.to = patch.to;
    }
    if (patch.trigger !== undefined) {
      setScalarPreserving(
        astHandle.doc,
        ["navigation", "edges", args.index, "trigger"],
        patch.trigger,
      );
      updatedEdge.trigger = patch.trigger;
    }
    if (patch.transition !== undefined) {
      setScalarPreserving(
        astHandle.doc,
        ["navigation", "edges", args.index, "transition"],
        patch.transition,
      );
      updatedEdge.transition = patch.transition;
    }

    const newEdges = spec.navigation.edges.map((e, i) => (i === args.index ? updatedEdge : e));
    const newSpec = {
      ...spec,
      navigation: { ...spec.navigation, edges: newEdges },
    };

    const inverseArgs: UpdateNavEdgeInverse = { index: args.index, prevEdge };
    return { spec: newSpec, inverseArgs };
  },

  invert(spec, astHandle, inverseArgs) {
    const { index, prevEdge } = inverseArgs as UpdateNavEdgeInverse;
    if (!prevEdge) return { spec };

    const edge = spec.navigation.edges[index];
    if (!edge) return { spec };

    // Restore each field that may have changed
    setScalarPreserving(astHandle.doc, ["navigation", "edges", index, "from"], prevEdge.from);
    setScalarPreserving(astHandle.doc, ["navigation", "edges", index, "to"], prevEdge.to);
    setScalarPreserving(astHandle.doc, ["navigation", "edges", index, "trigger"], prevEdge.trigger);

    if (prevEdge.transition !== undefined) {
      setScalarPreserving(
        astHandle.doc,
        ["navigation", "edges", index, "transition"],
        prevEdge.transition,
      );
    } else if (edge.transition !== undefined) {
      // Transition was added by the patch; remove it
      if (astHandle.doc.hasIn(["navigation", "edges", index, "transition"])) {
        astHandle.doc.deleteIn(["navigation", "edges", index, "transition"]);
      }
    }

    const restoredEdge: NavEdge = { ...prevEdge };
    const newEdges = spec.navigation.edges.map((e, i) => (i === index ? restoredEdge : e));

    return {
      spec: {
        ...spec,
        navigation: { ...spec.navigation, edges: newEdges },
      },
    };
  },
};
