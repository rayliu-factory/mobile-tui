// src/editor/commands/set-component-action.ts
// set-component-action command per D-59 (two-command binding) + D-56 (one-file-per-command).
//
// APPLY:
//   - Validate actionId exists in spec.actions (T-04-12); if not, return spec unchanged.
//   - Resolve path to node; update node.action + node.testID (if provided).
//   - AST-level (D-62): setScalarPreserving for action + testID scalar fields.
//   - inverseArgs: { screenIndex, variantKind, nodeAstPath, prevActionId, prevTestID }
//
// INVERT:
//   - Restore prevActionId + prevTestID via setScalarPreserving.
//
// THREAT T-04-12 (non-existent actionId): validate actionId in spec.actions;
//   on miss, return spec unchanged (no-op). Post-apply validateSpec surfaces
//   any ref integrity issues as EDITOR_REF_CASCADE_INCOMPLETE diagnostics.
import { z } from "zod";
import type { Spec } from "../../model/index.ts";
import { ActionIdSchema, ScreenIdSchema } from "../../primitives/ids.ts";
import { decodeSegment, JsonPointerSchema } from "../../primitives/path.ts";
import type { AstHandle } from "../../serialize/ast-handle.ts";
import { setScalarPreserving } from "../../serialize/write.ts";
import type { Command } from "../types.ts";

export const setComponentActionArgs = z.object({
  screenId: ScreenIdSchema,
  variantKind: z.enum(["content", "empty", "loading", "error"]),
  path: JsonPointerSchema,
  actionId: ActionIdSchema,
  testID: z.string().optional(),
});

type SetComponentActionArgs = z.infer<typeof setComponentActionArgs>;

interface SetComponentActionInverseArgs {
  screenIndex: number;
  variantKind: string;
  nodeAstPath: (string | number)[];
  prevActionId: string | undefined;
  prevTestID: string | undefined;
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

export const setComponentAction: Command<typeof setComponentActionArgs> = {
  name: "set-component-action",
  argsSchema: setComponentActionArgs,

  apply(
    spec: Spec,
    astHandle: AstHandle,
    args: SetComponentActionArgs,
  ): { spec: Spec; inverseArgs: unknown } {
    const { screenId, variantKind, path, actionId, testID } = args;

    // T-04-12: validate actionId exists in spec.actions
    if (!(actionId in spec.actions)) {
      // No-op: return unchanged spec; inverseArgs signals no change
      return { spec, inverseArgs: null };
    }

    const screenIndex = spec.screens.findIndex((s) => s.id === screenId);
    if (screenIndex === -1) return { spec, inverseArgs: null };

    const screen = spec.screens[screenIndex];
    if (!screen) return { spec, inverseArgs: null };

    const variants = screen.variants as Record<
      string,
      { kind: string; tree: unknown[]; when?: unknown } | null
    >;
    const variant = variants[variantKind];
    if (!variant || !Array.isArray(variant.tree)) return { spec, inverseArgs: null };

    const nodeIdx = parseRootPointer(path);
    if (nodeIdx === null || nodeIdx < 0 || nodeIdx >= variant.tree.length) {
      return { spec, inverseArgs: null };
    }

    const nodeAstPath: (string | number)[] = [
      "screens",
      screenIndex,
      "variants",
      variantKind,
      "tree",
      nodeIdx,
    ];

    const node = variant.tree[nodeIdx] as Record<string, unknown>;
    const prevActionId = node["action"] as string | undefined;
    const prevTestID = node["testID"] as string | undefined;

    // Only interactable nodes have action/testID — if the node doesn't have
    // these fields, we still update them (command caller is responsible for
    // targeting the right node kind)
    const newNode: Record<string, unknown> = { ...node, action: actionId };
    if (testID !== undefined) {
      newNode["testID"] = testID;
    }

    const newTree = [...variant.tree];
    newTree[nodeIdx] = newNode;

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

    // AST-level (D-62): setScalarPreserving for scalar action/testID fields
    setScalarPreserving(astHandle.doc, [...nodeAstPath, "action"], actionId);
    if (testID !== undefined) {
      setScalarPreserving(astHandle.doc, [...nodeAstPath, "testID"], testID);
    }

    const inverseArgs: SetComponentActionInverseArgs = {
      screenIndex,
      variantKind,
      nodeAstPath,
      prevActionId,
      prevTestID,
    };

    return { spec: newSpec, inverseArgs };
  },

  invert(spec: Spec, astHandle: AstHandle, inverseArgs: unknown): { spec: Spec } {
    const inv = inverseArgs as SetComponentActionInverseArgs | null;
    if (!inv || typeof inv.screenIndex !== "number") return { spec };

    const { screenIndex, variantKind, nodeAstPath, prevActionId, prevTestID } = inv;
    const nodeIdx = nodeAstPath[nodeAstPath.length - 1] as number;

    const screen = spec.screens[screenIndex];
    if (!screen) return { spec };

    const variants = screen.variants as Record<
      string,
      { kind: string; tree: unknown[]; when?: unknown } | null
    >;
    const variant = variants[variantKind];
    if (!variant || !Array.isArray(variant.tree)) return { spec };

    const node = variant.tree[nodeIdx] as Record<string, unknown>;

    // Restore prevActionId
    let newNode: Record<string, unknown>;
    if (prevActionId === undefined) {
      const { action: _a, testID: _t, ...rest } = node;
      void _a;
      void _t;
      newNode = rest;
    } else {
      newNode = { ...node, action: prevActionId };
      if (prevTestID !== undefined) {
        newNode["testID"] = prevTestID;
      } else {
        // Remove testID if it didn't exist before
        const { testID: _t, ...rest } = newNode;
        void _t;
        newNode = rest;
      }
    }

    const newTree = [...variant.tree];
    newTree[nodeIdx] = newNode;

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

    // AST-level (D-62): restore previous action/testID
    if (prevActionId !== undefined) {
      setScalarPreserving(astHandle.doc, [...nodeAstPath, "action"], prevActionId);
    } else {
      astHandle.doc.deleteIn([...nodeAstPath, "action"]);
    }
    if (prevTestID !== undefined) {
      setScalarPreserving(astHandle.doc, [...nodeAstPath, "testID"], prevTestID);
    } else {
      astHandle.doc.deleteIn([...nodeAstPath, "testID"]);
    }

    return { spec: newSpec };
  },
};
