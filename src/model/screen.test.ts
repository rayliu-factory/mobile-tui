import { describe, expect, it } from "vitest";
import { ScreenSchema } from "./screen.ts";

// Reusable minimal ScreenVariants literal. Plan 03's factory + Plan 04's
// ComponentNodeSchema converge here: `variants.content.tree` is typed as
// ComponentNode[] (via Plan 05's factory wiring), but structurally the empty
// tree is always valid.
const emptyVariants = {
  content: { kind: "content", tree: [] as unknown[] },
  empty: null,
  loading: null,
  error: null,
};

describe("ScreenSchema", () => {
  it("accepts minimal regular screen without back_behavior (root case)", () => {
    expect(
      ScreenSchema.safeParse({
        id: "home",
        title: "Home",
        kind: "regular",
        variants: emptyVariants,
      }).success,
    ).toBe(true);
  });

  it("accepts overlay screen (kind: overlay resolves RESEARCH Open Q#3)", () => {
    expect(
      ScreenSchema.safeParse({
        id: "detail_modal",
        title: "Detail",
        kind: "overlay",
        variants: emptyVariants,
      }).success,
    ).toBe(true);
  });

  it.each(["pop", "dismiss", "reset-to-root"])('accepts back_behavior: "%s"', (b) => {
    expect(
      ScreenSchema.safeParse({
        id: "detail",
        title: "Detail",
        kind: "regular",
        back_behavior: b,
        variants: emptyVariants,
      }).success,
    ).toBe(true);
  });

  it('accepts back_behavior: { kind: "replace", screen }', () => {
    expect(
      ScreenSchema.safeParse({
        id: "detail",
        title: "Detail",
        kind: "regular",
        back_behavior: { kind: "replace", screen: "home" },
        variants: emptyVariants,
      }).success,
    ).toBe(true);
  });

  it("accepts optional acceptance: string[] (SPEC-10 prose one-liners)", () => {
    expect(
      ScreenSchema.safeParse({
        id: "home",
        title: "Home",
        kind: "regular",
        variants: emptyVariants,
        acceptance: ["User sees a list of habits", "Tapping a habit opens the detail modal"],
      }).success,
    ).toBe(true);
  });

  it("rejects empty acceptance entry (.min(1) per line)", () => {
    expect(
      ScreenSchema.safeParse({
        id: "home",
        title: "Home",
        kind: "regular",
        variants: emptyVariants,
        acceptance: ["", "ok"],
      }).success,
    ).toBe(false);
  });

  it("rejects empty title (title .min(1))", () => {
    expect(
      ScreenSchema.safeParse({
        id: "home",
        title: "",
        kind: "regular",
        variants: emptyVariants,
      }).success,
    ).toBe(false);
  });

  it("rejects PascalCase id (ScreenId is snake_case)", () => {
    expect(
      ScreenSchema.safeParse({
        id: "Home",
        title: "x",
        kind: "regular",
        variants: emptyVariants,
      }).success,
    ).toBe(false);
  });

  it('rejects unknown kind (e.g. "popup")', () => {
    expect(
      ScreenSchema.safeParse({
        id: "home",
        title: "x",
        kind: "popup",
        variants: emptyVariants,
      }).success,
    ).toBe(false);
  });

  it("rejects missing variants field", () => {
    expect(
      ScreenSchema.safeParse({
        id: "home",
        title: "x",
        kind: "regular",
      }).success,
    ).toBe(false);
  });

  it("rejects extra top-level keys (.strict on Screen root)", () => {
    expect(
      ScreenSchema.safeParse({
        id: "home",
        title: "x",
        kind: "regular",
        variants: emptyVariants,
        extra: "nope",
      }).success,
    ).toBe(false);
  });

  it("variants.content.tree uses REAL ComponentNodeSchema — nested Button validates", () => {
    const screen = {
      id: "home",
      title: "Home",
      kind: "regular",
      variants: {
        content: {
          kind: "content",
          tree: [{ kind: "Button", label: "Add", action: "add_habit", testID: "add_btn" }],
        },
        empty: null,
        loading: null,
        error: null,
      },
    };
    expect(ScreenSchema.safeParse(screen).success).toBe(true);
  });

  it("variants.content.tree rejects unknown component kind (ComponentNode closed-catalog)", () => {
    const screen = {
      id: "home",
      title: "Home",
      kind: "regular",
      variants: {
        content: {
          kind: "content",
          tree: [{ kind: "FooComponent" }],
        },
        empty: null,
        loading: null,
        error: null,
      },
    };
    expect(ScreenSchema.safeParse(screen).success).toBe(false);
  });

  it("variants.content.tree accepts a nested Column containing a Button (recursion alive)", () => {
    const screen = {
      id: "home",
      title: "Home",
      kind: "regular",
      variants: {
        content: {
          kind: "content",
          tree: [
            {
              kind: "Column",
              children: [
                { kind: "Text", text: "Welcome" },
                { kind: "Button", label: "Start", action: "start", testID: "start_btn" },
              ],
            },
          ],
        },
        empty: null,
        loading: null,
        error: null,
      },
    };
    expect(ScreenSchema.safeParse(screen).success).toBe(true);
  });
});
