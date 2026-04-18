// src/editor/commands/remove-component.ts
// remove-component command per D-55 (MVP component tree) + D-56 (one-file-per-command).
//
// APPLY:
//   - Spec-level: resolve path in spec.screens[i].variants[kind].tree;
//     capture removedNode via .toJSON() or deep clone; splice it out.
//   - AST-level (D-62): doc.setIn([...treeAstPath], doc.createNode(newTree))
//     to keep AST in sync after removal.
//   - inverseArgs: { screenIndex, variantKind, removedIndex, removedNodeJSON, treeAstPath }
//
// INVERT:
//   - Spec-level: re-insert removedNodeJSON at removedIndex.
//   - AST-level: rebuild the tree sequence with the restored node.
//
// THREAT T-04-13 (path traversal): path must resolve inside
//   spec.screens[i].variants[kind].tree — no fs.* calls.
// THREAT T-04-14 (live YAML node corruption): removedNodeJSON is captured
//   via YAML node toJSON() — a plain deep-JS copy, never a live YAML node ref.
import { z } from "zod";
import type { Spec } from "../../model/index.ts";
import type { AstHandle } from "../../serialize/ast-handle.ts";
import { JsonPointerSchema } from "../../primitives/path.ts";
import { ScreenIdSchema } from "../../primitives/ids.ts";
import { decodeSegment } from "../../primitives/path.ts";
import type { Command } from "../types.ts";

export const removeComponentArgs = z.object({
  screenId: ScreenIdSchema,
  variantKind: z.enum(["content", "empty", "loading", "error"]),
  /** JsonPointer to the node to remove, e.g. "/0" for tree[0], "/0/children/1" for nested. */
  path: JsonPointerSchema,
});

type RemoveComponentArgs = z.infer<typeof removeComponentArgs>;

interface RemoveComponentInverseArgs {
  screenIndex: number;
  variantKind: string;
  removedIndex: number;
  removedNodeJSON: unknown;
  treeAstPath: (string | number)[];
}

/** Parse a JsonPointer to (parentAstPathSuffix, index) for root-level paths like "/N". */
function parseRootPointer(
  pointer: string,
): { index: number } | null {
  if (pointer === "") return null;
  const segments = pointer.split("/").slice(1);
  if (segments.length !== 1) return null; // MVP: only root-level paths
  const seg = segments[0];
  if (seg === undefined) return null;
  const decoded = decodeSegment(seg);
  const idx = Number(decoded);
  if (Number.isNaN(idx) || !Number.isInteger(idx)) return null;
  return { index: idx };
}

export const removeComponent: Command<typeof removeComponentArgs> = {
  name: "remove-component",
  argsSchema: removeComponentArgs,

  apply(
    spec: Spec,
    astHandle: AstHandle,
    args: RemoveComponentArgs,
  ): { spec: Spec; inverseArgs: unknown } {
    const { screenId, variantKind, path } = args;
    const screenIndex = spec.screens.findIndex((s) => s.id === screenId);
    if (screenIndex === -1) return { spec, inverseArgs: null };

    const screen = spec.screens[screenIndex];
    if (!screen) return { spec, inverseArgs: null };

    const variants = screen.variants as Record<string, { kind: string; tree: unknown[]; when?: unknown } | null>;
    const variant = variants[variantKind];
    if (!variant || !Array.isArray(variant.tree)) return { spec, inverseArgs: null };

    const parsed = parseRootPointer(path);
    if (!parsed) return { spec, inverseArgs: null };

    const { index } = parsed;
    if (index < 0 || index >= variant.tree.length) return { spec, inverseArgs: null };

    // T-04-14: capture via plain JS copy (never live YAML node reference)
    const treeAstPath: (string | number)[] = [
      "screens",
      screenIndex,
      "variants",
      variantKind,
      "tree",
    ];

    // Get the AST node and capture its JSON for invert
    const astNode = astHandle.doc.getIn([...treeAstPath, index], /* keepNode */ true);
    const removedNodeJSON =
      astNode !== null &&
      astNode !== undefined &&
      typeof (astNode as { toJSON?: () => unknown }).toJSON === "function"
        ? (astNode as { toJSON: () => unknown }).toJSON()
        : variant.tree[index];

    // Spec-level: remove node
    const newTree = [...variant.tree];
    newTree.splice(index, 1);

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

    // AST-level (D-62): rebuild tree
    astHandle.doc.setIn(treeAstPath, astHandle.doc.createNode(newTree));

    const inverseArgs: RemoveComponentInverseArgs = {
      screenIndex,
      variantKind,
      removedIndex: index,
      removedNodeJSON,
      treeAstPath,
    };

    return { spec: newSpec, inverseArgs };
  },

  invert(
    spec: Spec,
    astHandle: AstHandle,
    inverseArgs: unknown,
  ): { spec: Spec } {
    const inv = inverseArgs as RemoveComponentInverseArgs;
    if (!inv || typeof inv.screenIndex !== "number") return { spec };

    const { screenIndex, variantKind, removedIndex, removedNodeJSON, treeAstPath } = inv;

    const screen = spec.screens[screenIndex];
    if (!screen) return { spec };

    const variants = screen.variants as Record<string, { kind: string; tree: unknown[]; when?: unknown } | null>;
    const variant = variants[variantKind];
    if (!variant || !Array.isArray(variant.tree)) return { spec };

    // Spec-level: re-insert removed node
    const newTree = [...variant.tree];
    newTree.splice(removedIndex, 0, removedNodeJSON);

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

    // AST-level (D-62): restore tree in AST
    astHandle.doc.setIn(treeAstPath, astHandle.doc.createNode(newTree));

    return { spec: newSpec };
  },
};
