// tests/store-state-filepath.test.ts
// TDD RED: StoreState.filePath field (MAESTRO-04 plan 04 task 1).
// This test verifies that store.getState() returns the filePath passed to createStore.
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import { join, resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { COMMANDS } from "../src/editor/commands/index.ts";
import { createStore } from "../src/editor/store.ts";
import { parseSpecFile } from "../src/serialize/index.ts";

const TMP_DIR = resolve(process.cwd(), "tests", "tmp");

beforeAll(async () => {
  await fs.mkdir(TMP_DIR, { recursive: true });
});

describe("StoreState.filePath (MAESTRO-04 plan 04)", () => {
  it("getState() returns the filePath passed to createStore", async () => {
    const { spec, astHandle } = await parseSpecFile(resolve("fixtures/habit-tracker.spec.md"));
    if (!spec || !astHandle) throw new Error("fixture failed to parse");

    const tmpPath = join(TMP_DIR, `fp-test-${randomUUID()}.spec.md`);
    const store = createStore({ spec, astHandle, filePath: tmpPath }, COMMANDS);

    const state = store.getState();
    // filePath must be returned from getState() — this is the Phase-7 addition
    expect(state.filePath).toBe(tmpPath);
  });
});
