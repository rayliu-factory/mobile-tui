import { describe, expect, it } from "vitest";
import {
  ContentVariantSchema,
  EmptyVariantSchema,
  ErrorVariantSchema,
  LoadingVariantSchema,
  ScreenVariantsSchema,
} from "./variant.ts";

describe("individual variant schemas", () => {
  it("ContentVariant accepts { kind: content, tree: [] }", () => {
    expect(ContentVariantSchema.safeParse({ kind: "content", tree: [] }).success).toBe(true);
  });

  it("EmptyVariant accepts { kind: empty, when: { collection }, tree: [] }", () => {
    expect(
      EmptyVariantSchema.safeParse({
        kind: "empty",
        when: { collection: "/Habit" },
        tree: [],
      }).success,
    ).toBe(true);
  });

  it("LoadingVariant accepts { kind: loading, when: { async }, tree: [] }", () => {
    expect(
      LoadingVariantSchema.safeParse({
        kind: "loading",
        when: { async: "/is_loading" },
        tree: [],
      }).success,
    ).toBe(true);
  });

  it("ErrorVariant accepts { kind: error, when: { field_error }, tree: [] }", () => {
    expect(
      ErrorVariantSchema.safeParse({
        kind: "error",
        when: { field_error: "/form/email" },
        tree: [],
      }).success,
    ).toBe(true);
  });

  it("Empty rejects `when: { async }` (closed per-kind grammar D-08)", () => {
    expect(
      EmptyVariantSchema.safeParse({
        kind: "empty",
        when: { async: "/x" },
        tree: [],
      }).success,
    ).toBe(false);
  });

  it("Error rejects `when: { collection }`", () => {
    expect(
      ErrorVariantSchema.safeParse({
        kind: "error",
        when: { collection: "/x" },
        tree: [],
      }).success,
    ).toBe(false);
  });

  it("Empty rejects missing when", () => {
    expect(EmptyVariantSchema.safeParse({ kind: "empty", tree: [] }).success).toBe(false);
  });
});

describe("ScreenVariantsSchema — all four keys required (D-06)", () => {
  const content = { kind: "content", tree: [] };

  it("accepts all four keys with empty/loading/error = null", () => {
    expect(
      ScreenVariantsSchema.safeParse({
        content,
        empty: null,
        loading: null,
        error: null,
      }).success,
    ).toBe(true);
  });

  it("accepts all four keys with full variants", () => {
    expect(
      ScreenVariantsSchema.safeParse({
        content,
        empty: { kind: "empty", when: { collection: "/Habit" }, tree: [] },
        loading: { kind: "loading", when: { async: "/is_loading" }, tree: [] },
        error: { kind: "error", when: { field_error: "/form/email" }, tree: [] },
      }).success,
    ).toBe(true);
  });

  it("REJECTS omission of empty key (D-06 — must use null for N/A)", () => {
    expect(
      ScreenVariantsSchema.safeParse({
        content,
        loading: null,
        error: null,
      }).success,
    ).toBe(false);
  });

  it("REJECTS content: null (content is required non-null)", () => {
    expect(
      ScreenVariantsSchema.safeParse({
        content: null,
        empty: null,
        loading: null,
        error: null,
      }).success,
    ).toBe(false);
  });

  it("REJECTS extra keys (strict)", () => {
    expect(
      ScreenVariantsSchema.safeParse({
        content,
        empty: null,
        loading: null,
        error: null,
        bonus: null,
      }).success,
    ).toBe(false);
  });
});
