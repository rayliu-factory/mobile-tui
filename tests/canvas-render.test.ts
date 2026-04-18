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
