// src/serialize/schema-inject.test.ts
// Tests for idempotent first-save `schema: mobile-tui/1` injection at top
// of frontmatter (D-28). Idempotency anchor: migrations/index.ts same-version
// no-op contract.
import { describe, expect, it } from "vitest";
import YAML from "yaml";
import { SCHEMA_VERSION } from "../model/index.ts";
import { injectSchemaIfAbsent } from "./schema-inject.ts";

describe("schema-inject.ts — injectSchemaIfAbsent", () => {
  it("returns true and injects schema pair when absent", () => {
    const doc = YAML.parseDocument("screens: []\nactions: {}\n", {
      version: "1.2",
      keepSourceTokens: true,
    });
    expect(doc.has("schema")).toBe(false);
    const injected = injectSchemaIfAbsent(doc);
    expect(injected).toBe(true);
    expect(doc.has("schema")).toBe(true);
    expect(doc.get("schema")).toBe(SCHEMA_VERSION);
  });

  it("injects schema at items[0] (top position, D-28)", () => {
    const doc = YAML.parseDocument("screens: []\nactions: {}\n", {
      version: "1.2",
      keepSourceTokens: true,
    });
    injectSchemaIfAbsent(doc);
    // Top-level contents must be a Map after injection of a keyed pair.
    const contents = doc.contents;
    if (contents === null || typeof contents !== "object" || !("items" in contents)) {
      throw new Error("doc.contents is not a YAMLMap after injection");
    }
    const items = (contents as { items: Array<{ key: { value: unknown } }> }).items;
    expect(items.length).toBeGreaterThanOrEqual(1);
    const firstItem = items[0];
    if (firstItem === undefined) {
      throw new Error("items[0] is undefined after injection");
    }
    expect(firstItem.key.value).toBe("schema");
  });

  it("forces blank line between schema and original first key (D-28)", () => {
    const doc = YAML.parseDocument("screens: []\nactions: {}\n", {
      version: "1.2",
      keepSourceTokens: true,
    });
    const injected = injectSchemaIfAbsent(doc);
    expect(injected).toBe(true);
    const emitted = doc.toString();
    // D-28 convention: `schema: mobile-tui/1\n\nscreens: ...` — blank line between.
    expect(emitted).toMatch(/^schema: mobile-tui\/1\n\nscreens:/);
  });

  it("is idempotent when schema already present (returns false, no mutation)", () => {
    const doc = YAML.parseDocument("schema: mobile-tui/1\n\nscreens: []\nactions: {}\n", {
      version: "1.2",
      keepSourceTokens: true,
    });
    const before = doc.toString();
    const injected = injectSchemaIfAbsent(doc);
    expect(injected).toBe(false);
    expect(doc.toString()).toBe(before);
  });

  it("second call returns false and leaves document unchanged (double-call idempotency)", () => {
    const doc = YAML.parseDocument("screens: []\n", {
      version: "1.2",
      keepSourceTokens: true,
    });
    const firstInject = injectSchemaIfAbsent(doc);
    expect(firstInject).toBe(true);
    const afterFirst = doc.toString();
    const secondInject = injectSchemaIfAbsent(doc);
    expect(secondInject).toBe(false);
    expect(doc.toString()).toBe(afterFirst);
  });

  it("creates single-pair map for empty document", () => {
    const doc = YAML.parseDocument("", { version: "1.2", keepSourceTokens: true });
    const injected = injectSchemaIfAbsent(doc);
    expect(injected).toBe(true);
    expect(doc.has("schema")).toBe(true);
    const emitted = doc.toString();
    expect(emitted).toMatch(/^schema: mobile-tui\/1\n/);
  });

  it("uses imported SCHEMA_VERSION literal (not hardcoded string)", () => {
    const doc = YAML.parseDocument("screens: []\n", {
      version: "1.2",
      keepSourceTokens: true,
    });
    injectSchemaIfAbsent(doc);
    // If someone inlines a literal "mobile-tui/1" then a future version bump
    // breaks silently. Check the value tracks the imported constant exactly.
    expect(doc.get("schema")).toBe(SCHEMA_VERSION);
  });

  it("preserves schema pair on re-parse + re-emit (first save lands, subsequent saves no-op)", () => {
    const doc = YAML.parseDocument("screens: []\nactions: {}\n", {
      version: "1.2",
      keepSourceTokens: true,
    });
    injectSchemaIfAbsent(doc);
    const emitted = doc.toString();
    // Simulate a subsequent read + write cycle.
    const reparsed = YAML.parseDocument(emitted, {
      version: "1.2",
      keepSourceTokens: true,
    });
    const secondInject = injectSchemaIfAbsent(reparsed);
    expect(secondInject).toBe(false);
    // And the schema is still at the top position.
    const contents = reparsed.contents;
    if (contents === null || typeof contents !== "object" || !("items" in contents)) {
      throw new Error("re-parsed contents is not a YAMLMap");
    }
    const items = (contents as { items: Array<{ key: { value: unknown } }> }).items;
    const firstItem = items[0];
    if (firstItem === undefined) {
      throw new Error("items[0] is undefined in re-parsed doc");
    }
    expect(firstItem.key.value).toBe("schema");
  });
});
