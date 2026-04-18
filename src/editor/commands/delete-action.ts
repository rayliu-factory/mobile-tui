// src/editor/commands/delete-action.ts
// delete-action command per D-54 + D-56.
//
// APPLY:
//   - Capture action JSON (plain JS, T-04-14)
//   - Delete from spec.actions; doc.deleteIn(["actions", id])
//   - inverseArgs: { id, actionJSON }
//
// Note: Orphan component bindings left in place — EDITOR_REF_CASCADE_INCOMPLETE
// is informational; validateSpec will surface the dangling refs as errors.
//
// INVERT:
//   - Restore action at id via doc.setIn
//
// THREAT T-04-ArgInjection: ActionIdSchema enforces snake_case.
// THREAT T-04-18: Orphan bindings are left for validateSpec, not fixed here.
import { z } from "zod";
import type { Action } from "../../model/action.ts";
import { ActionIdSchema } from "../../primitives/ids.ts";
import type { Command } from "../types.ts";

export const deleteActionArgs = z.object({
  id: ActionIdSchema,
});

type DeleteActionArgs = z.infer<typeof deleteActionArgs>;

interface DeleteActionInverse {
  id: string;
  actionJSON: Action | null;
}

export const deleteAction: Command<typeof deleteActionArgs> = {
  name: "delete-action",
  argsSchema: deleteActionArgs,

  apply(spec, astHandle, args: DeleteActionArgs) {
    // biome-ignore lint/suspicious/noExplicitAny: branded key indexing
    const actionJSON = ((spec.actions as any)[args.id] ?? null) as Action | null;

    if (!actionJSON) {
      return { spec, inverseArgs: { id: args.id, actionJSON: null } };
    }

    const newActions = { ...spec.actions };
    // biome-ignore lint/suspicious/noExplicitAny: branded key indexing
    delete (newActions as any)[args.id];

    // AST-level: remove the key
    astHandle.doc.deleteIn(["actions", args.id]);

    const inverseArgs: DeleteActionInverse = {
      id: args.id,
      actionJSON: { ...actionJSON } as Action,
    };
    return { spec: { ...spec, actions: newActions }, inverseArgs };
  },

  invert(spec, astHandle, inverseArgs) {
    const { id, actionJSON } = inverseArgs as DeleteActionInverse;

    if (!actionJSON) return { spec };

    const newActions = { ...spec.actions };
    // biome-ignore lint/suspicious/noExplicitAny: branded key indexing
    (newActions as any)[id] = actionJSON;
    const newSpec = { ...spec, actions: newActions };

    // AST-level: restore the action
    astHandle.doc.setIn(["actions", id], astHandle.doc.createNode(actionJSON));

    return { spec: newSpec };
  },
};
