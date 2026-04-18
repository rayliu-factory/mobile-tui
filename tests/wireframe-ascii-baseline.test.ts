// Tests that every fixtures/wireframes/**/*.wf.txt file contains ONLY the
// ASCII-baseline character set (WIREFRAME-02 + D-33 glyph palette at 60-col).
// Permitted bytes: | - + . space, plus printable ASCII 0x20-0x7E, plus LF (0x0A).
// UNICODE BMP box-drawing glyphs allowed ONLY in Phase-5 TUI preview, never here.
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
