// src/serialize/schema-inject.ts
// First-save injection of `schema: mobile-tui/1` at the TOP of the
// frontmatter (D-28).
//
// SCOPE:
//   - injectSchemaIfAbsent(doc): boolean — idempotent
//   - Called by write.ts during every save, no-op after first save
//
// POST-CONDITION (D-28): if injected, the ORIGINAL first key now has
// spaceBefore: true so the emit produces `schema: mobile-tui/1\n\n{rest}`.
// Convention matches Jekyll/Hugo/Astro frontmatter norms.
//
// IDEMPOTENT: `doc.has("schema")` short-circuit means calling this twice
// is safe; second call returns false and no-op. Same pattern as
// src/migrations/v1_to_v2.ts (SERDE-08 anchor) — "same in, same out"
// on re-entry. Validated by the double-call + re-parse tests.
//
// SCHEMA_VERSION is imported from ../model/index.ts, NEVER inlined, so
// a future v2 bump lands in ONE place.
//
// RELATED: write.ts (caller), D-28 blank-line convention, Pitfall 6
//          (spaceBefore on items[1], not items[0]).
import type { Document } from "yaml";
import { isMap } from "yaml";
import { SCHEMA_VERSION } from "../model/index.ts";

export function injectSchemaIfAbsent(doc: Document): boolean {
  if (doc.has("schema")) return false;

  if (!isMap(doc.contents)) {
    // Empty / non-map document. Create a single-pair map holding just schema.
    doc.contents = doc.createNode({ schema: SCHEMA_VERSION }, { flow: false });
    return true;
  }

  const schemaPair = doc.createPair("schema", SCHEMA_VERSION);
  doc.contents.items.unshift(schemaPair);

  // D-28: blank line between schema and what was previously the first key.
  // `spaceBefore` lives on the KEY of the NEXT pair (items[1] after our
  // unshift). eemeli/yaml emits one blank line before any key with
  // spaceBefore: true on its key-node. Pitfall 6 anchor.
  if (doc.contents.items.length > 1) {
    const nextPair = doc.contents.items[1];
    if (nextPair !== undefined && nextPair.key !== null && typeof nextPair.key === "object") {
      (nextPair.key as { spaceBefore?: boolean }).spaceBefore = true;
    }
  }

  return true;
}
