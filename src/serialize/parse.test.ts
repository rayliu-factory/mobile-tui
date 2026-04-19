// src/serialize/parse.test.ts
// Unit coverage for the real parseSpecFile orchestrator (Plan 02-05 Task 2).
//
// Covers: canonical fixtures, unknown-top-key pass-through (D-26),
// prototype-pollution Layer-2 defense (__proto__ error diagnostic),
// .tmp-path rejection (Open Q#4), BLOCKER fix #2 (hasFrontmatter signal,
// not isEmpty), orphan-tmp detection (D-30).
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parseSpecFile } from "./parse.ts";

const TMP_DIR = resolve(process.cwd(), "tests", "tmp");
let sandbox = "";

beforeEach(async () => {
  await fs.mkdir(TMP_DIR, { recursive: true });
  sandbox = join(TMP_DIR, randomUUID());
  await fs.mkdir(sandbox, { recursive: true });
});

afterEach(async () => {
  await fs.rm(sandbox, { recursive: true, force: true }).catch(() => undefined);
});

describe("parseSpecFile — canonical fixtures", () => {
  it("parses habit-tracker.spec.md with zero errors", async () => {
    const { spec, astHandle, diagnostics, body } = await parseSpecFile(
      resolve("fixtures/habit-tracker.spec.md"),
    );
    expect(spec).not.toBeNull();
    expect(astHandle).not.toBeNull();
    expect(diagnostics.filter((d) => d.severity === "error")).toEqual([]);
    expect(body).toMatch(/# habit-tracker/);
  });

  it("parses todo.spec.md with zero errors", async () => {
    const { spec, diagnostics } = await parseSpecFile(resolve("fixtures/todo.spec.md"));
    expect(spec).not.toBeNull();
    expect(diagnostics.filter((d) => d.severity === "error")).toEqual([]);
  });

  it("parses social-feed.spec.md with zero errors", async () => {
    const { spec, diagnostics } = await parseSpecFile(resolve("fixtures/social-feed.spec.md"));
    expect(spec).not.toBeNull();
    expect(diagnostics.filter((d) => d.severity === "error")).toEqual([]);
  });
});

describe("parseSpecFile — unknown-key round-trip (D-26)", () => {
  it("theme: dark survives parse + does NOT emit SPEC_UNKNOWN_TOP_LEVEL_KEY", async () => {
    const { spec, astHandle, diagnostics } = await parseSpecFile(
      resolve("fixtures/round-trip/unknown-top-key-theme.spec.md"),
    );
    expect(spec).not.toBeNull();
    // biome-ignore lint/style/noNonNullAssertion: asserted non-null above
    expect(astHandle!.doc.has("theme")).toBe(true);
    // biome-ignore lint/style/noNonNullAssertion: asserted non-null above
    expect(astHandle!.doc.get("theme")).toBe("dark");
    const errors = diagnostics.filter((d) => d.severity === "error");
    expect(errors).toEqual([]);
  });
});

describe("parseSpecFile — prototype-pollution defense (Layer 2)", () => {
  it("emits SPEC_UNKNOWN_TOP_LEVEL_KEY error for __proto__", async () => {
    const { diagnostics } = await parseSpecFile(
      resolve("fixtures/round-trip/prototype-pollution-attempt.spec.md"),
    );
    const errors = diagnostics.filter(
      (d) => d.code === "SPEC_UNKNOWN_TOP_LEVEL_KEY" && d.severity === "error",
    );
    expect(errors.length).toBeGreaterThan(0);
    // biome-ignore lint/style/noNonNullAssertion: length asserted > 0 above
    expect(errors[0]!.path).toBe("/__proto__");
  });
});

describe("parseSpecFile — authoring-error rejections", () => {
  it("throws on .tmp-suffixed path (Open Q#4)", async () => {
    await expect(parseSpecFile("foo.spec.md.tmp")).rejects.toThrow(/refusing to parse temp file/);
  });

  it("BLOCKER fix #2: emits SERDE_MISSING_DELIMITER on file without frontmatter", async () => {
    const p = join(sandbox, "no-frontmatter.spec.md");
    await fs.writeFile(p, "hello world\n", "utf8");
    const { spec, diagnostics } = await parseSpecFile(p);
    expect(spec).toBeNull();
    expect(
      diagnostics.some((d) => d.code === "SERDE_MISSING_DELIMITER" && d.severity === "error"),
    ).toBe(true);
  });

  it("BLOCKER fix #2: does NOT emit SERDE_MISSING_DELIMITER for empty-map frontmatter (---\\n---\\n\\nbody\\n)", async () => {
    const p = join(sandbox, "empty-map.spec.md");
    await fs.writeFile(p, "---\n---\n\nbody\n", "utf8");
    const { diagnostics } = await parseSpecFile(p);
    // hasFrontmatter=true + isEmpty=true: the map is empty, but delimiters
    // are present. validateSpec will emit Stage-A errors, but
    // SERDE_MISSING_DELIMITER must NOT appear.
    expect(diagnostics.some((d) => d.code === "SERDE_MISSING_DELIMITER")).toBe(false);
  });
});

describe("parseSpecFile — orphan .tmp detection (D-30)", () => {
  it("surfaces SPEC_ORPHAN_TEMP_FILE info when orphan present", async () => {
    // Copy habit-tracker.spec.md into sandbox; author an orphan .tmp.
    const rawHabit = await fs.readFile(resolve("fixtures/habit-tracker.spec.md"), "utf8");
    const target = join(sandbox, "habit-tracker.spec.md");
    await fs.writeFile(target, rawHabit, "utf8");
    await fs.writeFile(join(sandbox, ".habit-tracker.spec.md.tmp"), "orphan", "utf8");

    const { diagnostics } = await parseSpecFile(target);
    expect(
      diagnostics.some((d) => d.code === "SPEC_ORPHAN_TEMP_FILE" && d.severity === "info"),
    ).toBe(true);
  });
});

describe("parseSpecFile — migration pipeline (SERDE-08)", () => {
  it("Test 1: spec with schema: mobile-tui/0 does NOT throw and returns SPEC_SCHEMA_VERSION diagnostic", async () => {
    // Write a spec with a v0 schema — no migration path exists for v0→v1.
    // After the fix, parseSpecFile must NOT throw and must emit
    // a SPEC_SCHEMA_VERSION diagnostic via the catch block.
    const rawHabit = await fs.readFile(resolve("fixtures/habit-tracker.spec.md"), "utf8");
    // Replace the schema field to use version 0
    const v0Spec = rawHabit.replace(/^schema: mobile-tui\/\d+/m, "schema: mobile-tui/0");
    const target = join(sandbox, "v0.spec.md");
    await fs.writeFile(target, v0Spec, "utf8");

    // Must not throw
    const { diagnostics } = await parseSpecFile(target);
    expect(
      diagnostics.some((d) => d.code === "SPEC_SCHEMA_VERSION"),
    ).toBe(true);
  });

  it("Test 2: spec with schema: mobile-tui/1 (current version) passes through as no-op — existing tests still pass", async () => {
    // v1 spec: runMigrations(spec, "1", "1") is a no-op.
    // The parse result should be identical to parsing without migration.
    const { spec, diagnostics } = await parseSpecFile(resolve("fixtures/habit-tracker.spec.md"));
    expect(spec).not.toBeNull();
    expect(diagnostics.filter((d) => d.severity === "error")).toEqual([]);
    // No SPEC_SCHEMA_VERSION diagnostic for current version specs
    expect(diagnostics.some((d) => d.code === "SPEC_SCHEMA_VERSION")).toBe(false);
  });

  it("Test 3: spec with no schema field skips migration and lets validateSpec handle it", async () => {
    // A spec without a schema field entirely — the migration block should be skipped.
    // validateSpec will emit its own diagnostic about the missing schema.
    const rawHabit = await fs.readFile(resolve("fixtures/habit-tracker.spec.md"), "utf8");
    // Remove the schema line entirely
    const noSchemaSpec = rawHabit.replace(/^schema: mobile-tui\/\d+\n/m, "");
    const target = join(sandbox, "no-schema.spec.md");
    await fs.writeFile(target, noSchemaSpec, "utf8");

    // Should not throw, migration block is skipped
    const { diagnostics } = await parseSpecFile(target);
    // No SPEC_SCHEMA_VERSION from the migration block (only from validateSpec if at all)
    // The key check: we didn't crash, and SPEC_SCHEMA_VERSION came from validateSpec only
    // (migration block skips when schema field is absent)
    expect(diagnostics.some((d) => d.code === "SPEC_SCHEMA_VERSION")).toBe(false);
  });
});
