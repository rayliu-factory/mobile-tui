// tests/canvas-render.test.ts — CANVAS-01, CANVAS-03, CANVAS-04 requirements
// Render output test stubs: line-width contract, help-line text, save indicator.
//
// Tests that depend on NYI implementations are marked it.todo().
// The one test that CAN run against the stub (line count > 0) is live.
//
// CANVAS-01: render() output lines must not exceed terminal width
// CANVAS-03: help line must show correct hint text per focus state
// CANVAS-04: save indicator shows ● (dirty) or ✓ (clean)

import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { ApplyResult, Snapshot, Store, StoreState } from "../src/editor/types.ts";
import type { Spec } from "../src/model/index.ts";
import type { AstHandle } from "../src/serialize/ast-handle.ts";
import type { WriteResult } from "../src/serialize/write.ts";
import { RootCanvas } from "../src/canvas/root.ts";
import { renderHelpLine } from "../src/canvas/help-line.ts";
import { renderSaveIndicator } from "../src/canvas/save-indicator.ts";
import { calcPaneWidths, drawBorderedPane } from "../src/canvas/horizontal-layout.ts";

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
