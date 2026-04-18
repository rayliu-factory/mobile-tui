// Tests for renderTextField (Plan 03-05) — D-34 `Label: _________` form +
// D-42 hidden metadata. Phase-3 v1 ignores bindsTo/placeholder (no live
// data at render time).
import { describe, expect, it } from "vitest";
import { renderTextField } from "./text-field.ts";

function firstLine(lines: string[]): string {
  const [head] = lines;
  if (head === undefined) throw new Error("expected at least 1 line");
  return head;
}

describe("renderTextField (D-34, D-42)", () => {
  it("renders `Title: ______...` padded to width", () => {
    const result = renderTextField(
      { kind: "TextField", label: "Title", action: "edit_title", testID: "title_in" },
      60,
    );
    expect(result).toHaveLength(1);
    const line = firstLine(result);
    expect(line).toHaveLength(60);
    expect(line.startsWith("Title: ")).toBe(true);
    expect(line).toMatch(/_+/); // underscore run present
    expect(result).toMatchSnapshot();
  });

  it("underscores fill the remainder after `label: ` prefix", () => {
    const result = renderTextField(
      { kind: "TextField", label: "Name", action: "edit_name", testID: "name_in" },
      20,
    );
    const line = firstLine(result);
    expect(line).toHaveLength(20);
    expect(line.startsWith("Name: ")).toBe(true);
    // After `Name: ` (6 chars), 14 underscores fill the remainder.
    expect(line).toBe("Name: ______________");
  });

  it("bindsTo + placeholder ignored in v1 (rendered as empty field)", () => {
    const result = renderTextField(
      {
        kind: "TextField",
        label: "Email",
        action: "edit_email",
        testID: "email_in",
        placeholder: "you@example.com",
        bindsTo: "/user/email",
      },
      30,
    );
    const line = firstLine(result);
    expect(line).toHaveLength(30);
    expect(line).not.toContain("you@example.com");
    expect(line).not.toContain("/user/email");
    expect(line.startsWith("Email: ")).toBe(true);
  });

  it("action + testID hidden (D-42)", () => {
    const result = renderTextField(
      {
        kind: "TextField",
        label: "Title",
        action: "edit_title_action_zzz",
        testID: "title_input_id_yyy",
      },
      60,
    );
    const line = firstLine(result);
    expect(line).not.toContain("edit_title_action_zzz");
    expect(line).not.toContain("title_input_id_yyy");
  });

  it("truncates overlong label; `: ` separator + underscore run preserved", () => {
    const result = renderTextField(
      {
        kind: "TextField",
        label: "A very long label name that will overflow",
        action: "edit",
        testID: "t",
      },
      15,
    );
    const line = firstLine(result);
    expect(line).toHaveLength(15);
    // Some underscores remain visible (the field must read as a field).
    expect(line).toMatch(/_+/);
  });

  it("is deterministic (byte-equal on repeated calls)", () => {
    const a = renderTextField({ kind: "TextField", label: "X", action: "a", testID: "b" }, 40);
    const b = renderTextField({ kind: "TextField", label: "X", action: "a", testID: "b" }, 40);
    expect(a).toEqual(b);
  });

  it("rectangular contract: every line has length === width across widths", () => {
    const widths = [10, 20, 40, 60];
    for (const w of widths) {
      const r = renderTextField({ kind: "TextField", label: "Lbl", action: "a", testID: "b" }, w);
      expect(r.every((l) => l.length === w)).toBe(true);
    }
  });
});
