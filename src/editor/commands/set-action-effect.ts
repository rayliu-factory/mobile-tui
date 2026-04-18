// src/editor/commands/set-action-effect.ts
// set-action-effect command per D-54 + D-56.
//
// APPLY:
//   - Replace action effect in registry; doc.setIn(["actions", id], doc.createNode(effect))
//   - inverseArgs: { id, prevEffect: spec.actions[id] }
//
// INVERT:
//   - Restore prevEffect via doc.setIn
//
// THREAT T-04-ArgInjection: ActionIdSchema + ActionSchema for full discriminated union.
import { z } from "zod";
import type { Action } from "../../model/action.ts";
import { ActionSchema } from "../../model/action.ts";
import { ActionIdSchema } from "../../primitives/ids.ts";
import type { Command } from "../types.ts";

export const setActionEffectArgs = z.object({
  id: ActionIdSchema,
  effect: ActionSchema,
});

type SetActionEffectArgs = z.infer<typeof setActionEffectArgs>;

interface SetActionEffectInverse {
  id: string;
  prevEffect: Action | null;
}

export const setActionEffect: Command<typeof setActionEffectArgs> = {
  name: "set-action-effect",
  argsSchema: setActionEffectArgs,

  apply(spec, astHandle, args: SetActionEffectArgs) {
    // biome-ignore lint/suspicious/noExplicitAny: branded key indexing
    const prevEffect = ((spec.actions as any)[args.id] ?? null) as Action | null;

    const newActions = { ...spec.actions };
    // biome-ignore lint/suspicious/noExplicitAny: branded key indexing
    (newActions as any)[args.id] = args.effect;
    const newSpec = { ...spec, actions: newActions };

    // AST-level: replace the action entry
    astHandle.doc.setIn(["actions", args.id], astHandle.doc.createNode(args.effect));

    const inverseArgs: SetActionEffectInverse = {
      id: args.id,
      prevEffect: prevEffect ? ({ ...prevEffect } as Action) : null,
    };
    return { spec: newSpec, inverseArgs };
  },

  invert(spec, astHandle, inverseArgs) {
    const { id, prevEffect } = inverseArgs as SetActionEffectInverse;

    if (!prevEffect) {
      // If there was no previous effect, remove the key
      const newActions = { ...spec.actions };
      // biome-ignore lint/suspicious/noExplicitAny: branded key indexing
      delete (newActions as any)[id];
      astHandle.doc.deleteIn(["actions", id]);
      return { spec: { ...spec, actions: newActions } };
    }

    const newActions = { ...spec.actions };
    // biome-ignore lint/suspicious/noExplicitAny: branded key indexing
    (newActions as any)[id] = prevEffect;
    const newSpec = { ...spec, actions: newActions };

    astHandle.doc.setIn(["actions", id], astHandle.doc.createNode(prevEffect));

    return { spec: newSpec };
  },
};
