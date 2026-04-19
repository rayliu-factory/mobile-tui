// src/emit/maestro/step-mapper.ts
// testID resolution + action→YAML mapping for Maestro step emission.
//
// GUARANTEES:
//   - Returns deterministically from the same inputs.
//   - No Date, no process.env, no fs, no Math.random.
//   - All 6 action kinds produce tapOn: { id: testID } (exhaustive switch).
//   - Missing testID for an action returns { ok: false, diagnostic } with
//     code MAESTRO_MISSING_TESTID.
//   - Only walks screen.variants.content.tree (D-106 — content variant is
//     the interactive happy path; empty/loading/error are non-interactive).
import type { ComponentNode } from "../../model/component.ts";
import type { Spec } from "../../model/index.ts";
import type { Screen } from "../../model/screen.ts";
import type { TestFlowStep } from "../../model/spec.ts";
import type { Diagnostic } from "../../primitives/diagnostic.ts";
import { pathToJsonPointer } from "../../primitives/path.ts";

export type StepMapResult =
  | { ok: true; tapOnId: string; customActionName?: string }
  | { ok: false; diagnostic: Diagnostic };

/**
 * Find the testID string for a given actionId by walking the content variant
 * tree of the specified screen. Handles the TabBar.items special case.
 *
 * Returns null when actionId not found — the caller creates the diagnostic.
 */
export function findTestIDForAction(screen: Screen, actionId: string): string | null {
  // D-106: walk content variant only (not empty/loading/error)
  const tree = screen.variants.content?.tree ?? [];
  return walkForTestID(tree as ComponentNode[], actionId);
}

function walkForTestID(nodes: ComponentNode[], actionId: string): string | null {
  for (const node of nodes) {
    // Check interactable leaves with action + testID fields
    if (
      "action" in node &&
      "testID" in node &&
      node.action === actionId &&
      typeof node.testID === "string" &&
      node.testID.length > 0
    ) {
      return node.testID;
    }

    // TabBar special case: items are inline { label, action, testID } tuples,
    // NOT ComponentNode children — must be handled before the recursive switch.
    if (node.kind === "TabBar") {
      for (const item of node.items) {
        if (item.action === actionId) return item.testID;
      }
      continue;
    }

    // Recurse into container kinds (exactly mirrors walkComponentTree in cross-reference.ts)
    let childResult: string | null = null;
    switch (node.kind) {
      case "Column":
      case "Row":
        childResult = walkForTestID(node.children, actionId);
        break;
      case "Card":
        childResult = walkForTestID([node.child], actionId);
        break;
      case "List":
        childResult = walkForTestID([node.itemTemplate], actionId);
        break;
      case "ListItem":
        childResult = walkForTestID(node.children, actionId);
        break;
      case "NavBar":
        if (node.leading) {
          childResult = walkForTestID([node.leading], actionId);
          if (childResult !== null) return childResult;
        }
        if (node.trailing) {
          childResult = walkForTestID([node.trailing], actionId);
        }
        break;
      case "Modal":
      case "Sheet":
        childResult = walkForTestID([node.child], actionId);
        break;
      // Leaf kinds (no recursion): Text, Icon, Divider, Spacer, Image,
      // Button, TextField, Toggle, SegmentedControl — already handled above
      // via the "action" in node check.
      default:
        break;
    }
    if (childResult !== null) return childResult;
  }
  return null;
}

/**
 * Map a single TestFlowStep to a tapOn result or diagnostic.
 *
 * All 6 action kinds produce the same output shape: tapOn: { id: testID }.
 * The exhaustive switch over action.kind is for future extensibility and
 * to make missing-kind errors compile-time errors.
 *
 * Custom action kind additionally returns customActionName for comment emission.
 */
export function mapStep(
  step: TestFlowStep,
  spec: Spec,
  flowIndex: number,
  stepIndex: number,
): StepMapResult {
  // 1. Find the screen (should have been caught by crossReferencePass, but defend)
  const screen = spec.screens.find((s) => s.id === step.screen);
  if (!screen) {
    return {
      ok: false,
      diagnostic: {
        code: "MAESTRO_UNRESOLVED_SCREEN",
        severity: "error",
        path: pathToJsonPointer(["test_flows", flowIndex, "steps", stepIndex, "screen"]),
        message: `screen "${step.screen}" not found`,
      },
    };
  }

  // 2. Resolve testID — walk content variant only (D-106)
  const testID = findTestIDForAction(screen, step.action);
  if (testID === null) {
    return {
      ok: false,
      diagnostic: {
        code: "MAESTRO_MISSING_TESTID",
        severity: "error",
        path: pathToJsonPointer(["test_flows", flowIndex, "steps", stepIndex, "action"]),
        message: `no testID found for action "${step.action}" on screen "${step.screen}"`,
      },
    };
  }

  // 3. Determine custom action name (for comment emission in emitter.ts)
  //    All 6 action kinds produce tapOn: { id: testID } per D-109.
  const action = spec.actions[step.action];
  const customActionName = action?.kind === "custom" ? action.name : undefined;

  // 4. Exhaustive switch over action.kind (makes missing-kind a TS error)
  if (action) {
    switch (action.kind) {
      case "navigate":
      case "submit":
      case "mutate":
      case "present":
      case "dismiss":
      case "custom":
        // All 6 kinds produce tapOn: { id: testID } — no per-kind divergence (D-109/D-110)
        break;
      default: {
        // TypeScript exhaustiveness check
        const _exhaustive: never = action;
        void _exhaustive;
      }
    }
  }

  return { ok: true, tapOnId: testID, customActionName };
}
