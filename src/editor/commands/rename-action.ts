// src/editor/commands/rename-action.ts
// rename-action command per D-54 + D-56 + D-59 (cascade through component bindings + NavEdge.trigger).
//
// APPLY cascade:
//   1. Copy spec.actions[from] to spec.actions[to]; delete spec.actions[from]
//   2. Walk every screen × every variant × component tree — update node.action === from → to
//   3. Walk navigation.edges — update NavEdge.trigger === from → to
//
// INVERT:
//   - Re-apply with from/to swapped
//
// THREAT T-04-16: validateSpec post-apply catches if 'to' already existed (duplicate).
// THREAT T-04-19: walkForActionRefs is O(N-nodes); typical specs <1ms.
// THREAT T-04-ArgInjection: ActionIdSchema (snake_case) enforced.
import { z } from "zod";
import type { Action } from "../../model/action.ts";
import type { ComponentNode } from "../../model/component.ts";
import type { NavEdge } from "../../model/navigation.ts";
import type { Screen } from "../../model/screen.ts";
import type { Spec } from "../../model/spec.ts";
import type { ActionId } from "../../primitives/ids.ts";
import { ActionIdSchema } from "../../primitives/ids.ts";
import type { AstHandle } from "../../serialize/ast-handle.ts";
import { setScalarPreserving } from "../../serialize/write.ts";
import type { Command } from "../types.ts";

export const renameActionArgs = z.object({
  from: ActionIdSchema,
  to: ActionIdSchema,
});

type RenameActionArgs = z.infer<typeof renameActionArgs>;

interface RenameActionInverse {
  prevName: ActionId;
  newName: ActionId;
}

/**
 * Walk a component subtree and update any node.action === fromActionId → toActionId.
 * Returns the (possibly mutated) tree copy.
 */
function walkAndRenameAction(
  nodes: ComponentNode[],
  astPath: (string | number)[],
  from: ActionId,
  to: ActionId,
  astHandle: AstHandle,
): ComponentNode[] {
  return nodes.map((node, i) => {
    const nodePath = [...astPath, i];
    let updated = node;

    // Update action ref on this node if applicable
    if ("action" in node && node.action === from) {
      setScalarPreserving(astHandle.doc, [...nodePath, "action"], to);
      updated = { ...updated, action: to } as ComponentNode;
    }

    // Recurse into children
    switch (node.kind) {
      case "Column":
      case "Row": {
        const updatedChildren = walkAndRenameAction(
          node.children,
          [...nodePath, "children"],
          from,
          to,
          astHandle,
        );
        updated = { ...updated, children: updatedChildren } as ComponentNode;
        break;
      }
      case "Card": {
        const [updatedChild] = walkAndRenameAction(
          [node.child],
          [...nodePath, "child"],
          from,
          to,
          astHandle,
        );
        if (updatedChild) updated = { ...updated, child: updatedChild } as ComponentNode;
        break;
      }
      case "List": {
        const [updatedTemplate] = walkAndRenameAction(
          [node.itemTemplate],
          [...nodePath, "itemTemplate"],
          from,
          to,
          astHandle,
        );
        if (updatedTemplate)
          updated = { ...updated, itemTemplate: updatedTemplate } as ComponentNode;
        break;
      }
      case "ListItem": {
        const updatedChildren = walkAndRenameAction(
          node.children,
          [...nodePath, "children"],
          from,
          to,
          astHandle,
        );
        updated = { ...updated, children: updatedChildren } as ComponentNode;
        break;
      }
      case "NavBar": {
        let updatedLeading = node.leading;
        let updatedTrailing = node.trailing;
        if (node.leading) {
          const [l] = walkAndRenameAction(
            [node.leading],
            [...nodePath, "leading"],
            from,
            to,
            astHandle,
          );
          updatedLeading = l;
        }
        if (node.trailing) {
          const [t] = walkAndRenameAction(
            [node.trailing],
            [...nodePath, "trailing"],
            from,
            to,
            astHandle,
          );
          updatedTrailing = t;
        }
        updated = {
          ...updated,
          leading: updatedLeading,
          trailing: updatedTrailing,
        } as ComponentNode;
        break;
      }
      case "TabBar": {
        const updatedItems = node.items.map((item, itemIdx) => {
          if (item.action === from) {
            setScalarPreserving(astHandle.doc, [...nodePath, "items", itemIdx, "action"], to);
            return { ...item, action: to };
          }
          return item;
        });
        updated = { ...updated, items: updatedItems } as ComponentNode;
        break;
      }
      case "Modal":
      case "Sheet": {
        const [updatedChild] = walkAndRenameAction(
          [node.child],
          [...nodePath, "child"],
          from,
          to,
          astHandle,
        );
        if (updatedChild) updated = { ...updated, child: updatedChild } as ComponentNode;
        break;
      }
      default:
        break;
    }

    return updated;
  });
}

function renameActionInSpec(spec: Spec, astHandle: AstHandle, from: ActionId, to: ActionId): Spec {
  // 1. Rename in actions registry
  // biome-ignore lint/suspicious/noExplicitAny: branded key indexing
  const fromEffect = (spec.actions as any)[from] as Action | undefined;
  const newActions: Record<string, Action> = {};
  for (const [actionId, action] of Object.entries(spec.actions)) {
    if (!action) continue;
    if (actionId === from) {
      // Move to new key
      newActions[to] = action as Action;
      astHandle.doc.setIn(["actions", to], astHandle.doc.createNode(action));
      astHandle.doc.deleteIn(["actions", from]);
    } else {
      newActions[actionId] = action as Action;
    }
  }
  if (!fromEffect) {
    // from doesn't exist — no-op
    return spec;
  }

  // 2. Cascade through component trees in all screens × variants
  const newScreens: Screen[] = spec.screens.map((screen, screenIndex) => {
    const variants = screen.variants;

    // content (always present)
    const contentTree = walkAndRenameAction(
      variants.content.tree as ComponentNode[],
      ["screens", screenIndex, "variants", "content", "tree"],
      from,
      to,
      astHandle,
    );

    // non-null optional variants
    const updatedEmpty = variants.empty
      ? {
          ...variants.empty,
          tree: walkAndRenameAction(
            variants.empty.tree as ComponentNode[],
            ["screens", screenIndex, "variants", "empty", "tree"],
            from,
            to,
            astHandle,
          ),
        }
      : null;

    const updatedLoading = variants.loading
      ? {
          ...variants.loading,
          tree: walkAndRenameAction(
            variants.loading.tree as ComponentNode[],
            ["screens", screenIndex, "variants", "loading", "tree"],
            from,
            to,
            astHandle,
          ),
        }
      : null;

    const updatedError = variants.error
      ? {
          ...variants.error,
          tree: walkAndRenameAction(
            variants.error.tree as ComponentNode[],
            ["screens", screenIndex, "variants", "error", "tree"],
            from,
            to,
            astHandle,
          ),
        }
      : null;

    return {
      ...screen,
      variants: {
        ...variants,
        content: { ...variants.content, tree: contentTree },
        empty: updatedEmpty,
        loading: updatedLoading,
        error: updatedError,
      },
    };
  });

  // 3. Cascade through NavEdge.trigger
  const newEdges: NavEdge[] = spec.navigation.edges.map((edge, i) => {
    if (edge.trigger === from) {
      setScalarPreserving(astHandle.doc, ["navigation", "edges", i, "trigger"], to);
      return { ...edge, trigger: to };
    }
    return edge;
  });

  return {
    ...spec,
    actions: newActions,
    screens: newScreens,
    navigation: { ...spec.navigation, edges: newEdges },
  };
}

export const renameAction: Command<typeof renameActionArgs> = {
  name: "rename-action",
  argsSchema: renameActionArgs,

  apply(spec, astHandle, args: RenameActionArgs) {
    const newSpec = renameActionInSpec(spec, astHandle, args.from, args.to);
    const inverseArgs: RenameActionInverse = { prevName: args.from, newName: args.to };
    return { spec: newSpec, inverseArgs };
  },

  invert(spec, astHandle, inverseArgs) {
    const { prevName, newName } = inverseArgs as RenameActionInverse;
    const restoredSpec = renameActionInSpec(spec, astHandle, newName, prevName);
    return { spec: restoredSpec };
  },
};
