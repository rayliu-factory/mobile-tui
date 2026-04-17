import { describe, expect, it } from "vitest";
import { COMPONENT_KINDS } from "./component.ts";

describe("18-kind closed catalog", () => {
  it("exposes exactly 18 kinds", () => {
    expect(COMPONENT_KINDS.length).toBe(18);
  });
});
