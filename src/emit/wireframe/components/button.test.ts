// Tests for renderButton (Plan 03-05) — D-34 three-variant glyph + D-42 hidden
// metadata. Test shape mirrors text.test.ts (firstLine() helper satisfies
// tsconfig `noUncheckedIndexedAccess`).
import { describe, expect, it } from "vitest";
import { renderButton } from "./button.ts";

function firstLine(lines: string[]): string {
  const [head] = lines;
  if (head === undefined) throw new Error("expected at least 1 line");
  return head;
}

describe("renderButton (D-34, D-42)", () => {
  it("primary variant: [[ label ]]", () => {
    const result = renderButton(
      {
        kind: "Button",
        label: "Save",
        action: "save",
        testID: "save_btn",
        variant: "primary",
      },
      60,
    );
    expect(result).toHaveLength(1);
    const line = firstLine(result);
    expect(line).toHaveLength(60);
    expect(line.startsWith("[[ Save ]]")).toBe(true);
    expect(result).toMatchSnapshot();
  });

  it("secondary variant (default when variant omitted): [ label ]", () => {
    const result = renderButton(
      { kind: "Button", label: "Cancel", action: "cancel", testID: "cancel_btn" },
      60,
    );
    const line = firstLine(result);
    expect(line).toHaveLength(60);
    expect(line.startsWith("[ Cancel ]")).toBe(true);
  });

  it("explicit secondary variant: [ label ]", () => {
    const result = renderButton(
      {
        kind: "Button",
        label: "Cancel",
        action: "cancel",
        testID: "cancel_btn",
        variant: "secondary",
      },
      60,
    );
    const line = firstLine(result);
    expect(line.startsWith("[ Cancel ]")).toBe(true);
  });

  it("text variant: bare label (no structural glyph)", () => {
    const result = renderButton(
      {
        kind: "Button",
        label: "Skip",
        action: "skip",
        testID: "skip_btn",
        variant: "text",
      },
      60,
    );
    const line = firstLine(result);
    expect(line).toHaveLength(60);
    expect(line.startsWith("Skip")).toBe(true);
    // No structural brackets in text variant.
    expect(line.startsWith("[")).toBe(false);
  });

  it("truncates overlong label; primary glyph structural chars preserved", () => {
    const result = renderButton(
      {
        kind: "Button",
        label: "Save my progress to the cloud right now",
        action: "save_to_cloud",
        testID: "save_cloud_btn",
        variant: "primary",
      },
      20,
    );
    const line = firstLine(result);
    expect(line).toHaveLength(20);
    expect(line.startsWith("[[ ")).toBe(true);
    expect(line.includes(" ]]")).toBe(true);
  });

  it("truncates overlong label; secondary glyph structural chars preserved", () => {
    const result = renderButton(
      {
        kind: "Button",
        label: "Cancel and discard changes forever",
        action: "cancel_discard",
        testID: "cancel_btn",
      },
      18,
    );
    const line = firstLine(result);
    expect(line).toHaveLength(18);
    expect(line.startsWith("[ ")).toBe(true);
    expect(line.includes(" ]")).toBe(true);
  });

  it("action + testID do NOT appear in output (D-42)", () => {
    const result = renderButton(
      {
        kind: "Button",
        label: "Save",
        action: "save_habit_completed",
        testID: "save_btn_test_id_zzz",
        variant: "primary",
      },
      60,
    );
    const line = firstLine(result);
    expect(line).not.toContain("save_habit_completed");
    expect(line).not.toContain("save_btn_test_id_zzz");
  });

  it("is deterministic (byte-equal on repeated calls)", () => {
    const a = renderButton(
      { kind: "Button", label: "X", action: "x", testID: "x", variant: "primary" },
      30,
    );
    const b = renderButton(
      { kind: "Button", label: "X", action: "x", testID: "x", variant: "primary" },
      30,
    );
    expect(a).toEqual(b);
  });

  it("rectangular contract: every line has length === width across widths", () => {
    const widths = [10, 20, 40, 60];
    for (const w of widths) {
      const r = renderButton(
        { kind: "Button", label: "Go", action: "go", testID: "go", variant: "primary" },
        w,
      );
      expect(r.every((l) => l.length === w)).toBe(true);
    }
  });
});
