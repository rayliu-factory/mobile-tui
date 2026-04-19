// tests/canvas-chrome.test.ts — CANVAS-06 requirement
// Chrome hygiene test: render() output must never contain raw terminal
// alt-buffer or screen-clear escape sequences.
//
// This test is GREEN from day 1 against the stub (which returns ["NYI"] —
// no escape codes). Its role is to gate regressions once implementation lands.
//
// CANVAS-06: No raw alt-buffer escape sequences (\x1b[?1049h, \x1b[2J, \x1b[?)
//            must appear in render() output. pi-tui's diff renderer handles
//            all terminal switching internally.

import { describe, expect, it } from "vitest";
import type { ApplyResult, Snapshot, Store, StoreState } from "../src/editor/types.ts";
import type { Spec } from "../src/model/index.ts";
import type { AstHandle } from "../src/serialize/ast-handle.ts";
import type { WriteResult } from "../src/serialize/write.ts";
import { RootCanvas } from "../src/canvas/root.ts";

// ── Regex patterns for forbidden escape sequences ─────────────────────────────

/** Enter alternate screen buffer */
const ALT_BUFFER_ENTER = /\x1b\[\?1049h/;
/** Clear screen (full) */
const CLEAR_SCREEN = /\x1b\[2J/;
/** Any alternate screen / private mode sequence */
const ALT_SCREEN = /\x1b\[\?/;

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

function makeStubStore(): Store {
  const subscribers = new Set<(s: Snapshot) => void>();

  const stubState: StoreState = {
    spec: minimalSpec(),
    astHandle: {} as AstHandle,
    diagnostics: [],
    dirty: false,
    filePath: "/tmp/stub.spec.md",
  };

  return {
    getState: () => stubState,
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
  };
}

// ── Mock theme ────────────────────────────────────────────────────────────────

const mockTheme = {
  fg: (_token: string, str: string) => str,
  bold: (str: string) => str,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("canvas chrome hygiene (CANVAS-06)", () => {
  it("stub root.render(80) contains no raw alt-buffer sequences", () => {
    const store = makeStubStore();
    const root = new RootCanvas(store, { theme: mockTheme });
    const output = root.render(80).join("\n");

    expect(output).not.toMatch(ALT_BUFFER_ENTER);
    expect(output).not.toMatch(CLEAR_SCREEN);
    expect(output).not.toMatch(ALT_SCREEN);
  });

  it("stub root.render(120) contains no raw alt-buffer sequences at wider width", () => {
    const store = makeStubStore();
    const root = new RootCanvas(store, { theme: mockTheme });
    const output = root.render(120).join("\n");

    expect(output).not.toMatch(ALT_BUFFER_ENTER);
    expect(output).not.toMatch(CLEAR_SCREEN);
    expect(output).not.toMatch(ALT_SCREEN);
  });

  it("stub root.render(40) contains no raw alt-buffer sequences at narrow width", () => {
    const store = makeStubStore();
    const root = new RootCanvas(store, { theme: mockTheme });
    const output = root.render(40).join("\n");

    expect(output).not.toMatch(ALT_BUFFER_ENTER);
    expect(output).not.toMatch(CLEAR_SCREEN);
    expect(output).not.toMatch(ALT_SCREEN);
  });
});
