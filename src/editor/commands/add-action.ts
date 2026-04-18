// src/editor/commands/add-action.ts
// add-action command per D-54 + D-56 + D-59 (action registry, two-command split).
//
// APPLY:
//   - Spec-level: { ...spec, actions: { ...spec.actions, [id]: effect } }
//   - AST-level (D-62): doc.setIn(["actions", id], doc.createNode(effect))
//   - inverseArgs: { id }
//
// INVERT:
//   - Delete id from spec.actions; doc.deleteIn(["actions", id])
//
// THREAT T-04-ArgInjection: ActionIdSchema (snake_case) + ActionSchema (discriminated union).
// THREAT T-04-16 (rename collision): validateSpec post-apply catches duplicates.
import { z } from "zod";
import { ActionSchema } from "../../model/action.ts";
import { ActionIdSchema } from "../../primitives/ids.ts";
import type { Command } from "../types.ts";

export const addActionArgs = z.object({
  id: ActionIdSchema,
  effect: ActionSchema,
});

type AddActionArgs = z.infer<typeof addActionArgs>;

interface AddActionInverse {
  id: string;
}

export const addAction: Command<typeof addActionArgs> = {
  name: "add-action",
  argsSchema: addActionArgs,

  apply(spec, astHandle, args: AddActionArgs) {
    const newActions = { ...spec.actions };
    // biome-ignore lint/suspicious/noExplicitAny: branded key indexing
    (newActions as any)[args.id] = args.effect;

    const newSpec = { ...spec, actions: newActions };

    // AST-level (D-62)
    astHandle.doc.setIn(["actions", args.id], astHandle.doc.createNode(args.effect));

    const inverseArgs: AddActionInverse = { id: args.id };
    return { spec: newSpec, inverseArgs };
  },

  invert(spec, astHandle, inverseArgs) {
    const { id } = inverseArgs as AddActionInverse;

    const newActions = { ...spec.actions };
    // biome-ignore lint/suspicious/noExplicitAny: branded key indexing
    delete (newActions as any)[id];

    // AST-level: remove the entry
    astHandle.doc.deleteIn(["actions", id]);

    return { spec: { ...spec, actions: newActions } };
  },
};
