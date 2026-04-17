// src/serialize/write.test.ts
// Tests for the Phase-2 writeSpecFile orchestrator. Covers:
//   - BLOCKER fix #3: AST-layer adversarial-key pre-gate (__proto__,
//     constructor, prototype) blocks the write with no disk I/O
//   - D-31 save-gate: any severity:error from validateSpec blocks write
//     without creating a .tmp file
//   - Never-throws contract on schema-error input (D-31)
//   - Happy-path round-trip via atomic primitive
//   - BLOCKER fix #1: step-7 splice honors closingDelimiterTerminator for
//     "\n", "", and "\r\n"
//   - D-28 schema injection on first save
//   - setScalarPreserving CST edit preserves PLAIN quoting
//   - SERDE-07 auto-quote on YAML 1.1 gotcha scalars (yes/no/on/off/...)
//
// Synthetic AstHandles are built by mkAstHandle() until Plan 05 ships the
// real parseSpecFile. Defaults align with the LF baseline
// (closingDelimiterTerminator: "\n", hasFrontmatter: true).
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import YAML from "yaml";
import type { Spec } from "../model/index.ts";
import type { AstHandle } from "./ast-handle.ts";
import { createSigilOriginsMap } from "./sigil.ts";
import { setScalarPreserving, writeSpecFile } from "./write.ts";

const TMP_DIR = join(process.cwd(), "tests", "tmp");
let sandbox = "";

beforeEach(async () => {
  await fs.mkdir(TMP_DIR, { recursive: true });
  sandbox = join(TMP_DIR, randomUUID());
  await fs.mkdir(sandbox, { recursive: true });
});

afterEach(async () => {
  await fs.rm(sandbox, { recursive: true, force: true }).catch(() => undefined);
});

// Minimal valid spec that passes validateSpec() — `screens.min(1)`,
// `data.entities.min(1)`, `navigation.root` names an existing screen.
const MINIMAL_VALID_SPEC: Spec = {
  schema: "mobile-tui/1",
  screens: [
    {
      id: "home",
      title: "Home",
      kind: "regular",
      variants: {
        content: {
          kind: "content",
          tree: [{ kind: "Text", text: "hi", style: "body" }],
        },
        empty: null,
        loading: null,
        error: null,
      },
    },
  ],
  actions: {},
  data: {
    entities: [{ name: "Thing", fields: [{ name: "title", type: "string" }] }],
  },
  navigation: { root: "home", edges: [] },
} as unknown as Spec;

/**
 * Build a synthetic AstHandle for unit tests. Defaults align with the
 * LF-fixture baseline so happy-path tests asserting `/---\n$/` stay correct
 * after BLOCKER fix #1. Edge-case tests (empty-body, CRLF, no-trailing-
 * newline) override closingDelimiterTerminator explicitly.
 */
function mkAstHandle(yamlSource: string, overrides: Partial<AstHandle> = {}): AstHandle {
  const doc = YAML.parseDocument(yamlSource, {
    version: "1.2",
    keepSourceTokens: true,
  });
  const origBytes = `---\n${yamlSource}---\n`;
  return {
    doc,
    bodyBytes: "",
    origBytes,
    sigilOrigins: createSigilOriginsMap(),
    lineEndingStyle: "lf",
    orphanTemp: null,
    frontmatterStart: 0,
    frontmatterEnd: origBytes.length,
    closingDelimiterTerminator: "\n", // BLOCKER fix #1 default
    hasFrontmatter: true, // BLOCKER fix #2 default
    ...overrides,
  };
}

describe("writeSpecFile — adversarial-key AST pre-gate (BLOCKER fix #3)", () => {
  it("returns SPEC_UNKNOWN_TOP_LEVEL_KEY error for __proto__ in AST; creates no .tmp", async () => {
    const handle = mkAstHandle("__proto__: evil\nschema: mobile-tui/1\n");
    const target = join(sandbox, "protopollute.spec.md");
    const result = await writeSpecFile(target, MINIMAL_VALID_SPEC, handle);
    expect(result.written).toBe(false);
    expect(
      result.diagnostics.some(
        (d) => d.code === "SPEC_UNKNOWN_TOP_LEVEL_KEY" && d.severity === "error",
      ),
    ).toBe(true);
    // No disk I/O whatsoever.
    await expect(fs.access(target)).rejects.toBeDefined();
    await expect(fs.access(join(sandbox, ".protopollute.spec.md.tmp"))).rejects.toBeDefined();
  });

  it("blocks constructor + prototype adversarial keys as well", async () => {
    for (const adv of ["constructor", "prototype"] as const) {
      const handle = mkAstHandle(`${adv}: evil\nschema: mobile-tui/1\n`);
      const target = join(sandbox, `${adv}.spec.md`);
      const result = await writeSpecFile(target, MINIMAL_VALID_SPEC, handle);
      expect(result.written).toBe(false);
      expect(
        result.diagnostics.some(
          (d) => d.code === "SPEC_UNKNOWN_TOP_LEVEL_KEY" && d.severity === "error",
        ),
      ).toBe(true);
      await expect(fs.access(target)).rejects.toBeDefined();
      await expect(fs.access(join(sandbox, `.${adv}.spec.md.tmp`))).rejects.toBeDefined();
    }
  });
});

describe("writeSpecFile — save-gate (D-31)", () => {
  it("returns { written: false } on severity:error; creates no .tmp file", async () => {
    // WARNING #6 verified: navigation.root → nonexistent_screen emits
    // SPEC_UNRESOLVED_ACTION with severity:"error" per cross-reference.ts 368-373.
    const badSpec = {
      ...MINIMAL_VALID_SPEC,
      navigation: { root: "nonexistent_screen", edges: [] },
    } as unknown as Spec;
    const handle = mkAstHandle("schema: mobile-tui/1\n");
    const target = join(sandbox, "blocked.spec.md");
    const result = await writeSpecFile(target, badSpec, handle);
    expect(result.written).toBe(false);
    expect(result.diagnostics.some((d) => d.severity === "error")).toBe(true);
    // No disk I/O.
    await expect(fs.access(target)).rejects.toBeDefined();
    await expect(fs.access(join(sandbox, ".blocked.spec.md.tmp"))).rejects.toBeDefined();
  });

  it("never throws on schema-error input (D-31 never-throws contract)", async () => {
    const badSpec = { schema: "mobile-tui/1", screens: "not-an-array" } as unknown as Spec;
    const handle = mkAstHandle("schema: mobile-tui/1\n");
    const target = join(sandbox, "throws.spec.md");
    await expect(writeSpecFile(target, badSpec, handle)).resolves.toBeDefined();
  });
});

describe("writeSpecFile — happy path", () => {
  it("writes target via atomic primitive for a valid spec", async () => {
    const handle = mkAstHandle(
      [
        "schema: mobile-tui/1",
        "",
        "screens:",
        "  - id: home",
        "    title: Home",
        "    kind: regular",
        "    variants:",
        "      content:",
        "        kind: content",
        "        tree:",
        "          - kind: Text",
        "            text: hi",
        "            style: body",
        "      empty: null",
        "      loading: null",
        "      error: null",
        "",
        "actions: {}",
        "data:",
        "  entities:",
        "    - name: Thing",
        "      fields:",
        "        - name: title",
        "          type: string",
        "navigation:",
        "  root: home",
        "  edges: []",
        "",
      ].join("\n"),
    );
    const target = join(sandbox, "ok.spec.md");
    const result = await writeSpecFile(target, MINIMAL_VALID_SPEC, handle);
    expect(result.written).toBe(true);
    const bytes = await fs.readFile(target, "utf8");
    expect(bytes).toMatch(/^---\nschema: mobile-tui\/1\n/);
    // Default closingDelimiterTerminator "\n" + empty bodyBytes → file ends "---\n".
    expect(bytes).toMatch(/---\n$/);
  });
});

describe("writeSpecFile — step 7 splice honors closingDelimiterTerminator (BLOCKER fix #1)", () => {
  it("'\\n' terminator + non-empty body produces the exact terminator+body sequence", async () => {
    const handle = mkAstHandle("schema: mobile-tui/1\n", {
      bodyBytes: "\n# body\n",
      closingDelimiterTerminator: "\n",
    });
    const target = join(sandbox, "lf-body.spec.md");
    const result = await writeSpecFile(target, MINIMAL_VALID_SPEC, handle);
    expect(result.written).toBe(true);
    const bytes = await fs.readFile(target, "utf8");
    // output ends "---" + "\n" + "\n# body\n" = "---\n\n# body\n"
    expect(bytes.endsWith("---\n\n# body\n")).toBe(true);
  });

  it("'' terminator (empty-body fixture) produces output ending exactly at '---' (no trailing newline)", async () => {
    const handle = mkAstHandle("schema: mobile-tui/1\n", {
      bodyBytes: "",
      closingDelimiterTerminator: "",
    });
    const target = join(sandbox, "empty-body.spec.md");
    const result = await writeSpecFile(target, MINIMAL_VALID_SPEC, handle);
    expect(result.written).toBe(true);
    const bytes = await fs.readFile(target, "utf8");
    expect(bytes.endsWith("---")).toBe(true);
    // Not ending in newline.
    expect(bytes.endsWith("---\n")).toBe(false);
  });

  it("'\\r\\n' terminator + CRLF body produces closing '---\\r\\n' + body", async () => {
    const handle = mkAstHandle("schema: mobile-tui/1\n", {
      bodyBytes: "# body\r\n",
      closingDelimiterTerminator: "\r\n",
      lineEndingStyle: "crlf",
    });
    const target = join(sandbox, "crlf-body.spec.md");
    const result = await writeSpecFile(target, MINIMAL_VALID_SPEC, handle);
    expect(result.written).toBe(true);
    const bytes = await fs.readFile(target, "utf8");
    expect(bytes).toContain("---\r\n# body\r\n");
    expect(bytes.endsWith("---\r\n# body\r\n")).toBe(true);
  });
});

describe("writeSpecFile — schema inject (D-28)", () => {
  it("injects schema: mobile-tui/1 + blank line when astHandle doc lacks schema", async () => {
    const handle = mkAstHandle(
      [
        "screens:",
        "  - id: home",
        "    title: Home",
        "    kind: regular",
        "    variants:",
        "      content:",
        "        kind: content",
        "        tree: []",
        "      empty: null",
        "      loading: null",
        "      error: null",
        "actions: {}",
        "data:",
        "  entities:",
        "    - name: Thing",
        "      fields:",
        "        - name: title",
        "          type: string",
        "navigation:",
        "  root: home",
        "  edges: []",
        "",
      ].join("\n"),
    );
    const target = join(sandbox, "inject.spec.md");
    const result = await writeSpecFile(target, MINIMAL_VALID_SPEC, handle);
    expect(result.written).toBe(true);
    const bytes = await fs.readFile(target, "utf8");
    expect(bytes).toMatch(/^---\nschema: mobile-tui\/1\n\nscreens:/);
  });
});

describe("setScalarPreserving — CST edits", () => {
  it("preserves PLAIN quoting on scalar replace", () => {
    const doc = YAML.parseDocument("title: Home\n", {
      version: "1.2",
      keepSourceTokens: true,
    });
    setScalarPreserving(doc, ["title"], "New Title");
    const emitted = doc.toString();
    expect(emitted).toBe("title: New Title\n");
  });

  it("auto-quotes YAML 1.1 gotcha values (SERDE-07) — replace plain with 'yes'", () => {
    const doc = YAML.parseDocument("mode: development\n", {
      version: "1.2",
      keepSourceTokens: true,
    });
    setScalarPreserving(doc, ["mode"], "yes");
    const emitted = doc.toString();
    // Must emit double-quoted, NOT plain `yes` (would parse as boolean in YAML 1.1).
    expect(emitted).toMatch(/mode: "yes"/);
  });

  it("auto-quotes for every variant of yes/no/on/off/y/n/true/false (case-insensitive)", () => {
    for (const gotcha of ["YES", "No", "on", "OFF", "y", "N", "True", "FALSE"]) {
      const doc = YAML.parseDocument("k: placeholder\n", {
        version: "1.2",
        keepSourceTokens: true,
      });
      setScalarPreserving(doc, ["k"], gotcha);
      const emitted = doc.toString();
      expect(emitted).toMatch(new RegExp(`k: "${gotcha}"`));
    }
  });
});
