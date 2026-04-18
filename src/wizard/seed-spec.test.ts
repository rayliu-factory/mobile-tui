// Tests for createSeedSpec factory (Phase-6, Plan 01).
// Verifies that the seed spec passes SpecSchema.safeParse.
//
// RED phase: these tests fail until seed-spec.ts is created.
import { describe, expect, it } from "vitest";
import { SpecSchema } from "../model/spec.ts";
import { createSeedSpec } from "./seed-spec.ts";

describe("createSeedSpec", () => {
  it("returns a spec that passes SpecSchema.safeParse", () => {
    const seed = createSeedSpec();
    const result = SpecSchema.safeParse(seed);
    expect(result.success).toBe(true);
  });

  it("has a placeholder screen with id 'placeholder'", () => {
    const seed = createSeedSpec();
    expect(seed.screens).toHaveLength(1);
    expect(seed.screens[0]?.id).toBe("placeholder");
  });

  it("has empty entities array (wizard relaxed .min(0))", () => {
    const seed = createSeedSpec();
    expect(seed.data.entities).toHaveLength(0);
  });

  it("navigation root points to placeholder screen", () => {
    const seed = createSeedSpec();
    expect(seed.navigation.root).toBe("placeholder");
  });

  it("has correct schema version", () => {
    const seed = createSeedSpec();
    expect(seed.schema).toBe("mobile-tui/1");
  });

  it("produces distinct objects on each call (no shared reference)", () => {
    const seed1 = createSeedSpec();
    const seed2 = createSeedSpec();
    seed1.screens[0] && (seed1.screens[0].title = "Modified");
    expect(seed2.screens[0]?.title).not.toBe("Modified");
  });
});
