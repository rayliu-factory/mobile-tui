// src/editor/commands/set-component-prop.ts
// set-component-prop command per D-55 (MVP component tree) + D-56 (one-file-per-command).
//
// APPLY:
//   - Spec-level: resolve path to node; spread node with updated prop.
//   - AST-level (D-62): use setScalarPreserving for scalar values (string/number/boolean);
//     doc.setIn for structural values (arrays/objects). Per D-62 research §2(b).
//   - inverseArgs: { screenIndex, variantKind, nodeAstPath, prop, prevValue }
//
// INVERT:
//   - Restore prevValue via setScalarPreserving or doc.setIn.
//
// THREAT T-04-13 (path traversal): path resolves only within variant.tree.
import { z } from "zod";
import type { Spec } from "../../model/index.ts";
import { ScreenIdSchema } from "../../primitives/ids.ts";
import { decodeSegment, JsonPointerSchema } from "../../primitives/path.ts";
import type { AstHandle } from "../../serialize/ast-handle.ts";
import { setScalarPreserving } from "../../serialize/write.ts";
import type { Command } from "../types.ts";

export const setComponentPropArgs = z.object({
  screenId: ScreenIdSchema,
  variantKind: z.enum(["content", "empty", "loading", "error"]),
  /** JsonPointer to the node, e.g. "/0" for tree[0]. */
  path: JsonPointerSchema,
  prop: z.string().min(1),
  value: z.unknown(),
});

type SetComponentPropArgs = z.infer<typeof setComponentPropArgs>;

interface SetComponentPropInverseArgs {
  screenIndex: number;
  variantKind: string;
  nodeAstPath: (string | number)[];
  prop: string;
  prevValue: unknown;
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

function isScalar(v: unknown): v is string | number | boolean | null {
  return typeof v === "string" || typeof v === "number" || typeof v === "boolean" || v === null;
}

export const setComponentProp: Command<typeof setComponentPropArgs> = {
  name: "set-component-prop",
  argsSchema: setComponentPropArgs,

  apply(
    spec: Spec,
    astHandle: AstHandle,
    args: SetComponentPropArgs,
  ): { spec: Spec; inverseArgs: unknown } {
    const { screenId, variantKind, path, prop, value } = args;
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
    const prevValue = node[prop];

    // Spec-level: spread node with new prop
    const newNode = { ...node, [prop]: value };
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

    // AST-level (D-62): setScalarPreserving for scalar; doc.setIn for structural
    if (isScalar(value)) {
      setScalarPreserving(astHandle.doc, [...nodeAstPath, prop], value);
    } else {
      astHandle.doc.setIn([...nodeAstPath, prop], astHandle.doc.createNode(value));
    }

    const inverseArgs: SetComponentPropInverseArgs = {
      screenIndex,
      variantKind,
      nodeAstPath,
      prop,
      prevValue,
    };

    return { spec: newSpec, inverseArgs };
  },

  invert(spec: Spec, astHandle: AstHandle, inverseArgs: unknown): { spec: Spec } {
    const inv = inverseArgs as SetComponentPropInverseArgs;
    if (!inv || typeof inv.screenIndex !== "number") return { spec };

    const { screenIndex, variantKind, nodeAstPath, prop, prevValue } = inv;
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

    // Restore: if prevValue was undefined, remove the prop; otherwise restore it
    let newNode: Record<string, unknown>;
    if (prevValue === undefined) {
      // Remove the prop
      const { [prop]: _removed, ...rest } = node;
      void _removed;
      newNode = rest;
    } else {
      newNode = { ...node, [prop]: prevValue };
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

    // AST-level (D-62): restore prevValue
    if (prevValue === undefined) {
      astHandle.doc.deleteIn([...nodeAstPath, prop]);
    } else if (isScalar(prevValue)) {
      setScalarPreserving(astHandle.doc, [...nodeAstPath, prop], prevValue);
    } else {
      astHandle.doc.setIn([...nodeAstPath, prop], astHandle.doc.createNode(prevValue));
    }

    return { spec: newSpec };
  },
};
