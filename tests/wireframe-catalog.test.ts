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

  // UNSKIPPED by Plan 03-08: render() is live; walk canonicals, call
  // render(spec, screen.id), and assert per-kind fingerprint fragments
  // appear somewhere in the aggregate output. Structural containers
  // (Column/Row/ListItem/Spacer) are inferred via their children's glyphs
  // and skipped from the fingerprint table.
  it("every kind in COMPONENT_KINDS appears in at least one canonical render output", async () => {
    const { render } = await import("../src/emit/wireframe/index.ts");
    const { parseSpecFile } = await import("../src/serialize/index.ts");

    const allOutputs: string[] = [];
    for (const name of CANONICAL) {
      const r = await parseSpecFile(`fixtures/${name}.spec.md`);
      if (!r.spec) throw new Error(`${name} failed to parse`);
      for (const screen of r.spec.screens) {
        allOutputs.push(render(r.spec, screen.id));
      }
    }
    const combined = allOutputs.join("\n");

    // Per-kind glyph fingerprints: fragments expected in at least one
    // render output for each non-structural kind. Structural containers
    // (Column/Row/ListItem/Spacer) have no own-glyph — their presence is
    // inferred via children; marked `null` and skipped.
    const kindFingerprints: Record<string, string[] | null> = {
      Text: ["MY HABITS", "Habit Title", "Saving", "Title is required"],
      Icon: ["[icon:"],
      Divider: ["-----"],
      Spacer: null,
      Image: ["[img:", "+--IMG"],
      Button: ["[[ ", "[ "],
      TextField: [": _"],
      Toggle: ["[ ]"],
      SegmentedControl: ["< ", " | "],
      Column: null,
      Row: null,
      Card: ["+--"],
      List: ["list bound to"],
      ListItem: null,
      NavBar: ["---"],
      TabBar: [" | ["],
      Modal: ["+-- Modal"],
      Sheet: ["+-- Sheet"],
    };

    for (const kind of COMPONENT_KINDS) {
      const fps = kindFingerprints[kind];
      if (fps === null) continue; // structural — skip fingerprint check
      if (fps === undefined) {
        throw new Error(`catalog coverage: no fingerprint table entry for kind "${kind}"`);
      }
      const matched = fps.some((fp) => combined.includes(fp));
      if (!matched) {
        throw new Error(
          `catalog coverage: kind "${kind}" has no fingerprint in render output ` +
            `(looked for: ${JSON.stringify(fps)})`,
        );
      }
    }
  });
});
