// Tests for renderTabBar (Plan 03-07) — D-37 `---` rule + `[ label ] | [ label ]`
// row. D-42: action + testID hidden; only label renders (threat T-03-08 mitigation).
import { describe, expect, it } from "vitest";
import { renderTabBar } from "./tab-bar.ts";

describe("renderTabBar (D-37, D-42)", () => {
  it("emits --- rule + `[ Home ] | [ Stats ] | [ Settings ]` row at width 60", () => {
    const r = renderTabBar(
      {
        kind: "TabBar",
        items: [
          { label: "Home", action: "go_home", testID: "home_tab" },
          { label: "Stats", action: "go_stats", testID: "stats_tab" },
          { label: "Settings", action: "go_settings", testID: "settings_tab" },
        ],
      },
      60,
    );
    expect(r).toHaveLength(2);
    expect(r[0]).toBe("-".repeat(60));
    expect(r[1]).toHaveLength(60);
    expect(r[1]).toContain("[ Home ]");
    expect(r[1]).toContain("[ Stats ]");
    expect(r[1]).toContain("[ Settings ]");
    expect(r[1]).toContain(" | ");
    expect(r).toMatchSnapshot();
  });

  it("action + testID hidden (D-42, threat T-03-08)", () => {
    const r = renderTabBar(
      {
        kind: "TabBar",
        items: [
          { label: "X", action: "go_x_action", testID: "x_tab_id" },
          { label: "Y", action: "go_y_action", testID: "y_tab_id" },
        ],
      },
      60,
    );
    expect(r[1]).not.toContain("go_x_action");
    expect(r[1]).not.toContain("x_tab_id");
    expect(r[1]).not.toContain("go_y_action");
    expect(r[1]).not.toContain("y_tab_id");
  });

  it("every line has length === width", () => {
    const r = renderTabBar(
      {
        kind: "TabBar",
        items: [
          { label: "A", action: "a", testID: "at" },
          { label: "B", action: "b", testID: "bt" },
        ],
      },
      40,
    );
    expect(r.every((l) => l.length === 40)).toBe(true);
  });

  it("is deterministic (byte-equal on repeated calls)", () => {
    const node = {
      kind: "TabBar" as const,
      items: [
        { label: "Home", action: "go_home", testID: "home_tab" },
        { label: "Stats", action: "go_stats", testID: "stats_tab" },
      ],
    };
    const a = renderTabBar(node, 60);
    const b = renderTabBar(node, 60);
    expect(a).toEqual(b);
  });

  it("rectangular contract holds across widths (2 items)", () => {
    const widths = [20, 30, 40, 60];
    for (const w of widths) {
      const r = renderTabBar(
        {
          kind: "TabBar",
          items: [
            { label: "A", action: "a", testID: "at" },
            { label: "B", action: "b", testID: "bt" },
          ],
        },
        w,
      );
      expect(r.every((l) => l.length === w)).toBe(true);
    }
  });
});
