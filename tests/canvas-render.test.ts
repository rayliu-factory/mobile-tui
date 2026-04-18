// tests/canvas-render.test.ts — CANVAS-01, CANVAS-03, CANVAS-04, CANVAS-05 requirements
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
//
// NOVEL PATTERNS (plan 05-04):
//   - PropertyInspectorPane: 5-field D-70 inspector, j/k navigation, in-place edit

import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { ApplyResult, Snapshot, Store, StoreState } from "../src/editor/types.ts";
import type { Spec } from "../src/model/index.ts";
import type { AstHandle } from "../src/serialize/ast-handle.ts";
import type { WriteResult } from "../src/serialize/write.ts";
import { RootCanvas } from "../src/canvas/root.ts";
import { renderHelpLine } from "../src/canvas/help-line.ts";
import { renderSaveIndicator } from "../src/canvas/save-indicator.ts";
import { calcPaneWidths, drawBorderedPane } from "../src/canvas/horizontal-layout.ts";
import { ScreensListPane } from "../src/canvas/panes/screens-list.ts";
import { WireframePreviewPane } from "../src/canvas/panes/wireframe-preview.ts";
import { PropertyInspectorPane } from "../src/canvas/panes/property-inspector.ts";
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
  fg: (token: string, str: string) => `[${token}:${str}]`,
  bold: (str: string) => str,
};

const mockThemePassthrough = {
  fg: (_token: string, str: string) => str,
  bold: (str: string) => str,
};

// ── renderHelpLine pure-function tests (CANVAS-03) ────────────────────────────

describe("renderHelpLine (CANVAS-03)", () => {
  it("screens focus returns string containing '[j/k] navigate'", () => {
    const result = renderHelpLine("screens", 200);
    expect(result).toContain("[j/k] navigate");
  });

  it("inspector focus returns string containing '[enter] edit'", () => {
    const result = renderHelpLine("inspector", 200);
    expect(result).toContain("[enter] edit");
  });

  it("preview focus returns string containing '[tab] next pane'", () => {
    const result = renderHelpLine("preview", 200);
    expect(result).toContain("[tab] next pane");
  });

  it("palette focus returns string containing '[↑↓] navigate'", () => {
    const result = renderHelpLine("palette", 200);
    expect(result).toContain("[↑↓] navigate");
  });

  it("truncates to provided width", () => {
    const result = renderHelpLine("screens", 10);
    expect(result.length).toBeLessThanOrEqual(10);
  });

  it("returns exact D-84 screens string at sufficient width", () => {
    const expected = "[j/k] navigate  [tab] next pane  [ctrl+p] palette  [ctrl+z] undo  [ctrl+q] quit";
    const result = renderHelpLine("screens", 200);
    expect(result).toBe(expected);
  });

  it("returns exact D-84 inspector string at sufficient width", () => {
    const expected = "[j/k] navigate  [enter] edit  [tab] next pane  [ctrl+p] palette  [ctrl+z] undo  [ctrl+q] quit";
    const result = renderHelpLine("inspector", 200);
    expect(result).toBe(expected);
  });

  it("returns exact D-84 preview string at sufficient width", () => {
    const expected = "[tab] next pane  [ctrl+p] palette  [ctrl+z] undo  [ctrl+q] quit";
    const result = renderHelpLine("preview", 200);
    expect(result).toBe(expected);
  });

  it("returns exact D-84 palette string at sufficient width", () => {
    const expected = "[↑↓] navigate  [enter] select  [esc] cancel";
    const result = renderHelpLine("palette", 200);
    expect(result).toBe(expected);
  });
});

// ── renderSaveIndicator pure-function tests (CANVAS-04) ───────────────────────

describe("renderSaveIndicator (CANVAS-04)", () => {
  it("dirty=true returns warning-themed ●", () => {
    const result = renderSaveIndicator(true, mockTheme);
    expect(result).toBe("[warning:●]");
  });

  it("dirty=false returns success-themed ✓", () => {
    const result = renderSaveIndicator(false, mockTheme);
    expect(result).toBe("[success:✓]");
  });

  it("dirty=true contains ● glyph", () => {
    const result = renderSaveIndicator(true, mockThemePassthrough);
    expect(result).toContain("●");
  });

  it("dirty=false contains ✓ glyph", () => {
    const result = renderSaveIndicator(false, mockThemePassthrough);
    expect(result).toContain("✓");
  });
});

// ── calcPaneWidths pure-function tests (CANVAS-01) ───────────────────────────

describe("calcPaneWidths (CANVAS-01)", () => {
  it.each([60, 74, 75, 80, 100, 120, 200])("widths sum to total for input %i", (total) => {
    const [screens, inspector, preview] = calcPaneWidths(total);
    expect(screens + inspector + preview).toBe(total);
  });

  it("calcPaneWidths(100) returns [20, 40, 40]", () => {
    expect(calcPaneWidths(100)).toEqual([20, 40, 40]);
  });

  it("calcPaneWidths(74) collapses preview to 0", () => {
    const [, , preview] = calcPaneWidths(74);
    expect(preview).toBe(0);
  });

  it("calcPaneWidths(75) has preview >= 30", () => {
    const [screens, , preview] = calcPaneWidths(75);
    expect(preview).toBeGreaterThanOrEqual(30);
    expect(screens).toBeGreaterThanOrEqual(15);
  });

  it("calcPaneWidths(80) screens >= 15 and preview >= 30", () => {
    const [screens, , preview] = calcPaneWidths(80);
    expect(screens).toBeGreaterThanOrEqual(15);
    expect(preview).toBeGreaterThanOrEqual(30);
  });
});

// ── drawBorderedPane tests (CANVAS-01, D-79) ──────────────────────────────────

describe("drawBorderedPane (D-79)", () => {
  it("focused=true uses accent color in top border", () => {
    const result = drawBorderedPane(["content"], true, mockTheme, 20);
    expect(result[0]).toContain("[accent:");
  });

  it("focused=false uses muted color in top border", () => {
    const result = drawBorderedPane(["content"], false, mockTheme, 20);
    expect(result[0]).toContain("[muted:");
  });

  it("result has content line between borders", () => {
    const result = drawBorderedPane(["hello"], true, mockTheme, 20);
    expect(result[1]).toBe("hello");
  });

  it("result length is lines.length + 2 (top + bottom borders)", () => {
    const result = drawBorderedPane(["a", "b", "c"], true, mockTheme, 20);
    expect(result.length).toBe(5);
  });
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("canvas pane rendering (CANVAS-01, CANVAS-03, CANVAS-04)", () => {
  it("stub render() returns at least one line (sanity)", () => {
    const store = makeStubStore();
    const root = new RootCanvas(store, { theme: mockThemePassthrough });
    const lines = root.render(80);
    // Stub returns ["NYI"] — length is > 0
    expect(lines.length).toBeGreaterThan(0);
  });

  it("CANVAS-01: root.render(80) produces lines of at most 80 visible chars", () => {
    const store = makeStubStore();
    const root = new RootCanvas(store, { theme: mockThemePassthrough });
    const lines = root.render(80);
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      const visible = line.replace(/\x1b\[[0-9;]*m/g, "");
      expect(visible.length).toBeLessThanOrEqual(80);
    }
  });

  it("CANVAS-03: root render contains '[j/k] navigate' when focus is 'screens'", () => {
    const store = makeStubStore();
    const root = new RootCanvas(store, { theme: mockThemePassthrough });
    // Default focus is 'screens'
    const output = root.render(200).join("\n");
    expect(output).toContain("[j/k] navigate");
  });

  it("CANVAS-03: root render contains '[↑↓] navigate' when focus is 'palette'", () => {
    const store = makeStubStore();
    const root = new RootCanvas(store, { theme: mockThemePassthrough });
    root.handleInput(":"); // open palette
    const output = root.render(200).join("\n");
    expect(output).toContain("[↑↓] navigate");
  });

  it("CANVAS-04: root render shows ● when dirty", () => {
    const store = makeStubStore();
    store._setDirty(true);
    const root = new RootCanvas(store, { theme: mockThemePassthrough });
    const output = root.render(80).join("\n");
    expect(output).toContain("●");
  });

  it("CANVAS-04: root render shows ✓ when clean", () => {
    const store = makeStubStore();
    const root = new RootCanvas(store, { theme: mockThemePassthrough });
    const output = root.render(80).join("\n");
    expect(output).toContain("✓");
  });

  it("CANVAS-01: render output lines respect narrow terminal width of 40", () => {
    const store = makeStubStore();
    const root = new RootCanvas(store, { theme: mockThemePassthrough });
    const lines = root.render(40);
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      const visible = line.replace(/\x1b\[[0-9;]*m/g, "");
      expect(visible.length).toBeLessThanOrEqual(40);
    }
  });
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

// ── PropertyInspectorPane helpers ─────────────────────────────────────────────

/**
 * Build a minimal Screen object compatible with the Spec shape for testing.
 * Provides all required fields per ScreenSchema (id, title, kind, variants).
 */
function makeMinimalScreen(id: string, title: string) {
  return {
    id,
    title,
    kind: "regular" as const,
    back_behavior: "pop" as const,
    variants: {
      content: { kind: "content" as const, tree: [] },
      empty: null,
      loading: null,
      error: null,
    },
    acceptance: ["User can navigate back", "Screen loads in < 2s"],
  };
}

function makeMinimalSpecWithScreen(screenId: string, screenTitle: string): Spec {
  return {
    version: "1.0",
    screens: [makeMinimalScreen(screenId, screenTitle)],
    navigation: { root: screenId, edges: [] },
    dataModels: [],
    actions: {},
    testFlows: [],
  } as unknown as Spec;
}

// ── PropertyInspectorPane render tests (plan 05-04, CANVAS-05) ───────────────

describe("PropertyInspectorPane — field rendering (D-70)", () => {
  it("render(40) with a screen contains 'title:' in output", () => {
    const store = makeStubStore();
    const screenId = "home";
    const spec = makeMinimalSpecWithScreen(screenId, "Home Screen");
    const snapshot: Snapshot = { spec, diagnostics: [], dirty: false };

    const pane = new PropertyInspectorPane(store, () => screenId, mockThemePassthrough);
    pane.update(snapshot);

    const joined = pane.render(40).join("\n");
    expect(joined).toContain("title:");
  });

  it("render(40) with a screen contains 'components:' in output", () => {
    const store = makeStubStore();
    const screenId = "home";
    const spec = makeMinimalSpecWithScreen(screenId, "Home Screen");
    const snapshot: Snapshot = { spec, diagnostics: [], dirty: false };

    const pane = new PropertyInspectorPane(store, () => screenId, mockThemePassthrough);
    pane.update(snapshot);

    const joined = pane.render(40).join("\n");
    expect(joined).toContain("components:");
  });

  it("render(40) with error diagnostic shows ⚠ marker", () => {
    const store = makeStubStore();
    const screenId = "home";
    const spec = makeMinimalSpecWithScreen(screenId, "Home Screen");
    const snapshot: Snapshot = {
      spec,
      diagnostics: [
        {
          severity: "error" as const,
          path: `/screens/${screenId}`,
          message: "something is wrong",
          code: "TEST_ERR",
        },
      ],
      dirty: false,
    };

    const pane = new PropertyInspectorPane(store, () => screenId, mockThemePassthrough);
    pane.update(snapshot);

    const lines = pane.render(40);
    const hasWarning = lines.some((l) => l.includes("⚠"));
    expect(hasWarning).toBe(true);
  });

  it("all render(40) lines have visibleWidth <= 40", () => {
    const store = makeStubStore();
    const screenId = "home";
    const spec = makeMinimalSpecWithScreen(screenId, "Home Screen");
    const snapshot: Snapshot = { spec, diagnostics: [], dirty: false };

    const pane = new PropertyInspectorPane(store, () => screenId, mockThemePassthrough);
    pane.update(snapshot);

    const lines = pane.render(40);
    for (const line of lines) {
      // Strip ANSI escape sequences for measuring visible width
      const visible = line.replace(/\x1b\[[0-9;]*m/g, "");
      expect(visible.length).toBeLessThanOrEqual(40);
    }
  });

  it("render(40) with no active screen returns '(no screen selected)' line", () => {
    const store = makeStubStore();
    const pane = new PropertyInspectorPane(store, () => null, mockThemePassthrough);
    const snapshot: Snapshot = { spec: minimalSpec(), diagnostics: [], dirty: false };
    pane.update(snapshot);

    const joined = pane.render(40).join("\n");
    expect(joined).toContain("no screen selected");
  });
});

// ── PropertyInspectorPane edit flow tests (D-71) ─────────────────────────────

describe("PropertyInspectorPane — edit flow (D-71)", () => {
  it("Enter on title field activates Input in edit mode", () => {
    const store = makeStubStore();
    const screenId = "home";
    const spec = makeMinimalSpecWithScreen(screenId, "Home Screen");
    const snapshot: Snapshot = { spec, diagnostics: [], dirty: false };

    const pane = new PropertyInspectorPane(store, () => screenId, mockThemePassthrough);
    pane.update(snapshot);
    pane.focused = true;

    // Cursor starts at row 0 (title field). Press Enter to activate.
    pane.handleInput("\r");

    // After activation, render should indicate editing state (editingField set)
    // We verify indirectly: the pane is now in edit mode (no crash, valid lines)
    const lines = pane.render(40);
    expect(lines.length).toBeGreaterThan(0);
    // All lines within width
    for (const line of lines) {
      const visible = line.replace(/\x1b\[[0-9;]*m/g, "");
      expect(visible.length).toBeLessThanOrEqual(40);
    }
  });

  it("Enter while editing commits store.apply with correct command", async () => {
    const applySpy = vi.fn().mockResolvedValue({
      spec: makeMinimalSpecWithScreen("home", "Home Screen"),
      diagnostics: [],
      ok: true,
    });
    const store = { ...makeStubStore(), apply: applySpy };

    const screenId = "home";
    const spec = makeMinimalSpecWithScreen(screenId, "Home Screen");
    const snapshot: Snapshot = { spec, diagnostics: [], dirty: false };

    const pane = new PropertyInspectorPane(store as unknown as Store, () => screenId, mockThemePassthrough);
    pane.update(snapshot);
    pane.focused = true;

    // Activate title field (row 0)
    pane.handleInput("\r");

    // Type a new title character by character
    pane.handleInput("N");
    pane.handleInput("e");
    pane.handleInput("w");

    // Commit with Enter
    pane.handleInput("\r");

    // store.apply should have been called exactly once
    expect(applySpy).toHaveBeenCalledTimes(1);
    // Called with set-screen-title command
    const [commandName] = applySpy.mock.calls[0] as [string, unknown];
    expect(commandName).toBe("set-screen-title");
  });

  it("Esc while editing cancels without store.apply", () => {
    const applySpy = vi.fn();
    const store = { ...makeStubStore(), apply: applySpy };

    const screenId = "home";
    const spec = makeMinimalSpecWithScreen(screenId, "Home Screen");
    const snapshot: Snapshot = { spec, diagnostics: [], dirty: false };

    const pane = new PropertyInspectorPane(store as unknown as Store, () => screenId, mockThemePassthrough);
    pane.update(snapshot);
    pane.focused = true;

    // Activate title field
    pane.handleInput("\r");

    // Press Escape to cancel
    pane.handleInput("\x1b");

    // store.apply must NOT have been called
    expect(applySpy).not.toHaveBeenCalled();

    // Back in view mode — render shows field row (no edit Input replacing it)
    const joined = pane.render(40).join("\n");
    expect(joined).toContain("title:");
  });

  it("Read-only field (components count) does not activate on Enter", () => {
    const applySpy = vi.fn();
    const store = { ...makeStubStore(), apply: applySpy };

    const screenId = "home";
    const spec = makeMinimalSpecWithScreen(screenId, "Home Screen");
    const snapshot: Snapshot = { spec, diagnostics: [], dirty: false };

    const pane = new PropertyInspectorPane(store as unknown as Store, () => screenId, mockThemePassthrough);
    pane.update(snapshot);
    pane.focused = true;

    // Navigate to components row (row 2, 0-indexed): j, j
    pane.handleInput("j");
    pane.handleInput("j");

    // Try to activate — should be a no-op (read-only)
    pane.handleInput("\r");

    // store.apply must NOT have been called
    expect(applySpy).not.toHaveBeenCalled();

    // Still in view mode
    const joined = pane.render(40).join("\n");
    expect(joined).toContain("components:");
  });
});
