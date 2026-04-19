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
    filePath: "/tmp/stub.spec.md",
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

// ── CommandPalette filter and arg-prompt flow (CANVAS-02) ────────────────────

describe("CommandPalette — filter and arg-prompt (CANVAS-02)", () => {
  it("initial render lists all commands from COMMANDS registry", () => {
    const store = makeStubStore();
    const onClose = vi.fn();
    const palette = new CommandPalette(store, onClose, mockTheme);
    const output = palette.render(60).join("\n");
    // COMMANDS registry has 34 commands; at least one known command must appear
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

  it("typing filters commands by prefix/substring", () => {
    const store = makeStubStore();
    const onClose = vi.fn();
    const palette = new CommandPalette(store, onClose, mockTheme);
    // Type "add-s" — should match "add-screen" but NOT "delete-screen"
    for (const ch of "add-s") {
      palette.handleInput(ch);
    }
    const output = palette.render(60).join("\n");
    expect(output).toContain("add-screen");
    expect(output).not.toContain("delete-screen");
  });

  it("selecting a command with required args enters arg-prompt flow", () => {
    const store = makeStubStore();
    const onClose = vi.fn();
    const palette = new CommandPalette(store, onClose, mockTheme);
    // Filter to "add-screen" (which has required args: id, title, kind)
    for (const ch of "add-screen") {
      palette.handleInput(ch);
    }
    // Press Enter to select
    palette.handleInput("\r");
    // Should now be in arg-prompt mode — render should show a label with ": "
    const output = palette.render(60).join("\n");
    expect(output).toContain(": ");
    // store.apply should NOT have been called yet
    expect(vi.spyOn(store, "apply")).not.toHaveBeenCalled();
    // onClose should NOT have been called
    expect(onClose).not.toHaveBeenCalled();
  });

  it("entering all required args fires store.apply and closes", () => {
    const store = makeStubStore();
    const onClose = vi.fn();
    const applySpy = vi.spyOn(store, "apply");
    const palette = new CommandPalette(store, onClose, mockTheme);
    // Filter to "set-nav-root" (1 required arg: screenId)
    for (const ch of "set-nav-root") {
      palette.handleInput(ch);
    }
    // Press Enter to select the command
    palette.handleInput("\r");
    // Now in arg-prompt mode — type a screenId value and press Enter
    for (const ch of "home") {
      palette.handleInput(ch);
    }
    palette.handleInput("\r"); // Enter on last (only) arg
    // store.apply should have been called once with the command + collected arg
    expect(applySpy).toHaveBeenCalledTimes(1);
    const [cmdName, args] = applySpy.mock.calls[0]!;
    expect(cmdName).toBe("set-nav-root");
    expect((args as Record<string, string>)["screenId"]).toBe("home");
    // onClose should have been called
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Esc mid arg-prompt cancels without store.apply", () => {
    const store = makeStubStore();
    const onClose = vi.fn();
    const applySpy = vi.spyOn(store, "apply");
    const palette = new CommandPalette(store, onClose, mockTheme);
    // Navigate to add-screen
    for (const ch of "add-screen") {
      palette.handleInput(ch);
    }
    palette.handleInput("\r"); // select → enters arg-prompt
    // Now in arg-prompt mode — press Esc instead of completing
    palette.handleInput("\x1b");
    // No store.apply should fire
    expect(applySpy).not.toHaveBeenCalled();
    // onClose should have been called once
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
