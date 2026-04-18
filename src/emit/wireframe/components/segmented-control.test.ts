// Tests for renderSegmentedControl (Plan 03-05) — D-34 `< opt1 | opt2 | opt3 >`
// + D-42 hidden metadata. Phase-3 v1: no asterisk-selection marking (bindsTo
// unresolvable at render time); Phase-5 may parameterize per A1 in
// 03-RESEARCH.md §Component Emitter Details.
import { describe, expect, it } from "vitest";
import { renderSegmentedControl } from "./segmented-control.ts";

function firstLine(lines: string[]): string {
  const [head] = lines;
  if (head === undefined) throw new Error("expected at least 1 line");
  return head;
}

describe("renderSegmentedControl (D-34, D-42)", () => {
  it("renders `< Day | Week | Month >` padded to width (no selection in v1)", () => {
    const result = renderSegmentedControl(
      {
        kind: "SegmentedControl",
        label: "Period",
        action: "set_period",
        testID: "p",
        options: ["Day", "Week", "Month"],
      },
      60,
    );
    expect(result).toHaveLength(1);
    const line = firstLine(result);
    expect(line).toHaveLength(60);
    expect(line.startsWith("< Day | Week | Month >")).toBe(true);
    expect(result).toMatchSnapshot();
  });

  it("renders 2-option control with pipe separator", () => {
    const result = renderSegmentedControl(
      {
        kind: "SegmentedControl",
        label: "Mode",
        action: "set_mode",
        testID: "m",
        options: ["On", "Off"],
      },
      40,
    );
    const line = firstLine(result);
    expect(line).toHaveLength(40);
    expect(line.startsWith("< On | Off >")).toBe(true);
  });

  it("action + testID + top-level label hidden from visible glyph (D-42)", () => {
    const result = renderSegmentedControl(
      {
        kind: "SegmentedControl",
        label: "PeriodLabel",
        action: "set_period_action_zzz",
        testID: "period_ctrl_id_yyy",
        options: ["A", "B"],
      },
      60,
    );
    const line = firstLine(result);
    expect(line).not.toContain("set_period_action_zzz");
    expect(line).not.toContain("period_ctrl_id_yyy");
    // The top-level `label` is the sigil grouping, not part of the visible
    // glyph — only `options` render.
    expect(line).not.toContain("PeriodLabel");
  });

  it("truncates overlong options while preserving `<` and `>` endcaps", () => {
    const result = renderSegmentedControl(
      {
        kind: "SegmentedControl",
        label: "x",
        action: "y",
        testID: "z",
        options: ["very-long-option-one", "very-long-option-two", "very-long-option-three"],
      },
      30,
    );
    const line = firstLine(result);
    expect(line).toHaveLength(30);
    expect(line.startsWith("<")).toBe(true);
    // After right-padding the endcap `>` sits inside the line; trim trailing
    // spaces to find it.
    expect(line.trimEnd().endsWith(">")).toBe(true);
  });

  it("bindsTo present but unresolvable still produces no selection marking in v1", () => {
    const result = renderSegmentedControl(
      {
        kind: "SegmentedControl",
        label: "Period",
        action: "set_period",
        testID: "p",
        options: ["Day", "Week", "Month"],
        bindsTo: "/ui/period",
      },
      40,
    );
    const line = firstLine(result);
    expect(line).toHaveLength(40);
    // No asterisks in v1.
    expect(line).not.toContain("*");
  });

  it("is deterministic (byte-equal on repeated calls)", () => {
    const a = renderSegmentedControl(
      {
        kind: "SegmentedControl",
        label: "x",
        action: "y",
        testID: "z",
        options: ["A", "B"],
      },
      30,
    );
    const b = renderSegmentedControl(
      {
        kind: "SegmentedControl",
        label: "x",
        action: "y",
        testID: "z",
        options: ["A", "B"],
      },
      30,
    );
    expect(a).toEqual(b);
  });

  it("rectangular contract: every line has length === width across widths", () => {
    const widths = [20, 40, 60];
    for (const w of widths) {
      const r = renderSegmentedControl(
        {
          kind: "SegmentedControl",
          label: "x",
          action: "y",
          testID: "z",
          options: ["A", "B"],
        },
        w,
      );
      expect(r.every((l) => l.length === w)).toBe(true);
    }
  });
});
