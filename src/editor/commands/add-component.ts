// src/editor/commands/add-component.ts
// add-component command per D-55 (MVP component tree) + D-56 (one-file-per-command).
//
// APPLY:
//   - Spec-level: find the parent array at parentPath in
//     spec.screens[screenIdx].variants[variantKind].tree; splice node at `index`
//     (append if undefined).
//   - AST-level (D-62): doc.setIn([...astPath, insertedIndex], doc.createNode(node))
//     for the inserted element. Prior elements at insertedIndex and beyond are
//     shifted by the splice — AST is rebuilt via doc.setIn of the full sub-array.
//   - inverseArgs: { screenIndex, variantKind, insertedAstPath }
//
// INVERT:
//   - Spec-level: splice out the node at the stored index.
//   - AST-level: doc.deleteIn(insertedAstPath) (removes the element; yaml shifts rest).
//
// THREAT T-04-13 (path traversal): parentPath must resolve inside
//   spec.screens[i].variants[kind].tree — no fs.* calls; out-of-bounds → no-op.
import { z } from "zod";
import { ComponentNodeSchema } from "../../model/component.ts";
import type { Spec } from "../../model/index.ts";
import { ScreenIdSchema } from "../../primitives/ids.ts";
import { JsonPointerSchema } from "../../primitives/path.ts";
import type { AstHandle } from "../../serialize/ast-handle.ts";
import type { Command } from "../types.ts";

export const addComponentArgs = z.object({
  screenId: ScreenIdSchema,
  variantKind: z.enum(["content", "empty", "loading", "error"]),
  /** JsonPointer into the variant tree to find the parent array. "" = root tree. */
  parentPath: JsonPointerSchema,
  /** Index within the parent array to insert. Appended if undefined. */
  index: z.coerce.number().int().min(0).optional(),
  node: ComponentNodeSchema,
});

type AddComponentArgs = z.infer<typeof addComponentArgs>;

interface AddComponentInverseArgs {
  screenIndex: number;
  variantKind: string;
  insertedAstPath: (string | number)[];
}

function getVariantTree(spec: Spec, screenIndex: number, variantKind: string): unknown[] | null {
  const screen = spec.screens[screenIndex];
  if (!screen) return null;
  const variants = screen.variants as Record<string, { tree: unknown[] } | null>;
  const variant = variants[variantKind];
  if (!variant || !Array.isArray(variant.tree)) return null;
  return variant.tree;
}

/** Resolve parentPath to the array and base AST path within the variant tree. */
function resolveParentArray(
  spec: Spec,
  screenIndex: number,
  variantKind: string,
  parentPath: string,
): { array: unknown[]; astPathToArray: (string | number)[] } | null {
  const screen = spec.screens[screenIndex];
  if (!screen) return null;
  const variants = screen.variants as Record<string, { tree: unknown[] } | null>;
  const variant = variants[variantKind];
  if (!variant || !Array.isArray(variant.tree)) return null;

  const baseAstPath: (string | number)[] = [
    "screens",
    screenIndex,
    "variants",
    variantKind,
    "tree",
  ];

  if (parentPath === "") {
    return { array: variant.tree, astPathToArray: baseAstPath };
  }

  // Walk pointer segments into the tree
  const segments = parentPath.split("/").slice(1);
  let currentArray: unknown[] = variant.tree;
  let currentAstPath: (string | number)[] = [...baseAstPath];

  for (const seg of segments) {
    const numIdx = Number(seg);
    if (!Number.isNaN(numIdx) && Number.isInteger(numIdx)) {
      // Array index — navigate into node at that index
      const node = currentArray[numIdx];
      if (node === undefined || node === null) return null;
      currentAstPath = [...currentAstPath, numIdx];
      // This is now a node — need next seg to be a property key
      void node;
      // Not an array at this level — caller must navigate via property key
      currentArray = []; // will be resolved by next seg
      void currentArray;
      return null; // complex nested paths not supported in MVP
    }
  }
  return null;
}

export const addComponent: Command<typeof addComponentArgs> = {
  name: "add-component",
  argsSchema: addComponentArgs,

  apply(
    spec: Spec,
    astHandle: AstHandle,
    args: AddComponentArgs,
  ): { spec: Spec; inverseArgs: unknown } {
    const { screenId, variantKind, parentPath, index, node } = args;
    const screenIndex = spec.screens.findIndex((s) => s.id === screenId);
    if (screenIndex === -1) {
      return { spec, inverseArgs: null };
    }

    const screen = spec.screens[screenIndex];
    if (!screen) return { spec, inverseArgs: null };

    // For MVP: only support root-level tree (parentPath === "")
    const variants = screen.variants as Record<
      string,
      { kind: string; tree: unknown[]; when?: unknown } | null
    >;
    const variant = variants[variantKind];
    if (!variant || !Array.isArray(variant.tree)) {
      return { spec, inverseArgs: null };
    }

    const baseAstPath: (string | number)[] = [
      "screens",
      screenIndex,
      "variants",
      variantKind,
      "tree",
    ];

    if (parentPath !== "") {
      // Nested path: not yet supported in MVP
      return { spec, inverseArgs: null };
    }

    const insertedIndex = index !== undefined ? index : variant.tree.length;

    // Spec-level: create new tree with spliced node
    const newTree = [...variant.tree];
    newTree.splice(insertedIndex, 0, node);

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

    // AST-level (D-62): rebuild tree sequence
    // We set each element from insertedIndex onward to keep the AST in sync
    // with the spliced array.
    const astTreePath = baseAstPath;
    // Set the full tree in AST to ensure consistency
    astHandle.doc.setIn(astTreePath, astHandle.doc.createNode(newTree));

    const insertedAstPath = [...baseAstPath, insertedIndex];

    const inverseArgs: AddComponentInverseArgs = {
      screenIndex,
      variantKind,
      insertedAstPath,
    };

    return { spec: newSpec, inverseArgs };
  },

  invert(spec: Spec, astHandle: AstHandle, inverseArgs: unknown): { spec: Spec } {
    const inv = inverseArgs as AddComponentInverseArgs;
    if (!inv || typeof inv.screenIndex !== "number") return { spec };

    const { screenIndex, variantKind, insertedAstPath } = inv;
    const insertedIndex = insertedAstPath[insertedAstPath.length - 1] as number;

    const screen = spec.screens[screenIndex];
    if (!screen) return { spec };

    const variants = screen.variants as Record<
      string,
      { kind: string; tree: unknown[]; when?: unknown } | null
    >;
    const variant = variants[variantKind];
    if (!variant || !Array.isArray(variant.tree)) return { spec };

    // Spec-level: remove node at insertedIndex
    const newTree = [...variant.tree];
    newTree.splice(insertedIndex, 1);

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

    // AST-level (D-62): rebuild tree to match
    const astTreePath = insertedAstPath.slice(0, -1);
    astHandle.doc.setIn(astTreePath, astHandle.doc.createNode(newTree));

    return { spec: newSpec };
  },
};
