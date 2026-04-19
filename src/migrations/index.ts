// src/migrations/index.ts
// Migration chain runner per SERDE-08.
//
// Returns `{ result: unknown; diagnostic: Diagnostic | null }` — never throws.
// Returns a diagnostic instead of throwing — callers should check
// `diagnostic !== null` to detect migration failure.
// Callers MUST re-validate the result with the target version's schema via
// validateSpec(). This is deliberate per RESEARCH Pitfall #7: typing chained
// heterogeneous transforms across string-literal versions is painful and not
// worth it in Phase 1's one-migrator reality.
import type { Diagnostic } from "../primitives/diagnostic.ts";
import { migrate as v1_to_v2 } from "./v1_to_v2.ts";

// Grows as migrations land. Must be strictly ordered and contiguous by version.
export const MIGRATIONS = [{ from: "1", to: "2", run: v1_to_v2 }] as const;

export type SpecVersion = "1" | "2";

export function runMigrations(
  spec: unknown,
  fromVersion: SpecVersion,
  toVersion: SpecVersion,
): { result: unknown; diagnostic: Diagnostic | null } {
  if (fromVersion === toVersion) return { result: spec, diagnostic: null };

  let current: unknown = spec;
  let v: string = fromVersion;

  while (v !== toVersion) {
    const step = MIGRATIONS.find((m) => m.from === v);
    if (!step) {
      return {
        result: spec,
        diagnostic: {
          code: "SPEC_UNSUPPORTED_VERSION",
          severity: "error",
          path: "",
          message: `No migration path from v${v} toward v${toVersion} in MIGRATIONS chain`,
        },
      };
    }
    // Cast to never is intentional — we're treating the input as opaque. The
    // migrator itself is typed at SpecV(N) → SpecV(N+1); the chain runner doesn't
    // track those types per Pitfall #7.
    current = step.run(current as never);
    v = step.to;
  }

  return { result: current, diagnostic: null };
}
