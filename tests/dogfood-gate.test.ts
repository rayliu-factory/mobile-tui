// WIREFRAME-06 dogfood gate harness.
// Two describe blocks:
//   (a) file-count: fixtures/wireframes/ contains EXACTLY 20 .wf.txt files
//   (b) SHARED.md evidence: parses with schema: mobile-tui/shared/1 and
//       records at least 3 shareable verdicts (D-48 + D-49 gate for Phase 4).
// Both are .skip-marked at Wave-0 — UNSKIP after Plan 03-09 authors the 20
// fixtures and seeds real SHARED.md entries.
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import matter from "gray-matter";
import { describe, expect, it } from "vitest";
import YAML from "yaml";
import { allWireframeFiles } from "./helpers/wireframe-files.ts";

describe("dogfood gate — file count (WIREFRAME-06)", () => {
  it.skip("fixtures/wireframes/ contains exactly 20 .wf.txt files — UNSKIP after Plan 03-09", async () => {
    const files = await allWireframeFiles();
    expect(files.length).toBe(20);
  });
});

describe("dogfood gate — SHARED.md evidence (D-48)", () => {
  it.skip("SHARED.md parses with schema: mobile-tui/shared/1 and >=3 shareable verdicts — UNSKIP after Plan 03-09", async () => {
    const raw = await readFile(resolve("fixtures/wireframes/SHARED.md"), "utf8");
    const parsed = matter(raw, {
      engines: {
        yaml: {
          parse: (s: string) => YAML.parse(s) as object,
          stringify: () => {
            throw new Error("no writes from dogfood-gate test");
          },
        },
      },
    });
    const data = parsed.data as {
      schema?: string;
      shared?: Array<{ verdict?: string }>;
    };
    expect(data.schema).toBe("mobile-tui/shared/1");
    const shareable = (data.shared ?? []).filter((e) => e.verdict === "shareable");
    expect(shareable.length).toBeGreaterThanOrEqual(3);
  });
});
