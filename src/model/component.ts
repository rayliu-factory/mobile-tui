// src/model/component.ts
// A2UI-shaped component catalog — closed vocabulary of 18 kinds (SPEC-01).
//
// IMPLEMENTATION NOTE: This schema uses z.union + z.lazy + explicit
// z.ZodType<ComponentNode> annotation, NOT the discriminated-union variant.
// Zod v4's discriminated-union API does not compose with recursion — runtime
// error "Cannot access X before initialization" + TS inference collapse. See
// RESEARCH §Common Pitfalls #1 and GitHub issues #4264, #5288. Non-recursive
// unions in this codebase (Action, Variant, BackBehavior) DO use the
// discriminated-union API; ComponentNode is the single recursive-union module.
//
// Sigil triple (D-01..D-04):
//   - Interactable components (Button, TextField, Toggle, SegmentedControl,
//     tappable ListItem, TabBar items) require {label, action, testID}.
//   - Non-interactables (Text, Icon, Divider, Spacer, Image, Card, Column,
//     Row, List, NavBar, Modal, Sheet) do NOT carry sigils.
//   - ListItem is a tappable-or-container dual mode (all-or-nothing triple).
//
// Threat T-01-02: labels restricted to printable ASCII at schema time.
// Threat T-01-01: regex anchored + non-backtracking; z.lazy depth handled by
// Zod's stack-bounded evaluator (100-level stress test in component.test.ts).
import { z } from "zod";
import { SNAKE_CASE, TestIDSchema } from "../primitives/ids.ts";
import { JsonPointerSchema } from "../primitives/path.ts";

// 18-kind closed catalog — add kinds ONLY by updating this list AND the
// ComponentNode discriminated union type AND the ComponentNodeSchema union.
export const COMPONENT_KINDS = [
  "Column",
  "Row",
  "Text",
  "Button",
  "TextField",
  "List",
  "ListItem",
  "Card",
  "Image",
  "Icon",
  "Divider",
  "Toggle",
  "SegmentedControl",
  "TabBar",
  "NavBar",
  "Modal",
  "Sheet",
  "Spacer",
] as const;

export type ComponentKind = (typeof COMPONENT_KINDS)[number];
export const ComponentKindSchema = z.enum(COMPONENT_KINDS);

// D-03: printable ASCII only (0x20 = space through 0x7E = tilde).
// Anchored + non-backtracking — threat T-01-02 mitigation, no ReDoS.
const PRINTABLE_ASCII = /^[\x20-\x7E]+$/;

// Interactable sigil-triple base (D-01). Each interactable component
// extends this to carry {label, action, testID} in memory.
export const InteractableBase = z.object({
  label: z.string().regex(PRINTABLE_ASCII, "label must be printable ASCII (D-03)"),
  action: z.string().regex(SNAKE_CASE, "action ref must be snake_case"),
  testID: TestIDSchema,
});

// Forward TypeScript type — authoritative alongside ComponentNodeSchema.
// Adding a new component kind REQUIRES updating BOTH this union AND the
// schema's z.union branches (the grep gate in plan verification enforces parity).
export type ComponentNode =
  | { kind: "Text"; text: string; style?: "heading-1" | "heading-2" | "body" | "caption" }
  | { kind: "Icon"; name: string }
  | { kind: "Divider" }
  | { kind: "Spacer"; size?: "sm" | "md" | "lg" }
  | { kind: "Image"; source: string; alt: string }
  | {
      kind: "Button";
      label: string;
      action: string;
      testID: string;
      variant?: "primary" | "secondary" | "text";
    }
  | {
      kind: "TextField";
      label: string;
      action: string;
      testID: string;
      placeholder?: string;
      bindsTo?: string;
    }
  | { kind: "Toggle"; label: string; action: string; testID: string; bindsTo?: string }
  | {
      kind: "SegmentedControl";
      label: string;
      action: string;
      testID: string;
      options: string[];
      bindsTo?: string;
    }
  | {
      kind: "Column";
      children: ComponentNode[];
      align?: "start" | "center" | "end";
      gap?: "sm" | "md" | "lg";
    }
  | {
      kind: "Row";
      children: ComponentNode[];
      align?: "start" | "center" | "end";
      gap?: "sm" | "md" | "lg";
    }
  | { kind: "Card"; child: ComponentNode }
  | { kind: "List"; itemTemplate: ComponentNode; bindsTo: string }
  | {
      kind: "ListItem";
      children: ComponentNode[];
      label?: string;
      action?: string;
      testID?: string;
    }
  | { kind: "NavBar"; title: string; leading?: ComponentNode; trailing?: ComponentNode }
  | {
      kind: "TabBar";
      items: Array<{ label: string; action: string; testID: string; icon?: string }>;
    }
  | { kind: "Modal"; child: ComponentNode }
  | { kind: "Sheet"; child: ComponentNode };

// TabBar item — inline sigil triple, never a full ComponentNode.
const TabItem = InteractableBase.extend({ icon: z.string().optional() }).strict();

// --- Leaf (non-recursive) branches ---
const TextNode = z
  .object({
    kind: z.literal("Text"),
    text: z.string(),
    style: z.enum(["heading-1", "heading-2", "body", "caption"]).optional(),
  })
  .strict();

const IconNode = z
  .object({
    kind: z.literal("Icon"),
    name: z.string(),
  })
  .strict();

const DividerNode = z.object({ kind: z.literal("Divider") }).strict();

const SpacerNode = z
  .object({
    kind: z.literal("Spacer"),
    size: z.enum(["sm", "md", "lg"]).optional(),
  })
  .strict();

const ImageNode = z
  .object({
    kind: z.literal("Image"),
    source: z.string(),
    alt: z.string(),
  })
  .strict();

const ButtonNode = InteractableBase.extend({
  kind: z.literal("Button"),
  variant: z.enum(["primary", "secondary", "text"]).optional(),
}).strict();

const TextFieldNode = InteractableBase.extend({
  kind: z.literal("TextField"),
  placeholder: z.string().optional(),
  bindsTo: JsonPointerSchema.optional(),
}).strict();

const ToggleNode = InteractableBase.extend({
  kind: z.literal("Toggle"),
  bindsTo: JsonPointerSchema.optional(),
}).strict();

const SegmentedControlNode = InteractableBase.extend({
  kind: z.literal("SegmentedControl"),
  options: z.array(z.string()).min(2),
  bindsTo: JsonPointerSchema.optional(),
}).strict();

// --- Recursive branches — reference ComponentNodeSchema via z.lazy ---
// CRITICAL: z.ZodType<ComponentNode> annotation terminates TS inference.
// Without it, downstream types collapse to `unknown`. See RESEARCH §Pattern 1.
export const ComponentNodeSchema: z.ZodType<ComponentNode> = z.lazy(() =>
  z.union([
    TextNode,
    IconNode,
    DividerNode,
    SpacerNode,
    ImageNode,
    ButtonNode,
    TextFieldNode,
    ToggleNode,
    SegmentedControlNode,
    z
      .object({
        kind: z.literal("Column"),
        children: z.array(ComponentNodeSchema),
        align: z.enum(["start", "center", "end"]).optional(),
        gap: z.enum(["sm", "md", "lg"]).optional(),
      })
      .strict(),
    z
      .object({
        kind: z.literal("Row"),
        children: z.array(ComponentNodeSchema),
        align: z.enum(["start", "center", "end"]).optional(),
        gap: z.enum(["sm", "md", "lg"]).optional(),
      })
      .strict(),
    z
      .object({
        kind: z.literal("Card"),
        child: ComponentNodeSchema,
      })
      .strict(),
    z
      .object({
        kind: z.literal("List"),
        itemTemplate: ComponentNodeSchema,
        bindsTo: JsonPointerSchema,
      })
      .strict(),
    z
      .object({
        kind: z.literal("ListItem"),
        children: z.array(ComponentNodeSchema),
        label: z.string().regex(PRINTABLE_ASCII).optional(),
        action: z.string().regex(SNAKE_CASE).optional(),
        testID: TestIDSchema.optional(),
      })
      .strict()
      .refine(
        (v) => {
          // ListItem sigil triple is all-or-nothing per D-02:
          // either all three (tappable) or none (container).
          const have = [v.label, v.action, v.testID].filter((x) => x !== undefined).length;
          return have === 0 || have === 3;
        },
        {
          message: "ListItem sigil triple must be all-or-nothing (D-02): either all 3 or 0",
        },
      ),
    z
      .object({
        kind: z.literal("NavBar"),
        title: z.string(),
        leading: ComponentNodeSchema.optional(),
        trailing: ComponentNodeSchema.optional(),
      })
      .strict(),
    z
      .object({
        kind: z.literal("TabBar"),
        items: z.array(TabItem).min(2).max(5),
      })
      .strict(),
    z
      .object({
        kind: z.literal("Modal"),
        child: ComponentNodeSchema,
      })
      .strict(),
    z
      .object({
        kind: z.literal("Sheet"),
        child: ComponentNodeSchema,
      })
      .strict(),
  ]),
);
