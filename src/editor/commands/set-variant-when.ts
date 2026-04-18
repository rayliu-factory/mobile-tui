// src/editor/commands/set-variant-when.ts
// set-variant-when command per D-54 (exhaustive catalog) + D-56 (one-file-per-command).
//
// APPLY:
//   - Update variant.when clause only; tree is unchanged.
//   - "content" variant has no when clause — argsSchema excludes it.
//   - AST-level (D-62): doc.setIn(["screens", screenIndex, "variants", variantKind, "when"], ...)
//   - inverseArgs: { screenIndex, variantKind, prevWhen, whenAstPath }
//
// INVERT:
//   - Restore prevWhen via doc.setIn + doc.createNode.
//
// NOTE: WhenClause is a discriminated union with three mutually exclusive keys:
//   { collection } | { async } | { field_error }
//   argsSchema accepts a z.union of three strict z.object shapes.
import { z } from "zod";
import type { Spec } from "../../model/index.ts";
import { ScreenIdSchema } from "../../primitives/ids.ts";
import { JsonPointerSchema } from "../../primitives/path.ts";
import type { AstHandle } from "../../serialize/ast-handle.ts";
import type { Command } from "../types.ts";

// WhenClause discriminated union — three mutually exclusive keys
const WhenClauseSchema = z.union([
  z.object({ collection: JsonPointerSchema }).strict(),
  z.object({ async: JsonPointerSchema }).strict(),
  z.object({ field_error: JsonPointerSchema }).strict(),
]);

export const setVariantWhenArgs = z.object({
  screenId: ScreenIdSchema,
  // "content" intentionally excluded — content variants have no when clause
  variantKind: z.enum(["empty", "loading", "error"]),
  when: WhenClauseSchema,
});

type SetVariantWhenArgs = z.infer<typeof setVariantWhenArgs>;

interface SetVariantWhenInverseArgs {
  screenIndex: number;
  variantKind: string;
  prevWhen: unknown;
  whenAstPath: (string | number)[];
}

export const setVariantWhen: Command<typeof setVariantWhenArgs> = {
  name: "set-variant-when",
  argsSchema: setVariantWhenArgs,

  apply(
    spec: Spec,
    astHandle: AstHandle,
    args: SetVariantWhenArgs,
  ): { spec: Spec; inverseArgs: unknown } {
    const { screenId, variantKind, when } = args;
    const screenIndex = spec.screens.findIndex((s) => s.id === screenId);
    if (screenIndex === -1) return { spec, inverseArgs: null };

    const screen = spec.screens[screenIndex];
    if (!screen) return { spec, inverseArgs: null };

    const variants = screen.variants as Record<
      string,
      { kind: string; tree: unknown[]; when?: unknown } | null
    >;
    const variant = variants[variantKind];
    if (!variant) return { spec, inverseArgs: null }; // null variant

    const whenAstPath: (string | number)[] = [
      "screens",
      screenIndex,
      "variants",
      variantKind,
      "when",
    ];

    // Capture prevWhen as plain JS
    const prevWhen = variant.when;

    // Spec-level: update when clause
    const updatedVariant = { ...variant, when };
    const newScreen = {
      ...screen,
      variants: {
        ...screen.variants,
        [variantKind]: updatedVariant,
      },
    };
    const newScreens = [...spec.screens];
    newScreens[screenIndex] = newScreen as typeof screen;
    const newSpec: Spec = { ...spec, screens: newScreens as typeof spec.screens };

    // AST-level (D-62): set when in AST
    astHandle.doc.setIn(whenAstPath, astHandle.doc.createNode(when));

    const inverseArgs: SetVariantWhenInverseArgs = {
      screenIndex,
      variantKind,
      prevWhen,
      whenAstPath,
    };

    return { spec: newSpec, inverseArgs };
  },

  invert(spec: Spec, astHandle: AstHandle, inverseArgs: unknown): { spec: Spec } {
    const inv = inverseArgs as SetVariantWhenInverseArgs;
    if (!inv || typeof inv.screenIndex !== "number") return { spec };

    const { screenIndex, variantKind, prevWhen, whenAstPath } = inv;

    const screen = spec.screens[screenIndex];
    if (!screen) return { spec };

    const variants = screen.variants as Record<
      string,
      { kind: string; tree: unknown[]; when?: unknown } | null
    >;
    const variant = variants[variantKind];
    if (!variant) return { spec };

    // Spec-level: restore prevWhen
    const updatedVariant = { ...variant, when: prevWhen };
    const newScreen = {
      ...screen,
      variants: {
        ...screen.variants,
        [variantKind]: updatedVariant,
      },
    };
    const newScreens = [...spec.screens];
    newScreens[screenIndex] = newScreen as typeof screen;
    const newSpec: Spec = { ...spec, screens: newScreens as typeof spec.screens };

    // AST-level (D-62): restore prevWhen
    if (prevWhen !== undefined) {
      astHandle.doc.setIn(whenAstPath, astHandle.doc.createNode(prevWhen));
    } else {
      astHandle.doc.deleteIn(whenAstPath);
    }

    return { spec: newSpec };
  },
};
