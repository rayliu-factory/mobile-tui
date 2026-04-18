// src/editor/commands/add-nav-edge.ts
// add-nav-edge command per D-54 + D-56. MVP D-55.
//
// APPLY:
//   - Append NavEdge; doc.addIn(["navigation", "edges"], doc.createNode({from, to, trigger, ...}))
//   - inverseArgs: { insertedIndex: spec.navigation.edges.length }
//
// INVERT:
//   - Remove by index via doc.deleteIn
//
// THREAT T-04-ArgInjection: ScreenIdSchema + ActionIdSchema.
// THREAT T-04-17: validateSpec post-apply catches dangling from/to screen refs.
import { z } from "zod";
import type { NavEdge } from "../../model/navigation.ts";
import { TRANSITIONS } from "../../model/navigation.ts";
import { ActionIdSchema, ScreenIdSchema } from "../../primitives/ids.ts";
import type { Command } from "../types.ts";

export const addNavEdgeArgs = z.object({
  from: ScreenIdSchema,
  to: ScreenIdSchema,
  trigger: ActionIdSchema,
  transition: z.enum(TRANSITIONS).optional(),
});

type AddNavEdgeArgs = z.infer<typeof addNavEdgeArgs>;

interface AddNavEdgeInverse {
  insertedIndex: number;
}

export const addNavEdge: Command<typeof addNavEdgeArgs> = {
  name: "add-nav-edge",
  argsSchema: addNavEdgeArgs,

  apply(spec, astHandle, args: AddNavEdgeArgs) {
    const insertedIndex = spec.navigation.edges.length;

    const newEdge: NavEdge = {
      from: args.from,
      to: args.to,
      trigger: args.trigger,
      ...(args.transition !== undefined ? { transition: args.transition } : {}),
    };

    const newSpec = {
      ...spec,
      navigation: {
        ...spec.navigation,
        edges: [...spec.navigation.edges, newEdge],
      },
    };

    // AST-level: addIn appends to the edges sequence
    astHandle.doc.addIn(["navigation", "edges"], astHandle.doc.createNode(newEdge));

    const inverseArgs: AddNavEdgeInverse = { insertedIndex };
    return { spec: newSpec, inverseArgs };
  },

  invert(spec, astHandle, inverseArgs) {
    const { insertedIndex } = inverseArgs as AddNavEdgeInverse;

    const restoredSpec = {
      ...spec,
      navigation: {
        ...spec.navigation,
        edges: spec.navigation.edges.slice(0, insertedIndex),
      },
    };

    astHandle.doc.deleteIn(["navigation", "edges", insertedIndex]);

    return { spec: restoredSpec };
  },
};
