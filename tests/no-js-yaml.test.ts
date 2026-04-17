// tests/no-js-yaml.test.ts
// SERDE-02: js-yaml is BANNED at the dependency level per CLAUDE.md
// "What NOT to Use". This test fails loud if a future change re-introduces
// js-yaml — either directly or as a transitive that bubbled up.
//
// Architectural-invariant pattern: mirrors tests/catalog-coverage.test.ts —
// walks disk + package.json at test time and asserts negative space. A single
// failure here means CLAUDE.md's stack decision has been silently reversed.
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("SERDE-02: js-yaml is banned at the dependency level", () => {
  it("package.json has NO js-yaml in any dependency field", () => {
    const pkg = JSON.parse(readFileSync(resolve("package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
      optionalDependencies?: Record<string, string>;
    };
    const allDeps = {
      ...(pkg.dependencies ?? {}),
      ...(pkg.devDependencies ?? {}),
      ...(pkg.peerDependencies ?? {}),
      ...(pkg.optionalDependencies ?? {}),
    };
    if (allDeps["js-yaml"] !== undefined || allDeps["@types/js-yaml"] !== undefined) {
      console.error(
        "[no-js-yaml] js-yaml reintroduced:",
        { "js-yaml": allDeps["js-yaml"], "@types/js-yaml": allDeps["@types/js-yaml"] },
        "\nUse eemeli/yaml per CLAUDE.md §What NOT to Use.",
      );
    }
    expect(allDeps["js-yaml"]).toBeUndefined();
    expect(allDeps["@types/js-yaml"]).toBeUndefined();
  });

  it("required YAML + frontmatter deps are present at pinned majors", () => {
    const pkg = JSON.parse(readFileSync(resolve("package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
    };
    expect(pkg.dependencies?.yaml).toMatch(/^\^2\./);
    expect(pkg.dependencies?.["gray-matter"]).toMatch(/^\^4\./);
  });

  it("no source file imports from 'js-yaml'", () => {
    // Walk src/ and tests/ recursively; for every .ts file, assert content
    // does not contain `from "js-yaml"` or `from 'js-yaml'`.
    function walk(dir: string): string[] {
      const out: string[] = [];
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === "node_modules" || entry.name === "__snapshots__") continue;
          out.push(...walk(full));
        } else if (entry.name.endsWith(".ts")) {
          out.push(full);
        }
      }
      return out;
    }
    // Exclude the audit file itself: its string literals ("from 'js-yaml'"
    // in comments + describe/it titles) would false-positive against the
    // import grep. The audit's own shape is covered by code review, not grep.
    const selfPath = resolve("tests/no-js-yaml.test.ts");
    const files = [...walk(resolve("src")), ...walk(resolve("tests"))].filter(
      (f) => f !== selfPath,
    );
    const offenders = files.filter((f) => {
      const src = readFileSync(f, "utf8");
      return /from\s+["']js-yaml["']/.test(src);
    });
    if (offenders.length > 0) {
      console.error("[no-js-yaml] source imports js-yaml:", offenders);
    }
    expect(offenders).toEqual([]);
  });
});
