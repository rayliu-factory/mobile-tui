// src/editor/commands/set-variant-tree.ts
// set-variant-tree command per D-54 (exhaustive catalog) + D-56 (one-file-per-command).
//
// APPLY:
//   - Replace variant.tree with the provided tree array.
//   - Optionally replace variant.when (for non-content variants).
//   - AST-level (D-62): doc.setIn(["screens", screenIndex, "variants", variantKind, "tree"], ...)
//   - inverseArgs: { screenIndex, variantKind, prevTree, prevWhen } (plain JS copies — T-04-14)
//
// INVERT:
//   - Restore prevTree + prevWhen via doc.setIn + doc.createNode.
//
// NOTE: set-variant-tree works on non-null variants. To turn a null variant non-null,
//   use a companion command that creates the variant first.
import { z } from "zod";
import { ComponentNodeSchema } from "../../model/component.ts";
import type { Spec } from "../../model/index.ts";
import { ScreenIdSchema } from "../../primitives/ids.ts";
import { JsonPointerSchema } from "../../primitives/path.ts";
import type { AstHandle } from "../../serialize/ast-handle.ts";
import type { Command } from "../types.ts";

// WhenClause discriminated union for variant when clauses
const WhenClauseSchema = z.union([
  z.object({ collection: JsonPointerSchema }).strict(),
  z.object({ async: JsonPointerSchema }).strict(),
  z.object({ field_error: JsonPointerSchema }).strict(),
]);

export const setVariantTreeArgs = z.object({
  screenId: ScreenIdSchema,
  variantKind: z.enum(["content", "empty", "loading", "error"]),
  tree: z.array(ComponentNodeSchema),
  when: WhenClauseSchema.optional(),
});

type SetVariantTreeArgs = z.infer<typeof setVariantTreeArgs>;

interface SetVariantTreeInverseArgs {
  screenIndex: number;
  variantKind: string;
  prevTree: unknown;
  prevWhen: unknown;
  treeAstPath: (string | number)[];
  whenAstPath: (string | number)[];
}

export const setVariantTree: Command<typeof setVariantTreeArgs> = {
  name: "set-variant-tree",
  argsSchema: setVariantTreeArgs,

  apply(
    spec: Spec,
    astHandle: AstHandle,
    args: SetVariantTreeArgs,
  ): { spec: Spec; inverseArgs: unknown } {
    const { screenId, variantKind, tree, when } = args;
    const screenIndex = spec.screens.findIndex((s) => s.id === screenId);
    if (screenIndex === -1) return { spec, inverseArgs: null };

    const screen = spec.screens[screenIndex];
    if (!screen) return { spec, inverseArgs: null };

    const variants = screen.variants as Record<
      string,
      { kind: string; tree: unknown[]; when?: unknown } | null
    >;
    const variant = variants[variantKind];
    if (!variant) return { spec, inverseArgs: null }; // null variant — use set-variant-null invert

    const treeAstPath: (string | number)[] = [
      "screens",
      screenIndex,
      "variants",
      variantKind,
      "tree",
    ];
    const whenAstPath: (string | number)[] = [
      "screens",
      screenIndex,
      "variants",
      variantKind,
      "when",
    ];

    // T-04-14: capture prev values as plain JS
    const prevTree = Array.isArray(variant.tree) ? [...variant.tree] : variant.tree;
    const prevWhen = variant.when;

    // Spec-level: replace tree (and optionally when)
    const updatedVariant: Record<string, unknown> = { ...variant, tree };
    if (when !== undefined) {
      updatedVariant["when"] = when;
    }

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

    // AST-level (D-62)
    astHandle.doc.setIn(treeAstPath, astHandle.doc.createNode(tree));
    if (when !== undefined) {
      astHandle.doc.setIn(whenAstPath, astHandle.doc.createNode(when));
    }

    const inverseArgs: SetVariantTreeInverseArgs = {
      screenIndex,
      variantKind,
      prevTree,
      prevWhen,
      treeAstPath,
      whenAstPath,
    };

    return { spec: newSpec, inverseArgs };
  },

  invert(spec: Spec, astHandle: AstHandle, inverseArgs: unknown): { spec: Spec } {
    const inv = inverseArgs as SetVariantTreeInverseArgs;
    if (!inv || typeof inv.screenIndex !== "number") return { spec };

    const { screenIndex, variantKind, prevTree, prevWhen, treeAstPath, whenAstPath } = inv;

    const screen = spec.screens[screenIndex];
    if (!screen) return { spec };

    const variants = screen.variants as Record<
      string,
      { kind: string; tree: unknown[]; when?: unknown } | null
    >;
    const variant = variants[variantKind];
    if (!variant) return { spec };

    // Spec-level: restore prevTree + prevWhen
    const updatedVariant: Record<string, unknown> = { ...variant, tree: prevTree };
    if (prevWhen !== undefined) {
      updatedVariant["when"] = prevWhen;
    } else {
      delete updatedVariant["when"];
    }

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

    // AST-level (D-62)
    astHandle.doc.setIn(treeAstPath, astHandle.doc.createNode(prevTree));
    if (prevWhen !== undefined) {
      astHandle.doc.setIn(whenAstPath, astHandle.doc.createNode(prevWhen));
    }

    return { spec: newSpec };
  },
};
