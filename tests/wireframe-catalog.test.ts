// WIREFRAME-03 catalog coverage harness.
// Walks the 3 canonical fixtures (habit-tracker, todo, social-feed) and
// asserts every kind in COMPONENT_KINDS appears in at least one fixture's
// node tree. The render-snapshot check is .skip-marked until Plan 03-08
// ships variants.ts render().
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { COMPONENT_KINDS } from "../src/model/component.ts";
import { parseSpecFile } from "../src/serialize/index.ts";

const CANONICAL = ["habit-tracker", "todo", "social-feed"] as const;

// Variant kinds are NOT component kinds — exclude from rogue-kind checks.
const VARIANT_KINDS = new Set(["content", "empty", "loading", "error"]);

async function collectKindsFromFixture(name: string): Promise<Set<string>> {
  const { spec } = await parseSpecFile(resolve(`fixtures/${name}.spec.md`));
  if (!spec) {
    throw new Error(`wireframe catalog: canonical fixture ${name} failed validateSpec`);
  }
  const kinds = new Set<string>();

  function walk(node: unknown): void {
    if (!node || typeof node !== "object") return;
    const n = node as Record<string, unknown>;
    if (typeof n.kind === "string" && !VARIANT_KINDS.has(n.kind)) {
      kinds.add(n.kind);
    }
    for (const v of Object.values(n)) {
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === "object") walk(v);
    }
  }
  walk(spec);
  return kinds;
}

describe("wireframe catalog coverage (WIREFRAME-03)", () => {
  it("every kind in COMPONENT_KINDS appears in at least one canonical fixture", async () => {
    const allKinds = new Set<string>();
    for (const name of CANONICAL) {
      const kinds = await collectKindsFromFixture(name);
      for (const k of kinds) allKinds.add(k);
    }
    const missing = COMPONENT_KINDS.filter((k) => !allKinds.has(k));
    if (missing.length > 0) {
      console.error("[wireframe-catalog] COMPONENT_KINDS missing from canonicals:", missing);
    }
    expect(missing).toEqual([]);
  });

  // UNSKIP after Plan 03-08 ships variants.ts render() — renders every kind
  // and asserts per-kind snapshot via renderNode(node, 60). Kept as a .skip
  // stanza so the test file shape is complete at Wave-0 scaffolding time.
  it.skip("renders every kind via render() — UNSKIP after Plan 03-08", async () => {
    // Placeholder body: once render() lands, walk canonicals, call
    // renderNode(node, 60) per encountered kind, and snapshot each.
    for (const name of CANONICAL) {
      const kinds = await collectKindsFromFixture(name);
      expect(kinds.size).toBeGreaterThan(0);
    }
  });
});
