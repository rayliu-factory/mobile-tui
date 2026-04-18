// src/editor/commands/set-screen-title.ts
// set-screen-title command per D-54 + D-56 (one-file-per-command).
//
// APPLY:
//   - Spec-level: update screens[i].title
//   - AST-level (D-62): setScalarPreserving(doc, ["screens", i, "title"], title)
//   - inverseArgs: { screenIndex: i, prevTitle: screen.title }
//
// INVERT:
//   - Restore prevTitle via setScalarPreserving
//
// THREAT T-04-ArgInjection: z.string().min(1) ensures non-empty title.
// THREAT T-04-ASTDrift: invert fully reverses both spec + AST.
import { z } from "zod";
import { ScreenIdSchema } from "../../primitives/ids.ts";
import { setScalarPreserving } from "../../serialize/write.ts";
import type { Command } from "../types.ts";

export const setScreenTitleArgs = z.object({
  id: ScreenIdSchema,
  title: z.string().min(1, "screen title must be non-empty"),
});

type SetScreenTitleArgs = z.infer<typeof setScreenTitleArgs>;

interface SetScreenTitleInverse {
  screenIndex: number;
  prevTitle: string;
}

export const setScreenTitle: Command<typeof setScreenTitleArgs> = {
  name: "set-screen-title",
  argsSchema: setScreenTitleArgs,

  apply(spec, astHandle, args: SetScreenTitleArgs) {
    const screenIndex = spec.screens.findIndex((s) => s.id === args.id);
    const screen = spec.screens[screenIndex];
    if (!screen) {
      throw new Error(`set-screen-title: screen "${args.id}" not found`);
    }

    const prevTitle = screen.title;

    const newScreens = spec.screens.map((s, i) =>
      i === screenIndex ? { ...s, title: args.title } : s,
    );

    // AST-level (D-62)
    setScalarPreserving(astHandle.doc, ["screens", screenIndex, "title"], args.title);

    const inverseArgs: SetScreenTitleInverse = { screenIndex, prevTitle };
    return { spec: { ...spec, screens: newScreens }, inverseArgs };
  },

  invert(spec, astHandle, inverseArgs) {
    const { screenIndex, prevTitle } = inverseArgs as SetScreenTitleInverse;

    const newScreens = spec.screens.map((s, i) =>
      i === screenIndex ? { ...s, title: prevTitle } : s,
    );

    setScalarPreserving(astHandle.doc, ["screens", screenIndex, "title"], prevTitle);

    return { spec: { ...spec, screens: newScreens } };
  },
};
