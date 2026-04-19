// tests/wizard-step-components.test.ts
// RED tests for ScreensStep and DataStep stateful step components.
// Plan 06-04, Task 1.

import { describe, expect, it } from "vitest";
import { ScreensStep } from "../src/wizard/steps/screens.ts";
import { DataStep } from "../src/wizard/steps/data.ts";

/** Passthrough theme for headless tests */
const theme = {
  fg: (_token: string, str: string) => str,
};

describe("ScreensStep", () => {
  it("handleInput(\\r) with non-empty inputValue pushes item and returns consumed", () => {
    const step = new ScreensStep(theme);
    // type "Home"
    step.handleInput("H");
    step.handleInput("o");
    step.handleInput("m");
    step.handleInput("e");
    const action = step.handleInput("\r");
    expect(action.kind).toBe("consumed");
    expect(step.getItems()).toEqual(["Home"]);
  });

  it("handleInput(\\r) with empty inputValue returns consumed (no-op)", () => {
    const step = new ScreensStep(theme);
    const action = step.handleInput("\r");
    expect(action.kind).toBe("consumed");
    expect(step.getItems()).toEqual([]);
  });

  it("handleInput(\\t) with 0 items sets error and returns consumed", () => {
    const step = new ScreensStep(theme);
    const action = step.handleInput("\t");
    expect(action.kind).toBe("consumed");
    expect(step.getItems()).toEqual([]);
  });

  it("handleInput(\\t) with 1+ items returns { kind: 'advance', args: items }", () => {
    const step = new ScreensStep(theme);
    // add "Home"
    step.handleInput("H");
    step.handleInput("o");
    step.handleInput("m");
    step.handleInput("e");
    step.handleInput("\r");
    const action = step.handleInput("\t");
    expect(action.kind).toBe("advance");
    if (action.kind === "advance") {
      expect(action.args).toEqual(["Home"]);
    }
  });

  it("handleInput(\\x7f) with empty inputValue and 1 item removes last item", () => {
    const step = new ScreensStep(theme);
    // add "Home"
    step.handleInput("H");
    step.handleInput("o");
    step.handleInput("m");
    step.handleInput("e");
    step.handleInput("\r");
    expect(step.getItems()).toHaveLength(1);
    const action = step.handleInput("\x7f"); // backspace on empty
    expect(action.kind).toBe("consumed");
    expect(step.getItems()).toEqual([]);
  });

  it("handleInput printable char appends to inputValue and returns consumed", () => {
    const step = new ScreensStep(theme);
    const action = step.handleInput("a");
    expect(action.kind).toBe("consumed");
  });

  it("render(40) returns non-empty string[]", () => {
    const step = new ScreensStep(theme);
    const lines = step.render(40);
    expect(Array.isArray(lines)).toBe(true);
    expect(lines.length).toBeGreaterThan(0);
  });

  it("render includes items in output", () => {
    const step = new ScreensStep(theme);
    step.handleInput("H");
    step.handleInput("o");
    step.handleInput("m");
    step.handleInput("e");
    step.handleInput("\r");
    const lines = step.render(40);
    const joined = lines.join("\n");
    expect(joined).toContain("Home");
  });

  it("loadFrom populates items list for re-entry", () => {
    const step = new ScreensStep(theme);
    step.loadFrom(["Home", "Profile"]);
    expect(step.getItems()).toEqual(["Home", "Profile"]);
  });

  it("handleInput(\\t) after error shows correct error text", () => {
    const step = new ScreensStep(theme);
    step.handleInput("\t"); // trigger error
    const lines = step.render(40);
    const joined = lines.join("\n");
    expect(joined).toContain("At least one screen is required.");
  });
});

describe("DataStep", () => {
  it("handleInput(\\t) with 0 items returns { kind: 'advance', args: [] } (no min-1)", () => {
    const step = new DataStep(theme);
    const action = step.handleInput("\t");
    expect(action.kind).toBe("advance");
    if (action.kind === "advance") {
      expect(action.args).toEqual([]);
    }
  });

  it("handleInput(\\r) adds entity and returns consumed", () => {
    const step = new DataStep(theme);
    step.handleInput("U");
    step.handleInput("s");
    step.handleInput("e");
    step.handleInput("r");
    const action = step.handleInput("\r");
    expect(action.kind).toBe("consumed");
    expect(step.getItems()).toEqual(["User"]);
  });

  it("handleInput(\\t) with 1+ items returns advance with items", () => {
    const step = new DataStep(theme);
    step.handleInput("U");
    step.handleInput("s");
    step.handleInput("e");
    step.handleInput("r");
    step.handleInput("\r");
    const action = step.handleInput("\t");
    expect(action.kind).toBe("advance");
    if (action.kind === "advance") {
      expect(action.args).toEqual(["User"]);
    }
  });

  it("loadFrom populates items for re-entry", () => {
    const step = new DataStep(theme);
    step.loadFrom(["User", "Post"]);
    expect(step.getItems()).toEqual(["User", "Post"]);
  });

  it("render(40) returns string array with placeholder", () => {
    const step = new DataStep(theme);
    const lines = step.render(40);
    expect(Array.isArray(lines)).toBe(true);
    expect(lines.length).toBeGreaterThan(0);
  });
});
