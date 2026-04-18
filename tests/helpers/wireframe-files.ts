// Shared helper — recursively collect every *.wf.txt under fixtures/wireframes/.
// Consumed by tests/wireframe-ascii-baseline.test.ts + tests/dogfood-gate.test.ts
// so both integration tests agree on the same file set.
// Kept outside any *.test.ts file (Biome's `noExportsInTest` rule forbids
// exports from test files).
import type { Dirent } from "node:fs";
import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

export const WIREFRAME_ROOT = resolve("fixtures/wireframes");

export async function allWireframeFiles(): Promise<string[]> {
  const out: string[] = [];
  async function walk(dir: string): Promise<void> {
    let entries: Dirent[];
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return; // dir may not exist yet at Wave-0
    }
    for (const e of entries) {
      const abs = join(dir, e.name);
      if (e.isDirectory()) await walk(abs);
      else if (e.isFile() && e.name.endsWith(".wf.txt")) out.push(abs);
    }
  }
  await walk(WIREFRAME_ROOT);
  return out;
}
