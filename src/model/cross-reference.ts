// src/model/cross-reference.ts
// Stage B of `validateSpec()` — cross-reference validation over a TYPED Spec.
//
// Semantics:
//   - Runs ONLY if Stage A (`SpecSchema.safeParse`) succeeded; input is the
//     already-typed `Spec` shape.
//   - Walks the spec ONCE, collecting declarations (screen ids, entity names,
//     action ids, testIDs) and checking references against them.
//   - Emits Diagnostic[] with SPEC_* codes per CONTEXT.md Claude's Discretion.
//
// SECURITY NOTE (T-01-02): `JsonPointer` here is RFC 6901 only — NEVER passed
// to `fs.*` or any other filesystem API. Resolution is a pure in-memory
// entity/field namespace lookup (see `resolveJsonPointerPrefix`).
//
// SECURITY NOTE (T-01-03): This pass is read-only over `spec`. No
// Object.assign / spread / mutation from the input into new containers.
// Zod's `.strict()` at Stage A already rejected `__proto__` / `constructor`.
//
// RESEARCH Pitfalls honored:
//   #3 — walkComponentTree is a FULL recursive function (visits every kind,
//        collects testIDs at every depth).
//   #4 — mutate.target resolution is PREFIX-only against entity/field names;
//        deeper path segments (array indices, nested refs) are not structurally
//        validated in Phase 1.
import type { Diagnostic } from "../primitives/diagnostic.ts";
import { decodeSegment, pathToJsonPointer } from "../primitives/path.ts";
import type { ComponentNode } from "./component.ts";
import type { Spec } from "./spec.ts";

// ---------- Walker context ----------

interface WalkContext {
  declaredActions: Set<string>;
  testIDRegistry: Map<string, string>; // testID → first-seen JSON Pointer
  diagnostics: Diagnostic[];
}

// ---------- Recursive component walker (RESEARCH Pitfall #3) ----------

/**
 * Recursively walks a component subtree accumulating:
 *   - testID collisions (D-05: globally unique across the entire spec)
 *   - unresolved `action` refs on interactable components
 *
 * `path` is the JSON-Pointer-shaped path-segment array from the spec root to
 * the parent of `nodes`. Each visited node extends it with its own index.
 *
 * No manual string-concat of JSON Pointers happens here — we build path
 * segment arrays and let `pathToJsonPointer` do the RFC 6901 escape. Hence
 * no `jsonpointer` library import is needed in this module.
 */
export function walkComponentTree(
  nodes: ComponentNode[],
  path: ReadonlyArray<string | number>,
  ctx: WalkContext,
): void {
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (!n) continue;
    visitNode(n, [...path, i], ctx);
  }
}

function visitNode(
  node: ComponentNode,
  path: ReadonlyArray<string | number>,
  ctx: WalkContext,
): void {
  // 1) Collect testID if this node declares one (Button / TextField / Toggle /
  //    SegmentedControl / tappable ListItem).
  collectTestID(node, path, ctx);

  // 2) Check `action` ref resolution if this node declares one.
  checkActionRef(node, path, ctx);

  // 3) Recurse into children — every recursive kind is enumerated explicitly
  //    to surface new kinds loudly (a new container kind added to component.ts
  //    must also be added here or its subtree is silently skipped).
  switch (node.kind) {
    case "Column":
    case "Row":
      walkComponentTree(node.children, [...path, "children"], ctx);
      break;
    case "Card":
      visitNode(node.child, [...path, "child"], ctx);
      break;
    case "List":
      visitNode(node.itemTemplate, [...path, "itemTemplate"], ctx);
      break;
    case "ListItem":
      walkComponentTree(node.children, [...path, "children"], ctx);
      break;
    case "NavBar":
      if (node.leading) visitNode(node.leading, [...path, "leading"], ctx);
      if (node.trailing) visitNode(node.trailing, [...path, "trailing"], ctx);
      break;
    case "TabBar":
      // TabBar items are INLINE sigil triples, not full ComponentNodes.
      // Collect their testIDs + action refs directly here.
      for (let i = 0; i < node.items.length; i++) {
        const item = node.items[i];
        if (!item) continue;
        const itemPath = [...path, "items", i];
        registerTestID(item.testID, [...itemPath, "testID"], ctx);
        registerActionRef(item.action, [...itemPath, "action"], ctx);
      }
      break;
    case "Modal":
    case "Sheet":
      visitNode(node.child, [...path, "child"], ctx);
      break;
    // Leaf kinds (no recursion): Text, Icon, Divider, Spacer, Image, Button,
    // TextField, Toggle, SegmentedControl.
    default:
      break;
  }
}

function collectTestID(
  node: ComponentNode,
  path: ReadonlyArray<string | number>,
  ctx: WalkContext,
): void {
  // Only interactables carry testIDs. We use a runtime `"testID" in node` check
  // because the discriminated union makes per-kind narrowing verbose — and
  // ListItem declares testID as OPTIONAL (tappable-or-container per D-02),
  // so an `in` guard is the cleanest way to cover all cases.
  if ("testID" in node && typeof node.testID === "string") {
    registerTestID(node.testID, [...path, "testID"], ctx);
  }
}

function registerTestID(
  testID: string,
  path: ReadonlyArray<string | number>,
  ctx: WalkContext,
): void {
  const ptr = pathToJsonPointer(path);
  const prev = ctx.testIDRegistry.get(testID);
  if (prev !== undefined) {
    ctx.diagnostics.push({
      code: "SPEC_TESTID_COLLISION",
      severity: "error",
      path: ptr,
      message: `testID "${testID}" already declared at ${prev}`,
    });
  } else {
    ctx.testIDRegistry.set(testID, ptr);
  }
}

function checkActionRef(
  node: ComponentNode,
  path: ReadonlyArray<string | number>,
  ctx: WalkContext,
): void {
  if ("action" in node && typeof node.action === "string") {
    registerActionRef(node.action, [...path, "action"], ctx);
  }
}

function registerActionRef(
  actionId: string,
  path: ReadonlyArray<string | number>,
  ctx: WalkContext,
): void {
  if (!ctx.declaredActions.has(actionId)) {
    ctx.diagnostics.push({
      code: "SPEC_UNRESOLVED_ACTION",
      severity: "error",
      path: pathToJsonPointer(path),
      message: `action "${actionId}" referenced but not declared in actions registry`,
    });
  }
}

// ---------- Entity/field namespace resolution (RESEARCH Pitfall #4) ----------

/**
 * Resolve a JSON Pointer's FIRST TWO tokens against the data-model namespace.
 *
 *   "/EntityName/field_name"         → true  iff entity exists with that field
 *   "/EntityName/field_name/0/foo"   → true  (deeper path accepted; only the
 *                                             entity/field prefix is validated
 *                                             per Pitfall #4)
 *   "/UnknownEntity/…"               → false
 *   "/KnownEntity/ghost_field"       → false
 *   ""  /  "notapath"  /  "/only"    → false
 *
 * Manual string split — we intentionally do NOT use the `jsonpointer` library
 * here. The library's `.get(obj, ptr)` resolves against a JSON INSTANCE, but
 * our data model is a TYPE definition (Entity + named Fields), not a populated
 * object. Re-using `.get` would require synthesizing a fake instance, which
 * is both slower and semantically confusing.
 *
 * Entity and field segments are decoded from RFC 6901 before lookup
 * (`decodeSegment` applied).
 */
export function resolveJsonPointerPrefix(spec: Spec, pointer: string): boolean {
  if (!pointer.startsWith("/")) return false;
  const parts = pointer.slice(1).split("/").map(decodeSegment);
  if (parts.length < 2) return false;
  const [entityName, fieldName] = parts;
  if (!entityName || !fieldName) return false;
  const entity = spec.data.entities.find((e) => e.name === entityName);
  if (!entity) return false;
  return entity.fields.some((f) => f.name === fieldName);
}

// ---------- Helper: when-path resolver used by 3 variant kinds ----------

function resolveWhenPath(
  spec: Spec,
  pointer: string,
  path: ReadonlyArray<string | number>,
  ctx: WalkContext,
): void {
  if (!resolveJsonPointerPrefix(spec, pointer)) {
    ctx.diagnostics.push({
      code: "SPEC_JSONPTR_UNRESOLVED",
      severity: "error",
      path: pathToJsonPointer(path),
      message: `JSON Pointer "${pointer}" does not resolve under data model`,
    });
  }
}

// ---------- Stage B entry point ----------

export function crossReferencePass(spec: Spec): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  const seenScreenIds = new Map<string, number>(); // id → first-seen index
  for (let i = 0; i < spec.screens.length; i++) {
    const s = spec.screens[i];
    if (!s) continue;
    const prev = seenScreenIds.get(s.id);
    if (prev !== undefined) {
      diagnostics.push({
        code: "SPEC_DUPLICATE_SCREEN_ID",
        severity: "error",
        path: pathToJsonPointer(["screens", i, "id"]),
        message: `screen id "${s.id}" already declared at /screens/${prev}/id`,
      });
    } else {
      seenScreenIds.set(s.id, i);
    }
  }
  const declaredScreens = new Set(seenScreenIds.keys());

  const seenEntityNames = new Map<string, number>(); // name → first-seen index
  for (let i = 0; i < spec.data.entities.length; i++) {
    const e = spec.data.entities[i];
    if (!e) continue;
    const prev = seenEntityNames.get(e.name);
    if (prev !== undefined) {
      diagnostics.push({
        code: "SPEC_DUPLICATE_ENTITY_NAME",
        severity: "error",
        path: pathToJsonPointer(["data", "entities", i, "name"]),
        message: `entity name "${e.name}" already declared at /data/entities/${prev}/name`,
      });
    } else {
      seenEntityNames.set(e.name, i);
    }
  }
  const declaredEntities = new Set(seenEntityNames.keys());
  const declaredActions = new Set(Object.keys(spec.actions));
  const testIDRegistry = new Map<string, string>();

  const ctx: WalkContext = { declaredActions, testIDRegistry, diagnostics };

  // --- Per-screen checks ---
  for (let i = 0; i < spec.screens.length; i++) {
    const screen = spec.screens[i];
    if (!screen) continue;

    const isRoot = screen.id === spec.navigation.root;

    // SPEC_MISSING_BACK_BEHAVIOR — non-root screens must declare back_behavior.
    // Shape-level: `back_behavior` is optional on Screen. Cross-ref enforces
    // presence on every non-root screen (per D-12 / CONTEXT.md).
    if (!isRoot && !screen.back_behavior) {
      diagnostics.push({
        code: "SPEC_MISSING_BACK_BEHAVIOR",
        severity: "error",
        path: pathToJsonPointer(["screens", i, "back_behavior"]),
        message: `non-root screen "${screen.id}" must declare back_behavior`,
      });
    }

    // Walk each populated variant tree; Zod already rejected omitted keys
    // (SPEC_VARIANT_OMITTED is therefore Stage-A SPEC_INVALID_TYPE territory),
    // so here we only walk content + any of {empty, loading, error} that are
    // non-null.
    const variants = screen.variants;
    walkComponentTree(
      variants.content.tree as ComponentNode[],
      ["screens", i, "variants", "content", "tree"],
      ctx,
    );
    if (variants.empty) {
      walkComponentTree(
        variants.empty.tree as ComponentNode[],
        ["screens", i, "variants", "empty", "tree"],
        ctx,
      );
      resolveWhenPath(
        spec,
        variants.empty.when.collection,
        ["screens", i, "variants", "empty", "when", "collection"],
        ctx,
      );
    }
    if (variants.loading) {
      walkComponentTree(
        variants.loading.tree as ComponentNode[],
        ["screens", i, "variants", "loading", "tree"],
        ctx,
      );
      resolveWhenPath(
        spec,
        variants.loading.when.async,
        ["screens", i, "variants", "loading", "when", "async"],
        ctx,
      );
    }
    if (variants.error) {
      walkComponentTree(
        variants.error.tree as ComponentNode[],
        ["screens", i, "variants", "error", "tree"],
        ctx,
      );
      resolveWhenPath(
        spec,
        variants.error.when.field_error,
        ["screens", i, "variants", "error", "when", "field_error"],
        ctx,
      );
    }
  }

  // --- Action intent cross-checks (D-13) ---
  // Object.entries ordering: insertion order for string keys (ES2015+).
  // Diagnostic order is deterministic for the same spec input.
  for (const [actionId, action] of Object.entries(spec.actions)) {
    if (!action) continue;
    switch (action.kind) {
      case "navigate":
        if (!declaredScreens.has(action.screen)) {
          diagnostics.push({
            code: "SPEC_UNRESOLVED_SCREEN",
            severity: "error",
            path: pathToJsonPointer(["actions", actionId, "screen"]),
            message: `navigate.screen "${action.screen}" not declared in screens`,
          });
        }
        break;
      case "submit":
        if (!declaredEntities.has(action.entity)) {
          diagnostics.push({
            code: "SPEC_UNRESOLVED_ACTION",
            severity: "error",
            path: pathToJsonPointer(["actions", actionId, "entity"]),
            message: `submit.entity "${action.entity}" not declared in data.entities`,
          });
        }
        break;
      case "mutate":
        if (!resolveJsonPointerPrefix(spec, action.target)) {
          diagnostics.push({
            code: "SPEC_JSONPTR_UNRESOLVED",
            severity: "error",
            path: pathToJsonPointer(["actions", actionId, "target"]),
            message: `mutate.target "${action.target}" does not resolve under data model (/Entity/field prefix required)`,
          });
        }
        break;
      case "present": {
        const overlay = spec.screens.find((s) => s.id === action.overlay);
        if (!overlay) {
          diagnostics.push({
            code: "SPEC_UNRESOLVED_ACTION",
            severity: "error",
            path: pathToJsonPointer(["actions", actionId, "overlay"]),
            message: `present.overlay "${action.overlay}" not declared in screens`,
          });
        } else if (overlay.kind !== "overlay") {
          diagnostics.push({
            code: "SPEC_ACTION_TYPE_MISMATCH",
            severity: "error",
            path: pathToJsonPointer(["actions", actionId, "overlay"]),
            message: `present.overlay "${action.overlay}" must be a screen with kind: "overlay" (got "${overlay.kind}")`,
          });
        }
        break;
      }
      case "dismiss":
      case "custom":
        // No cross-ref required for these kinds.
        break;
    }
  }

  // --- Navigation root must exist ---
  if (!declaredScreens.has(spec.navigation.root)) {
    diagnostics.push({
      code: "SPEC_UNRESOLVED_SCREEN",
      severity: "error",
      path: pathToJsonPointer(["navigation", "root"]),
      message: `navigation.root "${spec.navigation.root}" not declared in screens`,
    });
  }

  // --- Nav edge from/to/trigger resolution ---
  for (let i = 0; i < spec.navigation.edges.length; i++) {
    const edge = spec.navigation.edges[i];
    if (!edge) continue;
    if (!declaredScreens.has(edge.from)) {
      diagnostics.push({
        code: "SPEC_UNRESOLVED_SCREEN",
        severity: "error",
        path: pathToJsonPointer(["navigation", "edges", i, "from"]),
        message: `nav edge.from "${edge.from}" not declared in screens`,
      });
    }
    if (!declaredScreens.has(edge.to)) {
      diagnostics.push({
        code: "SPEC_UNRESOLVED_SCREEN",
        severity: "error",
        path: pathToJsonPointer(["navigation", "edges", i, "to"]),
        message: `nav edge.to "${edge.to}" not declared in screens`,
      });
    }
    if (!declaredActions.has(edge.trigger)) {
      diagnostics.push({
        code: "SPEC_UNRESOLVED_ACTION",
        severity: "error",
        path: pathToJsonPointer(["navigation", "edges", i, "trigger"]),
        message: `nav edge.trigger "${edge.trigger}" not declared in actions`,
      });
    }
  }

  // Phase-7: validate test_flows[] screen + action references (MAESTRO-03 structural check)
  // T-7-02-02 mitigation: bad refs produce error diagnostics that block emission.
  for (let fi = 0; fi < (spec.test_flows ?? []).length; fi++) {
    const flow = spec.test_flows?.[fi];
    if (!flow) continue;
    for (let si = 0; si < flow.steps.length; si++) {
      const step = flow.steps[si];
      if (!step) continue;
      if (!declaredScreens.has(step.screen)) {
        diagnostics.push({
          code: "MAESTRO_UNRESOLVED_SCREEN",
          severity: "error",
          path: pathToJsonPointer(["test_flows", fi, "steps", si, "screen"]),
          message: `test_flow step.screen "${step.screen}" not declared in screens`,
        });
      }
      if (!declaredActions.has(step.action)) {
        diagnostics.push({
          code: "MAESTRO_UNRESOLVED_ACTION",
          severity: "error",
          path: pathToJsonPointer(["test_flows", fi, "steps", si, "action"]),
          message: `test_flow step.action "${step.action}" not declared in actions`,
        });
      }
    }
  }

  return diagnostics;
}
