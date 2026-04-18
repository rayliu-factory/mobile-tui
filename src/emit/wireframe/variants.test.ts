// Tests for src/emit/wireframe/variants.ts — end-to-end render(spec, screenId).
// Covers: D-39 4-variant stack, D-40 header-in-top-border, D-41 when-trigger
// in header only, D-42 sigil metadata hidden, D-45 acceptance under content,
// D-37 NavBar root-trim, WIREFRAME-02 ASCII-baseline, WIREFRAME-05 pure function.
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { Spec } from "../../model/index.ts";
import { parseSpecFile } from "../../serialize/index.ts";
import { render } from "./variants.ts";

const ASCII_BASELINE = /^[|\-+. \x20-\x7E\n]*$/;

async function loadFixture(name: string): Promise<Spec> {
  const r = await parseSpecFile(resolve(`fixtures/${name}.spec.md`));
  if (!r.spec) throw new Error(`fixture ${name} failed to parse`);
  return r.spec;
}

describe("render — 4-variant stacking (D-39)", () => {
  it("stacks content, empty, loading, error blocks separated by blank lines", async () => {
    const spec = await loadFixture("habit-tracker");
    const screen = spec.screens[0];
    if (!screen) throw new Error("habit-tracker has no screens");
    const out = render(spec, screen.id);
    // Output contains markers for every variant slot (content + 3 others)
    expect(out).toContain("variant: content");
    expect(out).toMatch(/variant: empty/);
    expect(out).toMatch(/variant: loading/);
    expect(out).toMatch(/variant: error/);
    expect(out).toMatchSnapshot();
  });

  it("null variants render as 1-line (N/A) marker frames, NOT omitted", async () => {
    const spec = await loadFixture("habit-tracker");
    // home has loading + error = null; detail_modal has empty + loading + error null
    const screenWithNulls = spec.screens.find(
      (s) => s.variants.loading === null || s.variants.error === null,
    );
    if (!screenWithNulls) {
      throw new Error("expected habit-tracker to have at least one null variant");
    }
    const out = render(spec, screenWithNulls.id);
    expect(out).toContain("(N/A)");
  });

  it("ends with a trailing newline (D-Claude text encoding)", async () => {
    const spec = await loadFixture("habit-tracker");
    const first = spec.screens[0];
    if (!first) throw new Error("no screens");
    const out = render(spec, first.id);
    expect(out.endsWith("\n")).toBe(true);
  });
});

describe("render — header format (D-40, D-41)", () => {
  it("content variant header has no when trigger (D-41)", async () => {
    const spec = await loadFixture("habit-tracker");
    const screen = spec.screens[0];
    if (!screen) throw new Error("no screens");
    const out = render(spec, screen.id);
    const lines = out.split("\n");
    const contentHeader = lines.find((l) => l.includes("variant: content"));
    expect(contentHeader).toBeDefined();
    expect(contentHeader).not.toContain("when ");
  });

  it("empty variant header carries when collection trigger (D-41)", async () => {
    const spec = await loadFixture("habit-tracker");
    const screen = spec.screens.find((s) => s.variants.empty !== null);
    if (!screen) throw new Error("expected habit-tracker screen with empty variant");
    const out = render(spec, screen.id);
    const lines = out.split("\n");
    const emptyHeader = lines.find((l) => l.includes("variant: empty"));
    expect(emptyHeader).toContain("when collection");
  });

  it("when trigger appears ONLY in header, never in body (D-41)", async () => {
    const spec = await loadFixture("habit-tracker");
    const screen = spec.screens.find((s) => s.variants.empty !== null);
    if (!screen) throw new Error("expected empty variant screen");
    const out = render(spec, screen.id);
    // "when collection" appears once per variant header (empty has it; others don't)
    const occurrences = out.match(/when collection/g);
    expect(occurrences?.length).toBe(1);
  });

  it("loading variant header carries when async trigger (D-41)", async () => {
    const spec = await loadFixture("habit-tracker");
    // new_habit has loading + error non-null
    const screen = spec.screens.find((s) => s.variants.loading !== null);
    if (!screen) throw new Error("expected a screen with loading variant");
    const out = render(spec, screen.id);
    const lines = out.split("\n");
    const loadingHeader = lines.find((l) => l.includes("variant: loading"));
    expect(loadingHeader).toContain("when async");
  });

  it("error variant header carries when field_error trigger (D-41)", async () => {
    const spec = await loadFixture("habit-tracker");
    const screen = spec.screens.find((s) => s.variants.error !== null);
    if (!screen) throw new Error("expected a screen with error variant");
    const out = render(spec, screen.id);
    const lines = out.split("\n");
    const errorHeader = lines.find((l) => l.includes("variant: error"));
    expect(errorHeader).toContain("when field_error");
  });
});

describe("render — acceptance footer (D-45)", () => {
  it("acceptance prose renders below content block only", async () => {
    const spec = await loadFixture("habit-tracker");
    const screenWithAcceptance = spec.screens.find((s) => s.acceptance && s.acceptance.length > 0);
    if (!screenWithAcceptance) {
      throw new Error("expected at least one screen with acceptance");
    }
    const out = render(spec, screenWithAcceptance.id);
    // acceptance: label appears exactly once
    const lines = out.split("\n");
    const acceptanceLabelCount = lines.filter((l) => l.trimEnd() === "acceptance:").length;
    expect(acceptanceLabelCount).toBe(1);
  });

  it("acceptance footer is absent when screen has no acceptance", async () => {
    const spec = await loadFixture("habit-tracker");
    const screenWithout = spec.screens.find((s) => !s.acceptance || s.acceptance.length === 0);
    if (!screenWithout) throw new Error("expected at least one screen without acceptance");
    const out = render(spec, screenWithout.id);
    expect(out).not.toContain("acceptance:");
  });
});

describe("render — NavBar root-trim (D-37)", () => {
  it("root screen (back_behavior undefined) strips leading < from NavBar", async () => {
    const spec = await loadFixture("habit-tracker");
    const rootScreen = spec.screens.find((s) => s.back_behavior === undefined);
    if (!rootScreen) throw new Error("expected habit-tracker to have a root screen");
    const out = render(spec, rootScreen.id);
    // Find the content block's first body line (which should be the NavBar title).
    const lines = out.split("\n");
    const headerIdx = lines.findIndex((l) => l.includes("variant: content"));
    expect(headerIdx).toBeGreaterThanOrEqual(0);
    const navLine = lines[headerIdx + 1];
    expect(navLine).toBeDefined();
    // NavBar body must NOT contain "< " (root-trim active).
    expect(navLine?.includes("| < ")).toBe(false);
  });

  it("non-root screen retains leading < on NavBar", async () => {
    const spec = await loadFixture("habit-tracker");
    // new_habit has back_behavior: pop + NavBar
    const nonRoot = spec.screens.find((s) => s.back_behavior !== undefined && s.id === "new_habit");
    if (!nonRoot) throw new Error("expected non-root new_habit screen");
    const out = render(spec, nonRoot.id);
    const lines = out.split("\n");
    const headerIdx = lines.findIndex((l) => l.includes("variant: content"));
    expect(headerIdx).toBeGreaterThanOrEqual(0);
    const navLine = lines[headerIdx + 1];
    expect(navLine).toBeDefined();
    // non-root: NavBar should still carry "< "
    expect(navLine?.startsWith("| < ")).toBe(true);
  });
});

describe("render — purity + determinism (WIREFRAME-05)", () => {
  it("is deterministic: two calls produce byte-equal output", async () => {
    const spec = await loadFixture("habit-tracker");
    const first = spec.screens[0];
    if (!first) throw new Error("no screens");
    const a = render(spec, first.id);
    const b = render(spec, first.id);
    expect(a).toBe(b);
  });

  it("throws Error on unknown screenId (CLI-caller error)", async () => {
    const spec = await loadFixture("habit-tracker");
    expect(() => render(spec, "nonexistent_screen_id")).toThrow();
  });
});

describe("render — ASCII-baseline (WIREFRAME-02)", () => {
  const fixtures = ["habit-tracker", "todo", "social-feed"] as const;

  it.each(fixtures)("every screen in %s renders in ASCII-baseline charset", async (name) => {
    const spec = await loadFixture(name);
    for (const screen of spec.screens) {
      const out = render(spec, screen.id);
      if (!ASCII_BASELINE.test(out)) {
        const bad = [...out].filter((c) => !/[|\-+. \x20-\x7E\n]/.test(c));
        throw new Error(`[${name}/${screen.id}] non-ASCII: ${JSON.stringify(bad)}`);
      }
    }
  });
});
