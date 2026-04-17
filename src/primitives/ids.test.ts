// Tests for branded ID schemas — snake_case (screen/action/testID) and PascalCase (entity).
// Covers T-01-01 regex ReDoS sanity per plan 01-02 threat model.
import { describe, expect, it } from "vitest";
import {
  ActionIdSchema,
  EntityNameSchema,
  PASCAL_CASE,
  ScreenIdSchema,
  SNAKE_CASE,
  TestIDSchema,
} from "./ids.ts";

describe("snake_case ID schemas (screen, action, testID)", () => {
  const schemas = [
    ["ScreenIdSchema", ScreenIdSchema],
    ["ActionIdSchema", ActionIdSchema],
    ["TestIDSchema", TestIDSchema],
  ] as const;

  describe.each(schemas)("%s", (_name, schema) => {
    it("accepts lowercase alphanumeric starting with letter", () => {
      expect(schema.safeParse("home").success).toBe(true);
      expect(schema.safeParse("home_screen").success).toBe(true);
      expect(schema.safeParse("h").success).toBe(true);
      expect(schema.safeParse("a1b2_c3").success).toBe(true);
    });

    it("rejects capital letters", () => {
      expect(schema.safeParse("Home").success).toBe(false);
      expect(schema.safeParse("HOME").success).toBe(false);
    });

    it("rejects leading digit", () => {
      expect(schema.safeParse("1home").success).toBe(false);
    });

    it("rejects dashes and other punctuation", () => {
      expect(schema.safeParse("home-screen").success).toBe(false);
      expect(schema.safeParse("home.screen").success).toBe(false);
      expect(schema.safeParse("home screen").success).toBe(false);
    });

    it("rejects empty string", () => {
      expect(schema.safeParse("").success).toBe(false);
    });

    it("brands the parsed value (transform returns snake_case string typed as brand)", () => {
      const parsed = schema.parse("home");
      expect(parsed).toBe("home");
    });
  });
});

describe("EntityNameSchema (PascalCase)", () => {
  it("accepts PascalCase names", () => {
    expect(EntityNameSchema.safeParse("Habit").success).toBe(true);
    expect(EntityNameSchema.safeParse("HabitTracker").success).toBe(true);
    expect(EntityNameSchema.safeParse("Habit2").success).toBe(true);
  });
  it("rejects lowercase-first", () => {
    expect(EntityNameSchema.safeParse("habit").success).toBe(false);
  });
  it("rejects leading digit", () => {
    expect(EntityNameSchema.safeParse("2Habit").success).toBe(false);
  });
  it("rejects underscores (PascalCase has no separators)", () => {
    expect(EntityNameSchema.safeParse("Habit_Tracker").success).toBe(false);
  });
  it("rejects empty string", () => {
    expect(EntityNameSchema.safeParse("").success).toBe(false);
  });
});

describe("regex patterns are exported for downstream reuse", () => {
  it("SNAKE_CASE matches snake_case identifiers", () => {
    expect(SNAKE_CASE.test("home_screen")).toBe(true);
    expect(SNAKE_CASE.test("Home")).toBe(false);
  });
  it("PASCAL_CASE matches PascalCase identifiers", () => {
    expect(PASCAL_CASE.test("HabitTracker")).toBe(true);
    expect(PASCAL_CASE.test("habit")).toBe(false);
  });
});

describe("ReDoS sanity (threat T-01-01)", () => {
  it("SNAKE_CASE regex completes in <50ms on 100kB pathological input", () => {
    const haystack = "a".repeat(100_000);
    const start = performance.now();
    SNAKE_CASE.test(haystack);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(50);
  });
  it("PASCAL_CASE regex completes in <50ms on 100kB pathological input", () => {
    const haystack = "A".repeat(100_000);
    const start = performance.now();
    PASCAL_CASE.test(haystack);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(50);
  });
});
