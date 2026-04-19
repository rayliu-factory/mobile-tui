// tests/wizard-chrome.test.ts — Chrome hygiene for WizardRoot (mirrors canvas-chrome.test.ts)
// WIZARD-06: render() output must never contain raw terminal alt-buffer or screen-clear sequences.
import { describe, expect, it } from "vitest";
import type { ApplyResult, Snapshot, Store, StoreState } from "../src/editor/types.ts";
import type { Spec } from "../src/model/index.ts";
import type { AstHandle } from "../src/serialize/ast-handle.ts";
import type { WriteResult } from "../src/serialize/write.ts";
import { WizardRoot } from "../src/wizard/root.ts";
import { createSeedSpec } from "../src/wizard/seed-spec.ts";

// ── Regex patterns for forbidden escape sequences ─────────────────────────────

/** Enter alternate screen buffer */
const ALT_BUFFER_ENTER = /\x1b\[\?1049h/;
/** Clear screen (full) */
const CLEAR_SCREEN = /\x1b\[2J/;
/** Any alternate screen / private mode sequence */
const ALT_SCREEN = /\x1b\[\?/;

// ── Stub store ────────────────────────────────────────────────────────────────

function makeWizardStubStore(): Store {
  const subscribers = new Set<(s: Snapshot) => void>();

  const spec: Spec = createSeedSpec();

  const stubState: StoreState = {
    spec,
    astHandle: {} as AstHandle,
    diagnostics: [],
    dirty: false,
  };

  return {
    getState: () => stubState,
    subscribe: (fn: (s: Snapshot) => void) => {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },
    apply: async (_: string, __: unknown): Promise<ApplyResult> => ({
      spec,
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
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("wizard chrome hygiene", () => {
  it("WizardRoot.render(80) produces no alt-buffer escape sequences", () => {
    const store = makeWizardStubStore();
    const root = new WizardRoot(store, { theme: mockTheme });
    const output = root.render(80).join("\n");

    expect(output).not.toMatch(ALT_BUFFER_ENTER);
    expect(output).not.toMatch(CLEAR_SCREEN);
    expect(output).not.toMatch(ALT_SCREEN);
  });

  it("WizardRoot.render(120) produces no alt-buffer escape sequences at wider width", () => {
    const store = makeWizardStubStore();
    const root = new WizardRoot(store, { theme: mockTheme });
    const output = root.render(120).join("\n");

    expect(output).not.toMatch(ALT_BUFFER_ENTER);
    expect(output).not.toMatch(CLEAR_SCREEN);
    expect(output).not.toMatch(ALT_SCREEN);
  });

  it("graduation leaves no orphan escape sequences in output", () => {
    const store = makeWizardStubStore();
    const root = new WizardRoot(store, { theme: mockTheme });

    let graduated = false;
    root.onGraduate = () => {
      graduated = true;
    };

    // Trigger graduation — Ctrl+G
    root.handleInput("\x07");
    expect(graduated).toBe(true);

    // Render after graduation — no orphan sequences
    const output = root.render(80).join("\n");
    expect(output).not.toMatch(ALT_SCREEN);
  });
});
