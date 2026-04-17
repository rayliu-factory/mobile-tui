// tests/fidelity.test.ts
// Automated half of the two-target fidelity gate (Phase 1 success criterion #5).
// Asserts that every Screen.id + testID from habit-tracker.spec.md appears
// in both fixtures/targets/habit-tracker.swift and .kt. The human half of
// the gate (VALIDATION.md §Manual-Only Verifications) judges translation
// ambiguity — see Plan 01-08 Task 6.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { readFixture } from "./helpers/parse-fixture.ts";

function collectTestIDsAndScreenIds(spec: {
  screens: Array<{
    id: string;
    variants: Record<string, { tree?: unknown[] } | null>;
  }>;
}): Set<string> {
  const ids = new Set<string>();
  for (const screen of spec.screens) {
    ids.add(screen.id);

    function walk(node: unknown): void {
      if (!node || typeof node !== "object") return;
      const n = node as Record<string, unknown>;
      if (typeof n.testID === "string") ids.add(n.testID);
      for (const v of Object.values(n)) {
        if (Array.isArray(v)) v.forEach(walk);
        else if (v && typeof v === "object") walk(v);
      }
    }

    for (const key of ["content", "empty", "loading", "error"] as const) {
      const variant = screen.variants?.[key];
      if (variant && Array.isArray(variant.tree)) variant.tree.forEach(walk);
    }
    // TabBar items carry testIDs inline — the walker above covers them
    // because the `Object.values` enumeration recurses into items[] arrays.
  }
  return ids;
}

describe("two-target fidelity gate — AUTOMATED HALF (success criterion #5)", () => {
  it("every Screen.id + testID from habit-tracker.spec.md appears in habit-tracker.swift", async () => {
    const spec = (await readFixture("fixtures/habit-tracker.spec.md")) as {
      screens: Array<{
        id: string;
        variants: Record<string, { tree?: unknown[] } | null>;
      }>;
    };
    const ids = collectTestIDsAndScreenIds(spec);
    const swift = readFileSync(resolve("fixtures/targets/habit-tracker.swift"), "utf8");
    const missing = [...ids].filter((id) => !swift.includes(id));
    if (missing.length > 0) {
      console.error("[swift] missing identifiers:", missing);
    }
    expect(missing).toEqual([]);
  });

  it("every Screen.id + testID appears in habit-tracker.kt", async () => {
    const spec = (await readFixture("fixtures/habit-tracker.spec.md")) as {
      screens: Array<{
        id: string;
        variants: Record<string, { tree?: unknown[] } | null>;
      }>;
    };
    const ids = collectTestIDsAndScreenIds(spec);
    const kt = readFileSync(resolve("fixtures/targets/habit-tracker.kt"), "utf8");
    const missing = [...ids].filter((id) => !kt.includes(id));
    if (missing.length > 0) {
      console.error("[kt] missing identifiers:", missing);
    }
    expect(missing).toEqual([]);
  });

  it("both target files reference the source spec + schema version in their header", () => {
    const swift = readFileSync(resolve("fixtures/targets/habit-tracker.swift"), "utf8");
    const kt = readFileSync(resolve("fixtures/targets/habit-tracker.kt"), "utf8");
    expect(swift).toContain("habit-tracker.spec.md");
    expect(swift).toContain("mobile-tui/1");
    expect(kt).toContain("habit-tracker.spec.md");
    expect(kt).toContain("mobile-tui/1");
  });
});
