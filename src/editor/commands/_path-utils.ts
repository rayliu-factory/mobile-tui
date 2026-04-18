// src/editor/commands/_path-utils.ts
// Internal path resolver for component-tree commands (D-55, plan 04-04).
//
// SCOPE:
//   resolvePathOnSpec — walk a JsonPointer into spec.screens[i].variants[kind].tree
//   to return the parent array, index, node, and AST path segments.
//   This is the single trusted path-resolution surface for all component commands.
//
// THREAT T-04-13 (path traversal): this resolver only walks inside
//   spec.screens[screenIndex].variants[variantKind].tree. It never calls fs.*
//   and never allows escape to spec-root or outer filesystem.
//   Out-of-bounds paths return null — callers emit a diagnostic and no-op.
//
// NOTE: JsonPointer segments after the base tree path must be numeric
// (array indices). This function resolves through "children", "items", "child",
// and "itemTemplate" keys when present — but only via array-index traversal
// per the plan specification.
import type { ComponentNode } from "../../model/component.ts";
import type { Spec } from "../../model/index.ts";
import { decodeSegment } from "../../primitives/path.ts";

export interface ResolvedPath {
  /** The array that contains the target node (parent's children-like array). */
  parentArray: ComponentNode[];
  /** Index of the node within parentArray. */
  index: number;
  /** The target node itself. */
  node: ComponentNode;
  /**
   * Full AST path segments from doc root to the target node.
   * e.g. ["screens", 2, "variants", "content", "tree", 0, "children", 1]
   */
  astPathSegments: (string | number)[];
}

/**
 * Walk a JsonPointer string into spec.screens[screenIndex].variants[variantKind].tree
 * and return the resolved path details. The JsonPointer is interpreted as a series
 * of numeric segments (array indices) into the nested component tree.
 *
 * The JsonPointer format used by component commands:
 *   ""   → the root tree array (not a node — callers handle this case)
 *   "/0" → tree[0]
 *   "/0/children/1" → tree[0].children[1]
 *
 * For property navigation: numeric segments are indices into the current array.
 * Named segments ("children", "itemTemplate", "child") are property keys.
 *
 * Returns null if path is out of bounds or structure doesn't match.
 */
export function resolvePathOnSpec(
  spec: Spec,
  screenId: string,
  variantKind: string,
  jsonPointer: string,
): ResolvedPath | null {
  // Find screen index
  const screenIndex = spec.screens.findIndex((s) => s.id === screenId);
  if (screenIndex === -1) return null;

  const screen = spec.screens[screenIndex];
  if (!screen) return null;

  const variants = screen.variants as Record<string, { tree: ComponentNode[] } | null>;
  const variant = variants[variantKind];
  if (!variant || !variant.tree) return null;

  const baseAstPath: (string | number)[] = [
    "screens",
    screenIndex,
    "variants",
    variantKind,
    "tree",
  ];

  // Empty pointer means the root tree level — can't resolve to a single node
  if (jsonPointer === "") return null;

  // Parse pointer segments
  const rawSegments = jsonPointer.split("/").slice(1); // remove leading empty string
  if (rawSegments.length === 0) return null;

  // Walk the tree following the segments
  // The last segment is the index we want; the preceding segments are the path to the parent array
  let currentArray: ComponentNode[] = variant.tree;
  let currentAstPath: (string | number)[] = [...baseAstPath];

  for (let i = 0; i < rawSegments.length - 1; i++) {
    const raw = rawSegments[i];
    if (raw === undefined) return null;
    const seg = decodeSegment(raw);

    const numIdx = Number(seg);
    if (!Number.isNaN(numIdx) && Number.isInteger(numIdx)) {
      // Array index: move into a child node
      const node = currentArray[numIdx];
      if (node === undefined) return null;
      currentAstPath = [...currentAstPath, numIdx];

      // Now navigate to the next key (next segment should be a named property)
      if (i + 1 < rawSegments.length - 1) {
        const nextRaw = rawSegments[i + 1];
        if (nextRaw === undefined) return null;
        const nextSeg = decodeSegment(nextRaw);
        const nextNumIdx = Number(nextSeg);

        if (!Number.isNaN(nextNumIdx)) {
          // next segment is also numeric — can't be correct without property key
          return null;
        }

        // Navigate to named property (children, child, itemTemplate)
        const nodeAsRecord = node as Record<string, unknown>;
        const prop = nodeAsRecord[nextSeg];

        if (Array.isArray(prop)) {
          currentArray = prop as ComponentNode[];
          currentAstPath = [...currentAstPath, nextSeg];
          i++; // skip next segment since we consumed it
        } else if (prop !== undefined && typeof prop === "object" && prop !== null) {
          // Single-child property (Card.child, Modal.child, Sheet.child)
          // We can't iterate a non-array — wrap it
          return null; // single-child props not addressable via this resolver
        } else {
          return null;
        }
      }
    } else {
      // Named property — move into an array property
      const prevNode =
        currentAstPath.length > baseAstPath.length
          ? null // already deep
          : null;
      // Check current "array" context for a property named seg
      void prevNode;
      return null; // unsupported — segments must alternate index/property
    }
  }

  // Last segment — the target index
  const lastRaw = rawSegments[rawSegments.length - 1];
  if (lastRaw === undefined) return null;
  const lastSeg = decodeSegment(lastRaw);
  const targetIndex = Number(lastSeg);

  if (Number.isNaN(targetIndex) || !Number.isInteger(targetIndex)) {
    return null; // last segment must be numeric
  }

  const node = currentArray[targetIndex];
  if (node === undefined) return null;

  return {
    parentArray: currentArray,
    index: targetIndex,
    node,
    astPathSegments: [...currentAstPath, targetIndex],
  };
}

/**
 * Compute the base AST path to a screen's variant tree array.
 * Returns ["screens", screenIndex, "variants", variantKind, "tree"]
 * or null if the screen is not found.
 */
export function variantTreeAstPath(
  spec: Spec,
  screenId: string,
  variantKind: string,
): (string | number)[] | null {
  const screenIndex = spec.screens.findIndex((s) => s.id === screenId);
  if (screenIndex === -1) return null;
  return ["screens", screenIndex, "variants", variantKind, "tree"];
}
