// src/editor/commands/set-back-behavior.ts
// set-back-behavior command per D-54 + D-56 (one-file-per-command).
//
// APPLY:
//   - Spec-level: update screens[i].back_behavior (or delete if behavior===null)
//   - AST-level (D-62):
//       if behavior === null: doc.hasIn check then doc.deleteIn (eemeli/yaml #345 safety)
//       else: setScalarPreserving(doc, ["screens", i, "back_behavior"], behavior)
//   - inverseArgs: { screenIndex: i, prevBehavior: screen.back_behavior ?? null }
//
// INVERT:
//   - if prevBehavior===null: delete field; else restore via setScalarPreserving
//
// THREAT T-04-ArgInjection: BackBehaviorSchema rejects invalid behavior values.
// THREAT T-04-ASTDrift: invert fully reverses both spec + AST.
import { z } from "zod";
import type { BackBehavior } from "../../model/back-behavior.ts";
import { BackBehaviorSchema } from "../../model/back-behavior.ts";
import { ScreenIdSchema } from "../../primitives/ids.ts";
import { setScalarPreserving } from "../../serialize/write.ts";
import type { Command } from "../types.ts";

export const setBackBehaviorArgs = z.object({
  id: ScreenIdSchema,
  behavior: BackBehaviorSchema.nullable(),
});

type SetBackBehaviorArgs = z.infer<typeof setBackBehaviorArgs>;

interface SetBackBehaviorInverse {
  screenIndex: number;
  prevBehavior: BackBehavior | null;
}

export const setBackBehavior: Command<typeof setBackBehaviorArgs> = {
  name: "set-back-behavior",
  argsSchema: setBackBehaviorArgs,

  apply(spec, astHandle, args: SetBackBehaviorArgs) {
    const screenIndex = spec.screens.findIndex((s) => s.id === args.id);
    const screen = spec.screens[screenIndex];
    if (!screen) {
      throw new Error(`set-back-behavior: screen "${args.id}" not found`);
    }

    const prevBehavior = screen.back_behavior ?? null;

    let newScreens: typeof spec.screens;
    if (args.behavior === null) {
      // Remove field from spec
      newScreens = spec.screens.map((s, i) => {
        if (i !== screenIndex) return s;
        const { back_behavior: _removed, ...rest } = s;
        return rest;
      });
      // AST: only deleteIn if field exists (eemeli/yaml #345 safety)
      if (astHandle.doc.hasIn(["screens", screenIndex, "back_behavior"])) {
        astHandle.doc.deleteIn(["screens", screenIndex, "back_behavior"]);
      }
    } else {
      // Set scalar value (back_behavior is always a string literal for non-object values)
      newScreens = spec.screens.map((s, i) =>
        i === screenIndex ? { ...s, back_behavior: args.behavior as BackBehavior } : s,
      );
      // For simple string back_behavior values, use setScalarPreserving
      if (typeof args.behavior === "string") {
        setScalarPreserving(
          astHandle.doc,
          ["screens", screenIndex, "back_behavior"],
          args.behavior,
        );
      } else {
        // Object form: { kind: "replace", screen: ScreenId } — use doc.setIn
        astHandle.doc.setIn(
          ["screens", screenIndex, "back_behavior"],
          astHandle.doc.createNode(args.behavior),
        );
      }
    }

    const inverseArgs: SetBackBehaviorInverse = { screenIndex, prevBehavior };
    return { spec: { ...spec, screens: newScreens }, inverseArgs };
  },

  invert(spec, astHandle, inverseArgs) {
    const { screenIndex, prevBehavior } = inverseArgs as SetBackBehaviorInverse;

    let newScreens: typeof spec.screens;
    if (prevBehavior === null) {
      // Remove the field (it didn't exist before)
      newScreens = spec.screens.map((s, i) => {
        if (i !== screenIndex) return s;
        const { back_behavior: _removed, ...rest } = s;
        return rest;
      });
      if (astHandle.doc.hasIn(["screens", screenIndex, "back_behavior"])) {
        astHandle.doc.deleteIn(["screens", screenIndex, "back_behavior"]);
      }
    } else {
      newScreens = spec.screens.map((s, i) =>
        i === screenIndex ? { ...s, back_behavior: prevBehavior } : s,
      );
      if (typeof prevBehavior === "string") {
        setScalarPreserving(astHandle.doc, ["screens", screenIndex, "back_behavior"], prevBehavior);
      } else {
        astHandle.doc.setIn(
          ["screens", screenIndex, "back_behavior"],
          astHandle.doc.createNode(prevBehavior),
        );
      }
    }

    return { spec: { ...spec, screens: newScreens } };
  },
};
