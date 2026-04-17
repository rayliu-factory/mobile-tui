// Tests for Stage B of validateSpec: the cross-reference pass.
//
// `crossReferencePass(spec)` operates on a TYPED Spec (SpecSchema already
// succeeded). It emits Diagnostic[] for:
//   - SPEC_MISSING_BACK_BEHAVIOR   (non-root screen missing back_behavior)
//   - SPEC_UNRESOLVED_ACTION       (action id / navigate.screen / submit.entity
//                                   / present.overlay / nav edge from/to/trigger
//                                   references to undeclared ids)
//   - SPEC_ACTION_TYPE_MISMATCH    (present.overlay names a kind: 'regular' screen)
//   - SPEC_TESTID_COLLISION        (duplicate testID anywhere in tree — Pitfall #3)
//   - SPEC_JSONPTR_UNRESOLVED      (mutate.target / when.{collection|async|field_error}
//                                   first two tokens don't match /Entity/field_name —
//                                   Pitfall #4)
//
// Tests use SpecSchema.parse() to produce typed data first, then pass it to
// crossReferencePass. Malformed-shape cases are covered by Stage A tests.
import { describe, expect, it } from "vitest";
import { crossReferencePass, walkComponentTree } from "./cross-reference.ts";
import { SpecSchema } from "./spec.ts";
import { SCHEMA_VERSION } from "./version.ts";

// Builds a minimal-but-richer spec with two screens and one action — happy-path baseline.
function buildSpec(): Record<string, unknown> {
  return {
    schema: SCHEMA_VERSION,
    screens: [
      {
        id: "home",
        title: "Home",
        kind: "regular",
        variants: {
          content: { kind: "content", tree: [] },
          empty: null,
          loading: null,
          error: null,
        },
      },
      {
        id: "detail",
        title: "Detail",
        kind: "regular",
        back_behavior: "pop",
        variants: {
          content: { kind: "content", tree: [] },
          empty: null,
          loading: null,
          error: null,
        },
      },
    ],
    actions: {
      open_detail: { kind: "navigate", screen: "detail" },
    },
    data: {
      entities: [
        {
          name: "Habit",
          fields: [
            { name: "title", type: "string" },
            { name: "done", type: "boolean" },
          ],
        },
      ],
    },
    navigation: {
      root: "home",
      edges: [{ from: "home", to: "detail", trigger: "open_detail" }],
    },
  };
}

function parse(spec: unknown) {
  return SpecSchema.parse(spec);
}

describe("crossReferencePass — happy path", () => {
  it("returns zero diagnostics for a fully-resolved spec", () => {
    expect(crossReferencePass(parse(buildSpec()))).toEqual([]);
  });

  it("returns zero diagnostics when all variant keys are null (only content populated)", () => {
    const diags = crossReferencePass(parse(buildSpec()));
    expect(diags.filter((d) => d.code === "SPEC_JSONPTR_UNRESOLVED")).toEqual([]);
  });
});

describe("SPEC_MISSING_BACK_BEHAVIOR", () => {
  it("root screen without back_behavior is OK (root exemption)", () => {
    const spec = buildSpec();
    // Root (screens[0]) doesn't declare back_behavior by default in buildSpec().
    const diags = crossReferencePass(parse(spec));
    expect(diags.filter((d) => d.code === "SPEC_MISSING_BACK_BEHAVIOR")).toEqual([]);
  });

  it("non-root screen missing back_behavior emits diagnostic at correct path", () => {
    const spec = buildSpec();
    const screens = spec.screens as Array<Record<string, unknown>>;
    delete screens[1]?.back_behavior;
    const diags = crossReferencePass(parse(spec));
    const missing = diags.filter((d) => d.code === "SPEC_MISSING_BACK_BEHAVIOR");
    expect(missing.length).toBe(1);
    expect(missing[0]?.path).toBe("/screens/1/back_behavior");
    expect(missing[0]?.severity).toBe("error");
  });
});

describe("SPEC_UNRESOLVED_ACTION — action intent cross-refs (D-13)", () => {
  it("navigate.screen pointing to unknown screen", () => {
    const spec = buildSpec();
    const actions = spec.actions as Record<string, Record<string, unknown>>;
    if (actions.open_detail) actions.open_detail.screen = "ghost";
    const diags = crossReferencePass(parse(spec));
    expect(
      diags.some((d) => d.code === "SPEC_UNRESOLVED_ACTION" && d.path.includes("/screen")),
    ).toBe(true);
  });

  it("submit.entity pointing to unknown entity", () => {
    const spec = buildSpec();
    const actions = spec.actions as Record<string, Record<string, unknown>>;
    actions.save_habit = { kind: "submit", entity: "GhostEntity" };
    const diags = crossReferencePass(parse(spec));
    expect(
      diags.some((d) => d.code === "SPEC_UNRESOLVED_ACTION" && d.path.includes("/entity")),
    ).toBe(true);
  });

  it("present.overlay pointing to unknown screen", () => {
    const spec = buildSpec();
    const actions = spec.actions as Record<string, Record<string, unknown>>;
    actions.open_modal = { kind: "present", overlay: "ghost_modal" };
    const diags = crossReferencePass(parse(spec));
    expect(
      diags.some((d) => d.code === "SPEC_UNRESOLVED_ACTION" && d.path.includes("/overlay")),
    ).toBe(true);
  });

  it("component Button.action ref not in actions registry", () => {
    const spec = buildSpec();
    const screens = spec.screens as Array<Record<string, unknown>>;
    const s0 = screens[0] as Record<string, unknown>;
    (s0.variants as Record<string, unknown>).content = {
      kind: "content",
      tree: [{ kind: "Button", label: "X", action: "ghost_action", testID: "x_btn" }],
    };
    const diags = crossReferencePass(parse(spec));
    expect(
      diags.some((d) => d.code === "SPEC_UNRESOLVED_ACTION" && d.message.includes("ghost_action")),
    ).toBe(true);
  });
});

describe("SPEC_ACTION_TYPE_MISMATCH — present.overlay requires kind='overlay'", () => {
  it("present.overlay pointing to a kind='regular' screen → mismatch", () => {
    const spec = buildSpec();
    const actions = spec.actions as Record<string, Record<string, unknown>>;
    actions.open_home = { kind: "present", overlay: "home" };
    const diags = crossReferencePass(parse(spec));
    expect(diags.some((d) => d.code === "SPEC_ACTION_TYPE_MISMATCH")).toBe(true);
  });

  it("present.overlay pointing to a kind='overlay' screen → OK", () => {
    const spec = buildSpec();
    const screens = spec.screens as Array<Record<string, unknown>>;
    screens.push({
      id: "detail_modal",
      title: "Modal",
      kind: "overlay",
      back_behavior: "dismiss",
      variants: {
        content: { kind: "content", tree: [] },
        empty: null,
        loading: null,
        error: null,
      },
    });
    const actions = spec.actions as Record<string, Record<string, unknown>>;
    actions.open_modal = { kind: "present", overlay: "detail_modal" };
    const diags = crossReferencePass(parse(spec));
    expect(diags.filter((d) => d.code === "SPEC_ACTION_TYPE_MISMATCH")).toEqual([]);
  });
});

describe("SPEC_TESTID_COLLISION — global uniqueness at ANY depth (Pitfall #3)", () => {
  it("two components with same testID nested in Column > Card > Column emit collision", () => {
    const spec = buildSpec();
    const actions = spec.actions as Record<string, Record<string, unknown>>;
    actions.act = { kind: "dismiss" };
    const screens = spec.screens as Array<Record<string, unknown>>;
    const s0 = screens[0] as Record<string, unknown>;
    (s0.variants as Record<string, unknown>).content = {
      kind: "content",
      tree: [
        {
          kind: "Column",
          children: [
            { kind: "Button", label: "A", action: "act", testID: "same_id" },
            {
              kind: "Card",
              child: {
                kind: "Column",
                children: [{ kind: "Button", label: "B", action: "act", testID: "same_id" }],
              },
            },
          ],
        },
      ],
    };
    const diags = crossReferencePass(parse(spec));
    const collisions = diags.filter((d) => d.code === "SPEC_TESTID_COLLISION");
    expect(collisions.length).toBeGreaterThanOrEqual(1);
    expect(collisions[0]?.message).toContain("same_id");
  });

  it("same testID across two different screens still collides (global, not per-screen)", () => {
    const spec = buildSpec();
    const actions = spec.actions as Record<string, Record<string, unknown>>;
    actions.act = { kind: "dismiss" };
    const screens = spec.screens as Array<Record<string, unknown>>;
    const s0 = screens[0] as Record<string, unknown>;
    const s1 = screens[1] as Record<string, unknown>;
    (s0.variants as Record<string, unknown>).content = {
      kind: "content",
      tree: [{ kind: "Button", label: "A", action: "act", testID: "shared_btn" }],
    };
    (s1.variants as Record<string, unknown>).content = {
      kind: "content",
      tree: [{ kind: "Button", label: "B", action: "act", testID: "shared_btn" }],
    };
    const diags = crossReferencePass(parse(spec));
    expect(diags.some((d) => d.code === "SPEC_TESTID_COLLISION")).toBe(true);
  });

  it("no collision when all testIDs distinct", () => {
    const spec = buildSpec();
    const actions = spec.actions as Record<string, Record<string, unknown>>;
    actions.act = { kind: "dismiss" };
    const screens = spec.screens as Array<Record<string, unknown>>;
    const s0 = screens[0] as Record<string, unknown>;
    (s0.variants as Record<string, unknown>).content = {
      kind: "content",
      tree: [
        { kind: "Button", label: "A", action: "act", testID: "btn_one" },
        { kind: "Button", label: "B", action: "act", testID: "btn_two" },
      ],
    };
    const diags = crossReferencePass(parse(spec));
    expect(diags.filter((d) => d.code === "SPEC_TESTID_COLLISION")).toEqual([]);
  });
});

describe("SPEC_JSONPTR_UNRESOLVED — entity/field namespace (Pitfall #4)", () => {
  it("mutate.target points to unknown entity", () => {
    const spec = buildSpec();
    const actions = spec.actions as Record<string, Record<string, unknown>>;
    actions.toggle = { kind: "mutate", target: "/Ghost/x", op: "toggle" };
    const diags = crossReferencePass(parse(spec));
    expect(diags.some((d) => d.code === "SPEC_JSONPTR_UNRESOLVED")).toBe(true);
  });

  it("mutate.target points to unknown field of known entity", () => {
    const spec = buildSpec();
    const actions = spec.actions as Record<string, Record<string, unknown>>;
    actions.toggle = { kind: "mutate", target: "/Habit/ghost_field", op: "toggle" };
    const diags = crossReferencePass(parse(spec));
    expect(diags.some((d) => d.code === "SPEC_JSONPTR_UNRESOLVED")).toBe(true);
  });

  it("mutate.target with deeper path past known prefix is OK (Pitfall #4 — prefix-only)", () => {
    const spec = buildSpec();
    const actions = spec.actions as Record<string, Record<string, unknown>>;
    actions.set_title = {
      kind: "mutate",
      target: "/Habit/title/nested",
      op: "set",
      value: "x",
    };
    const diags = crossReferencePass(parse(spec));
    expect(diags.filter((d) => d.code === "SPEC_JSONPTR_UNRESOLVED")).toEqual([]);
  });

  it("when.collection path unresolved emits diagnostic at correct path", () => {
    const spec = buildSpec();
    const screens = spec.screens as Array<Record<string, unknown>>;
    const s0 = screens[0] as Record<string, unknown>;
    (s0.variants as Record<string, unknown>).empty = {
      kind: "empty",
      when: { collection: "/Ghost/x" },
      tree: [],
    };
    const diags = crossReferencePass(parse(spec));
    expect(
      diags.some(
        (d) => d.code === "SPEC_JSONPTR_UNRESOLVED" && d.path.includes("/empty/when/collection"),
      ),
    ).toBe(true);
  });

  it("when.async path unresolved emits diagnostic", () => {
    const spec = buildSpec();
    const screens = spec.screens as Array<Record<string, unknown>>;
    const s0 = screens[0] as Record<string, unknown>;
    (s0.variants as Record<string, unknown>).loading = {
      kind: "loading",
      when: { async: "/Ghost/y" },
      tree: [],
    };
    const diags = crossReferencePass(parse(spec));
    expect(
      diags.some(
        (d) => d.code === "SPEC_JSONPTR_UNRESOLVED" && d.path.includes("/loading/when/async"),
      ),
    ).toBe(true);
  });
});

describe("navigation cross-refs", () => {
  it("unknown navigation.root emits diagnostic at /navigation/root", () => {
    const spec = buildSpec();
    (spec.navigation as Record<string, unknown>).root = "ghost";
    const diags = crossReferencePass(parse(spec));
    expect(diags.some((d) => d.path === "/navigation/root")).toBe(true);
  });

  it("nav edge.from pointing to unknown screen", () => {
    const spec = buildSpec();
    const nav = spec.navigation as Record<string, unknown>;
    (nav.edges as Array<Record<string, unknown>>)[0] = {
      from: "ghost",
      to: "detail",
      trigger: "open_detail",
    };
    const diags = crossReferencePass(parse(spec));
    expect(
      diags.some(
        (d) => d.code === "SPEC_UNRESOLVED_ACTION" && d.path === "/navigation/edges/0/from",
      ),
    ).toBe(true);
  });

  it("nav edge.to pointing to unknown screen", () => {
    const spec = buildSpec();
    const nav = spec.navigation as Record<string, unknown>;
    (nav.edges as Array<Record<string, unknown>>)[0] = {
      from: "home",
      to: "ghost",
      trigger: "open_detail",
    };
    const diags = crossReferencePass(parse(spec));
    expect(
      diags.some((d) => d.code === "SPEC_UNRESOLVED_ACTION" && d.path === "/navigation/edges/0/to"),
    ).toBe(true);
  });

  it("nav edge.trigger not in actions registry", () => {
    const spec = buildSpec();
    const nav = spec.navigation as Record<string, unknown>;
    (nav.edges as Array<Record<string, unknown>>)[0] = {
      from: "home",
      to: "detail",
      trigger: "ghost_trigger",
    };
    const diags = crossReferencePass(parse(spec));
    expect(
      diags.some(
        (d) => d.code === "SPEC_UNRESOLVED_ACTION" && d.path === "/navigation/edges/0/trigger",
      ),
    ).toBe(true);
  });
});

describe("walkComponentTree — recursion depth", () => {
  it("reaches List → Card → Column → Button (depth ≥3) for testID collection", () => {
    // Build a standalone tree and verify walkComponentTree flags collisions deep down.
    const testIDRegistry = new Map<string, string>();
    const diagnostics: Array<{ code: string; path: string; message: string }> = [];
    const ctx = {
      declaredActions: new Set<string>(["act"]),
      testIDRegistry,
      diagnostics: diagnostics as never,
    };
    // Tree: List[Card{Column[Button(deep_btn)]}]  + top-level Button(deep_btn) → collision.
    const tree = [
      {
        kind: "List" as const,
        bindsTo: "/Habit/title",
        itemTemplate: {
          kind: "Card" as const,
          child: {
            kind: "Column" as const,
            children: [
              {
                kind: "Button" as const,
                label: "Deep",
                action: "act",
                testID: "deep_btn",
              },
            ],
          },
        },
      },
      { kind: "Button" as const, label: "Top", action: "act", testID: "deep_btn" },
    ];
    // biome-ignore lint/suspicious/noExplicitAny: walker types accept ComponentNode array
    walkComponentTree(tree as any, ["screens", 0, "variants", "content", "tree"], ctx);
    expect(diagnostics.some((d: { code: string }) => d.code === "SPEC_TESTID_COLLISION")).toBe(
      true,
    );
  });
});

describe("diagnostic paths are valid JSON Pointers", () => {
  it("every emitted path starts with / or is empty", () => {
    const spec = buildSpec();
    // Create several different diagnostic paths.
    (spec.navigation as Record<string, unknown>).root = "ghost";
    const actions = spec.actions as Record<string, Record<string, unknown>>;
    actions.bad_mutate = { kind: "mutate", target: "/Ghost/x", op: "toggle" };
    const diags = crossReferencePass(parse(spec));
    expect(diags.length).toBeGreaterThan(0);
    for (const d of diags) {
      expect(d.path === "" || d.path.startsWith("/")).toBe(true);
    }
  });
});
