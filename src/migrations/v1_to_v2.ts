// src/migrations/v1_to_v2.ts
// SERDE-08 anchor: this file exists from commit 1, even though v1 has nothing
// to migrate. When a v2 schema lands in a future phase, this function transforms
// v1-shaped input to v2-shaped output.
//
// Body is currently empty-op: `input` is returned as-is under a v2 type assertion.
// Once a v2 schema is defined, this file needs:
//   1. Real structural transform logic
//   2. Updated SpecV2 import from a versioned schema file (e.g., src/model/v2/spec.ts)
import type { Spec } from "../model/spec.ts";

// In v1 these types are identical. When v2 ships, SpecV2 will import from a
// distinct schema file and the transform body will do real work.
type SpecV1 = Spec;
type SpecV2 = Spec;

export function migrate(input: SpecV1): SpecV2 {
  // No-op in Phase 1. Future migrations: transform v1-shaped input to v2-shaped output.
  return input as unknown as SpecV2;
}
