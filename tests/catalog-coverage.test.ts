// tests/catalog-coverage.test.ts
// SPEC-01 catalog coverage proof: every entry in COMPONENT_KINDS appears in
// at least one canonical fixture. If this test fails, a fixture needs to be
// extended to include the missing kind (see D-14 for shape bounds).
import { describe, expect, it } from "vitest";
import { COMPONENT_KINDS, type ComponentKind } from "../src/model/component.ts";
import { readFixture } from "./helpers/parse-fixture.ts";

const CANONICAL = ["habit-tracker", "todo", "social-feed"] as const;

// Collect every `kind` value from every nested component in a fixture.
async function collectKindsFromFixture(name: string): Promise<Set<string>> {
  const spec = (await readFixture(`fixtures/${name}.spec.md`)) as {
    screens: Array<{
      variants: Record<string, { tree?: unknown[] } | null>;
    }>;
  };
  const kinds = new Set<string>();

  function walk(node: unknown): void {
    if (!node || typeof node !== "object") return;
    const n = node as Record<string, unknown>;
    if (typeof n.kind === "string") kinds.add(n.kind);
    for (const v of Object.values(n)) {
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === "object") walk(v);
    }
  }

  for (const screen of spec.screens) {
    for (const key of ["content", "empty", "loading", "error"] as const) {
      const variant = screen.variants?.[key];
      if (variant && Array.isArray(variant.tree)) variant.tree.forEach(walk);
    }
  }
  return kinds;
}

describe("catalog coverage (SPEC-01)", () => {
  it("every kind in COMPONENT_KINDS appears in at least one canonical fixture", async () => {
    const allKinds = new Set<string>();
    for (const name of CANONICAL) {
      const kinds = await collectKindsFromFixture(name);
      for (const k of kinds) allKinds.add(k);
    }

    const missing = COMPONENT_KINDS.filter((k) => !allKinds.has(k));
    if (missing.length > 0) {
      console.error(
        "[catalog coverage] kinds missing from fixtures:",
        missing,
        "\nextend a fixture to include them (see D-14).",
      );
    }
    expect(missing).toEqual([]);
  });

  it("every catalog kind found in fixtures is in COMPONENT_KINDS (no rogue kinds)", async () => {
    const allKinds = new Set<string>();
    for (const name of CANONICAL) {
      const kinds = await collectKindsFromFixture(name);
      for (const k of kinds) allKinds.add(k);
    }
    // Non-catalog kinds such as "content"/"empty"/"loading"/"error" appear
    // as Variant discriminators in the walker; filter those out and only
    // assert catalog-kind names are legal.
    const catalogKinds = new Set<ComponentKind>(COMPONENT_KINDS);
    const VARIANT_KINDS = new Set(["content", "empty", "loading", "error"]);
    const rogue = [...allKinds].filter(
      (k) => !catalogKinds.has(k as ComponentKind) && !VARIANT_KINDS.has(k),
    );
    expect(rogue).toEqual([]);
  });
});
