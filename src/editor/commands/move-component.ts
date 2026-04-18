// src/editor/commands/move-component.ts
// move-component command per D-54 (exhaustive catalog) + D-56 (one-file-per-command).
//
// APPLY:
//   - Capture the node at fromPath as plain JSON (T-04-14).
//   - Delete from fromPath; insert at toParentPath[toIndex].
//   - AST mirrors spec ops: rebuild tree sequence via doc.setIn.
//   - inverseArgs: { screenIndex, variantKind, fromPath, toParentPath, toIndex, movedNodeJSON }
//
// INVERT:
//   - Reverse the move: delete from toParentPath[toIndex], re-insert at fromPath.
//
// MVP SCOPE: Only root-level tree paths are supported (parentPath === "" and
//   fromPath == "/N"). Nested-path moves are not yet wired.
//
// THREAT T-04-13 (path traversal): paths resolve only inside variant.tree.
import { z } from "zod";
import type { Spec } from "../../model/index.ts";
import type { AstHandle } from "../../serialize/ast-handle.ts";
import { JsonPointerSchema } from "../../primitives/path.ts";
import { ScreenIdSchema } from "../../primitives/ids.ts";
import { decodeSegment } from "../../primitives/path.ts";
import type { Command } from "../types.ts";

export const moveComponentArgs = z.object({
  screenId: ScreenIdSchema,
  variantKind: z.enum(["content", "empty", "loading", "error"]),
  fromPath: JsonPointerSchema,
  toParentPath: JsonPointerSchema,
  toIndex: z.coerce.number().int().min(0),
});

type MoveComponentArgs = z.infer<typeof moveComponentArgs>;

interface MoveComponentInverseArgs {
  screenIndex: number;
  variantKind: string;
  fromIndex: number;
  toIndex: number;
  movedNodeJSON: unknown;
  treeAstPath: (string | number)[];
}

function parseRootPointer(pointer: string): number | null {
  if (pointer === "") return null;
  const segments = pointer.split("/").slice(1);
  if (segments.length !== 1) return null;
  const seg = segments[0];
  if (seg === undefined) return null;
  const decoded = decodeSegment(seg);
  const idx = Number(decoded);
  if (Number.isNaN(idx) || !Number.isInteger(idx)) return null;
  return idx;
}

export const moveComponent: Command<typeof moveComponentArgs> = {
  name: "move-component",
  argsSchema: moveComponentArgs,

  apply(
    spec: Spec,
    astHandle: AstHandle,
    args: MoveComponentArgs,
  ): { spec: Spec; inverseArgs: unknown } {
    const { screenId, variantKind, fromPath, toParentPath, toIndex } = args;
    const screenIndex = spec.screens.findIndex((s) => s.id === screenId);
    if (screenIndex === -1) return { spec, inverseArgs: null };

    const screen = spec.screens[screenIndex];
    if (!screen) return { spec, inverseArgs: null };

    const variants = screen.variants as Record<string, { kind: string; tree: unknown[]; when?: unknown } | null>;
    const variant = variants[variantKind];
    if (!variant || !Array.isArray(variant.tree)) return { spec, inverseArgs: null };

    const fromIndex = parseRootPointer(fromPath);
    if (fromIndex === null || fromIndex < 0 || fromIndex >= variant.tree.length) {
      return { spec, inverseArgs: null };
    }

    if (toParentPath !== "") {
      // Nested target path: not yet supported in MVP
      return { spec, inverseArgs: null };
    }

    const treeAstPath: (string | number)[] = [
      "screens",
      screenIndex,
      "variants",
      variantKind,
      "tree",
    ];

    // Capture node as plain JS (T-04-14)
    const astNode = astHandle.doc.getIn([...treeAstPath, fromIndex], true);
    const movedNodeJSON =
      astNode !== null &&
      astNode !== undefined &&
      typeof (astNode as { toJSON?: () => unknown }).toJSON === "function"
        ? (astNode as { toJSON: () => unknown }).toJSON()
        : variant.tree[fromIndex];

    // Spec-level: remove from fromIndex, insert at toIndex
    const newTree = [...variant.tree];
    const [removed] = newTree.splice(fromIndex, 1);
    // After removal, insert at `toIndex` clamped to array bounds.
    // When toIndex > fromIndex, shifting would mean toIndex-1 in the original
    // but splice treats the position in the SHORTER array — inserting at
    // toIndex (which may be newTree.length = origLength-1) is correct.
    const effectiveToIndex = Math.min(toIndex, newTree.length);
    newTree.splice(effectiveToIndex, 0, removed);

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

    const inverseArgs: MoveComponentInverseArgs = {
      screenIndex,
      variantKind,
      fromIndex,
      toIndex: effectiveToIndex,
      movedNodeJSON,
      treeAstPath,
    };

    return { spec: newSpec, inverseArgs };
  },

  invert(
    spec: Spec,
    astHandle: AstHandle,
    inverseArgs: unknown,
  ): { spec: Spec } {
    const inv = inverseArgs as MoveComponentInverseArgs;
    if (!inv || typeof inv.screenIndex !== "number") return { spec };

    const { screenIndex, variantKind, fromIndex, toIndex, movedNodeJSON, treeAstPath } = inv;

    const screen = spec.screens[screenIndex];
    if (!screen) return { spec };

    const variants = screen.variants as Record<string, { kind: string; tree: unknown[]; when?: unknown } | null>;
    const variant = variants[variantKind];
    if (!variant || !Array.isArray(variant.tree)) return { spec };

    // Reverse: remove from toIndex, reinsert at fromIndex
    const newTree = [...variant.tree];
    const [removed] = newTree.splice(toIndex, 1);
    // Same logic as apply: clamp fromIndex to shorter array bounds
    const effectiveFromIndex = Math.min(fromIndex, newTree.length);
    newTree.splice(effectiveFromIndex, 0, removed ?? movedNodeJSON);

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
