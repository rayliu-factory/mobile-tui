// src/editor/commands/delete-screen.ts
// delete-screen command per D-54 + D-56 (one-file-per-command) + D-58 (cascade).
//
// APPLY cascade (D-58):
//   1. Remove screen from spec.screens at screenIndex
//   2. Remove NavEdges where from===id OR to===id (track indices for invert)
//   3. If navigation.root === id, reassign to first remaining screen (or null)
//
// INVERT:
//   - Restore screen at screenIndex via spec.screens.splice-like insert
//   - Restore removed nav edges at their original positions
//   - Restore navigation.root if it was changed
//
// THREAT T-04-ArgInjection: argsSchema rejects non-snake_case id.
// THREAT T-04-ASTDrift: every spec-level removal mirrors a doc.deleteIn per D-62.
// THREAT T-04-09: nav.root reassigned when root is deleted; validateSpec catches residual.
import { z } from "zod";
import type { NavEdge } from "../../model/navigation.ts";
import type { Screen } from "../../model/screen.ts";
import type { Spec } from "../../model/spec.ts";
import type { ScreenId } from "../../primitives/ids.ts";
import { ScreenIdSchema } from "../../primitives/ids.ts";
import type { AstHandle } from "../../serialize/ast-handle.ts";
import type { Command } from "../types.ts";

export const deleteScreenArgs = z.object({
  id: ScreenIdSchema,
});

type DeleteScreenArgs = z.infer<typeof deleteScreenArgs>;

interface RemovedEdgeEntry {
  originalIndex: number;
  edge: NavEdge;
}

interface DeleteScreenInverse {
  removedScreen: Screen;
  screenIndex: number;
  removedEdges: RemovedEdgeEntry[];
  prevRoot: ScreenId;
  rootChanged: boolean;
}

export const deleteScreen: Command<typeof deleteScreenArgs> = {
  name: "delete-screen",
  argsSchema: deleteScreenArgs,

  apply(spec, astHandle: AstHandle, args: DeleteScreenArgs) {
    const { id } = args;

    // 1. Find screen index
    const screenIndex = spec.screens.findIndex((s) => s.id === id);
    const removedScreen = spec.screens[screenIndex];
    if (!removedScreen) {
      throw new Error(`delete-screen: screen "${id}" not found`);
    }

    // 2. Identify nav edges to remove (in reverse order for safe AST deleteIn)
    const removedEdges: RemovedEdgeEntry[] = [];
    for (let i = spec.navigation.edges.length - 1; i >= 0; i--) {
      const edge = spec.navigation.edges[i];
      if (edge && (edge.from === id || edge.to === id)) {
        removedEdges.unshift({ originalIndex: i, edge });
      }
    }

    // 3. Build new edges (filter out removed)
    const removedIndices = new Set(removedEdges.map((e) => e.originalIndex));
    const newEdges: NavEdge[] = spec.navigation.edges.filter((_, i) => !removedIndices.has(i));

    // 4. Handle navigation root
    const prevRoot = spec.navigation.root;
    let rootChanged = false;
    let newRoot = prevRoot;

    if (spec.navigation.root === id) {
      rootChanged = true;
      // Assign to first remaining screen after deletion
      const firstRemaining = spec.screens.find((s) => s.id !== id);
      newRoot = firstRemaining ? firstRemaining.id : (null as unknown as ScreenId);
    }

    // Build new spec
    const newScreens = spec.screens.filter((s) => s.id !== id);
    const newSpec: Spec = {
      ...spec,
      screens: newScreens,
      navigation: {
        ...spec.navigation,
        root: newRoot,
        edges: newEdges,
      },
    };

    // AST mutations (D-62): delete in reverse order of indices to keep positions stable
    // First delete nav edges (in reverse original index order)
    const sortedRemovedIndices = [...removedEdges.map((e) => e.originalIndex)].sort(
      (a, b) => b - a,
    );
    for (const edgeIdx of sortedRemovedIndices) {
      astHandle.doc.deleteIn(["navigation", "edges", edgeIdx]);
    }

    // Update nav root if changed
    if (rootChanged) {
      if (newRoot) {
        // Use doc.setIn to update the root value
        astHandle.doc.setIn(["navigation", "root"], newRoot);
      }
    }

    // Delete the screen (after nav mutations since edges ref screenIndex)
    astHandle.doc.deleteIn(["screens", screenIndex]);

    const inverseArgs: DeleteScreenInverse = {
      removedScreen,
      screenIndex,
      removedEdges,
      prevRoot,
      rootChanged,
    };

    return { spec: newSpec, inverseArgs };
  },

  invert(spec, astHandle: AstHandle, inverseArgs) {
    const { removedScreen, screenIndex, removedEdges, prevRoot, rootChanged } =
      inverseArgs as DeleteScreenInverse;

    // 1. Restore screen at its original position
    const newScreens = [
      ...spec.screens.slice(0, screenIndex),
      removedScreen,
      ...spec.screens.slice(screenIndex),
    ];

    // AST: insert screen back at screenIndex
    // We must use setIn on the sequence to insert at position
    // eemeli/yaml doesn't have insertIn, so we rebuild the whole sequence or use addIn
    // Strategy: addIn appends; for restore we use setIn to overwrite the whole screens array
    astHandle.doc.setIn(["screens"], astHandle.doc.createNode(newScreens));

    // 2. Restore nav edges at original positions (insert in ascending order)
    const newEdges = [...spec.navigation.edges];
    // Insert in ascending index order so positions are correct
    const sortedRemovedEdges = [...removedEdges].sort((a, b) => a.originalIndex - b.originalIndex);
    for (const { originalIndex, edge } of sortedRemovedEdges) {
      newEdges.splice(originalIndex, 0, edge);
    }
    astHandle.doc.setIn(["navigation", "edges"], astHandle.doc.createNode(newEdges));

    // 3. Restore nav root if it changed
    let newRoot = spec.navigation.root;
    if (rootChanged) {
      newRoot = prevRoot;
      astHandle.doc.setIn(["navigation", "root"], prevRoot);
    }

    const restoredSpec: Spec = {
      ...spec,
      screens: newScreens,
      navigation: {
        ...spec.navigation,
        root: newRoot,
        edges: newEdges,
      },
    };

    return { spec: restoredSpec };
  },
};
