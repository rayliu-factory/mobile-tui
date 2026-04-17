// Tests for Diagnostic shape, severity enum, and factory helpers.
// Shape per CONTEXT.md "Diagnostic codes": { code, severity, path, message }.
import { describe, expect, it } from "vitest";
import {
  DiagnosticSchema,
  DiagnosticSeveritySchema,
  error,
  info,
  warning,
} from "./diagnostic.ts";
import type { JsonPointer } from "./path.ts";

const pathBrand = (s: string) => s as JsonPointer;

describe("DiagnosticSeveritySchema", () => {
  it("accepts error | warning | info", () => {
    expect(DiagnosticSeveritySchema.safeParse("error").success).toBe(true);
    expect(DiagnosticSeveritySchema.safeParse("warning").success).toBe(true);
    expect(DiagnosticSeveritySchema.safeParse("info").success).toBe(true);
  });
  it("rejects other severities (closed enum)", () => {
    expect(DiagnosticSeveritySchema.safeParse("fatal").success).toBe(false);
    expect(DiagnosticSeveritySchema.safeParse("hint").success).toBe(false);
    expect(DiagnosticSeveritySchema.safeParse("").success).toBe(false);
  });
});

describe("DiagnosticSchema", () => {
  it("accepts a well-formed diagnostic", () => {
    expect(
      DiagnosticSchema.safeParse({
        code: "SPEC_UNKNOWN_COMPONENT",
        severity: "error",
        path: "/screens/0",
        message: 'unknown component kind "Foo"',
      }).success,
    ).toBe(true);
  });
  it("rejects lowercase code", () => {
    expect(
      DiagnosticSchema.safeParse({
        code: "spec_unknown",
        severity: "error",
        path: "/x",
        message: "m",
      }).success,
    ).toBe(false);
  });
  it("rejects kebab-case code", () => {
    expect(
      DiagnosticSchema.safeParse({
        code: "spec-unknown",
        severity: "error",
        path: "/x",
        message: "m",
      }).success,
    ).toBe(false);
  });
  it("rejects leading digit in code", () => {
    expect(
      DiagnosticSchema.safeParse({
        code: "1SPEC",
        severity: "error",
        path: "/x",
        message: "m",
      }).success,
    ).toBe(false);
  });
  it("rejects empty message", () => {
    expect(
      DiagnosticSchema.safeParse({
        code: "X",
        severity: "error",
        path: "/x",
        message: "",
      }).success,
    ).toBe(false);
  });
  it("rejects invalid severity", () => {
    expect(
      DiagnosticSchema.safeParse({
        code: "X",
        severity: "fatal",
        path: "/x",
        message: "m",
      }).success,
    ).toBe(false);
  });
  it("accepts minimal single-char code", () => {
    expect(
      DiagnosticSchema.safeParse({
        code: "X",
        severity: "info",
        path: "",
        message: "m",
      }).success,
    ).toBe(true);
  });
});

describe("factory helpers", () => {
  it("error() sets severity to error", () => {
    const d = error("TEST_CODE", pathBrand("/x"), "msg");
    expect(d.severity).toBe("error");
    expect(d.code).toBe("TEST_CODE");
    expect(d.path).toBe("/x");
    expect(d.message).toBe("msg");
  });
  it("warning() sets severity to warning", () => {
    expect(warning("C", pathBrand("/x"), "m").severity).toBe("warning");
  });
  it("info() sets severity to info", () => {
    expect(info("C", pathBrand("/x"), "m").severity).toBe("info");
  });
  it("factory output validates against DiagnosticSchema", () => {
    const d = error("VALID_CODE", pathBrand("/a"), "message");
    expect(DiagnosticSchema.safeParse(d).success).toBe(true);
  });
});
