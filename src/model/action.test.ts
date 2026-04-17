import { describe, expect, it } from "vitest";
import { ActionSchema, ActionsRegistrySchema, MUTATE_OPS } from "./action.ts";

describe("ActionSchema — 6 closed kinds", () => {
  describe("navigate", () => {
    it("accepts { kind: navigate, screen }", () => {
      expect(
        ActionSchema.safeParse({
          kind: "navigate",
          screen: "home",
        }).success,
      ).toBe(true);
    });
    it("accepts optional params (map of name → JsonPointer)", () => {
      expect(
        ActionSchema.safeParse({
          kind: "navigate",
          screen: "detail",
          params: { id: "/Habit/0/id" },
        }).success,
      ).toBe(true);
    });
    it("rejects missing screen", () => {
      expect(ActionSchema.safeParse({ kind: "navigate" }).success).toBe(false);
    });
    it("rejects extra keys (strict)", () => {
      expect(
        ActionSchema.safeParse({
          kind: "navigate",
          screen: "home",
          extra: "nope",
        }).success,
      ).toBe(false);
    });
  });

  describe("submit", () => {
    it("accepts { kind: submit, entity }", () => {
      expect(
        ActionSchema.safeParse({
          kind: "submit",
          entity: "Habit",
        }).success,
      ).toBe(true);
    });
    it("rejects lowercase entity name (must be PascalCase)", () => {
      expect(
        ActionSchema.safeParse({
          kind: "submit",
          entity: "habit",
        }).success,
      ).toBe(false);
    });
  });

  describe("mutate", () => {
    it.each(MUTATE_OPS)("accepts mutate.op = %s", (op) => {
      expect(
        ActionSchema.safeParse({
          kind: "mutate",
          target: "/Habit/0/done",
          op,
          value: op === "toggle" ? undefined : "x",
        }).success,
      ).toBe(true);
    });
    it("rejects unknown op", () => {
      expect(
        ActionSchema.safeParse({
          kind: "mutate",
          target: "/x",
          op: "replace",
        }).success,
      ).toBe(false);
    });
    it("rejects non-RFC-6901 target", () => {
      expect(
        ActionSchema.safeParse({
          kind: "mutate",
          target: "not-a-pointer",
          op: "set",
        }).success,
      ).toBe(false);
    });
  });

  describe("present", () => {
    it("accepts { kind: present, overlay }", () => {
      expect(
        ActionSchema.safeParse({
          kind: "present",
          overlay: "detail_modal",
        }).success,
      ).toBe(true);
    });
  });

  describe("dismiss", () => {
    it("accepts { kind: dismiss }", () => {
      expect(ActionSchema.safeParse({ kind: "dismiss" }).success).toBe(true);
    });
  });

  describe("custom", () => {
    it("accepts snake_case name", () => {
      expect(
        ActionSchema.safeParse({
          kind: "custom",
          name: "request_camera_permission",
        }).success,
      ).toBe(true);
    });
    it("accepts optional description", () => {
      expect(
        ActionSchema.safeParse({
          kind: "custom",
          name: "open_url",
          description: "External link",
        }).success,
      ).toBe(true);
    });
    it("rejects non-snake-case name", () => {
      expect(
        ActionSchema.safeParse({
          kind: "custom",
          name: "RequestPermission",
        }).success,
      ).toBe(false);
    });
  });

  it("rejects unknown kind (closed union)", () => {
    expect(ActionSchema.safeParse({ kind: "teleport", screen: "home" }).success).toBe(false);
  });
});

describe("ActionsRegistrySchema", () => {
  it("accepts a record keyed by snake_case ActionId", () => {
    expect(
      ActionsRegistrySchema.safeParse({
        go_home: { kind: "navigate", screen: "home" },
        save_habit: { kind: "submit", entity: "Habit" },
      }).success,
    ).toBe(true);
  });

  it("rejects keys violating snake_case", () => {
    expect(
      ActionsRegistrySchema.safeParse({
        "1invalid": { kind: "dismiss" },
      }).success,
    ).toBe(false);
  });
});

describe("MUTATE_OPS constant", () => {
  it('equals exactly ["toggle", "set", "push", "remove"]', () => {
    expect(MUTATE_OPS).toEqual(["toggle", "set", "push", "remove"]);
  });
});
