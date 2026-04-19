// tests/wizard-form-pane.test.ts
// RED tests for FormPane orchestrator component.
// Plan 06-04, Task 2.

import { describe, expect, it, vi } from "vitest";
import { FormPane } from "../src/wizard/panes/form-pane.ts";
import { createSeedSpec } from "../src/wizard/seed-spec.ts";
import type { ApplyResult, Snapshot, Store, StoreState } from "../src/editor/types.ts";
import type { Spec } from "../src/model/index.ts";

/** Passthrough theme for headless tests */
const theme = {
  fg: (_token: string, str: string) => str,
  bold: (str: string) => str,
};

/** Build a minimal stub Store for FormPane testing */
function makeStubStore(spec?: Spec): Store {
  const _spec = spec ?? createSeedSpec();
  const okResult: ApplyResult = { spec: _spec, diagnostics: [], ok: true };
  return {
    getState(): StoreState {
      return {
        spec: _spec,
        astHandle: {} as StoreState["astHandle"],
        diagnostics: [],
        dirty: false,
        filePath: "/tmp/stub.spec.md",
      };
    },
    subscribe(_fn: (s: Snapshot) => void): () => void {
      return () => {};
    },
    apply: vi.fn().mockResolvedValue(okResult),
    undo: vi.fn().mockResolvedValue(null),
    redo: vi.fn().mockResolvedValue(null),
    flush: vi.fn().mockResolvedValue({ ok: true, path: "" }),
  };
}

describe("FormPane construction and setStep", () => {
  it("constructs without error", () => {
    const store = makeStubStore();
    const pane = new FormPane(store, theme, vi.fn(), vi.fn());
    expect(pane).toBeDefined();
  });

  it("setStep(0, spec) clears error and sets stepIndex 0", () => {
    const store = makeStubStore();
    const pane = new FormPane(store, theme, vi.fn(), vi.fn());
    const spec = createSeedSpec();
    pane.setStep(0, spec);
    // Verify render doesn't throw
    const lines = pane.render(40);
    expect(Array.isArray(lines)).toBe(true);
    expect(lines.length).toBeGreaterThan(0);
  });

  it("setStep(3, spec) loads ScreensStep from spec.screens non-placeholder screens", () => {
    const store = makeStubStore();
    const pane = new FormPane(store, theme, vi.fn(), vi.fn());
    const spec = createSeedSpec();
    // Seed spec has placeholder screen — should not be loaded
    pane.setStep(3, spec);
    const lines = pane.render(40);
    expect(Array.isArray(lines)).toBe(true);
  });

  it("setStep pre-populates inputValue from spec for step 0 (D-97)", () => {
    const store = makeStubStore();
    const pane = new FormPane(store, theme, vi.fn(), vi.fn());
    const spec = {
      ...createSeedSpec(),
      app_idea: "A todo app",
    } as Spec;
    pane.setStep(0, spec);
    const lines = pane.render(40);
    // The input line should contain the pre-populated value
    const joined = lines.join("\n");
    expect(joined).toContain("A todo app");
  });
});

describe("FormPane render", () => {
  it("render(40) first 2 lines form the step indicator (D-91)", () => {
    const store = makeStubStore();
    const pane = new FormPane(store, theme, vi.fn(), vi.fn());
    pane.setStep(0, createSeedSpec());
    const lines = pane.render(40);
    // Line 0: "Step 1/8: App Idea"
    expect(lines[0]).toContain("Step 1/8");
    // Line 1: dot row with ◉ for current step
    expect(lines[1]).toContain("◉");
  });

  it("render includes question text for current step", () => {
    const store = makeStubStore();
    const pane = new FormPane(store, theme, vi.fn(), vi.fn());
    pane.setStep(0, createSeedSpec());
    const lines = pane.render(60);
    const joined = lines.join("\n");
    expect(joined).toContain("app idea");
  });

  it("all render() lines are at most width chars long", () => {
    const store = makeStubStore();
    const pane = new FormPane(store, theme, vi.fn(), vi.fn());
    pane.setStep(0, createSeedSpec());
    const width = 40;
    const lines = pane.render(width);
    for (const line of lines) {
      expect(line.length).toBeLessThanOrEqual(width);
    }
  });
});

describe("FormPane keyboard navigation", () => {
  it("Esc on step 0 does nothing (D-95: no retreat from step 1)", () => {
    const store = makeStubStore();
    const onRetreat = vi.fn();
    const pane = new FormPane(store, theme, vi.fn(), onRetreat);
    pane.setStep(0, createSeedSpec());
    pane.handleInput("\x1b");
    expect(onRetreat).not.toHaveBeenCalled();
  });

  it("Esc on step 1+ calls onRetreat with stepIndex (D-95)", () => {
    const store = makeStubStore();
    const onRetreat = vi.fn();
    const pane = new FormPane(store, theme, vi.fn(), onRetreat);
    pane.setStep(1, createSeedSpec());
    pane.handleInput("\x1b");
    expect(onRetreat).toHaveBeenCalledWith(1);
  });

  it("Tab on step 0 with non-empty input calls store.apply then onAdvance", async () => {
    const store = makeStubStore();
    const onAdvance = vi.fn();
    const pane = new FormPane(store, theme, onAdvance, vi.fn());
    pane.setStep(0, createSeedSpec());
    pane.handleInput("H");
    pane.handleInput("i");
    pane.handleInput("\t");
    // Wait for the async tryAdvance to resolve
    await new Promise((r) => setTimeout(r, 10));
    expect(store.apply).toHaveBeenCalledWith("set-wizard-app-idea", expect.anything());
    expect(onAdvance).toHaveBeenCalledWith(0, null);
  });

  it("Tab on step 3 with ScreensStep empty list does NOT call onAdvance", async () => {
    const store = makeStubStore();
    const onAdvance = vi.fn();
    const pane = new FormPane(store, theme, onAdvance, vi.fn());
    pane.setStep(3, createSeedSpec());
    pane.handleInput("\t");
    await new Promise((r) => setTimeout(r, 10));
    expect(onAdvance).not.toHaveBeenCalled();
  });

  it("Tab on step 5 (DataStep) with empty list still calls onAdvance (no min-1)", async () => {
    const store = makeStubStore();
    const onAdvance = vi.fn();
    const pane = new FormPane(store, theme, onAdvance, vi.fn());
    pane.setStep(5, createSeedSpec());
    pane.handleInput("\t");
    await new Promise((r) => setTimeout(r, 10));
    expect(onAdvance).toHaveBeenCalledWith(5, null);
  });

  it("Enter on step 3 returns consumed (Pitfall 5: does NOT advance)", async () => {
    const store = makeStubStore();
    const onAdvance = vi.fn();
    const pane = new FormPane(store, theme, onAdvance, vi.fn());
    pane.setStep(3, createSeedSpec());
    // type a screen name
    pane.handleInput("H");
    pane.handleInput("o");
    pane.handleInput("m");
    pane.handleInput("e");
    // press Enter — should add screen, not advance
    pane.handleInput("\r");
    await new Promise((r) => setTimeout(r, 10));
    expect(onAdvance).not.toHaveBeenCalled();
  });
});

describe("FormPane invalidate", () => {
  it("invalidate() does not throw", () => {
    const store = makeStubStore();
    const pane = new FormPane(store, theme, vi.fn(), vi.fn());
    expect(() => pane.invalidate()).not.toThrow();
  });
});
