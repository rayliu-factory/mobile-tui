// src/serialize/sigil.test.ts
// Tests for sigil grammar parsing + AST normalization with WeakMap origin
// tracking. Covers D-22..D-25 and threat T-01-01 (ReDoS on 100KB input).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import YAML from "yaml";
import {
  createSigilOriginsMap,
  INTERACTABLE_KINDS,
  normalizeSigilsOnDoc,
  parseSigil,
  SIGIL_REGEX,
} from "./sigil.ts";

describe("parseSigil — grammar", () => {
  it.each([
    [
      "[Open Detail →open_detail test:habit_row]",
      { label: "Open Detail", action: "open_detail", testID: "habit_row" },
    ],
    ["[Save →save test:save_btn]", { label: "Save", action: "save", testID: "save_btn" }],
    ["[+ →add_habit test:add_btn]", { label: "+", action: "add_habit", testID: "add_btn" }],
  ])("parses %s", (input, expected) => {
    expect(parseSigil(input)).toEqual(expected);
  });

  it.each([
    "[ →action test:id]", // empty label
    "[Label →Action test:id]", // PascalCase action
    "Label →action test:id", // missing brackets
    "[Label action test:id]", // missing arrow
    "[Label →action]", // missing test:id
    "[Label →action test:Id_X]", // PascalCase testID
    "[Label →1action test:id]", // leading-digit action
    "[Label →action test:1id]", // leading-digit testID
    "", // empty string
    "random text", // noise
  ])("rejects %s", (input) => {
    expect(parseSigil(input)).toBeNull();
  });

  it("SIGIL_REGEX is anchored + exported as a RegExp constant", () => {
    expect(SIGIL_REGEX).toBeInstanceOf(RegExp);
    expect(SIGIL_REGEX.source.startsWith("^")).toBe(true);
    expect(SIGIL_REGEX.source.endsWith("$")).toBe(true);
  });

  it("SIGIL_REGEX is safe against 100KB adversarial input (T-01-01)", () => {
    const adversarial = `[${"a".repeat(100_000)}`;
    const start = Date.now();
    parseSigil(adversarial);
    expect(Date.now() - start).toBeLessThan(100);
  });
});

describe("INTERACTABLE_KINDS", () => {
  it("is the 5-element subset of COMPONENT_KINDS carrying InteractableBase", () => {
    expect([...INTERACTABLE_KINDS].sort()).toEqual([
      "Button",
      "ListItem",
      "SegmentedControl",
      "TextField",
      "Toggle",
    ]);
  });

  it("excludes TabBar (inline-extended per 01-04 decision)", () => {
    expect(INTERACTABLE_KINDS.has("TabBar")).toBe(false);
  });

  it("excludes non-interactable kinds (Column, Row, Text, ...)", () => {
    expect(INTERACTABLE_KINDS.has("Column")).toBe(false);
    expect(INTERACTABLE_KINDS.has("Row")).toBe(false);
    expect(INTERACTABLE_KINDS.has("Text")).toBe(false);
    expect(INTERACTABLE_KINDS.has("Card")).toBe(false);
  });
});

describe("createSigilOriginsMap", () => {
  it("returns an empty WeakMap each call", () => {
    const wm1 = createSigilOriginsMap();
    const wm2 = createSigilOriginsMap();
    expect(wm1).toBeInstanceOf(WeakMap);
    expect(wm2).toBeInstanceOf(WeakMap);
    expect(wm1).not.toBe(wm2);
  });
});

describe("normalizeSigilsOnDoc — parse-direction normalization", () => {
  it("splits a sigil-form Button label into triple fields + records 'sigil' origin", () => {
    const doc = YAML.parseDocument(
      [
        "screens:",
        "  - id: home",
        "    variants:",
        "      content:",
        "        kind: content",
        "        tree:",
        "          - kind: Button",
        '            label: "[Save →save test:save_btn]"',
        "",
      ].join("\n"),
      { version: "1.2", keepSourceTokens: true },
    );
    const wm = createSigilOriginsMap();
    normalizeSigilsOnDoc(doc, wm);

    // The Button node now has label = "Save", action = "save", testID = "save_btn".
    const btn = doc.getIn(["screens", 0, "variants", "content", "tree", 0]);
    expect((btn as { get: (k: string) => unknown }).get("label")).toBe("Save");
    expect((btn as { get: (k: string) => unknown }).get("action")).toBe("save");
    expect((btn as { get: (k: string) => unknown }).get("testID")).toBe("save_btn");
    // And the WeakMap records "sigil" for the button's node.
    expect(wm.get(btn as object)).toBe("sigil");
  });

  it("records 'triple' origin for a triple-form Button without mutation", () => {
    const raw = [
      "screens:",
      "  - id: home",
      "    variants:",
      "      content:",
      "        kind: content",
      "        tree:",
      "          - kind: Button",
      "            label: Save",
      "            action: save",
      "            testID: save_btn",
      "",
    ].join("\n");
    const doc = YAML.parseDocument(raw, { version: "1.2", keepSourceTokens: true });
    const wm = createSigilOriginsMap();
    normalizeSigilsOnDoc(doc, wm);
    // Byte-identical after normalization (triple form → no mutation).
    expect(doc.toString({ version: "1.2" })).toBe(raw);
    const btn = doc.getIn(["screens", 0, "variants", "content", "tree", 0]);
    expect(wm.get(btn as object)).toBe("triple");
  });

  it("records 'triple' for known interactables in habit-tracker fixture (D-25)", () => {
    const raw = readFileSync(resolve("fixtures/habit-tracker.spec.md"), "utf8");
    const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
    if (fmMatch === null) {
      throw new Error("habit-tracker.spec.md missing frontmatter delimiters");
    }
    const doc = YAML.parseDocument(fmMatch[1] ?? "", {
      version: "1.2",
      keepSourceTokens: true,
    });
    const wm = createSigilOriginsMap();
    normalizeSigilsOnDoc(doc, wm);

    // The canonical fixture is 100% triple-form per D-25. Verify a few known
    // interactables by AST path are recorded as "triple".
    // screens[0] = home; navbar trailing Button "+"
    const addHabitBtn = doc.getIn(["screens", 0, "variants", "content", "tree", 0, "trailing"]);
    expect(wm.get(addHabitBtn as object)).toBe("triple");

    // screens[0] ListItem (itemTemplate of the List)
    const listItem = doc.getIn(["screens", 0, "variants", "content", "tree", 1, "itemTemplate"]);
    expect(wm.get(listItem as object)).toBe("triple");

    // Nested Toggle inside the ListItem's Card → Row → Toggle
    const toggle = doc.getIn([
      "screens",
      0,
      "variants",
      "content",
      "tree",
      1,
      "itemTemplate",
      "children",
      0,
      "child",
      "children",
      1,
    ]);
    expect(wm.get(toggle as object)).toBe("triple");

    // screens[1] = new_habit; TextField inside Column children
    const textField = doc.getIn(["screens", 1, "variants", "content", "tree", 1, "children", 0]);
    expect(wm.get(textField as object)).toBe("triple");
  });

  it("splits a sigil-form ListItem (tappable all-or-nothing D-02)", () => {
    const raw = [
      "screens:",
      "  - id: home",
      "    variants:",
      "      content:",
      "        kind: content",
      "        tree:",
      "          - kind: List",
      "            bindsTo: /Habit",
      "            itemTemplate:",
      "              kind: ListItem",
      '              label: "[Open Detail →open_detail test:habit_row]"',
      "              children:",
      "                - kind: Text",
      "                  text: Row",
      "",
    ].join("\n");
    const doc = YAML.parseDocument(raw, { version: "1.2", keepSourceTokens: true });
    const wm = createSigilOriginsMap();
    normalizeSigilsOnDoc(doc, wm);

    const li = doc.getIn(["screens", 0, "variants", "content", "tree", 0, "itemTemplate"]);
    expect((li as { get: (k: string) => unknown }).get("label")).toBe("Open Detail");
    expect((li as { get: (k: string) => unknown }).get("action")).toBe("open_detail");
    expect((li as { get: (k: string) => unknown }).get("testID")).toBe("habit_row");
    expect(wm.get(li as object)).toBe("sigil");
  });

  it("skips non-interactable maps (no entry in WeakMap)", () => {
    const raw = [
      "screens:",
      "  - id: home",
      "    variants:",
      "      content:",
      "        kind: content",
      "        tree:",
      "          - kind: Column",
      "            children:",
      "              - kind: Text",
      "                text: Hello",
      "",
    ].join("\n");
    const doc = YAML.parseDocument(raw, { version: "1.2", keepSourceTokens: true });
    const wm = createSigilOriginsMap();
    normalizeSigilsOnDoc(doc, wm);

    const column = doc.getIn(["screens", 0, "variants", "content", "tree", 0]);
    const text = doc.getIn(["screens", 0, "variants", "content", "tree", 0, "children", 0]);
    // Neither Column nor Text are in INTERACTABLE_KINDS → no WeakMap entries.
    expect(wm.has(column as object)).toBe(false);
    expect(wm.has(text as object)).toBe(false);
  });

  it("no-op on document without a screens key (defensive)", () => {
    const doc = YAML.parseDocument("actions: {}\n", {
      version: "1.2",
      keepSourceTokens: true,
    });
    const wm = createSigilOriginsMap();
    expect(() => normalizeSigilsOnDoc(doc, wm)).not.toThrow();
  });

  it("no-op on scalar root document", () => {
    const doc = YAML.parseDocument("just-a-string\n", {
      version: "1.2",
      keepSourceTokens: true,
    });
    const wm = createSigilOriginsMap();
    expect(() => normalizeSigilsOnDoc(doc, wm)).not.toThrow();
  });
});
