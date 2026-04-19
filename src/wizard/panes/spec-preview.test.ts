// src/wizard/panes/spec-preview.test.ts — TDD RED tests for SpecPreviewPane (plan 06-05)
// Tests for the read-only YAML preview pane used in the wizard 2-pane layout (D-88, D-90).
//
// Behavior expectations (from plan 06-05 <behavior> block):
//   - render(width) before update() returns ["(loading...)"] padded to width
//   - update(snapshot) + render(width) returns YAML lines from yaml.stringify(snapshot.spec)
//   - Lines are truncated to width-2 (pane border padding)
//   - Calling update() again clears the cache so render() recomputes
//   - render() is idempotent — calling twice without update() returns same lines (cache hit)
//   - handleInput() is a no-op (read-only pane per D-90)
//   - invalidate() clears the line cache
//   - YAML output for a seed spec includes "schema:", "screens:", "actions:", "data:", "navigation:"

import { describe, expect, it } from "vitest";
import type { Snapshot } from "../../editor/types.ts";
import type { Diagnostic } from "../../primitives/diagnostic.ts";
import { createSeedSpec } from "../seed-spec.ts";
import { SpecPreviewPane } from "./spec-preview.ts";

function makeSnapshot(): Snapshot {
  return {
    spec: createSeedSpec(),
    diagnostics: [] as Diagnostic[],
    dirty: false,
  };
}

describe("SpecPreviewPane", () => {
  it("render(width) before any update() returns loading placeholder", () => {
    const pane = new SpecPreviewPane();
    const lines = pane.render(40);
    expect(lines.length).toBeGreaterThan(0);
    expect(lines[0]).toContain("(loading...)");
  });

  it("loading placeholder is padded to the requested width", () => {
    const pane = new SpecPreviewPane();
    const lines = pane.render(40);
    // First line should be padded to exactly 40 chars
    expect(lines[0]?.length).toBe(40);
  });

  it("update() + render() returns YAML lines from yaml.stringify(spec)", () => {
    const pane = new SpecPreviewPane();
    const snapshot = makeSnapshot();
    pane.update(snapshot);
    const lines = pane.render(40);
    // Should contain YAML content, not loading placeholder
    expect(lines.some((l) => l.includes("schema:"))).toBe(true);
  });

  it("YAML output for seed spec includes screens: key", () => {
    const pane = new SpecPreviewPane();
    pane.update(makeSnapshot());
    const lines = pane.render(60);
    expect(lines.some((l) => l.includes("screens:"))).toBe(true);
  });

  it("YAML output for seed spec includes actions: key", () => {
    const pane = new SpecPreviewPane();
    pane.update(makeSnapshot());
    const lines = pane.render(60);
    expect(lines.some((l) => l.includes("actions:"))).toBe(true);
  });

  it("YAML output for seed spec includes data: key", () => {
    const pane = new SpecPreviewPane();
    pane.update(makeSnapshot());
    const lines = pane.render(60);
    expect(lines.some((l) => l.includes("data:"))).toBe(true);
  });

  it("YAML output for seed spec includes navigation: key", () => {
    const pane = new SpecPreviewPane();
    pane.update(makeSnapshot());
    const lines = pane.render(60);
    expect(lines.some((l) => l.includes("navigation:"))).toBe(true);
  });

  it("lines are truncated to width-2 (border padding)", () => {
    const pane = new SpecPreviewPane();
    pane.update(makeSnapshot());
    const width = 40;
    const lines = pane.render(width);
    // All lines should be at most (width-2) chars long
    for (const line of lines) {
      expect(line.length).toBeLessThanOrEqual(width - 2);
    }
  });

  it("calling update() again clears cache and next render() recomputes", () => {
    const pane = new SpecPreviewPane();
    const snap1 = makeSnapshot();
    pane.update(snap1);
    const lines1 = pane.render(60);

    // Update with a modified snapshot
    const modifiedSpec = { ...snap1.spec, app_idea: "My brilliant app" };
    const snap2: Snapshot = { ...snap1, spec: modifiedSpec };
    pane.update(snap2);
    const lines2 = pane.render(60);

    // Lines should include the new app_idea field
    expect(lines2.some((l) => l.includes("My brilliant app"))).toBe(true);
    // The two renders should differ
    expect(lines1).not.toEqual(lines2);
  });

  it("render() is idempotent — calling twice without update() returns the same lines (cache hit)", () => {
    const pane = new SpecPreviewPane();
    pane.update(makeSnapshot());
    const lines1 = pane.render(40);
    const lines2 = pane.render(40);
    expect(lines1).toEqual(lines2);
  });

  it("handleInput() is a no-op (read-only pane)", () => {
    const pane = new SpecPreviewPane();
    // Should not throw or change any state
    expect(() => pane.handleInput("a")).not.toThrow();
    expect(() => pane.handleInput("\t")).not.toThrow();
  });

  it("invalidate() clears the line cache", () => {
    const pane = new SpecPreviewPane();
    pane.update(makeSnapshot());
    // Render to populate cache
    pane.render(60);
    // Invalidate should clear cache
    pane.invalidate();
    // Rendering again after invalidate should still work
    const lines = pane.render(60);
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.some((l) => l.includes("schema:"))).toBe(true);
  });
});
