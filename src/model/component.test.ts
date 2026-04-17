import { describe, expect, it } from "vitest";
import type { ComponentNode } from "./component.ts";
import { COMPONENT_KINDS, ComponentNodeSchema } from "./component.ts";

describe("18-kind closed catalog", () => {
  it("exposes exactly 18 kinds", () => {
    expect(COMPONENT_KINDS.length).toBe(18);
  });

  it("contains the expected kinds", () => {
    expect(new Set(COMPONENT_KINDS)).toEqual(
      new Set([
        "Column",
        "Row",
        "Text",
        "Button",
        "TextField",
        "List",
        "ListItem",
        "Card",
        "Image",
        "Icon",
        "Divider",
        "Toggle",
        "SegmentedControl",
        "TabBar",
        "NavBar",
        "Modal",
        "Sheet",
        "Spacer",
      ]),
    );
  });

  it("rejects unknown kind", () => {
    expect(ComponentNodeSchema.safeParse({ kind: "Foo" }).success).toBe(false);
    expect(ComponentNodeSchema.safeParse({ kind: "Canvas" }).success).toBe(false);
  });
});

describe("leaf components", () => {
  it("Text with minimal fields", () => {
    expect(ComponentNodeSchema.safeParse({ kind: "Text", text: "hello" }).success).toBe(true);
  });

  it("Text rejects unknown style", () => {
    expect(
      ComponentNodeSchema.safeParse({
        kind: "Text",
        text: "x",
        style: "display-1",
      }).success,
    ).toBe(false);
  });

  it("Icon with name", () => {
    expect(ComponentNodeSchema.safeParse({ kind: "Icon", name: "checkmark" }).success).toBe(true);
  });

  it("Divider bare", () => {
    expect(ComponentNodeSchema.safeParse({ kind: "Divider" }).success).toBe(true);
  });

  it("Spacer with optional size", () => {
    expect(ComponentNodeSchema.safeParse({ kind: "Spacer" }).success).toBe(true);
    expect(ComponentNodeSchema.safeParse({ kind: "Spacer", size: "md" }).success).toBe(true);
  });

  it("Image requires source + alt", () => {
    expect(
      ComponentNodeSchema.safeParse({
        kind: "Image",
        source: "avatar.png",
        alt: "User avatar",
      }).success,
    ).toBe(true);
    expect(ComponentNodeSchema.safeParse({ kind: "Image", source: "x" }).success).toBe(false);
  });
});

describe("interactable sigil triple (D-01)", () => {
  const baseButton = {
    kind: "Button" as const,
    label: "Submit",
    action: "save_habit",
    testID: "save_btn",
  };

  it("Button with full triple", () => {
    expect(ComponentNodeSchema.safeParse(baseButton).success).toBe(true);
  });

  it.each(["label", "action", "testID"])("Button rejects missing %s", (field) => {
    const b = { ...baseButton } as Record<string, unknown>;
    delete b[field];
    expect(ComponentNodeSchema.safeParse(b).success).toBe(false);
  });

  it("Button rejects non-ASCII label (D-03)", () => {
    expect(
      ComponentNodeSchema.safeParse({
        ...baseButton,
        label: "Submit \u{1F680}",
      }).success,
    ).toBe(false);
  });

  it("Button rejects control-char in label", () => {
    expect(
      ComponentNodeSchema.safeParse({
        ...baseButton,
        label: "Sub\u0000mit",
      }).success,
    ).toBe(false);
  });

  it("Button rejects non-snake-case action", () => {
    expect(
      ComponentNodeSchema.safeParse({
        ...baseButton,
        action: "SaveHabit",
      }).success,
    ).toBe(false);
  });

  it("TextField accepts optional bindsTo as JsonPointer", () => {
    expect(
      ComponentNodeSchema.safeParse({
        kind: "TextField",
        label: "Email",
        action: "on_email_change",
        testID: "email_field",
        bindsTo: "/form/email",
      }).success,
    ).toBe(true);
  });

  it("TextField rejects invalid bindsTo pointer", () => {
    expect(
      ComponentNodeSchema.safeParse({
        kind: "TextField",
        label: "x",
        action: "a",
        testID: "t",
        bindsTo: "not-a-pointer",
      }).success,
    ).toBe(false);
  });

  it("Toggle requires sigil triple", () => {
    expect(
      ComponentNodeSchema.safeParse({
        kind: "Toggle",
        label: "Dark mode",
        action: "toggle_dark",
        testID: "dark_toggle",
      }).success,
    ).toBe(true);
  });

  it("SegmentedControl requires sigil triple", () => {
    expect(
      ComponentNodeSchema.safeParse({
        kind: "SegmentedControl",
        label: "Period",
        action: "change_period",
        testID: "period_seg",
        options: ["Day", "Week", "Month"],
      }).success,
    ).toBe(true);
  });

  it("SegmentedControl requires at least 2 options", () => {
    expect(
      ComponentNodeSchema.safeParse({
        kind: "SegmentedControl",
        label: "x",
        action: "a",
        testID: "t",
        options: ["OnlyOne"],
      }).success,
    ).toBe(false);
  });
});

describe("List + ListItem", () => {
  it("List requires itemTemplate + bindsTo", () => {
    expect(
      ComponentNodeSchema.safeParse({
        kind: "List",
        itemTemplate: { kind: "Text", text: "item" },
        bindsTo: "/Habit",
      }).success,
    ).toBe(true);
  });

  it("List rejects missing bindsTo", () => {
    expect(
      ComponentNodeSchema.safeParse({
        kind: "List",
        itemTemplate: { kind: "Text", text: "x" },
      }).success,
    ).toBe(false);
  });

  it("ListItem all-or-nothing: 0 of triple → ok (container)", () => {
    expect(
      ComponentNodeSchema.safeParse({
        kind: "ListItem",
        children: [{ kind: "Text", text: "row" }],
      }).success,
    ).toBe(true);
  });

  it("ListItem all-or-nothing: 3 of triple → ok (tappable)", () => {
    expect(
      ComponentNodeSchema.safeParse({
        kind: "ListItem",
        children: [{ kind: "Text", text: "row" }],
        label: "Open",
        action: "open_habit",
        testID: "habit_row",
      }).success,
    ).toBe(true);
  });

  it("ListItem all-or-nothing: 1 of triple → REJECTED", () => {
    expect(
      ComponentNodeSchema.safeParse({
        kind: "ListItem",
        children: [{ kind: "Text", text: "row" }],
        label: "Open only",
      }).success,
    ).toBe(false);
  });

  it("ListItem all-or-nothing: 2 of triple → REJECTED", () => {
    expect(
      ComponentNodeSchema.safeParse({
        kind: "ListItem",
        children: [{ kind: "Text", text: "row" }],
        label: "Open",
        action: "open_habit",
      }).success,
    ).toBe(false);
  });
});

describe("TabBar", () => {
  const mkItem = (i: number) => ({
    label: `Tab${i}`,
    action: `go_tab_${i}`,
    testID: `tab_${i}`,
  });

  it("TabBar accepts 2-5 items", () => {
    expect(
      ComponentNodeSchema.safeParse({
        kind: "TabBar",
        items: [mkItem(1), mkItem(2)],
      }).success,
    ).toBe(true);
    expect(
      ComponentNodeSchema.safeParse({
        kind: "TabBar",
        items: [mkItem(1), mkItem(2), mkItem(3), mkItem(4), mkItem(5)],
      }).success,
    ).toBe(true);
  });

  it("TabBar rejects <2 items", () => {
    expect(
      ComponentNodeSchema.safeParse({
        kind: "TabBar",
        items: [mkItem(1)],
      }).success,
    ).toBe(false);
  });

  it("TabBar rejects >5 items", () => {
    expect(
      ComponentNodeSchema.safeParse({
        kind: "TabBar",
        items: [mkItem(1), mkItem(2), mkItem(3), mkItem(4), mkItem(5), mkItem(6)],
      }).success,
    ).toBe(false);
  });

  it("TabBar items require sigil triple (no missing testID)", () => {
    expect(
      ComponentNodeSchema.safeParse({
        kind: "TabBar",
        items: [mkItem(1), { label: "Missing", action: "go_missing" }],
      }).success,
    ).toBe(false);
  });
});

describe("containers + recursion", () => {
  it("Column with no children", () => {
    expect(ComponentNodeSchema.safeParse({ kind: "Column", children: [] }).success).toBe(true);
  });

  it("Row with nested Text children", () => {
    expect(
      ComponentNodeSchema.safeParse({
        kind: "Row",
        children: [
          { kind: "Text", text: "a" },
          { kind: "Text", text: "b" },
        ],
      }).success,
    ).toBe(true);
  });

  it("Card wraps single child", () => {
    expect(
      ComponentNodeSchema.safeParse({
        kind: "Card",
        child: { kind: "Text", text: "in card" },
      }).success,
    ).toBe(true);
  });

  it("NavBar with optional leading + trailing", () => {
    expect(
      ComponentNodeSchema.safeParse({
        kind: "NavBar",
        title: "Home",
        leading: { kind: "Icon", name: "back" },
        trailing: {
          kind: "Button",
          label: "Add",
          action: "add_habit",
          testID: "add_btn",
        },
      }).success,
    ).toBe(true);
  });

  it("Modal wraps a single child", () => {
    expect(
      ComponentNodeSchema.safeParse({
        kind: "Modal",
        child: { kind: "Text", text: "in modal" },
      }).success,
    ).toBe(true);
  });

  it("Sheet wraps a single child", () => {
    expect(
      ComponentNodeSchema.safeParse({
        kind: "Sheet",
        child: { kind: "Text", text: "in sheet" },
      }).success,
    ).toBe(true);
  });

  it("deeply nested Column-in-Card-in-Column parses", () => {
    const tree: ComponentNode = {
      kind: "Column",
      children: [
        {
          kind: "Card",
          child: {
            kind: "Column",
            children: [
              { kind: "Text", text: "deep" },
              {
                kind: "Row",
                children: [
                  {
                    kind: "Button",
                    label: "Tap",
                    action: "do_tap",
                    testID: "deep_btn",
                  },
                ],
              },
            ],
          },
        },
      ],
    };
    expect(ComponentNodeSchema.safeParse(tree).success).toBe(true);
  });
});

describe("threat T-01-01: deep-recursion stress", () => {
  it("100-level nested Column tree parses without stack overflow", () => {
    // Build a 100-deep Column chain leafing at a Text node.
    let tree: ComponentNode = { kind: "Text", text: "leaf" };
    for (let i = 0; i < 100; i++) {
      tree = { kind: "Column", children: [tree] };
    }
    const result = ComponentNodeSchema.safeParse(tree);
    expect(result.success).toBe(true);
  });
});

describe("TypeScript inference sanity (RESEARCH Pitfall #1)", () => {
  it("inferred ComponentNode is discriminated on kind (compile-time check)", () => {
    // If inference collapsed to `unknown`, this would fail to compile.
    const tree: ComponentNode = { kind: "Text", text: "hi" };
    if (tree.kind === "Text") {
      // `text` must be accessible on this narrowed branch.
      expect(tree.text).toBe("hi");
    }
  });
});
