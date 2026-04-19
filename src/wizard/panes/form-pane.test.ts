// src/wizard/panes/form-pane.test.ts
// TDD tests for FormPane.tryAdvance() at stepIndex === 5 (DataStep entity persistence).
// Tests cover WIZARD-02 and WIZARD-03: entity names collected by DataStep are persisted
// via store.apply("add-entity", ...) before onAdvance is called.
//
// RED phase: these tests fail until form-pane.ts is updated to call store.apply("add-entity").

import { describe, expect, it, vi } from "vitest";
import type { Store } from "../../editor/types.ts";
import type { EntityName } from "../../primitives/ids.ts";
import { createSeedSpec } from "../seed-spec.ts";
import { FormPane } from "./form-pane.ts";

/** Minimal theme stub */
function makeTheme() {
  return {
    fg: (_token: string, str: string) => str,
    bold: (str: string) => str,
  };
}

/** Creates a mock Store where all apply calls return ok:true by default */
function makeMockStore(
  applyImpl?: (command: string, args: unknown) => { ok: boolean; error?: string },
) {
  const applyCalls: Array<{ command: string; args: unknown }> = [];
  const store = {
    apply: vi.fn(async (command: string, args: unknown) => {
      applyCalls.push({ command, args });
      if (applyImpl) {
        return applyImpl(command, args);
      }
      return { ok: true };
    }),
    getSnapshot: vi.fn(() => ({
      spec: createSeedSpec(),
      diagnostics: [],
      dirty: false,
    })),
    subscribe: vi.fn(() => () => {}),
  } as unknown as Store;
  return { store, applyCalls };
}

/** Build a FormPane at stepIndex 5 with a given set of entity names pre-loaded */
function makeFormPaneAtDataStep(
  store: Store,
  entityNames: string[],
  onAdvance = vi.fn(),
  onRetreat = vi.fn(),
) {
  const theme = makeTheme();
  const pane = new FormPane(store, theme, onAdvance, onRetreat);

  // Build a spec with those entity names already in data.entities so setStep pre-populates
  const spec = createSeedSpec();
  spec.data.entities = entityNames.map((name) => ({
    name: name as EntityName,
    fields: [{ name: "id", type: "string" as const }],
  }));
  pane.setStep(5, spec);
  return pane;
}

describe("FormPane — stepIndex 5 DataStep entity persistence (WIZARD-02, WIZARD-03)", () => {
  it("Test 1: calls store.apply('add-entity') for each entity name before onAdvance", async () => {
    const onAdvance = vi.fn();
    const { store, applyCalls } = makeMockStore();
    const pane = makeFormPaneAtDataStep(store, ["Habit", "User"], onAdvance);

    // Simulate Tab key to trigger tryAdvance
    pane.handleInput("\t");

    // Wait for the async tryAdvance to settle
    await new Promise((resolve) => setTimeout(resolve, 100));

    const entityCalls = applyCalls.filter((c) => c.command === "add-entity");
    expect(entityCalls).toHaveLength(2);
    expect(entityCalls[0]?.args).toMatchObject({
      name: "Habit",
      fields: [{ name: "id", type: "string" }],
    });
    expect(entityCalls[1]?.args).toMatchObject({
      name: "User",
      fields: [{ name: "id", type: "string" }],
    });
    expect(onAdvance).toHaveBeenCalledOnce();
  });

  it("Test 2: zero store.apply calls when DataStep has no entities; onAdvance still called", async () => {
    const onAdvance = vi.fn();
    const { store, applyCalls } = makeMockStore();
    const pane = makeFormPaneAtDataStep(store, [], onAdvance);

    pane.handleInput("\t");
    await new Promise((resolve) => setTimeout(resolve, 100));

    const entityCalls = applyCalls.filter((c) => c.command === "add-entity");
    expect(entityCalls).toHaveLength(0);
    expect(onAdvance).toHaveBeenCalledOnce();
  });

  it("Test 3: store.apply returning ok:false sets this.error and blocks onAdvance", async () => {
    const onAdvance = vi.fn();
    let callCount = 0;
    const { store } = makeMockStore((_cmd, _args) => {
      callCount++;
      // First entity fails
      if (callCount === 1) return { ok: false, error: "invalid" };
      return { ok: true };
    });
    const pane = makeFormPaneAtDataStep(store, ["BadName", "Habit"], onAdvance);

    pane.handleInput("\t");

    // Wait a tick for async to settle
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(onAdvance).not.toHaveBeenCalled();
    // Render the pane to verify error is shown
    const lines = pane.render(60);
    const hasError = lines.some((l) => l.includes("Could not add entity") || l.includes("invalid"));
    expect(hasError).toBe(true);
  });

  it("Test 4: stub field { name: 'id', type: 'string' } is used for each entity", async () => {
    const onAdvance = vi.fn();
    const { store, applyCalls } = makeMockStore();
    const pane = makeFormPaneAtDataStep(store, ["Order"], onAdvance);

    pane.handleInput("\t");
    await new Promise((resolve) => setTimeout(resolve, 100));

    const entityCall = applyCalls.find((c) => c.command === "add-entity");
    expect(entityCall?.args).toMatchObject({
      name: "Order",
      fields: [{ name: "id", type: "string" }],
    });
  });
});
