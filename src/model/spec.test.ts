import { describe, expect, it } from "vitest";
import { SpecSchema } from "./spec.ts";
import { SCHEMA_VERSION } from "./version.ts";

// Minimal valid Spec literal for Phase 1 shape tests. Every top-level field
// is present and structurally valid. Cross-reference errors (undefined screen
// ids in nav edges, unresolved action refs, JSON Pointer targets that don't
// resolve into the data model, etc.) are Plan 06's concern — this suite
// ONLY exercises SpecSchema.safeParse shape validation.
const minimalSpec = {
  schema: SCHEMA_VERSION,
  screens: [
    {
      id: "home",
      title: "Home",
      kind: "regular",
      variants: {
        content: { kind: "content", tree: [] },
        empty: null,
        loading: null,
        error: null,
      },
    },
  ],
  actions: {},
  data: {
    entities: [{ name: "Habit", fields: [{ name: "title", type: "string" }] }],
  },
  navigation: { root: "home", edges: [] },
};

describe("SpecSchema", () => {
  it("accepts a minimal valid spec", () => {
    const result = SpecSchema.safeParse(minimalSpec);
    expect(result.success).toBe(true);
  });

  it('requires schema === SCHEMA_VERSION ("mobile-tui/1")', () => {
    const bad = { ...minimalSpec, schema: "mobile-tui/2" };
    expect(SpecSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects missing schema field", () => {
    const { schema: _, ...rest } = minimalSpec as Record<string, unknown>;
    expect(SpecSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects empty screens array (.min(1))", () => {
    expect(SpecSchema.safeParse({ ...minimalSpec, screens: [] }).success).toBe(false);
  });

  it.each(["actions", "data", "navigation"])("rejects missing top-level field: %s", (field) => {
    const bad = { ...minimalSpec } as Record<string, unknown>;
    delete bad[field];
    expect(SpecSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects unknown top-level key (Phase 2 owns _unknown: bucket; Phase 1 is strict)", () => {
    const bad = { ...minimalSpec, _unknown: { extra: "data" } };
    expect(SpecSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects __proto__ key (T-01-03 prototype-pollution mitigation)", () => {
    // Structured object with own-property __proto__ — Zod's .strict() rejects it.
    const bad = { ...minimalSpec, __proto__: { polluted: true } } as Record<string, unknown>;
    expect(SpecSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects constructor key (T-01-03 prototype-pollution mitigation)", () => {
    const bad = { ...minimalSpec, constructor: { polluted: true } };
    expect(SpecSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects prototype key (T-01-03 defence-in-depth)", () => {
    const bad = { ...minimalSpec, prototype: { polluted: true } };
    expect(SpecSchema.safeParse(bad).success).toBe(false);
  });

  it("accepts a richer spec with actions + data + nav edges + overlay screen", () => {
    const richer = {
      ...minimalSpec,
      actions: {
        open_detail: { kind: "navigate", screen: "detail" },
        save_habit: { kind: "submit", entity: "Habit" },
        open_settings: { kind: "present", overlay: "settings_modal" },
      },
      screens: [
        minimalSpec.screens[0],
        {
          id: "detail",
          title: "Detail",
          kind: "regular",
          back_behavior: "pop",
          variants: {
            content: { kind: "content", tree: [] },
            empty: null,
            loading: null,
            error: null,
          },
        },
        {
          id: "settings_modal",
          title: "Settings",
          kind: "overlay",
          back_behavior: "dismiss",
          variants: {
            content: { kind: "content", tree: [] },
            empty: null,
            loading: null,
            error: null,
          },
          acceptance: ["User can toggle dark mode"],
        },
      ],
      navigation: {
        root: "home",
        edges: [
          { from: "home", to: "detail", trigger: "open_detail", transition: "push" },
          { from: "home", to: "settings_modal", trigger: "open_settings", transition: "modal" },
        ],
      },
    };
    expect(SpecSchema.safeParse(richer).success).toBe(true);
  });

  // Phase-6 wizard schema extension tests — RED until spec.ts is edited.
  it("WIZARD accepts app_idea optional field (backward compat)", () => {
    const withWizard = { ...minimalSpec, app_idea: "A habit tracking app" };
    expect(SpecSchema.safeParse(withWizard).success).toBe(true);
  });

  it("WIZARD accepts nav_pattern optional enum field", () => {
    const withNav = { ...minimalSpec, nav_pattern: "tab_bar" as const };
    expect(SpecSchema.safeParse(withNav).success).toBe(true);
  });

  it("WIZARD accepts auth optional enum field", () => {
    const withAuth = { ...minimalSpec, auth: "email_password" as const };
    expect(SpecSchema.safeParse(withAuth).success).toBe(true);
  });

  it("WIZARD accepts offline_sync optional enum field", () => {
    const withSync = { ...minimalSpec, offline_sync: "read_only" as const };
    expect(SpecSchema.safeParse(withSync).success).toBe(true);
  });

  it("WIZARD accepts target_platforms optional array field", () => {
    const withPlatforms = { ...minimalSpec, target_platforms: ["ios", "android"] as const };
    expect(SpecSchema.safeParse(withPlatforms).success).toBe(true);
  });

  it("WIZARD accepts primary_user optional string field", () => {
    const withUser = { ...minimalSpec, primary_user: "fitness enthusiasts" };
    expect(SpecSchema.safeParse(withUser).success).toBe(true);
  });

  it("WIZARD existing spec without wizard fields still passes (backward compat)", () => {
    expect(SpecSchema.safeParse(minimalSpec).success).toBe(true);
  });

  it("WIZARD rejects invalid nav_pattern enum value", () => {
    const bad = { ...minimalSpec, nav_pattern: "drawer_bad" };
    expect(SpecSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects an unknown component kind nested deep in a screen tree", () => {
    const bad = {
      ...minimalSpec,
      screens: [
        {
          id: "home",
          title: "Home",
          kind: "regular",
          variants: {
            content: {
              kind: "content",
              tree: [{ kind: "FooWidget" }],
            },
            empty: null,
            loading: null,
            error: null,
          },
        },
      ],
    };
    expect(SpecSchema.safeParse(bad).success).toBe(false);
  });
});
