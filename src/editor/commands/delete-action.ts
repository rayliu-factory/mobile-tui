// src/editor/commands/delete-action.ts
// delete-action command per D-54 + D-56.
//
// APPLY:
//   - Capture action JSON (plain JS, T-04-14)
//   - Delete from spec.actions; doc.deleteIn(["actions", id])
//   - inverseArgs: { id, actionJSON }
//
// Note: Orphan component bindings left in place — EDITOR_REF_CASCADE_INCOMPLETE
// is informational; validateSpec will surface the dangling refs as errors.
//
// INVERT:
//   - Restore action at id via doc.setIn
//
// THREAT T-04-ArgInjection: ActionIdSchema enforces snake_case.
// THREAT T-04-18: Orphan bindings are left for validateSpec, not fixed here.
import { z } from "zod";
import type { Action } from "../../model/action.ts";
import type { ComponentNode } from "../../model/component.ts";
import type { Spec } from "../../model/index.ts";
import type { Diagnostic } from "../../primitives/diagnostic.ts";
import { info } from "../../primitives/diagnostic.ts";
import type { JsonPointer } from "../../primitives/path.ts";
import { ActionIdSchema } from "../../primitives/ids.ts";
import { EDITOR_CODES } from "../diagnostics.ts";
import type { Command } from "../types.ts";

export const deleteActionArgs = z.object({
  id: ActionIdSchema,
});

type DeleteActionArgs = z.infer<typeof deleteActionArgs>;

interface DeleteActionInverse {
  id: string;
  actionJSON: Action | null;
}

function walkTree(node: ComponentNode, actionId: string, path: string, diags: Diagnostic[]): void {
  if ("action" in node && node.action === actionId) {
    diags.push(
      info(
        EDITOR_CODES.EDITOR_REF_CASCADE_INCOMPLETE,
        path as JsonPointer,
        `Component at "${path}" binds deleted action "${actionId}"`,
      ),
    );
  }
  switch (node.kind) {
    case "Column":
    case "Row":
    case "ListItem":
      node.children.forEach((child, i) =>
        walkTree(child, actionId, `${path}/children/${i}`, diags),
      );
      break;
    case "Card":
    case "Modal":
    case "Sheet":
      walkTree(node.child, actionId, `${path}/child`, diags);
      break;
    case "List":
      walkTree(node.itemTemplate, actionId, `${path}/itemTemplate`, diags);
      break;
    case "NavBar":
      if (node.leading) walkTree(node.leading, actionId, `${path}/leading`, diags);
      if (node.trailing) walkTree(node.trailing, actionId, `${path}/trailing`, diags);
      break;
    case "TabBar":
      // TabBar items are plain {label, action, testID, icon?} — not ComponentNodes
      node.items.forEach((item, i) => {
        if (item.action === actionId) {
          diags.push(
            info(
              EDITOR_CODES.EDITOR_REF_CASCADE_INCOMPLETE,
              `${path}/items/${i}` as JsonPointer,
              `TabBar item at "${path}/items/${i}" binds deleted action "${actionId}"`,
            ),
          );
        }
      });
      break;
    default:
      break;
  }
}

function collectOrphanActionRefs(spec: Spec, deletedId: string): Diagnostic[] {
  const diags: Diagnostic[] = [];
  for (let si = 0; si < spec.screens.length; si++) {
    const screen = spec.screens[si];
    if (!screen) continue;
    for (const [variantKind, variant] of Object.entries(screen.variants)) {
      if (!variant?.tree) continue;
      variant.tree.forEach((node, ni) => {
        walkTree(node, deletedId, `/screens/${si}/variants/${variantKind}/tree/${ni}`, diags);
      });
    }
  }
  return diags;
}

export const deleteAction: Command<typeof deleteActionArgs> = {
  name: "delete-action",
  argsSchema: deleteActionArgs,

  apply(spec, astHandle, args: DeleteActionArgs) {
    // biome-ignore lint/suspicious/noExplicitAny: branded key indexing
    const actionJSON = ((spec.actions as any)[args.id] ?? null) as Action | null;

    if (!actionJSON) {
      return { spec, inverseArgs: { id: args.id, actionJSON: null } };
    }

    const newActions = { ...spec.actions };
    // biome-ignore lint/suspicious/noExplicitAny: branded key indexing
    delete (newActions as any)[args.id];

    // AST-level: remove the key
    astHandle.doc.deleteIn(["actions", args.id]);

    const inverseArgs: DeleteActionInverse = {
      id: args.id,
      actionJSON: { ...actionJSON } as Action,
    };
    const newSpec = { ...spec, actions: newActions };
    const diagnostics = collectOrphanActionRefs(newSpec, args.id);
    return { spec: newSpec, inverseArgs, diagnostics };
  },

  invert(spec, astHandle, inverseArgs) {
    const { id, actionJSON } = inverseArgs as DeleteActionInverse;

    if (!actionJSON) return { spec };

    const newActions = { ...spec.actions };
    // biome-ignore lint/suspicious/noExplicitAny: branded key indexing
    (newActions as any)[id] = actionJSON;
    const newSpec = { ...spec, actions: newActions };

    // AST-level: restore the action
    astHandle.doc.setIn(["actions", id], astHandle.doc.createNode(actionJSON));

    return { spec: newSpec };
  },
};
