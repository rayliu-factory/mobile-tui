// tests/fixtures.test.ts
// Success criterion #1: the three canonical fixtures pass validateSpec()
// with zero error-severity diagnostics. Also asserts the D-14 structural
// shape (3 screens + 2 entities + 5+ interactions per fixture).
//
// MIGRATED (Plan 02-01): parseSpecFile from src/serialize/index.ts
// replaces the Phase-1 readFixture helper. The WAVE-0 stub in
// src/serialize/parse.ts still reads the .spec.json sibling under the
// hood — Plan 02-02 swaps it for the real gray-matter + eemeli/yaml
// parser and Plan 02-05 deletes the siblings.
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseSpecFile } from "../src/serialize/index.ts";

const CANONICAL = ["habit-tracker", "todo", "social-feed"] as const;

describe("canonical fixtures validate with zero error diagnostics (success criterion #1)", () => {
  it.each(CANONICAL)("%s.spec.md — zero errors", async (name) => {
    const { spec, diagnostics } = await parseSpecFile(resolve(`fixtures/${name}.spec.md`));
    const errors = diagnostics.filter((d) => d.severity === "error");
    if (errors.length > 0) {
      // Surface the unexpected diagnostics so a failing run is self-diagnosing.
      console.error(`[${name}] unexpected errors:`, JSON.stringify(errors, null, 2));
    }
    expect(errors).toEqual([]);
    expect(spec).not.toBeNull();
  });

  it.each(
    CANONICAL,
  )("%s has 3 screens + 2 entities + >=5 interactions (D-14 shape)", async (name) => {
    const { spec } = await parseSpecFile(resolve(`fixtures/${name}.spec.md`));
    expect(spec).not.toBeNull();
    // biome-ignore lint/style/noNonNullAssertion: asserted non-null above
    expect(spec!.screens.length).toBe(3);
    // biome-ignore lint/style/noNonNullAssertion: asserted non-null above
    expect(spec!.data.entities.length).toBe(2);
    // biome-ignore lint/style/noNonNullAssertion: asserted non-null above
    expect(Object.keys(spec!.actions).length).toBeGreaterThanOrEqual(5);
  });
});
