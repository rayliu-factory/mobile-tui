// tests/canvas-focus.test.ts — CANVAS-01, CANVAS-02 requirements
// Focus FSM test stubs: Tab cycle and palette-open behaviour.
//
// Tests use makeStubStore() to avoid real file I/O.

import { describe, expect, it, vi } from "vitest";
import type { ApplyResult, Snapshot, Store, StoreState } from "../src/editor/types.ts";
import type { Spec } from "../src/model/index.ts";
import type { AstHandle } from "../src/serialize/ast-handle.ts";
import type { WriteResult } from "../src/serialize/write.ts";
import { RootCanvas } from "../src/canvas/root.ts";
import { FOCUS_CYCLE, nextFocus } from "../src/canvas/focus-fsm.ts";
import { CommandPalette } from "../src/canvas/palette/index.ts";
import { COMMANDS } from "../src/editor/commands/index.ts";

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

// ── Stub store (no file I/O) ──────────────────────────────────────────────────

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

// ── Mock theme (strips ANSI; safe for assertions) ─────────────────────────────

const mockTheme = {
  fg: (_token: string, str: string) => str,
  bold: (str: string) => str,
};

// ── Pure-function unit tests for focus FSM ────────────────────────────────────

describe("nextFocus pure function (CANVAS-01)", () => {
  it("FOCUS_CYCLE contains exactly screens, inspector, preview", () => {
    expect(FOCUS_CYCLE).toEqual(["screens", "inspector", "preview"]);
  });

  it("nextFocus('screens', false) returns 'inspector'", () => {
    expect(nextFocus("screens", false)).toBe("inspector");
  });

  it("nextFocus('inspector', false) returns 'preview'", () => {
    expect(nextFocus("inspector", false)).toBe("preview");
  });

  it("nextFocus('preview', false) returns 'screens' (wraps)", () => {
    expect(nextFocus("preview", false)).toBe("screens");
  });

  it("nextFocus('screens', true) returns 'preview' (reverse)", () => {
    expect(nextFocus("screens", true)).toBe("preview");
  });

  it("nextFocus('inspector', true) returns 'screens' (reverse)", () => {
    expect(nextFocus("inspector", true)).toBe("screens");
  });

  it("nextFocus('preview', true) returns 'inspector' (reverse)", () => {
    expect(nextFocus("preview", true)).toBe("inspector");
  });

  it("nextFocus('palette', false) returns 'screens' (palette collapse)", () => {
    expect(nextFocus("palette", false)).toBe("screens");
  });

  it("nextFocus('palette', true) returns 'screens' (palette collapse, reverse)", () => {
    expect(nextFocus("palette", true)).toBe("screens");
  });
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("canvas focus FSM (CANVAS-01, CANVAS-02)", () => {
  it("initial focus state is 'screens'", () => {
    const store = makeStubStore();
    const root = new RootCanvas(store, { theme: mockTheme });
    expect(root.getFocus()).toBe("screens");
  });

  it("CANVAS-01: Tab cycles screens → inspector → preview → screens", () => {
    const store = makeStubStore();
    const root = new RootCanvas(store, { theme: mockTheme });
    expect(root.getFocus()).toBe("screens");
    root.handleInput("\t"); // Tab
    expect(root.getFocus()).toBe("inspector");
    root.handleInput("\t");
    expect(root.getFocus()).toBe("preview");
    root.handleInput("\t");
    expect(root.getFocus()).toBe("screens"); // wraps
  });

  it("CANVAS-01: Shift-Tab reverses the focus cycle", () => {
    const store = makeStubStore();
    const root = new RootCanvas(store, { theme: mockTheme });
    root.handleInput("\x1b[Z"); // Shift-Tab
    expect(root.getFocus()).toBe("preview");
  });

  it("CANVAS-02: colon ':' opens the command palette regardless of focused pane", () => {
    const store = makeStubStore();
    const root = new RootCanvas(store, { theme: mockTheme });
    root.handleInput("\t"); // move to inspector
    expect(root.getFocus()).toBe("inspector");
    root.handleInput(":");
    expect(root.getFocus()).toBe("palette");
  });

  it("CANVAS-02: Ctrl+P opens the command palette", () => {
    const store = makeStubStore();
    const root = new RootCanvas(store, { theme: mockTheme });
    root.handleInput("\x10"); // Ctrl+P
    expect(root.getFocus()).toBe("palette");
  });

  it("CANVAS-02: Esc while palette is open returns focus to the previous pane", () => {
    const store = makeStubStore();
    const root = new RootCanvas(store, { theme: mockTheme });
    root.handleInput(":");
    expect(root.getFocus()).toBe("palette");
    root.handleInput("\x1b"); // Esc
    expect(root.getFocus()).toBe("screens");
  });

  it("CANVAS-01: Tab from 'palette' focus returns to 'screens'", () => {
    const store = makeStubStore();
    const root = new RootCanvas(store, { theme: mockTheme });
    root.handleInput(":");
    expect(root.getFocus()).toBe("palette");
    root.handleInput("\t"); // Tab while palette open
    expect(root.getFocus()).toBe("screens");
  });
});

// ── CommandPalette unit tests (CANVAS-02) ────────────────────────────────────

describe("CommandPalette — filter mode (CANVAS-02)", () => {
  it("initial render lists all commands from COMMANDS registry", () => {
    const store = makeStubStore();
    const onClose = vi.fn();
    const palette = new CommandPalette(store, onClose, mockTheme);
    const output = palette.render(60).join("\n");
    expect(output).toContain("add-screen");
  });

  it("Esc closes palette without store.apply", () => {
    const store = makeStubStore();
    const onClose = vi.fn();
    const applySpy = vi.spyOn(store, "apply");
    const palette = new CommandPalette(store, onClose, mockTheme);
    palette.handleInput("\x1b"); // Esc
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(applySpy).not.toHaveBeenCalled();
  });
});
