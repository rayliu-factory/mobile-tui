// tests/canvas-integration.test.ts — CANVAS-05 requirement
// Integration smoke test: real fixture file → parseSpecFile → createStore →
// RootCanvas → render + flush roundtrip.
//
// Uses the habit-tracker.spec.md fixture (read-only via tmp copy pattern).
// afterEach cleans up the tmp file so the fixture is never mutated.
//
// CANVAS-05: Canvas must open a real spec file, render without throwing,
//             accept keyboard input, and flush cleanly to disk.
//
// NOVEL PATTERN: First test in the repo to construct a real RootCanvas against
// a real store. Uses the same tmp-copy pattern as tests/cli-edit.test.ts.

import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createStore } from "../src/editor/store.ts";
import { parseSpecFile } from "../src/serialize/index.ts";
import { RootCanvas } from "../src/canvas/root.ts";

const FIXTURE_PATH = resolve(process.cwd(), "fixtures", "habit-tracker.spec.md");
const TMP_DIR = resolve(process.cwd(), "tests", "tmp");

// ── Mock theme ────────────────────────────────────────────────────────────────

const mockTheme = {
  fg: (_token: string, str: string) => str,
  bold: (str: string) => str,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("canvas integration (CANVAS-05)", { timeout: 15000 }, () => {
  let tmpPath: string;

  beforeEach(async () => {
    await fs.mkdir(TMP_DIR, { recursive: true });
    tmpPath = resolve(TMP_DIR, `canvas-${randomUUID()}.spec.md`);
    await fs.copyFile(FIXTURE_PATH, tmpPath);
  });

  afterEach(async () => {
    try {
      await fs.unlink(tmpPath);
    } catch {
      // Ignore if file already gone
    }
  });

  it("parseSpecFile → createStore → RootCanvas → render(80) returns non-empty array", async () => {
    const r = await parseSpecFile(tmpPath);
    expect(r.spec).toBeTruthy();

    const store = createStore({
      spec: r.spec!,
      astHandle: r.astHandle!,
      filePath: tmpPath,
    });
    const root = new RootCanvas(store, { theme: mockTheme });

    const lines = root.render(80);
    // Stub returns ["NYI"] — non-empty, no throw
    expect(lines.length).toBeGreaterThan(0);
  });

  it("store.flush() writes the file to disk without error", async () => {
    const r = await parseSpecFile(tmpPath);
    expect(r.spec).toBeTruthy();

    const store = createStore({
      spec: r.spec!,
      astHandle: r.astHandle!,
      filePath: tmpPath,
    });

    const writeResult = await store.flush();
    expect(writeResult.written).toBe(true);

    // Verify file is non-empty
    const stat = await fs.stat(tmpPath);
    expect(stat.size).toBeGreaterThan(0);
  });

  it.todo(
    "CANVAS-05: 'j' key navigates to second screen and wireframe preview updates (NYI: handleInput)",
  );

  it.todo(
    "CANVAS-05: ':' key opens palette and focus changes to 'palette' (NYI: handleInput)",
  );

  it.todo(
    "CANVAS-05: Ctrl+Q triggers onQuit callback (NYI: handleInput)",
  );
});
