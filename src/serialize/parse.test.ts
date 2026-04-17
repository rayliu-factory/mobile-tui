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
