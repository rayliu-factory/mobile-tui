// src/editor/commands/set-tabbar-items.ts
// set-tabbar-items command per D-54 + D-56.
//
// Replaces the items array of a TabBar component found at `path` within a
// screen variant's tree. The `path` is a JsonPointer into the variant tree
// (e.g. "/3" = tree[3]).
//
// APPLY:
//   - Resolve TabBar node at path via resolvePathOnSpec
//   - Capture prevItems; update node.items to new items
//   - AST: doc.setIn([...tabBarAstPath, "items"], doc.createNode(items))
//   - inverseArgs: { screenId, variantKind, tabBarAstPath, prevItems }
//
// INVERT:
//   - Restore prevItems via doc.setIn
//
// THREAT T-04-ArgInjection: ScreenIdSchema + JsonPointerSchema.
import { z } from "zod";
import type { ComponentNode } from "../../model/component.ts";
import { SCREEN_KINDS } from "../../model/screen.ts";
import type { ScreenId } from "../../primitives/ids.ts";
import { ScreenIdSchema } from "../../primitives/ids.ts";
import { JsonPointerSchema } from "../../primitives/path.ts";
import type { Command } from "../types.ts";
import { resolvePathOnSpec } from "./_path-utils.ts";

// TabItem schema inline (matches component.ts TabItem shape)
const TabItemSchema = z
  .object({
    label: z.string(),
    action: z.string(),
    testID: z.string(),
    icon: z.string().optional(),
  })
  .strict();

type TabItem = z.infer<typeof TabItemSchema>;

export const setTabbarItemsArgs = z.object({
  screenId: ScreenIdSchema,
  variantKind: z.enum(["content", "empty", "loading", "error"]),
  path: JsonPointerSchema,
  items: z.array(TabItemSchema),
});

type SetTabbarItemsArgs = z.infer<typeof setTabbarItemsArgs>;

interface SetTabbarItemsInverse {
  screenId: ScreenId;
  variantKind: "content" | "empty" | "loading" | "error";
  tabBarAstPath: (string | number)[];
  prevItems: TabItem[];
  screenIndex: number;
  nodeIndex: number;
}

export const setTabbarItems: Command<typeof setTabbarItemsArgs> = {
  name: "set-tabbar-items",
  argsSchema: setTabbarItemsArgs,

  apply(spec, astHandle, args: SetTabbarItemsArgs) {
    const resolved = resolvePathOnSpec(spec, args.screenId, args.variantKind, args.path);
    if (!resolved || resolved.node.kind !== "TabBar") {
      // No-op if no TabBar found at path
      return {
        spec,
        inverseArgs: {
          screenId: args.screenId,
          variantKind: args.variantKind,
          tabBarAstPath: [],
          prevItems: [],
          screenIndex: -1,
          nodeIndex: -1,
        },
      };
    }

    const tabBarNode = resolved.node as Extract<ComponentNode, { kind: "TabBar" }>;
    const prevItems = tabBarNode.items.map((item) => ({ ...item })) as TabItem[];
    const tabBarAstPath = resolved.astPathSegments;

    // Update spec-level
    const updatedTabBar = { ...tabBarNode, items: args.items };
    const screenIndex = spec.screens.findIndex((s) => s.id === args.screenId);
    const screen = spec.screens[screenIndex]!;
    const variant = screen.variants[args.variantKind];
    if (!variant) {
      return {
        spec,
        inverseArgs: {
          screenId: args.screenId,
          variantKind: args.variantKind,
          tabBarAstPath: [],
          prevItems: [],
          screenIndex: -1,
          nodeIndex: -1,
        },
      };
    }
    const newTree = (variant.tree as ComponentNode[]).map((n, i) =>
      i === resolved.index ? updatedTabBar : n,
    );
    const updatedVariant = { ...variant, tree: newTree };
    const updatedScreen = {
      ...screen,
      variants: { ...screen.variants, [args.variantKind]: updatedVariant },
    };
    const newScreens = spec.screens.map((s, i) => (i === screenIndex ? updatedScreen : s));

    // AST-level: update items on the TabBar node
    astHandle.doc.setIn([...tabBarAstPath, "items"], astHandle.doc.createNode(args.items));

    const inverseArgs: SetTabbarItemsInverse = {
      screenId: args.screenId,
      variantKind: args.variantKind,
      tabBarAstPath,
      prevItems,
      screenIndex,
      nodeIndex: resolved.index,
    };
    return { spec: { ...spec, screens: newScreens }, inverseArgs };
  },

  invert(spec, astHandle, inverseArgs) {
    const { screenId, variantKind, tabBarAstPath, prevItems, screenIndex, nodeIndex } =
      inverseArgs as SetTabbarItemsInverse;

    if (screenIndex === -1 || nodeIndex === -1) return { spec };

    const screen = spec.screens[screenIndex];
    if (!screen) return { spec };

    const variant = screen.variants[variantKind];
    if (!variant) return { spec };

    const newTree = (variant.tree as ComponentNode[]).map((n, i) => {
      if (i === nodeIndex && n.kind === "TabBar") {
        return { ...n, items: prevItems };
      }
      return n;
    });

    const updatedVariant = { ...variant, tree: newTree };
    const updatedScreen = {
      ...screen,
      variants: { ...screen.variants, [variantKind]: updatedVariant },
    };
    const newScreens = spec.screens.map((s, i) => (i === screenIndex ? updatedScreen : s));

    // AST-level: restore prevItems
    if (tabBarAstPath.length > 0) {
      astHandle.doc.setIn([...tabBarAstPath, "items"], astHandle.doc.createNode(prevItems));
    }

    return { spec: { ...spec, screens: newScreens } };
  },
};
