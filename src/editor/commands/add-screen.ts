// src/editor/commands/add-screen.ts
// add-screen command per D-54 (exhaustive catalog) + D-56 (one-file-per-command).
//
// APPLY:
//   - Spec-level: append new Screen to spec.screens (spread, pure value)
//   - AST-level (D-62): doc.addIn(["screens"], doc.createNode(newScreenObj))
//   - inverseArgs: { insertedIndex: spec.screens.length }
//
// INVERT:
//   - Spec-level: spec.screens.slice(0, insertedIndex) to restore prior length
//   - AST-level: doc.deleteIn(["screens", insertedIndex])
//
// THREAT T-04-ArgInjection: argsSchema rejects non-snake_case id via ScreenIdSchema.
// THREAT T-04-ASTDrift: invert must fully reverse both spec + AST; A1 canary
//   in store.test.ts proves doc.createNode determinism for this pattern.
import { z } from "zod";
import type { Screen } from "../../model/screen.ts";
import { SCREEN_KINDS } from "../../model/screen.ts";
import { BackBehaviorSchema } from "../../model/back-behavior.ts";
import { ScreenIdSchema } from "../../primitives/ids.ts";
import type { Command } from "../types.ts";

export const addScreenArgs = z.object({
  id: ScreenIdSchema,
  title: z.string().min(1, "screen title must be non-empty"),
  kind: z.enum(SCREEN_KINDS),
  back_behavior: BackBehaviorSchema.optional(),
});

type AddScreenArgs = z.infer<typeof addScreenArgs>;

interface AddScreenInverse {
  insertedIndex: number;
}

const EMPTY_VARIANTS = {
  content: { kind: "content" as const, tree: [] },
  empty: null,
  loading: null,
  error: null,
};

export const addScreen: Command<typeof addScreenArgs> = {
  name: "add-screen",
  argsSchema: addScreenArgs,

  apply(spec, astHandle, args: AddScreenArgs) {
    const insertedIndex = spec.screens.length;

    const newScreen: Screen = {
      id: args.id,
      title: args.title,
      kind: args.kind,
      ...(args.back_behavior !== undefined ? { back_behavior: args.back_behavior } : {}),
      variants: EMPTY_VARIANTS,
    };

    const newSpec = {
      ...spec,
      screens: [...spec.screens, newScreen],
    };

    // AST-level mutation (D-62): addIn appends to the YAML sequence
    astHandle.doc.addIn(["screens"], astHandle.doc.createNode(newScreen));

    const inverseArgs: AddScreenInverse = { insertedIndex };
    return { spec: newSpec, inverseArgs };
  },

  invert(spec, astHandle, inverseArgs) {
    const { insertedIndex } = inverseArgs as AddScreenInverse;

    const restoredSpec = {
      ...spec,
      screens: spec.screens.slice(0, insertedIndex),
    };

    // AST-level: remove the node that was added at insertedIndex
    astHandle.doc.deleteIn(["screens", insertedIndex]);

    return { spec: restoredSpec };
  },
};
