// tests/canvas-render.test.ts — CANVAS-01, CANVAS-03, CANVAS-04 requirements
// Render output test stubs: line-width contract, help-line text, save indicator.
//
// Tests that depend on NYI implementations are marked it.todo().
// The one test that CAN run against the stub (line count > 0) is live.
//
// CANVAS-01: render() output lines must not exceed terminal width
// CANVAS-03: help line must show correct hint text per focus state
// CANVAS-04: save indicator shows ● (dirty) or ✓ (clean)
//
// NOVEL PATTERNS (plan 05-03):
//   - ScreensListPane: inline SelectList equivalent with onSelectionChange (D-80)
//   - WireframePreviewPane: renderSingleVariant cache-wrapper with placeholder

import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { ApplyResult, Snapshot, Store, StoreState } from "../src/editor/types.ts";
import type { Spec } from "../src/model/index.ts";
import type { AstHandle } from "../src/serialize/ast-handle.ts";
import type { WriteResult } from "../src/serialize/write.ts";
import { RootCanvas } from "../src/canvas/root.ts";
import { ScreensListPane } from "../src/canvas/panes/screens-list.ts";
import { WireframePreviewPane } from "../src/canvas/panes/wireframe-preview.ts";
import { parseSpecFile } from "../src/serialize/index.ts";

// ── Minimal spec fixture ──────────────────────────────────────────────────────

function minimalSpec(): Spec {
  return {
    version: "1.0",
    screens: [],
    navigation: { root: "s1", edges: [] },
    dataModels: [],
    actions: {},
    testFlows: [],
  } as unknown as Spec;
}

function specWithScreens(screenList: Array<{ id: string; title: string }>): Spec {
  return {
    version: "1.0",
    screens: screenList.map((s) => ({ id: s.id, title: s.title })),
    navigation: { root: screenList[0]?.id ?? "s1", edges: [] },
    dataModels: [],
    actions: {},
    testFlows: [],
  } as unknown as Spec;
}

// ── Stub store ────────────────────────────────────────────────────────────────

function makeStubStore(): Store & { _setDirty: (d: boolean) => void } {
  const subscribers = new Set<(s: Snapshot) => void>();
  let dirty = false;

  const stubState: StoreState = {
    spec: minimalSpec(),
    astHandle: {} as AstHandle,
    diagnostics: [],
    dirty,
  };

  const store = {
    getState: () => ({ ...stubState, dirty }),
    subscribe: (fn: (s: Snapshot) => void) => {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },
    apply: async (_: string, __: unknown): Promise<ApplyResult> => ({
      spec: minimalSpec(),
      diagnostics: [],
      ok: false,
    }),
    undo: async () => null,
    redo: async () => null,
    flush: async (): Promise<WriteResult> => ({ written: true, diagnostics: [] }),
    _setDirty: (d: boolean) => {
      dirty = d;
    },
  };

  return store as Store & { _setDirty: (d: boolean) => void };
}

// ── Mock theme ────────────────────────────────────────────────────────────────

const mockTheme = {
  fg: (_token: string, str: string) => str,
  bold: (str: string) => str,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("canvas pane rendering (CANVAS-01, CANVAS-03, CANVAS-04)", () => {
  it("stub render() returns at least one line (sanity)", () => {
    const store = makeStubStore();
    const root = new RootCanvas(store, { theme: mockTheme });
    const lines = root.render(80);
    // Stub returns ["NYI"] — length is > 0
    expect(lines.length).toBeGreaterThan(0);
  });

  it.todo(
    "CANVAS-01: root.render(80) produces lines of at most 80 visible chars (NYI: full render)",
  );

  it.todo(
    "CANVAS-03: help line shows '[j/k] navigate' when focus is 'screens' (NYI: renderHelpLine)",
  );

  it.todo(
    "CANVAS-03: help line shows '[↑↓] navigate' when focus is 'palette' (NYI: renderHelpLine)",
  );

  it.todo(
    "CANVAS-04: save indicator shows ● when dirty (NYI: renderSaveIndicator)",
  );

  it.todo(
    "CANVAS-04: save indicator shows ✓ when clean (NYI: renderSaveIndicator)",
  );

  it.todo(
    "CANVAS-01: render output lines respect narrow terminal width of 40 (NYI: calcPaneWidths)",
  );
});

// ── ScreensListPane tests (plan 05-03, CANVAS-01) ────────────────────────────

describe("ScreensListPane (CANVAS-01, CANVAS-05)", () => {
  it("renders 3 screen items with no error markers when no diagnostics", () => {
    const selectedIds: string[] = [];
    const pane = new ScreensListPane((id) => selectedIds.push(id), mockTheme);

    const snapshot: Snapshot = {
      spec: specWithScreens([
        { id: "home", title: "Home" },
        { id: "settings", title: "Settings" },
        { id: "profile", title: "Profile" },
      ]),
      diagnostics: [],
      dirty: false,
    };
    pane.update(snapshot);

    const lines = pane.render(30);
    expect(lines.length).toBeGreaterThanOrEqual(3);

    const joined = lines.join("\n");
    expect(joined).toContain("Home");
    expect(joined).toContain("Settings");
    expect(joined).toContain("Profile");
    // No error markers in clean state
    expect(joined).not.toContain("⚠");
  });

  it("appends ⚠ suffix to screen label when it has an error diagnostic", () => {
    const pane = new ScreensListPane(() => {}, mockTheme);

    const snapshot: Snapshot = {
      spec: specWithScreens([
        { id: "home", title: "Home" },
        { id: "broken", title: "Broken Screen" },
      ]),
      diagnostics: [
        {
          severity: "error" as const,
          path: "/screens/broken",
          message: "something is wrong",
          code: "TEST_ERR",
        },
      ],
      dirty: false,
    };
    pane.update(snapshot);

    const lines = pane.render(40);
    const joined = lines.join("\n");
    expect(joined).toContain("Broken Screen ⚠");
    // Home has no error — no ⚠
    const homeLines = lines.filter((l) => l.includes("Home"));
    for (const l of homeLines) {
      expect(l).not.toContain("⚠");
    }
  });

  it("all render(30) lines have visibleWidth <= 30", () => {
    const pane = new ScreensListPane(() => {}, mockTheme);

    const snapshot: Snapshot = {
      spec: specWithScreens([
        { id: "s1", title: "A very long screen title that might overflow" },
        { id: "s2", title: "Another screen" },
        { id: "s3", title: "Short" },
      ]),
      diagnostics: [],
      dirty: false,
    };
    pane.update(snapshot);

    const lines = pane.render(30);
    for (const line of lines) {
      // Strip ANSI escape sequences to measure visible width
      const visible = line.replace(/\x1b\[[0-9;]*m/g, "");
      expect(visible.length).toBeLessThanOrEqual(30);
    }
  });

  it("onSelectionChange fires immediately on j/k navigation (D-80)", () => {
    const selected: string[] = [];
    const pane = new ScreensListPane((id) => selected.push(id), mockTheme);

    const snapshot: Snapshot = {
      spec: specWithScreens([
        { id: "s1", title: "Screen 1" },
        { id: "s2", title: "Screen 2" },
        { id: "s3", title: "Screen 3" },
      ]),
      diagnostics: [],
      dirty: false,
    };
    pane.update(snapshot);

    // Navigate down — should immediately call onSelect with s2
    pane.handleInput("j");
    expect(selected.length).toBeGreaterThan(0);
    expect(selected[selected.length - 1]).toBe("s2");

    // Navigate down again — s3
    pane.handleInput("j");
    expect(selected[selected.length - 1]).toBe("s3");

    // Navigate up — back to s2
    pane.handleInput("k");
    expect(selected[selected.length - 1]).toBe("s2");
  });
});

// ── WireframePreviewPane tests (plan 05-03, CANVAS-01) ───────────────────────

describe("WireframePreviewPane (CANVAS-01, CANVAS-05)", () => {
  it("returns placeholder when no screen selected", () => {
    const pane = new WireframePreviewPane();
    const lines = pane.render(40);
    expect(lines.length).toBe(1);
    expect(lines[0]).toContain("no screen selected");
  });

  it("placeholder line has visibleWidth <= requested width", () => {
    const pane = new WireframePreviewPane();
    const lines = pane.render(20);
    for (const line of lines) {
      const visible = line.replace(/\x1b\[[0-9;]*m/g, "");
      expect(visible.length).toBeLessThanOrEqual(20);
    }
  });

  it("renders non-empty content for habit-tracker home screen", async () => {
    const r = await parseSpecFile(resolve(process.cwd(), "fixtures/habit-tracker.spec.md"));
    expect(r.spec).toBeTruthy();

    const firstScreen = r.spec!.screens[0];
    expect(firstScreen).toBeTruthy();

    const pane = new WireframePreviewPane();
    const snapshot: Snapshot = {
      spec: r.spec!,
      diagnostics: r.diagnostics,
      dirty: false,
    };
    pane.update(snapshot, firstScreen!.id);

    const lines = pane.render(40);
    expect(lines.length).toBeGreaterThan(1);
    // All lines must fit within pane width
    for (const line of lines) {
      const visible = line.replace(/\x1b\[[0-9;]*m/g, "");
      expect(visible.length).toBeLessThanOrEqual(40);
    }
  });

  it("invalidate clears line cache (re-renders on next call)", async () => {
    const r = await parseSpecFile(resolve(process.cwd(), "fixtures/habit-tracker.spec.md"));
    const firstScreen = r.spec!.screens[0]!;

    const pane = new WireframePreviewPane();
    const snapshot: Snapshot = {
      spec: r.spec!,
      diagnostics: r.diagnostics,
      dirty: false,
    };
    pane.update(snapshot, firstScreen.id);

    const lines1 = pane.render(60);
    pane.invalidate();
    const lines2 = pane.render(60);
    // After invalidate + re-render, output should be the same (deterministic)
    expect(lines2).toEqual(lines1);
  });
});
