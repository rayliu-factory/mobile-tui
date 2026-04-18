// Tests for set-tabbar-items command (Plan 04-05) — D-54.
// Replaces the items array of a TabBar component at a given path in a screen variant.
//
// Note: The habit-tracker fixture doesn't have a TabBar, so we test with
// a minimal spec that includes a TabBar in the content variant.
import { describe, expect, it } from "vitest";
import type { ActionId, ScreenId, TestID } from "../../primitives/ids.ts";
import type { JsonPointer } from "../../primitives/path.ts";
import { parseSpecFile } from "../../serialize/index.ts";
import { setTabbarItems } from "./set-tabbar-items.ts";

const FIXTURE_PATH = "fixtures/habit-tracker.spec.md";

async function loadFixture() {
  const result = await parseSpecFile(FIXTURE_PATH);
  if (!result.spec || !result.astHandle) {
    throw new Error(`fixture parse failed: ${result.diagnostics.map((d) => d.message).join(", ")}`);
  }
  // Add a TabBar to the home screen content variant so we can test
  const spec = result.spec;
  const homeIndex = spec.screens.findIndex((s) => s.id === "home");
  if (homeIndex === -1) throw new Error("home screen not found in fixture");

  const homeScreen = spec.screens[homeIndex]!;
  const tabBarNode = {
    kind: "TabBar" as const,
    items: [
      { label: "Home", action: "go_home" as ActionId, testID: "tab_home" as TestID },
      { label: "Profile", action: "go_profile" as ActionId, testID: "tab_profile" as TestID },
    ],
  };

  const newTree = [...homeScreen.variants.content.tree, tabBarNode];
  const modifiedScreen = {
    ...homeScreen,
    variants: {
      ...homeScreen.variants,
      content: { ...homeScreen.variants.content, tree: newTree },
    },
  };
  const modifiedSpec = {
    ...spec,
    screens: spec.screens.map((s, i) => (i === homeIndex ? modifiedScreen : s)),
  };
  // Also update the AST
  result.astHandle.doc.setIn(
    ["screens", homeIndex, "variants", "content", "tree"],
    result.astHandle.doc.createNode(newTree),
  );

  return {
    spec: modifiedSpec,
    astHandle: result.astHandle,
    homeIndex,
    tabBarIndex: newTree.length - 1,
  };
}

describe("setTabbarItems command (D-54)", () => {
  it("apply→invert→apply is idempotent: replace TabBar items", async () => {
    const { spec: before, astHandle, homeIndex, tabBarIndex } = await loadFixture();

    const newItems = [
      { label: "Feed", action: "go_feed" as ActionId, testID: "tab_feed" as TestID },
      { label: "Settings", action: "go_settings" as ActionId, testID: "tab_settings" as TestID },
      { label: "Me", action: "go_me" as ActionId, testID: "tab_me" as TestID },
    ];

    const args = {
      screenId: "home" as ScreenId,
      variantKind: "content" as const,
      path: `/${tabBarIndex}` as JsonPointer,
      items: newItems,
    };

    const { spec: after1, inverseArgs } = setTabbarItems.apply(before, astHandle, args);
    const homeScreen1 = after1.screens[homeIndex]!;
    const tabbar1 = homeScreen1.variants.content.tree[tabBarIndex] as {
      kind: "TabBar";
      items: unknown[];
    };
    expect(tabbar1?.kind).toBe("TabBar");
    expect(tabbar1?.items).toHaveLength(3);

    const { spec: restored } = setTabbarItems.invert(after1, astHandle, inverseArgs);
    const homeScreenR = restored.screens[homeIndex]!;
    const tabbarR = homeScreenR.variants.content.tree[tabBarIndex] as {
      kind: "TabBar";
      items: unknown[];
    };
    expect(tabbarR?.items).toHaveLength(2);

    const { spec: after2 } = setTabbarItems.apply(restored, astHandle, args);
    const homeScreen2 = after2.screens[homeIndex]!;
    const tabbar2 = homeScreen2.variants.content.tree[tabBarIndex] as {
      kind: "TabBar";
      items: unknown[];
    };
    expect(tabbar2?.items).toHaveLength(3);
  });

  it("apply→invert→apply is idempotent: set single-item TabBar", async () => {
    const { spec: before, astHandle, homeIndex, tabBarIndex } = await loadFixture();

    const args = {
      screenId: "home" as ScreenId,
      variantKind: "content" as const,
      path: `/${tabBarIndex}` as JsonPointer,
      items: [{ label: "Only", action: "go_only" as ActionId, testID: "tab_only" as TestID }],
    };

    const { spec: after1, inverseArgs } = setTabbarItems.apply(before, astHandle, args);
    const tabbar1 = after1.screens[homeIndex]!.variants.content.tree[tabBarIndex] as {
      items: unknown[];
    };
    expect(tabbar1?.items).toHaveLength(1);

    const { spec: restored } = setTabbarItems.invert(after1, astHandle, inverseArgs);
    const tabbarR = restored.screens[homeIndex]!.variants.content.tree[tabBarIndex] as {
      items: unknown[];
    };
    expect(tabbarR?.items).toHaveLength(2);

    const { spec: after2 } = setTabbarItems.apply(restored, astHandle, args);
    const tabbar2 = after2.screens[homeIndex]!.variants.content.tree[tabBarIndex] as {
      items: unknown[];
    };
    expect(tabbar2?.items).toHaveLength(1);
  });

  it("apply→invert→apply is idempotent: replace with items including icon", async () => {
    const { spec: before, astHandle, homeIndex, tabBarIndex } = await loadFixture();

    const args = {
      screenId: "home" as ScreenId,
      variantKind: "content" as const,
      path: `/${tabBarIndex}` as JsonPointer,
      items: [
        {
          label: "Home",
          action: "go_home" as ActionId,
          testID: "tab_home2" as TestID,
          icon: "home",
        },
        {
          label: "Search",
          action: "go_search" as ActionId,
          testID: "tab_search" as TestID,
          icon: "search",
        },
      ],
    };

    const { spec: after1, inverseArgs } = setTabbarItems.apply(before, astHandle, args);
    const tabbar1 = after1.screens[homeIndex]!.variants.content.tree[tabBarIndex] as {
      items: Array<{ icon?: string }>;
    };
    expect(tabbar1?.items[0]?.icon).toBe("home");

    const { spec: restored } = setTabbarItems.invert(after1, astHandle, inverseArgs);
    const tabbarR = restored.screens[homeIndex]!.variants.content.tree[tabBarIndex] as {
      items: Array<{ icon?: string }>;
    };
    expect(tabbarR?.items[0]?.icon).toBeUndefined();

    const { spec: after2 } = setTabbarItems.apply(restored, astHandle, args);
    const tabbar2 = after2.screens[homeIndex]!.variants.content.tree[tabBarIndex] as {
      items: Array<{ icon?: string }>;
    };
    expect(tabbar2?.items[0]?.icon).toBe("home");
  });
});
