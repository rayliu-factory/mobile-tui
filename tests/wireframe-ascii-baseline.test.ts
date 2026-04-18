// Tests that every fixtures/wireframes/**/*.wf.txt file contains ONLY the
// ASCII-baseline character set (WIREFRAME-02 + D-33 glyph palette at 60-col).
// Permitted bytes: | - + . space, plus printable ASCII 0x20-0x7E, plus LF (0x0A).
// UNICODE BMP box-drawing glyphs allowed ONLY in Phase-5 TUI preview, never here.
//
// Two suites live here:
//   1. Corpus suite — scans `fixtures/wireframes/**/*.wf.txt`. Empty at
//      Plan 03-08 close; Plan 03-09 populates it to 20 files.
//   2. render() suite — walks every screen across the 3 canonical fixtures
//      and asserts render() output is ASCII-baseline. Covers the renderer
//      directly, independent of corpus population order.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { allWireframeFiles } from "./helpers/wireframe-files.ts";

const ASCII_BASELINE = /^[|\-+. \x20-\x7E\n]*$/;

describe("wireframe ASCII-baseline (WIREFRAME-02)", () => {
  it("every .wf.txt file matches ^[|\\-+. \\x20-\\x7E\\n]*$", async () => {
    const files = await allWireframeFiles();
    // At Wave-0 files.length === 0; later plans grow it to 20.
    for (const f of files) {
      const content = readFileSync(f, "utf8");
      if (!ASCII_BASELINE.test(content)) {
        const bad = [...content].filter((c) => !/[|\-+. \x20-\x7E\n]/.test(c));
        console.error(`[${f}] non-ASCII-baseline chars:`, JSON.stringify(bad));
        throw new Error(`non-ASCII-baseline chars in ${f}`);
      }
    }
    // Sanity assertion so the test isn't a no-op on empty globs.
    expect(Array.isArray(files)).toBe(true);
  });
});

describe("wireframe ASCII-baseline via render() — all fixtures", () => {
  const CANONICAL = ["habit-tracker", "todo", "social-feed"] as const;

  it.each(CANONICAL)("every screen in %s renders ASCII-baseline-compliant", async (name) => {
    const { parseSpecFile } = await import("../src/serialize/index.ts");
    const { render } = await import("../src/emit/wireframe/index.ts");
    const r = await parseSpecFile(`fixtures/${name}.spec.md`);
    if (!r.spec) throw new Error(`${name} failed parse`);
    for (const screen of r.spec.screens) {
      const out = render(r.spec, screen.id);
      if (!ASCII_BASELINE.test(out)) {
        const bad = [...out].filter((c) => !/[|\-+. \x20-\x7E\n]/.test(c));
        throw new Error(`[${name}/${screen.id}] non-ASCII: ${JSON.stringify(bad)}`);
      }
    }
  });
});
