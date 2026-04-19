// src/serialize/unknown.ts
// AST-native unknown-top-level-key preservation (D-26, D-27).
//
// SCOPE:
//   - Partitions doc.contents.items into known-schema keys (fed to
//     validateSpec) and unknown-key names (stashed for diagnostics).
//   - Unknown pairs STAY in the Document AST at their original position
//     with comments + blank lines intact. We only record their NAMES here;
//     the AST is the source of truth for their bytes.
//   - NO literal `_unknown:` key is ever materialized (D-26).
//   - BLOCKER fix #3: export ADVERSARIAL_KEYS so writeSpecFile (Plan 04)
//     can re-inspect the AST at save time. partitionTopLevel strips
//     __proto__ from knownSubset, but the AST still carries it and we
//     MUST NOT write it to disk.
//
// THREAT T-02-ProtoPollution MITIGATION (defense in depth):
//   Layer 1 (this module): knownSubset built via Object.create(null)
//     after KNOWN_SET.has(...) check. Adversarial keys (__proto__,
//     constructor, prototype) are classified as UNKNOWN and never land
//     in knownSubset. validateSpec therefore never sees them.
//   Layer 2 (parse.ts, Plan 05): parse-time diagnostic emits
//     SPEC_UNKNOWN_TOP_LEVEL_KEY error for any unknown key whose name
//     is in ADVERSARIAL_KEYS.
//   Layer 3 (write.ts, Plan 04): BLOCKER fix #3 — writeSpecFile
//     re-scans astHandle.doc for adversarial keys BEFORE the save-gate
//     (since validateSpec would not see them). Blocks the write at the
//     AST layer, ensuring adversarial keys never reach disk.
//
// SCOPE BOUNDARY (D-27): only TOP-LEVEL keys. Nested unknowns (inside a
// screen, inside a component) remain rejected by Phase-1's .strict().
//
// RELATED: parse.ts (caller), schema-inject.ts (writes schema at items[0]
//          — complements the unknown-preservation story), write.ts
//          (re-checks ADVERSARIAL_KEYS at save time — BLOCKER fix #3).
import type { Document } from "yaml";
import { isMap, isScalar } from "yaml";

export const KNOWN_TOP_LEVEL_KEYS = [
  "schema",
  "screens",
  "actions",
  "data",
  "navigation",
  // Phase-6 wizard meta fields — added to knownSubset so validateSpec() sees them.
  // Matches WizardMetaSchema keys spread into SpecSchema (spec.ts).
  "app_idea",
  "primary_user",
  "nav_pattern",
  "auth",
  "offline_sync",
  "target_platforms",
] as const;
export type KnownTopLevelKey = (typeof KNOWN_TOP_LEVEL_KEYS)[number];

const KNOWN_SET: ReadonlySet<string> = new Set(KNOWN_TOP_LEVEL_KEYS);

/**
 * Top-level keys treated as prototype-pollution / tampering vectors.
 * Exported for consumers that need to re-check the AST directly
 * (Plan 04 writeSpecFile — BLOCKER fix #3). partitionTopLevel classifies
 * them as unknown (so validateSpec never sees them), but the AST still
 * carries them; writeSpecFile must block the save before they hit disk.
 */
export const ADVERSARIAL_KEYS: ReadonlySet<string> = new Set([
  "__proto__",
  "constructor",
  "prototype",
]);

export interface PartitionResult {
  /** Plain-JS projection of known-schema subset for validateSpec() consumption. */
  knownSubset: Record<string, unknown>;
  /** Names of unknown top-level keys (positions stay in AST). */
  unknownKeys: string[];
}

export function partitionTopLevel(doc: Document): PartitionResult {
  // Explicit early-return per PATTERNS discipline (no default fallthrough).
  if (!isMap(doc.contents)) {
    return { knownSubset: {}, unknownKeys: [] };
  }

  // Build knownSubset via Object.create(null) to side-step any implicit
  // prototype-chain interaction with adversarial keys. T-02-ProtoPollution.
  const knownSubset: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  const unknownKeys: string[] = [];

  for (const pair of doc.contents.items) {
    const keyStr = isScalar(pair.key) ? String(pair.key.value) : String(pair.key);

    if (KNOWN_SET.has(keyStr)) {
      // Project the value branch to plain JS for validation. toJSON walks
      // the AST; comments are intentionally lost in this transient copy.
      // The Document AST itself is untouched.
      if (pair.value && typeof pair.value === "object" && "toJSON" in pair.value) {
        knownSubset[keyStr] = (pair.value as { toJSON: (ctx?: unknown) => unknown }).toJSON();
      } else {
        knownSubset[keyStr] = pair.value;
      }
    } else {
      unknownKeys.push(keyStr);
    }
  }

  return { knownSubset, unknownKeys };
}
