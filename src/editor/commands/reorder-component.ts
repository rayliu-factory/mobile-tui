// src/editor/commands/reorder-component.ts
// reorder-component command per D-54 (exhaustive catalog) + D-56 (one-file-per-command).
//
// APPLY:
//   - Same-parent reorder: splice element from fromIndex, insert at toIndex.
//   - inverseArgs: { fromIndex: toIndex, toIndex: fromIndex } (swapped indices for invert)
//   - AST: rebuild tree sequence via doc.setIn.
//
// INVERT:
//   - Reorder back with swapped indices.
//
// NOTE: Same-index (fromIndex === toIndex) is a valid no-op that returns the
//   same spec unchanged. Tests verify this case explicitly.
//
// THREAT T-04-13 (path traversal): parentPath must resolve inside variant.tree.
import { z } from "zod";
import type { Spec } from "../../model/index.ts";
import { ScreenIdSchema } from "../../primitives/ids.ts";
import { JsonPointerSchema } from "../../primitives/path.ts";
import type { AstHandle } from "../../serialize/ast-handle.ts";
import type { Command } from "../types.ts";

export const reorderComponentArgs = z.object({
  screenId: ScreenIdSchema,
  variantKind: z.enum(["content", "empty", "loading", "error"]),
  /** JsonPointer to the parent array. "" = root tree. */
  parentPath: JsonPointerSchema,
  fromIndex: z.coerce.number().int().min(0),
  toIndex: z.coerce.number().int().min(0),
});

type ReorderComponentArgs = z.infer<typeof reorderComponentArgs>;

interface ReorderComponentInverseArgs {
  screenIndex: number;
  variantKind: string;
  parentPath: string;
  fromIndex: number;
  toIndex: number;
  treeAstPath: (string | number)[];
}

export const reorderComponent: Command<typeof reorderComponentArgs> = {
  name: "reorder-component",
  argsSchema: reorderComponentArgs,

  apply(
    spec: Spec,
    astHandle: AstHandle,
    args: ReorderComponentArgs,
  ): { spec: Spec; inverseArgs: unknown } {
    const { screenId, variantKind, parentPath, fromIndex, toIndex } = args;
    const screenIndex = spec.screens.findIndex((s) => s.id === screenId);
    if (screenIndex === -1) return { spec, inverseArgs: null };

    const screen = spec.screens[screenIndex];
    if (!screen) return { spec, inverseArgs: null };

    if (parentPath !== "") {
      // Nested reorders not yet supported in MVP
      return { spec, inverseArgs: null };
    }

    const variants = screen.variants as Record<
      string,
      { kind: string; tree: unknown[]; when?: unknown } | null
    >;
    const variant = variants[variantKind];
    if (!variant || !Array.isArray(variant.tree)) return { spec, inverseArgs: null };

    const treeAstPath: (string | number)[] = [
      "screens",
      screenIndex,
      "variants",
      variantKind,
      "tree",
    ];

    // Validate indices
    if (
      fromIndex < 0 ||
      fromIndex >= variant.tree.length ||
      toIndex < 0 ||
      toIndex >= variant.tree.length
    ) {
      return { spec, inverseArgs: null };
    }

    // No-op case
    if (fromIndex === toIndex) {
      const inverseArgs: ReorderComponentInverseArgs = {
        screenIndex,
        variantKind,
        parentPath,
        fromIndex: toIndex,
        toIndex: fromIndex,
        treeAstPath,
      };
      return { spec, inverseArgs };
    }

    // Reorder: remove from fromIndex, insert at toIndex.
    // splice(toIndex, 0, item) in the shortened array positions the item
    // at slot `toIndex` in the final result. No -1 adjustment needed.
    const newTree = [...variant.tree];
    const [moved] = newTree.splice(fromIndex, 1);
    const effectiveToIndex = Math.min(toIndex, newTree.length);
    newTree.splice(effectiveToIndex, 0, moved);

    const newScreen = {
      ...screen,
      variants: {
        ...screen.variants,
        [variantKind]: { ...variant, tree: newTree },
      },
    };
    const newScreens = [...spec.screens];
    newScreens[screenIndex] = newScreen as typeof screen;
    const newSpec: Spec = { ...spec, screens: newScreens as typeof spec.screens };

    // AST-level (D-62)
    astHandle.doc.setIn(treeAstPath, astHandle.doc.createNode(newTree));

    // inverseArgs: store where item landed (effectiveToIndex) and where it
    // came from (fromIndex) so invert can reverse the move exactly.
    const inverseArgs: ReorderComponentInverseArgs = {
      screenIndex,
      variantKind,
      parentPath,
      fromIndex: effectiveToIndex, // where it landed after insert
      toIndex: fromIndex, // original position to restore to
      treeAstPath,
    };

    return { spec: newSpec, inverseArgs };
  },

  invert(spec: Spec, astHandle: AstHandle, inverseArgs: unknown): { spec: Spec } {
    const inv = inverseArgs as ReorderComponentInverseArgs;
    if (!inv || typeof inv.screenIndex !== "number") return { spec };

    const { screenIndex, variantKind, fromIndex, toIndex, treeAstPath } = inv;

    const screen = spec.screens[screenIndex];
    if (!screen) return { spec };

    const variants = screen.variants as Record<
      string,
      { kind: string; tree: unknown[]; when?: unknown } | null
    >;
    const variant = variants[variantKind];
    if (!variant || !Array.isArray(variant.tree)) return { spec };

    // No-op case
    if (fromIndex === toIndex) {
      return { spec };
    }

    const newTree = [...variant.tree];
    const [moved] = newTree.splice(fromIndex, 1);
    const effectiveToIndex = Math.min(toIndex, newTree.length);
    newTree.splice(effectiveToIndex, 0, moved);

    const newScreen = {
      ...screen,
      variants: {
        ...screen.variants,
        [variantKind]: { ...variant, tree: newTree },
      },
    };
    const newScreens = [...spec.screens];
    newScreens[screenIndex] = newScreen as typeof screen;
    const newSpec: Spec = { ...spec, screens: newScreens as typeof spec.screens };

    // AST-level (D-62)
    astHandle.doc.setIn(treeAstPath, astHandle.doc.createNode(newTree));

    return { spec: newSpec };
  },
};
