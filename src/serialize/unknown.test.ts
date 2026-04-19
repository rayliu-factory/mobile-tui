import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { YAMLMap } from "yaml";
import YAML, { isMap } from "yaml";
import { ADVERSARIAL_KEYS, KNOWN_TOP_LEVEL_KEYS, partitionTopLevel } from "./unknown.ts";

describe("unknown.ts — KNOWN_TOP_LEVEL_KEYS registry", () => {
  it("exposes the 5 core SpecSchema root keys + 6 Phase-6 wizard meta keys (D-27 scope)", () => {
    expect([...KNOWN_TOP_LEVEL_KEYS]).toEqual([
      "schema",
      "screens",
      "actions",
      "data",
      "navigation",
      // Phase-6 wizard meta fields (WizardMetaSchema spread into SpecSchema)
      "app_idea",
      "primary_user",
      "nav_pattern",
      "auth",
      "offline_sync",
      "target_platforms",
    ]);
  });
});

describe("unknown.ts — ADVERSARIAL_KEYS registry (BLOCKER fix #3)", () => {
  it("exposes the 3 prototype-pollution vector names", () => {
    expect([...ADVERSARIAL_KEYS].sort()).toEqual(["__proto__", "constructor", "prototype"]);
  });
});

describe("unknown.ts — partitionTopLevel", () => {
  it("partitions a doc with one unknown top-level key", () => {
    const doc = YAML.parseDocument(
      "schema: mobile-tui/1\nscreens: []\nactions: {}\ndata: { entities: [] }\nnavigation: { root: home, edges: [] }\ntheme: dark\n",
      { version: "1.2", keepSourceTokens: true },
    );
    const { knownSubset, unknownKeys } = partitionTopLevel(doc);
    expect(Object.keys(knownSubset).sort()).toEqual([
      "actions",
      "data",
      "navigation",
      "schema",
      "screens",
    ]);
    expect(unknownKeys).toEqual(["theme"]);
  });

  it("classifies __proto__ as unknown (T-02-ProtoPollution defense Layer 1)", () => {
    const doc = YAML.parseDocument("__proto__: evil\nschema: mobile-tui/1\n", {
      version: "1.2",
      keepSourceTokens: true,
    });
    const { knownSubset, unknownKeys } = partitionTopLevel(doc);
    expect(unknownKeys).toContain("__proto__");
    expect(knownSubset).toEqual({ schema: "mobile-tui/1" });
    // knownSubset built via Object.create(null) → no prototype chain
    expect(Object.getPrototypeOf(knownSubset)).toBeNull();
  });

  it("returns empty partition for non-map document", () => {
    const scalarDoc = YAML.parseDocument("scalar-value\n", {
      version: "1.2",
      keepSourceTokens: true,
    });
    expect(partitionTopLevel(scalarDoc)).toEqual({ knownSubset: {}, unknownKeys: [] });
  });

  it("does not mutate doc.contents.items length or order", () => {
    const doc = YAML.parseDocument("theme: dark\nschema: mobile-tui/1\n", {
      version: "1.2",
      keepSourceTokens: true,
    });
    // Narrow via isMap instead of @ts-expect-error (INFO #8).
    if (!isMap(doc.contents)) {
      throw new Error("expected map contents");
    }
    const contents = doc.contents as YAMLMap;
    const beforeLen = contents.items.length;
    const beforeKeys = contents.items.map((p) => String((p.key as { value: unknown }).value));
    partitionTopLevel(doc);
    expect(contents.items.length).toBe(beforeLen);
    expect(contents.items.map((p) => String((p.key as { value: unknown }).value))).toEqual(
      beforeKeys,
    );
  });

  it("partitions a real Phase-1 fixture with 5 known + 0 unknown", () => {
    const raw = readFileSync(resolve("fixtures/habit-tracker.spec.md"), "utf8");
    // Grab just the frontmatter slice (between ---s)
    const match = raw.match(/^---\n([\s\S]*?)\n---/);
    expect(match).not.toBeNull();
    if (!match) throw new Error("fixture did not contain frontmatter");
    const matterBody = match[1];
    if (matterBody === undefined) throw new Error("matter body not captured");
    const doc = YAML.parseDocument(matterBody, {
      version: "1.2",
      keepSourceTokens: true,
    });
    const { knownSubset, unknownKeys } = partitionTopLevel(doc);
    expect(Object.keys(knownSubset).sort()).toEqual([
      "actions",
      "data",
      "navigation",
      "schema",
      "screens",
    ]);
    expect(unknownKeys).toEqual([]);
  });
});
