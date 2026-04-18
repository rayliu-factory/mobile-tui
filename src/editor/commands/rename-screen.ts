// src/editor/commands/rename-screen.ts
// rename-screen command per D-54 + D-56 (one-file-per-command) + D-58 (cascade).
//
// APPLY cascade (D-58):
//   1. screens[i].id: find screen with id===from, update to 'to'
//   2. navigation.root: if === from, update to 'to'
//   3. NavEdge.from/to: update all edges referencing 'from'
//   4. Action navigate.screen: update all navigate actions where screen===from
//   5. Action present.overlay: update all present actions where overlay===from
//
// INVERT:
//   - Reverse the rename by calling apply with { from: to, to: from }
//   - Use stored inverseArgs to know which sites were cascaded
//
// THREAT T-04-ArgInjection: argsSchema rejects non-snake_case ids.
// THREAT T-04-ASTDrift: every spec-level mutation is mirrored in the AST
//   via setScalarPreserving per D-62.
import { z } from "zod";
import type { Action } from "../../model/action.ts";
import type { NavEdge } from "../../model/navigation.ts";
import type { Screen } from "../../model/screen.ts";
import type { Spec } from "../../model/spec.ts";
import type { ScreenId } from "../../primitives/ids.ts";
import { ScreenIdSchema } from "../../primitives/ids.ts";
import type { AstHandle } from "../../serialize/ast-handle.ts";
import { setScalarPreserving } from "../../serialize/write.ts";
import type { Command } from "../types.ts";

export const renameScreenArgs = z.object({
  from: ScreenIdSchema,
  to: ScreenIdSchema,
});

type RenameScreenArgs = z.infer<typeof renameScreenArgs>;

interface RenameScreenInverse {
  prevId: ScreenId;
  newId: ScreenId;
  screenIndex: number;
  cascadedNavRoot: boolean;
  cascadedEdgeIndices: { edgeIndex: number; field: "from" | "to" }[];
  cascadedActionIds: string[];
}

function renameInSpec(
  spec: Spec,
  astHandle: AstHandle,
  from: ScreenId,
  to: ScreenId,
): {
  spec: Spec;
  screenIndex: number;
  cascadedNavRoot: boolean;
  cascadedEdgeIndices: { edgeIndex: number; field: "from" | "to" }[];
  cascadedActionIds: string[];
} {
  let screenIndex = -1;
  let cascadedNavRoot = false;
  const cascadedEdgeIndices: { edgeIndex: number; field: "from" | "to" }[] = [];
  const cascadedActionIds: string[] = [];

  // 1. Update screen id
  const newScreens: Screen[] = spec.screens.map((s, i) => {
    if (s.id === from) {
      screenIndex = i;
      // AST update
      setScalarPreserving(astHandle.doc, ["screens", i, "id"], to);
      return { ...s, id: to };
    }
    return s;
  });

  // 2. Update navigation.root if it references 'from'
  let newRoot = spec.navigation.root;
  if (spec.navigation.root === from) {
    cascadedNavRoot = true;
    newRoot = to;
    setScalarPreserving(astHandle.doc, ["navigation", "root"], to);
  }

  // 3. Update NavEdge.from/to
  const newEdges: NavEdge[] = spec.navigation.edges.map((edge, i) => {
    let updatedEdge = edge;
    if (edge.from === from) {
      cascadedEdgeIndices.push({ edgeIndex: i, field: "from" });
      setScalarPreserving(astHandle.doc, ["navigation", "edges", i, "from"], to);
      updatedEdge = { ...updatedEdge, from: to };
    }
    if (edge.to === from) {
      cascadedEdgeIndices.push({ edgeIndex: i, field: "to" });
      setScalarPreserving(astHandle.doc, ["navigation", "edges", i, "to"], to);
      updatedEdge = { ...updatedEdge, to: to };
    }
    return updatedEdge;
  });

  // 4 & 5. Update action registry: navigate.screen and present.overlay
  const newActions: Record<string, Action> = {};
  for (const [actionId, action] of Object.entries(spec.actions)) {
    if (!action) {
      continue;
    }
    if (action.kind === "navigate" && action.screen === from) {
      cascadedActionIds.push(actionId);
      // Find the action index in AST (actions is a mapping by key, not array)
      setScalarPreserving(astHandle.doc, ["actions", actionId, "screen"], to);
      newActions[actionId] = { ...action, screen: to };
    } else if (action.kind === "present" && action.overlay === from) {
      cascadedActionIds.push(actionId);
      setScalarPreserving(astHandle.doc, ["actions", actionId, "overlay"], to);
      newActions[actionId] = { ...action, overlay: to };
    } else {
      newActions[actionId] = action;
    }
  }

  const newSpec: Spec = {
    ...spec,
    screens: newScreens,
    navigation: {
      ...spec.navigation,
      root: newRoot,
      edges: newEdges,
    },
    actions: newActions,
  };

  return { spec: newSpec, screenIndex, cascadedNavRoot, cascadedEdgeIndices, cascadedActionIds };
}

export const renameScreen: Command<typeof renameScreenArgs> = {
  name: "rename-screen",
  argsSchema: renameScreenArgs,

  apply(spec, astHandle, args: RenameScreenArgs) {
    const {
      spec: newSpec,
      screenIndex,
      cascadedNavRoot,
      cascadedEdgeIndices,
      cascadedActionIds,
    } = renameInSpec(spec, astHandle, args.from, args.to);

    const inverseArgs: RenameScreenInverse = {
      prevId: args.from,
      newId: args.to,
      screenIndex,
      cascadedNavRoot,
      cascadedEdgeIndices,
      cascadedActionIds,
    };

    return { spec: newSpec, inverseArgs };
  },

  invert(spec, astHandle, inverseArgs) {
    const { prevId, newId } = inverseArgs as RenameScreenInverse;

    // Invert: rename 'to' back to 'from' (full cascade again)
    const { spec: restoredSpec } = renameInSpec(spec, astHandle, newId, prevId);
    return { spec: restoredSpec };
  },
};
