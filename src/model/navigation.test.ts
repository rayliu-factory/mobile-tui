import { describe, expect, it } from "vitest";
import { NavEdgeSchema, NavigationGraphSchema, TRANSITIONS } from "./navigation.ts";

describe("NavEdgeSchema", () => {
  it("accepts minimal edge { from, to, trigger } without transition", () => {
    expect(
      NavEdgeSchema.safeParse({
        from: "home",
        to: "detail",
        trigger: "open_detail",
      }).success,
    ).toBe(true);
  });

  it.each(TRANSITIONS)('accepts transition: "%s"', (t) => {
    expect(
      NavEdgeSchema.safeParse({
        from: "home",
        to: "detail",
        trigger: "go",
        transition: t,
      }).success,
    ).toBe(true);
  });

  it('rejects unknown transition (e.g. "slide")', () => {
    expect(
      NavEdgeSchema.safeParse({
        from: "home",
        to: "detail",
        trigger: "go",
        transition: "slide",
      }).success,
    ).toBe(false);
  });

  it("rejects PascalCase from (ScreenId is snake_case)", () => {
    expect(
      NavEdgeSchema.safeParse({
        from: "Home",
        to: "detail",
        trigger: "go",
      }).success,
    ).toBe(false);
  });

  it("rejects PascalCase to (ScreenId is snake_case)", () => {
    expect(
      NavEdgeSchema.safeParse({
        from: "home",
        to: "Detail",
        trigger: "go",
      }).success,
    ).toBe(false);
  });

  it("rejects PascalCase trigger (ActionId is snake_case)", () => {
    expect(
      NavEdgeSchema.safeParse({
        from: "home",
        to: "detail",
        trigger: "Go",
      }).success,
    ).toBe(false);
  });

  it("rejects extra keys on edge (.strict)", () => {
    expect(
      NavEdgeSchema.safeParse({
        from: "home",
        to: "detail",
        trigger: "go",
        bonus: "x",
      }).success,
    ).toBe(false);
  });
});

describe("NavigationGraphSchema", () => {
  it("accepts { root, edges: [] }", () => {
    expect(
      NavigationGraphSchema.safeParse({
        root: "home",
        edges: [],
      }).success,
    ).toBe(true);
  });

  it("accepts populated edges", () => {
    expect(
      NavigationGraphSchema.safeParse({
        root: "home",
        edges: [
          { from: "home", to: "detail", trigger: "open", transition: "push" },
          { from: "detail", to: "home", trigger: "back", transition: "none" },
        ],
      }).success,
    ).toBe(true);
  });

  it("rejects missing root", () => {
    expect(NavigationGraphSchema.safeParse({ edges: [] }).success).toBe(false);
  });

  it("rejects missing edges", () => {
    expect(NavigationGraphSchema.safeParse({ root: "home" }).success).toBe(false);
  });

  it("rejects PascalCase root (ScreenId is snake_case)", () => {
    expect(
      NavigationGraphSchema.safeParse({
        root: "Home",
        edges: [],
      }).success,
    ).toBe(false);
  });

  it("rejects extra keys on graph (.strict)", () => {
    expect(
      NavigationGraphSchema.safeParse({
        root: "home",
        edges: [],
        extra: "nope",
      }).success,
    ).toBe(false);
  });

  it("rejects graph where one edge has a bad transition — edge error propagates", () => {
    expect(
      NavigationGraphSchema.safeParse({
        root: "home",
        edges: [
          { from: "home", to: "detail", trigger: "open", transition: "push" },
          { from: "detail", to: "home", trigger: "back", transition: "teleport" },
        ],
      }).success,
    ).toBe(false);
  });
});
