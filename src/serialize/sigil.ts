// src/serialize/sigil.ts
// Sigil shorthand ↔ triple-form normalization (D-22, D-23).
//
// PARSE DIRECTION (this module): walk doc.contents.items[screens] tree;
// for every interactable component with a single sigil-string `label`
// scalar, split into { label, action, testID } triple fields AND record
// "sigil" origin in a WeakMap keyed by the component's YAMLMap node.
// Triple-form nodes get "triple" origin, no mutation.
//
// EMIT DIRECTION (Plan 02-04 write.ts): consults the WeakMap to decide
// whether to re-join the triple into a sigil string OR emit as separate
// pairs. D-24: sigil emitted only if all 3 fields present; otherwise
// falls back to triple + SPEC_SIGIL_PARTIAL_DROPPED info diagnostic.
//
// SCOPE:
//   - SIGIL_REGEX: grammar
//   - INTERACTABLE_KINDS: closed subset of COMPONENT_KINDS carrying triple
//   - parseSigil(str): SigilTriple | null — pure regex split
//   - createSigilOriginsMap(): WeakMap factory
//   - normalizeSigilsOnDoc(doc, wm): mutates AST + records origin
//
// THREAT T-01-01 (ReDoS): SIGIL_REGEX is anchored (^...$) with
// non-greedy `.+?` bounded by the literal " →" sequence. Followed by
// SNAKE_CASE classes (character-class + quantifier, no alternation).
// Safe on adversarial 100KB inputs (test covers).
//
// D-03 constraint: labels are printable ASCII; escape rules for literal
// → / ] in labels are DEFERRED. Phase 2 fixtures avoid this surface.
//
// Reference authority: src/model/component.ts lines 57-124 defines
// InteractableBase and the five kinds that extend it. TabBar items are
// inline-extended (not via InteractableBase) and are NOT walked for
// sigil normalization — their shape forbids a string-scalar shorthand
// per 01-04 decision.
//
// RELATED: parse.ts (caller), write.ts (re-emit consumer), D-03 label
//          grammar, src/primitives/ids.ts (SNAKE_CASE → action + testID).
import type { Document, YAMLMap } from "yaml";
import { isMap, isScalar, isSeq } from "yaml";

// Sigil grammar per D-22. Action + testID use SNAKE_CASE
// (src/primitives/ids.ts PATTERN: /^[a-z][a-z0-9_]*$/) — inlined here to
// avoid cross-module import at the regex level. Parity is covered by the
// accept-case test against canonical snake_case values.
export const SIGIL_REGEX = /^\[(.+?) →([a-z][a-z0-9_]*) test:([a-z][a-z0-9_]*)\]$/;

// Subset of COMPONENT_KINDS that carry (label, action, testID) via
// InteractableBase (src/model/component.ts lines 57-63). The inline-extended
// kinds (items on a NavigationBar/TabBar) are handled separately — they
// cannot carry a YAML string-scalar shorthand per 01-04 decision.
export const INTERACTABLE_KINDS: ReadonlySet<string> = new Set([
  "Button",
  "TextField",
  "Toggle",
  "SegmentedControl",
  "ListItem",
]);

export interface SigilTriple {
  label: string;
  action: string;
  testID: string;
}

export function parseSigil(input: string): SigilTriple | null {
  const m = SIGIL_REGEX.exec(input);
  if (m === null) return null;
  // m[1] = label, m[2] = action, m[3] = testID (all three captures defined on match).
  const label = m[1];
  const action = m[2];
  const testID = m[3];
  if (label === undefined || action === undefined || testID === undefined) return null;
  return { label, action, testID };
}

export function createSigilOriginsMap(): WeakMap<object, "sigil" | "triple"> {
  return new WeakMap<object, "sigil" | "triple">();
}

/**
 * Walk `doc.contents.items[screens]` tree and:
 *   - For every YAMLMap whose `kind` scalar is in INTERACTABLE_KINDS:
 *     - If `label` is a single-scalar sigil-matching string: split into
 *       triple fields, mutate the map (replace label value, add/update
 *       action + testID pairs), record "sigil" in wm keyed by the map.
 *     - Else: record "triple" keyed by the map (no mutation).
 *   - Non-interactable maps + non-map / non-seq values are skipped.
 *
 * Recurses through children / child / itemTemplate / leading / trailing
 * and any other YAMLMap / YAMLSeq reachable from the visited node. The
 * walk is type-guard-gated via isMap/isSeq/isScalar so adversarial AST
 * shapes cannot drive arbitrary property access.
 */
export function normalizeSigilsOnDoc(
  doc: Document,
  sigilOrigins: WeakMap<object, "sigil" | "triple">,
): void {
  if (!isMap(doc.contents)) return;

  const screensPair = doc.contents.items.find(
    (p) => isScalar(p.key) && String(p.key.value) === "screens",
  );
  if (screensPair === undefined) return;
  if (!isSeq(screensPair.value)) return;

  for (const screen of screensPair.value.items) {
    if (isMap(screen)) visitMap(screen, sigilOrigins);
  }
}

function visitMap(node: YAMLMap, wm: WeakMap<object, "sigil" | "triple">): void {
  // Check if this map represents an interactable component.
  const kindPair = node.items.find((p) => isScalar(p.key) && String(p.key.value) === "kind");
  const kindValue =
    kindPair !== undefined && isScalar(kindPair.value) ? String(kindPair.value.value) : null;

  if (kindValue !== null && INTERACTABLE_KINDS.has(kindValue)) {
    // Locate the `label` pair.
    const labelPair = node.items.find((p) => isScalar(p.key) && String(p.key.value) === "label");
    const labelScalar =
      labelPair !== undefined && isScalar(labelPair.value) ? labelPair.value : null;
    const labelStr = labelScalar !== null ? String(labelScalar.value) : null;

    if (labelStr !== null && labelScalar !== null) {
      const triple = parseSigil(labelStr);
      if (triple !== null) {
        // Sigil form → split into 3 triple fields on the AST.
        labelScalar.value = triple.label;

        // Add or update `action` pair.
        const existingAction = node.items.find(
          (p) => isScalar(p.key) && String(p.key.value) === "action",
        );
        if (existingAction !== undefined && isScalar(existingAction.value)) {
          existingAction.value.value = triple.action;
        } else {
          node.add({ key: "action", value: triple.action });
        }

        // Add or update `testID` pair.
        const existingTestID = node.items.find(
          (p) => isScalar(p.key) && String(p.key.value) === "testID",
        );
        if (existingTestID !== undefined && isScalar(existingTestID.value)) {
          existingTestID.value.value = triple.testID;
        } else {
          node.add({ key: "testID", value: triple.testID });
        }

        wm.set(node, "sigil");
      } else {
        wm.set(node, "triple");
      }
    } else {
      // Interactable with no string label scalar — still classify as triple.
      wm.set(node, "triple");
    }
  }

  // Recurse into every map/seq value. Covers children, child, itemTemplate,
  // tree, variants, leading, trailing, content, empty, loading, error, ...
  for (const pair of node.items) {
    const v = pair.value;
    if (isMap(v)) {
      visitMap(v, wm);
    } else if (isSeq(v)) {
      for (const item of v.items) {
        if (isMap(item)) visitMap(item, wm);
      }
    }
  }
}
