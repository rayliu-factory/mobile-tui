// tests/fixtures.test.ts
// Success criterion #1: the three canonical fixtures pass validateSpec()
// with zero error-severity diagnostics. Also asserts the D-14 structural
// shape (3 screens + 2 entities + 5+ interactions per fixture).
import { describe, expect, it } from "vitest";
import { validateSpec } from "../src/index.ts";
import { readFixture } from "./helpers/parse-fixture.ts";

const CANONICAL = ["habit-tracker", "todo", "social-feed"] as const;

describe("canonical fixtures validate with zero error diagnostics (success criterion #1)", () => {
  it.each(CANONICAL)("%s.spec.md — zero errors", async (name) => {
    const spec = await readFixture(`fixtures/${name}.spec.md`);
    const { spec: result, diagnostics } = validateSpec(spec);
    const errors = diagnostics.filter((d) => d.severity === "error");
    if (errors.length > 0) {
      // Surface the unexpected diagnostics so a failing run is self-diagnosing.
      console.error(`[${name}] unexpected errors:`, JSON.stringify(errors, null, 2));
    }
    expect(errors).toEqual([]);
    expect(result).not.toBeNull();
  });

  it.each(
    CANONICAL,
  )("%s has 3 screens + 2 entities + >=5 interactions (D-14 shape)", async (name) => {
    const spec = (await readFixture(`fixtures/${name}.spec.md`)) as {
      screens: unknown[];
      data: { entities: unknown[] };
      actions: Record<string, unknown>;
    };
    expect(spec.screens.length).toBe(3);
    expect(spec.data.entities.length).toBe(2);
    expect(Object.keys(spec.actions).length).toBeGreaterThanOrEqual(5);
  });
});
