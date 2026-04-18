// src/editor/commands/delete-nav-edge.ts
// delete-nav-edge command per D-54 + D-56.
//
// APPLY:
//   - Capture edge JSON; remove at index; doc.deleteIn(["navigation", "edges", index])
//   - inverseArgs: { index, edgeJSON }
//
// INVERT:
//   - Restore at index via full edges rebuild using doc.setIn
//
// THREAT T-04-ArgInjection: z.coerce.number.int.min(0).
import { z } from "zod";
import type { NavEdge } from "../../model/navigation.ts";
import type { Command } from "../types.ts";

export const deleteNavEdgeArgs = z.object({
  index: z.coerce.number().int().min(0),
});

type DeleteNavEdgeArgs = z.infer<typeof deleteNavEdgeArgs>;

interface DeleteNavEdgeInverse {
  index: number;
  edgeJSON: NavEdge;
}

export const deleteNavEdge: Command<typeof deleteNavEdgeArgs> = {
  name: "delete-nav-edge",
  argsSchema: deleteNavEdgeArgs,

  apply(spec, astHandle, args: DeleteNavEdgeArgs) {
    const edge = spec.navigation.edges[args.index];
    if (!edge) {
      return {
        spec,
        inverseArgs: { index: args.index, edgeJSON: null as unknown as NavEdge },
      };
    }

    // T-04-14: plain JS copy, never a live YAML node
    const edgeJSON = { ...edge };
    const newEdges = spec.navigation.edges.filter((_, i) => i !== args.index);

    // AST-level: remove from sequence
    astHandle.doc.deleteIn(["navigation", "edges", args.index]);

    const newSpec = {
      ...spec,
      navigation: { ...spec.navigation, edges: newEdges },
    };

    const inverseArgs: DeleteNavEdgeInverse = { index: args.index, edgeJSON };
    return { spec: newSpec, inverseArgs };
  },

  invert(spec, astHandle, inverseArgs) {
    const { index, edgeJSON } = inverseArgs as DeleteNavEdgeInverse;
    if (!edgeJSON) return { spec };

    const restoredEdges = [
      ...spec.navigation.edges.slice(0, index),
      edgeJSON,
      ...spec.navigation.edges.slice(index),
    ];

    // AST-level: rebuild the edges sequence to restore at index
    astHandle.doc.setIn(["navigation", "edges"], astHandle.doc.createNode(restoredEdges));

    return {
      spec: {
        ...spec,
        navigation: { ...spec.navigation, edges: restoredEdges },
      },
    };
  },
};
