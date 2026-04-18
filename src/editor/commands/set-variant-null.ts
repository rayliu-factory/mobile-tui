// src/editor/commands/set-variant-null.ts
// set-variant-null command per D-55 (MVP acceptance + variant) + D-56 (one-file-per-command).
//
// APPLY:
//   - "content" variant is never null (argsSchema excludes it).
//   - Spec-level: set screen.variants[variantKind] = null.
//   - AST-level (D-62): doc.setIn(["screens", screenIndex, "variants", variantKind], null).
//   - inverseArgs: { screenIndex, variantKind, prevVariantJSON } (plain JS via toJSON — T-04-14).
//
// INVERT:
//   - Restore prevVariantJSON via doc.setIn + doc.createNode.
//
// THREAT T-04-14 (live YAML node stored in inverseArgs): prevVariant is
//   captured via astHandle.doc.getIn(path, true).toJSON() — a deep plain-JS
//   copy, never a live YAML node reference.
import { z } from "zod";
import type { Spec } from "../../model/index.ts";
import { ScreenIdSchema } from "../../primitives/ids.ts";
import type { AstHandle } from "../../serialize/ast-handle.ts";
import type { Command } from "../types.ts";

export const setVariantNullArgs = z.object({
  screenId: ScreenIdSchema,
  // "content" is intentionally excluded — it must always be non-null.
  variantKind: z.enum(["empty", "loading", "error"]),
});

type SetVariantNullArgs = z.infer<typeof setVariantNullArgs>;

interface SetVariantNullInverseArgs {
  screenIndex: number;
  variantKind: string;
  prevVariantJSON: unknown;
  variantAstPath: (string | number)[];
}

export const setVariantNull: Command<typeof setVariantNullArgs> = {
  name: "set-variant-null",
  argsSchema: setVariantNullArgs,

  apply(
    spec: Spec,
    astHandle: AstHandle,
    args: SetVariantNullArgs,
  ): { spec: Spec; inverseArgs: unknown } {
    const { screenId, variantKind } = args;
    const screenIndex = spec.screens.findIndex((s) => s.id === screenId);
    if (screenIndex === -1) return { spec, inverseArgs: null };

    const screen = spec.screens[screenIndex];
    if (!screen) return { spec, inverseArgs: null };

    const variantAstPath: (string | number)[] = ["screens", screenIndex, "variants", variantKind];

    // T-04-14: capture prevVariant as plain JS (never a live YAML node)
    const astNode = astHandle.doc.getIn(variantAstPath, /* keepNode */ true);
    const prevVariantJSON =
      astNode !== null &&
      astNode !== undefined &&
      typeof (astNode as { toJSON?: () => unknown }).toJSON === "function"
        ? (astNode as { toJSON: () => unknown }).toJSON()
        : (screen.variants as Record<string, unknown>)[variantKind];

    // Spec-level: set variant to null
    const newScreen = {
      ...screen,
      variants: {
        ...screen.variants,
        [variantKind]: null,
      },
    };
    const newScreens = [...spec.screens];
    newScreens[screenIndex] = newScreen as typeof screen;
    const newSpec: Spec = { ...spec, screens: newScreens as typeof spec.screens };

    // AST-level (D-62): set variant node to null
    astHandle.doc.setIn(variantAstPath, null);

    const inverseArgs: SetVariantNullInverseArgs = {
      screenIndex,
      variantKind,
      prevVariantJSON,
      variantAstPath,
    };

    return { spec: newSpec, inverseArgs };
  },

  invert(spec: Spec, astHandle: AstHandle, inverseArgs: unknown): { spec: Spec } {
    const inv = inverseArgs as SetVariantNullInverseArgs;
    if (!inv || typeof inv.screenIndex !== "number") return { spec };

    const { screenIndex, variantKind, prevVariantJSON, variantAstPath } = inv;

    const screen = spec.screens[screenIndex];
    if (!screen) return { spec };

    // Spec-level: restore prevVariant
    const newScreen = {
      ...screen,
      variants: {
        ...screen.variants,
        [variantKind]: prevVariantJSON,
      },
    };
    const newScreens = [...spec.screens];
    newScreens[screenIndex] = newScreen as typeof screen;
    const newSpec: Spec = { ...spec, screens: newScreens as typeof spec.screens };

    // AST-level (D-62): restore via doc.createNode
    astHandle.doc.setIn(variantAstPath, astHandle.doc.createNode(prevVariantJSON));

    return { spec: newSpec };
  },
};
