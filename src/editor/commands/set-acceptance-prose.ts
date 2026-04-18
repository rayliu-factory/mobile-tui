// src/editor/commands/set-acceptance-prose.ts
// set-acceptance-prose command per D-54, D-55 (MVP) + D-56 (one-file-per-command).
//
// APPLY:
//   - Spec-level: replace entire acceptance[] on screens[i]
//   - AST-level (D-62): doc.setIn(["screens", i, "acceptance"], doc.createNode(lines))
//   - inverseArgs: { screenIndex: i, prevLines: [...screen.acceptance] | undefined }
//     T-04-11: capture prevLines as plain JSON clone, NOT a live YAML node reference.
//
// INVERT:
//   - if prevLines was undefined: doc.deleteIn(["screens", i, "acceptance"])
//   - else: doc.setIn(["screens", i, "acceptance"], doc.createNode(prevLines))
//
// THREAT T-04-ArgInjection: z.array(z.string()) rejects non-string array elements.
// THREAT T-04-ASTDrift: invert fully reverses both spec + AST.
// THREAT T-04-11: live YAML node stored in inverseArgs avoided by spreading prevLines.
import { z } from "zod";
import { ScreenIdSchema } from "../../primitives/ids.ts";
import type { Command } from "../types.ts";

export const setAcceptanceProseArgs = z.object({
  id: ScreenIdSchema,
  lines: z.array(z.string()),
});

type SetAcceptanceProseArgs = z.infer<typeof setAcceptanceProseArgs>;

interface SetAcceptanceProseInverse {
  screenIndex: number;
  prevLines: string[] | undefined;
}

export const setAcceptanceProse: Command<typeof setAcceptanceProseArgs> = {
  name: "set-acceptance-prose",
  argsSchema: setAcceptanceProseArgs,

  apply(spec, astHandle, args: SetAcceptanceProseArgs) {
    const screenIndex = spec.screens.findIndex((s) => s.id === args.id);
    const screen = spec.screens[screenIndex];
    if (!screen) {
      throw new Error(`set-acceptance-prose: screen "${args.id}" not found`);
    }

    // T-04-11: plain JSON clone — never store live YAML node reference
    const prevLines = screen.acceptance ? [...screen.acceptance] : undefined;

    const newScreens = spec.screens.map((s, i) =>
      i === screenIndex ? { ...s, acceptance: args.lines } : s,
    );

    // AST-level (D-62): structural replace via doc.setIn
    astHandle.doc.setIn(
      ["screens", screenIndex, "acceptance"],
      astHandle.doc.createNode(args.lines),
    );

    const inverseArgs: SetAcceptanceProseInverse = { screenIndex, prevLines };
    return { spec: { ...spec, screens: newScreens }, inverseArgs };
  },

  invert(spec, astHandle, inverseArgs) {
    const { screenIndex, prevLines } = inverseArgs as SetAcceptanceProseInverse;

    let newScreens: typeof spec.screens;
    if (prevLines === undefined) {
      // acceptance didn't exist before — remove it
      newScreens = spec.screens.map((s, i) => {
        if (i !== screenIndex) return s;
        const { acceptance: _removed, ...rest } = s;
        return rest;
      });
      if (astHandle.doc.hasIn(["screens", screenIndex, "acceptance"])) {
        astHandle.doc.deleteIn(["screens", screenIndex, "acceptance"]);
      }
    } else {
      newScreens = spec.screens.map((s, i) =>
        i === screenIndex ? { ...s, acceptance: prevLines } : s,
      );
      astHandle.doc.setIn(
        ["screens", screenIndex, "acceptance"],
        astHandle.doc.createNode(prevLines),
      );
    }

    return { spec: { ...spec, screens: newScreens } };
  },
};
