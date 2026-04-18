// src/editor/commands/set-screen-kind.ts
// set-screen-kind command per D-54 + D-56 (one-file-per-command).
//
// APPLY:
//   - Spec-level: update screens[i].kind
//   - AST-level (D-62): setScalarPreserving(doc, ["screens", i, "kind"], kind)
//   - inverseArgs: { screenIndex: i, prevKind: screen.kind }
//
// INVERT:
//   - Restore prevKind via setScalarPreserving
//
// THREAT T-04-ArgInjection: argsSchema rejects values outside SCREEN_KINDS enum.
// THREAT T-04-ASTDrift: invert fully reverses both spec + AST.
import { z } from "zod";
import type { ScreenKind } from "../../model/screen.ts";
import { SCREEN_KINDS } from "../../model/screen.ts";
import { ScreenIdSchema } from "../../primitives/ids.ts";
import { setScalarPreserving } from "../../serialize/write.ts";
import type { Command } from "../types.ts";

export const setScreenKindArgs = z.object({
  id: ScreenIdSchema,
  kind: z.enum(SCREEN_KINDS),
});

type SetScreenKindArgs = z.infer<typeof setScreenKindArgs>;

interface SetScreenKindInverse {
  screenIndex: number;
  prevKind: ScreenKind;
}

export const setScreenKind: Command<typeof setScreenKindArgs> = {
  name: "set-screen-kind",
  argsSchema: setScreenKindArgs,

  apply(spec, astHandle, args: SetScreenKindArgs) {
    const screenIndex = spec.screens.findIndex((s) => s.id === args.id);
    const screen = spec.screens[screenIndex];
    if (!screen) {
      throw new Error(`set-screen-kind: screen "${args.id}" not found`);
    }

    const prevKind = screen.kind;

    const newScreens = spec.screens.map((s, i) =>
      i === screenIndex ? { ...s, kind: args.kind } : s,
    );

    // AST-level (D-62)
    setScalarPreserving(astHandle.doc, ["screens", screenIndex, "kind"], args.kind);

    const inverseArgs: SetScreenKindInverse = { screenIndex, prevKind };
    return { spec: { ...spec, screens: newScreens }, inverseArgs };
  },

  invert(spec, astHandle, inverseArgs) {
    const { screenIndex, prevKind } = inverseArgs as SetScreenKindInverse;

    const newScreens = spec.screens.map((s, i) =>
      i === screenIndex ? { ...s, kind: prevKind } : s,
    );

    setScalarPreserving(astHandle.doc, ["screens", screenIndex, "kind"], prevKind);

    return { spec: { ...spec, screens: newScreens } };
  },
};
