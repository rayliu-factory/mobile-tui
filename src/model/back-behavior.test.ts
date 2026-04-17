import { describe, expect, it } from "vitest";
import { BackBehaviorSchema } from "./back-behavior.ts";
import { SCHEMA_VERSION } from "./version.ts";

describe("SCHEMA_VERSION constant", () => {
  it('is the literal string "mobile-tui/1"', () => {
    expect(SCHEMA_VERSION).toBe("mobile-tui/1");
  });
});

describe("BackBehaviorSchema", () => {
  it.each(["pop", "dismiss", "reset-to-root"])('accepts literal "%s"', (s) => {
    expect(BackBehaviorSchema.safeParse(s).success).toBe(true);
  });

  it("accepts { kind: replace, screen: <snake_case> }", () => {
    expect(
      BackBehaviorSchema.safeParse({
        kind: "replace",
        screen: "home",
      }).success,
    ).toBe(true);
  });

  it("rejects unknown string literal", () => {
    expect(BackBehaviorSchema.safeParse("back").success).toBe(false);
  });

  it("rejects replace with PascalCase screen (violates ScreenId snake_case)", () => {
    expect(
      BackBehaviorSchema.safeParse({
        kind: "replace",
        screen: "Home",
      }).success,
    ).toBe(false);
  });

  it("rejects replace missing screen field", () => {
    expect(BackBehaviorSchema.safeParse({ kind: "replace" }).success).toBe(false);
  });

  it("rejects replace with unknown kind value", () => {
    expect(
      BackBehaviorSchema.safeParse({
        kind: "unknown",
        screen: "home",
      }).success,
    ).toBe(false);
  });

  it("rejects extra keys on replace object (strict)", () => {
    expect(
      BackBehaviorSchema.safeParse({
        kind: "replace",
        screen: "home",
        extra: "nope",
      }).success,
    ).toBe(false);
  });
});
