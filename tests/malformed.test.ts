// tests/malformed.test.ts
// Asserts the malformed fixture produces every Stage-B cross-reference
// diagnostic code in one validateSpec() call, plus programmatic mutations
// that trigger Stage-A (Zod structural) codes. Snapshot-guards the full
// diagnostic array for regression protection.
//
// MIGRATED (Plan 02-01): parseSpecFile from src/serialize/index.ts
// replaces readFixture. Stage-A clone mutations now run validateSpec
// directly on the already-validated Spec object returned by
// parseSpecFile (we use `spec!` since the malformed fixture is
// Stage-A-valid and parseSpecFile returns a non-null Spec).
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { validateSpec } from "../src/index.ts";
import { parseSpecFile } from "../src/serialize/index.ts";

describe("malformed fixture — cross-ref diagnostics (Stage B)", () => {
  const CROSSREF_CODES = [
    "SPEC_DUPLICATE_SCREEN_ID",
    "SPEC_DUPLICATE_ENTITY_NAME",
    "SPEC_UNRESOLVED_SCREEN",
    "SPEC_UNRESOLVED_ACTION",
    "SPEC_JSONPTR_UNRESOLVED",
    "SPEC_TESTID_COLLISION",
    "SPEC_MISSING_BACK_BEHAVIOR",
    "SPEC_ACTION_TYPE_MISMATCH",
  ] as const;

  it.each(CROSSREF_CODES)("emits %s", async (code) => {
    const { diagnostics } = await parseSpecFile(resolve("fixtures/malformed.spec.md"));
    expect(diagnostics.some((d) => d.code === code)).toBe(true);
  });

  it("never throws on the malformed fixture", async () => {
    await expect(parseSpecFile(resolve("fixtures/malformed.spec.md"))).resolves.toBeDefined();
  });

  it("snapshots the full Diagnostic[] for regression protection", async () => {
    const { diagnostics } = await parseSpecFile(resolve("fixtures/malformed.spec.md"));
    // Sort for stability across insertion-order changes in the cross-ref walker.
    const sorted = [...diagnostics].sort((a, b) =>
      a.code !== b.code ? a.code.localeCompare(b.code) : a.path.localeCompare(b.path),
    );
    expect(sorted).toMatchSnapshot();
  });

  it("every diagnostic path is RFC-6901-shaped", async () => {
    const { diagnostics } = await parseSpecFile(resolve("fixtures/malformed.spec.md"));
    for (const d of diagnostics) {
      expect(d.path === "" || d.path.startsWith("/")).toBe(true);
    }
  });
});

describe("Stage-A diagnostics — triggered by programmatic mutation", () => {
  // These can't coexist with Stage B errors in one fixture because Stage A
  // failure short-circuits Stage B. Test them via targeted clones of a
  // Stage-A-valid fixture (habit-tracker) then re-validate.

  it("emits SPEC_UNKNOWN_COMPONENT when tree has an unknown kind", async () => {
    const { spec } = await parseSpecFile(resolve("fixtures/habit-tracker.spec.md"));
    expect(spec).not.toBeNull();
    const clone = JSON.parse(JSON.stringify(spec)) as {
      screens: Array<{ variants: { content: { tree: unknown } } }>;
    };
    const firstScreen = clone.screens[0];
    if (!firstScreen) throw new Error("fixture missing screens[0]");
    firstScreen.variants.content.tree = [{ kind: "FooBar" }];
    const { diagnostics } = validateSpec(clone);
    expect(diagnostics.some((d) => d.code === "SPEC_UNKNOWN_COMPONENT")).toBe(true);
  });

  it("emits a structural error (SPEC_VARIANT_OMITTED equivalent) when ScreenVariants omits a key", async () => {
    const { spec } = await parseSpecFile(resolve("fixtures/habit-tracker.spec.md"));
    expect(spec).not.toBeNull();
    const clone = JSON.parse(JSON.stringify(spec)) as {
      screens: Array<{ variants: Record<string, unknown> }>;
    };
    const firstScreen = clone.screens[0];
    if (!firstScreen) throw new Error("fixture missing screens[0]");
    // Simulate key omission by stripping the loading variant.
    const variantsWithoutLoading: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(firstScreen.variants)) {
      if (k !== "loading") variantsWithoutLoading[k] = v;
    }
    firstScreen.variants = variantsWithoutLoading;
    const { spec: out, diagnostics } = validateSpec(clone);
    expect(out).toBeNull();
    // Zod emits invalid_type (missing key) → we map to SPEC_INVALID_TYPE (or
    // related structural code). What we guarantee: validateSpec returns null
    // + at least one error at a path that includes /variants.
    expect(diagnostics.some((d) => d.path.includes("/variants"))).toBe(true);
  });
});

describe("Never-throws — hostile inputs don't crash validateSpec", () => {
  it.each([null, undefined, 42, [], {}])("input %p", (input) => {
    expect(() => validateSpec(input)).not.toThrow();
  });
});
