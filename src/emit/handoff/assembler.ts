// src/emit/handoff/assembler.ts
// Pure prompt assembler for LLM handoff commands (D-203).
//
// GUARANTEES:
//   - Returns deterministically from the same Spec + screenId + target input.
//   - No Date, no process.env, no fs, no Math.random (pure function).
//   - Screen spec + acceptance criteria: NEVER truncated (D-201).
//   - Nav neighbors + data entities: degrade to summary form when over budget.
//   - All emitted prop values appear in SEMANTIC_TOKENS (enforced by prop collection).

import * as YAML from "yaml";
import { isWithinBudget } from "./token-budget.ts";
import { SEMANTIC_TOKENS } from "./semantic-tokens.ts";
import type { Spec } from "../../model/index.ts";

export type Target = "swiftui" | "compose" | "tests";

export type AssembleResult =
  | { ok: true; prompt: string }
  | { ok: false; message: string };

/** Task preambles per target (D-206). */
const PREAMBLES: Record<Target, string> = {
  swiftui:
    "## Task\n\nImplement this screen in SwiftUI. Use SwiftUI native components aligned to the component tree below.",
  compose:
    "## Task\n\nImplement this screen in Jetpack Compose. Use Compose native components aligned to the component tree below.",
  tests:
    "## Task\n\nWrite Maestro YAML flows for this screen. Each acceptance criterion should map to one or more Maestro steps using the testID sigils listed in the actions section.",
};

const TOKEN_BUDGET = 2000;

// ── Section builders ─────────────────────────────────────────────────────────

function buildTaskPreamble(target: Target): string {
  return PREAMBLES[target];
}

function buildSpecSection(spec: Spec, screenId: string): string {
  const screen = spec.screens.find((s) => s.id === screenId);
  if (!screen) return "";
  // Build plain JS object — never stringify Zod-typed objects directly (T-8-05)
  const plain: Record<string, unknown> = {
    id: screen.id,
    title: screen.title,
    kind: screen.kind,
  };
  if (screen.back_behavior !== undefined) {
    plain["back_behavior"] = screen.back_behavior;
  }
  // Filter null variants before stringifying
  const variants: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(screen.variants)) {
    if (v !== null && v !== undefined) {
      variants[k] = v;
    }
  }
  plain["variants"] = variants;

  return `## Screen Spec\n\n\`\`\`yaml\n${YAML.stringify(plain).trimEnd()}\n\`\`\``;
}

function buildAcceptanceSection(spec: Spec, screenId: string): string {
  const screen = spec.screens.find((s) => s.id === screenId);
  if (!screen?.acceptance || screen.acceptance.length === 0) {
    return "## Acceptance Criteria\n\n_No acceptance criteria defined._";
  }
  const lines = screen.acceptance.map((line) => `- ${line}`).join("\n");
  return `## Acceptance Criteria\n\n${lines}`;
}

function buildNeighborsSection(spec: Spec, screenId: string, summaryOnly: boolean): string {
  const edges = spec.navigation.edges.filter(
    (e) => e.from === screenId || e.to === screenId,
  );
  const neighborIds = [
    ...new Set(
      edges.flatMap((e) => [e.from, e.to]).filter((id) => id !== screenId),
    ),
  ];
  if (neighborIds.length === 0) {
    return "## Navigation Neighbors\n\n_No navigation neighbors._";
  }
  const lines = neighborIds.map((id) => {
    const neighbor = spec.screens.find((s) => s.id === id);
    if (!neighbor) return `- ${id}`;
    if (summaryOnly) return `- ${id}`;
    const edge =
      edges.find((e) => e.from === screenId && e.to === id) ??
      edges.find((e) => e.to === id);
    const transition = edge?.transition ?? "unknown";
    return `- **${id}** (${neighbor.title}) — transition: ${transition}`;
  });
  return `## Navigation Neighbors\n\n${lines.join("\n")}`;
}

function buildEntitiesSection(spec: Spec, screenId: string, summaryOnly: boolean): string {
  // Collect entity names referenced by JSON Pointers in the screen's component tree
  const screen = spec.screens.find((s) => s.id === screenId);
  const bindsToValues: string[] = [];
  if (screen) {
    // Walk all variant trees collecting bindsTo values
    for (const variant of Object.values(screen.variants)) {
      if (!variant || !("tree" in variant) || !variant.tree) continue;
      // biome-ignore lint/suspicious/noExplicitAny: component tree is recursive unknown shape
      collectBindsTo(variant.tree as any[], bindsToValues);
    }
  }
  // Extract entity names: JSON Pointer "/EntityName/0/field" → EntityName
  const entityNames = new Set(
    bindsToValues
      .map((p) => p.split("/")[1])
      .filter((n): n is string => Boolean(n)),
  );
  const entities = spec.data.entities.filter((e) => entityNames.has(e.name));
  if (entities.length === 0) {
    return "## Data Entities\n\n_No data entities referenced by this screen._";
  }
  const lines = entities.map((entity) => {
    if (summaryOnly) {
      return `- **${entity.name}** (entity)`;
    }
    const fields = entity.fields.map((f) => `  - ${f.name}: ${f.type}`).join("\n");
    return `- **${entity.name}**\n${fields}`;
  });
  return `## Data Entities\n\n${lines.join("\n")}`;
}

function buildActionsSection(spec: Spec, screenId: string): string {
  const screen = spec.screens.find((s) => s.id === screenId);
  if (!screen) return "";
  // Collect action IDs referenced in the screen's component tree
  const actionIds = new Set<string>();
  for (const variant of Object.values(screen.variants)) {
    if (!variant || !("tree" in variant) || !variant.tree) continue;
    // biome-ignore lint/suspicious/noExplicitAny: component tree is recursive unknown shape
    collectActionIds(variant.tree as any[], actionIds);
  }
  if (actionIds.size === 0) return "";
  // spec.actions is Record<ActionId, Action> — iterate entries
  const relevantEntries = Object.entries(spec.actions).filter(([id]) => actionIds.has(id));
  if (relevantEntries.length === 0) return "";
  // Collect testID from the component tree nodes that reference each action
  const actionTestIds = collectActionTestIds(screen);
  const lines = relevantEntries.map(([id]) => {
    const testID = actionTestIds.get(id) ?? "(none)";
    return `- **${id}**: testID \`${testID}\``;
  });
  return `## Actions & TestIDs\n\n${lines.join("\n")}`;
}

function buildPropsComment(spec: Spec, screenId: string): string {
  const screen = spec.screens.find((s) => s.id === screenId);
  const propMap: Record<string, string> = {};
  if (screen) {
    collectProps(screen, propMap);
  }
  return `<!-- spec-props: ${JSON.stringify(propMap)} -->`;
}

// ── Tree walkers ─────────────────────────────────────────────────────────────

// biome-ignore lint/suspicious/noExplicitAny: component tree is recursive unknown shape
function collectBindsTo(nodes: any[], out: string[]): void {
  for (const node of nodes) {
    if (typeof node?.bindsTo === "string") out.push(node.bindsTo);
    if (Array.isArray(node?.children)) collectBindsTo(node.children, out);
    if (Array.isArray(node?.items)) collectBindsTo(node.items, out);
    if (node?.child && typeof node.child === "object") collectBindsTo([node.child], out);
    if (node?.itemTemplate && typeof node.itemTemplate === "object")
      collectBindsTo([node.itemTemplate], out);
    if (node?.leading && typeof node.leading === "object") collectBindsTo([node.leading], out);
    if (node?.trailing && typeof node.trailing === "object") collectBindsTo([node.trailing], out);
  }
}

// biome-ignore lint/suspicious/noExplicitAny: component tree is recursive unknown shape
function collectActionIds(nodes: any[], out: Set<string>): void {
  for (const node of nodes) {
    if (typeof node?.action === "string") out.add(node.action);
    if (Array.isArray(node?.children)) collectActionIds(node.children, out);
    if (Array.isArray(node?.items)) collectActionIds(node.items, out);
    if (node?.child && typeof node.child === "object") collectActionIds([node.child], out);
    if (node?.itemTemplate && typeof node.itemTemplate === "object")
      collectActionIds([node.itemTemplate], out);
    if (node?.leading && typeof node.leading === "object") collectActionIds([node.leading], out);
    if (node?.trailing && typeof node.trailing === "object")
      collectActionIds([node.trailing], out);
  }
}

// Collect Map<actionId, testID> from the screen's component tree for Actions section
// biome-ignore lint/suspicious/noExplicitAny: component tree is recursive unknown shape
function collectActionTestIds(screen: any): Map<string, string> {
  const result = new Map<string, string>();
  for (const variant of Object.values(screen.variants ?? {})) {
    // biome-ignore lint/suspicious/noExplicitAny: recursive tree walk
    if (!variant || !("tree" in (variant as any)) || !(variant as any).tree) continue;
    // biome-ignore lint/suspicious/noExplicitAny: recursive tree walk
    walkActionTestIds((variant as any).tree, result);
  }
  return result;
}

// biome-ignore lint/suspicious/noExplicitAny: recursive tree walk
function walkActionTestIds(nodes: any[], out: Map<string, string>): void {
  for (const node of nodes) {
    if (typeof node?.action === "string" && typeof node?.testID === "string") {
      out.set(node.action, node.testID);
    }
    if (Array.isArray(node?.children)) walkActionTestIds(node.children, out);
    if (Array.isArray(node?.items)) walkActionTestIds(node.items, out);
    if (node?.child && typeof node.child === "object") walkActionTestIds([node.child], out);
    if (node?.itemTemplate && typeof node.itemTemplate === "object")
      walkActionTestIds([node.itemTemplate], out);
    if (node?.leading && typeof node.leading === "object") walkActionTestIds([node.leading], out);
    if (node?.trailing && typeof node.trailing === "object")
      walkActionTestIds([node.trailing], out);
  }
}

// biome-ignore lint/suspicious/noExplicitAny: component tree is recursive unknown shape
function collectProps(screen: any, out: Record<string, string>): void {
  // Collect known semantic prop values from the screen and its component tree
  if (typeof screen.kind === "string" && SEMANTIC_TOKENS.has(screen.kind)) {
    out["screen.kind"] = screen.kind;
  }
  if (typeof screen.back_behavior === "string" && SEMANTIC_TOKENS.has(screen.back_behavior)) {
    out["screen.back_behavior"] = screen.back_behavior;
  }
  for (const variant of Object.values(screen.variants ?? {})) {
    // biome-ignore lint/suspicious/noExplicitAny: recursive tree walk
    walkComponentProps((variant as any)?.tree ?? [], out);
  }
}

// biome-ignore lint/suspicious/noExplicitAny: recursive tree walk
function walkComponentProps(nodes: any[], out: Record<string, string>): void {
  for (const node of nodes) {
    // Collect props that MUST be in SEMANTIC_TOKENS
    const propNames = ["variant", "gap", "align", "size", "style"] as const;
    for (const prop of propNames) {
      if (typeof node?.[prop] === "string") {
        const val = node[prop] as string;
        if (SEMANTIC_TOKENS.has(val)) {
          out[`${node.kind ?? "component"}.${prop}`] = val;
        }
      }
    }
    // Recurse into all child slots
    if (Array.isArray(node?.children)) walkComponentProps(node.children, out);
    if (Array.isArray(node?.items)) walkComponentProps(node.items, out);
    if (node?.child && typeof node.child === "object") walkComponentProps([node.child], out);
    if (node?.itemTemplate && typeof node.itemTemplate === "object")
      walkComponentProps([node.itemTemplate], out);
    if (node?.leading && typeof node.leading === "object") walkComponentProps([node.leading], out);
    if (node?.trailing && typeof node.trailing === "object")
      walkComponentProps([node.trailing], out);
  }
}

function joinSections(parts: string[]): string {
  return parts.filter(Boolean).join("\n\n");
}

// ── Main assembler (D-203 section order) ────────────────────────────────────

/**
 * Assemble a self-contained LLM prompt for a given screen and target framework.
 *
 * Section order (D-203):
 *   ## Task → ## Screen Spec → ## Acceptance Criteria →
 *   ## Navigation Neighbors → ## Data Entities → (## Actions & TestIDs for tests) →
 *   <!-- spec-props: {...} -->
 *
 * Degrades nav neighbors and entity sections to summary form when over budget (D-201).
 * Screen spec and acceptance criteria are NEVER truncated.
 */
export function assemblePrompt(spec: Spec, screenId: string, target: Target): string {
  const screen = spec.screens.find((s) => s.id === screenId);
  if (!screen) {
    throw new Error(`assemblePrompt: screen "${screenId}" not found in spec`);
  }

  const task = buildTaskPreamble(target);
  const specSection = buildSpecSection(spec, screenId);
  const acceptance = buildAcceptanceSection(spec, screenId);
  const neighborsFull = buildNeighborsSection(spec, screenId, false);
  const entitiesFull = buildEntitiesSection(spec, screenId, false);
  const actions = target === "tests" ? buildActionsSection(spec, screenId) : "";
  const propsComment = buildPropsComment(spec, screenId);

  const full = joinSections([
    task,
    specSection,
    acceptance,
    neighborsFull,
    entitiesFull,
    actions,
    propsComment,
  ]);
  if (isWithinBudget(full, TOKEN_BUDGET)) return full;

  // Degrade: neighbors → name-only, entities → name only (D-201)
  const neighborsDegraded = buildNeighborsSection(spec, screenId, true);
  const entitiesDegraded = buildEntitiesSection(spec, screenId, true);
  return joinSections([
    task,
    specSection,
    acceptance,
    neighborsDegraded,
    entitiesDegraded,
    actions,
    propsComment,
  ]);
}
