// src/editor/commands/set-nav-root.ts
// set-nav-root command per D-54 + D-56.
//
// APPLY:
//   - setScalarPreserving(doc, ["navigation", "root"], screenId)
//   - inverseArgs: { prevRoot: spec.navigation.root }
//
// INVERT:
//   - Restore prevRoot via setScalarPreserving
//
// THREAT T-04-ArgInjection: ScreenIdSchema (snake_case).
// THREAT T-04-17: validateSpec post-apply catches if screenId doesn't exist in screens[].
import { z } from "zod";
import type { ScreenId } from "../../primitives/ids.ts";
import { ScreenIdSchema } from "../../primitives/ids.ts";
import { setScalarPreserving } from "../../serialize/write.ts";
import type { Command } from "../types.ts";

export const setNavRootArgs = z.object({
  screenId: ScreenIdSchema,
});

type SetNavRootArgs = z.infer<typeof setNavRootArgs>;

interface SetNavRootInverse {
  prevRoot: ScreenId;
}

export const setNavRoot: Command<typeof setNavRootArgs> = {
  name: "set-nav-root",
  argsSchema: setNavRootArgs,

  apply(spec, astHandle, args: SetNavRootArgs) {
    const prevRoot = spec.navigation.root;

    setScalarPreserving(astHandle.doc, ["navigation", "root"], args.screenId);

    const newSpec = {
      ...spec,
      navigation: { ...spec.navigation, root: args.screenId },
    };

    const inverseArgs: SetNavRootInverse = { prevRoot };
    return { spec: newSpec, inverseArgs };
  },

  invert(spec, astHandle, inverseArgs) {
    const { prevRoot } = inverseArgs as SetNavRootInverse;

    setScalarPreserving(astHandle.doc, ["navigation", "root"], prevRoot);

    return {
      spec: {
        ...spec,
        navigation: { ...spec.navigation, root: prevRoot },
      },
    };
  },
};
