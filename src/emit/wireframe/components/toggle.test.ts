// Tests for renderToggle (Plan 03-05) — D-34 `[ ]` off / `[x]` on + D-42
// hidden metadata. Phase-3 v1 always renders off (no live data at render
// time); state-parameterized render is deferred to Phase-5.
import { describe, expect, it } from "vitest";
import { renderToggle } from "./toggle.ts";

function firstLine(lines: string[]): string {
  const [head] = lines;
  if (head === undefined) throw new Error("expected at least 1 line");
  return head;
}

describe("renderToggle (D-34, D-42)", () => {
  it("default off state: `[ ] label` (bindsTo unresolved at render time)", () => {
    const result = renderToggle(
      { kind: "Toggle", label: "Done", action: "toggle_done", testID: "done_tog" },
      60,
    );
    expect(result).toHaveLength(1);
    const line = firstLine(result);
    expect(line).toHaveLength(60);
    expect(line.startsWith("[ ] Done")).toBe(true);
    expect(result).toMatchSnapshot();
  });

  it("bindsTo present but unresolved still renders off in v1", () => {
    const result = renderToggle(
      {
        kind: "Toggle",
        label: "Notify",
        action: "toggle_notify",
        testID: "notify_tog",
        bindsTo: "/settings/notifyEnabled",
      },
      40,
    );
    const line = firstLine(result);
    expect(line).toHaveLength(40);
    expect(line.startsWith("[ ] Notify")).toBe(true);
  });

  it("action + testID hidden (D-42)", () => {
    const result = renderToggle(
      {
        kind: "Toggle",
        label: "X",
        action: "toggle_x_habit_weekly",
        testID: "x_tog_test_id_zzz",
      },
      40,
    );
    const line = firstLine(result);
    expect(line).not.toContain("toggle_x_habit_weekly");
    expect(line).not.toContain("x_tog_test_id_zzz");
  });

  it("truncates overlong label; `[ ]` glyph preserved", () => {
    const result = renderToggle(
      {
        kind: "Toggle",
        label: "Enable very long notification preference",
        action: "toggle",
        testID: "t",
      },
      15,
    );
    const line = firstLine(result);
    expect(line).toHaveLength(15);
    expect(line.startsWith("[ ] ")).toBe(true);
  });

  it("is deterministic (byte-equal on repeated calls)", () => {
    const a = renderToggle({ kind: "Toggle", label: "X", action: "t", testID: "x" }, 30);
    const b = renderToggle({ kind: "Toggle", label: "X", action: "t", testID: "x" }, 30);
    expect(a).toEqual(b);
  });

  it("rectangular contract: every line has length === width across widths", () => {
    const widths = [10, 20, 40, 60];
    for (const w of widths) {
      const r = renderToggle(
        { kind: "Toggle", label: "Go", action: "g", testID: "g" },
        w,
      );
      expect(r.every((l) => l.length === w)).toBe(true);
    }
  });
});
