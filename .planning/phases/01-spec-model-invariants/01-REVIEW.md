---
phase: 01-spec-model-invariants
reviewed: 2026-04-17T00:00:00Z
depth: standard
files_reviewed: 25
files_reviewed_list:
  - src/index.ts
  - src/primitives/ids.ts
  - src/primitives/path.ts
  - src/primitives/diagnostic.ts
  - src/primitives/index.ts
  - src/model/version.ts
  - src/model/back-behavior.ts
  - src/model/action.ts
  - src/model/data.ts
  - src/model/variant.ts
  - src/model/component.ts
  - src/model/screen.ts
  - src/model/navigation.ts
  - src/model/spec.ts
  - src/model/zod-issue-adapter.ts
  - src/model/cross-reference.ts
  - src/model/invariants.ts
  - src/model/index.ts
  - src/migrations/v1_to_v2.ts
  - src/migrations/index.ts
  - tests/fixtures.test.ts
  - tests/malformed.test.ts
  - tests/catalog-coverage.test.ts
  - tests/fidelity.test.ts
  - tests/helpers/parse-fixture.ts
findings:
  critical: 0
  warning: 3
  info: 6
  total: 9
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-04-17
**Depth:** standard
**Files Reviewed:** 25
**Status:** issues_found

## Summary

The Phase 1 spec model + invariants code is high-quality, well-commented, and
tight against the stated threats (T-01-01 ReDoS, T-01-02 input sanitization,
T-01-03 prototype pollution). Critical invariants hold:

- **`validateSpec()` never-throws invariant is solid.** Serialize-once pre-check
  correctly catches cycles + BigInts; `SpecSchema.safeParse` is wrapped in the
  success/failure branch; cross-ref pass only runs on typed data.
- **Zod v4 recursive ComponentNode pattern is correct.** Uses `z.union` +
  `z.lazy` + explicit `z.ZodType<ComponentNode>` annotation as required for Zod
  v4 — avoids the documented `discriminatedUnion` + recursion breakage.
- **ReDoS-safety is verified empirically.** All five regex patterns
  (`SNAKE_CASE`, `PASCAL_CASE`, `DIAGNOSTIC_CODE`, `PRINTABLE_ASCII`,
  `JSON_POINTER`) are anchored + non-backtracking; 100k-char adversarial inputs
  complete in under 1 ms.
- **Prototype pollution mitigation is load-bearing.** `.strict()` is applied to
  every object schema in the spec model (verified: Spec, Screen, Action
  variants, BackBehavior.replace, NavEdge, NavigationGraph, Field, Entity, Data,
  all component-node variants).
- **RFC 6901 encode/decode ordering is correct.** `encodeSegment` escapes `~`
  BEFORE `/`; `decodeSegment` decodes `~1` BEFORE `~0` — both comments
  explicitly document the data-corruption failure mode if reordered.
- **Diagnostic shape is consistent.** All emitters use `severity: "error"` with
  `code: SPEC_*`, `path` as RFC 6901, and non-empty `message`.

Three warnings focus on completeness gaps against the stated Phase 1 contract
(CONTEXT.md D-05 + §"Uniqueness scopes"). Six info items cover minor
hardening opportunities and mapping-table polish.

## Warnings

### WR-01: Missing screen-id uniqueness diagnostic (contract gap vs. CONTEXT.md §"Uniqueness scopes")

**File:** `src/model/cross-reference.ts:230`
**Issue:** `01-CONTEXT.md:73` states: *"screen ids unique spec-wide; entity
names unique spec-wide; action ids unique spec-wide; testIDs unique
spec-wide"*. The cross-reference pass enforces testID uniqueness via
`testIDRegistry` collision detection, but screen ids are collected with
`new Set(spec.screens.map((s) => s.id))`, which **silently deduplicates
collisions without emitting any diagnostic**. A spec with two screens sharing
the same id validates clean — a contract violation.

Example: two screens both with `id: "home"` produces no diagnostic. Downstream
consumers (Phase 2 serializer, Phase 3 renderer, nav resolution) will see
inconsistent behaviour depending on which duplicate wins in lookups.

**Fix:**
```typescript
// In crossReferencePass(), replace the Set construction with an explicit
// pre-scan that emits a SPEC_DUPLICATE_SCREEN_ID diagnostic for each collision.
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
```

### WR-02: Missing entity-name uniqueness diagnostic (same contract gap)

**File:** `src/model/cross-reference.ts:231`
**Issue:** Same issue as WR-01 but for `spec.data.entities`. The CONTEXT
uniqueness scope covers entity names too, but the code uses
`new Set(spec.data.entities.map((e) => e.name))` which silently dedupes. Two
entities named `Habit` with different field shapes would pass validation and
produce undefined downstream behaviour.

**Fix:** Apply the same pattern as WR-01, iterating `spec.data.entities` and
emitting `SPEC_DUPLICATE_ENTITY_NAME` at the second-occurrence site. Code
structure identical to WR-01.

### WR-03: `resolveJsonPointerPrefix` does not decode RFC 6901 escapes

**File:** `src/model/cross-reference.ts:196-205`
**Issue:** The function splits a JSON Pointer by `/` and compares each token
literally to entity/field names, but does NOT apply `decodeSegment` to unescape
`~0` / `~1`. In practice this is non-exploitable because entity names
(PascalCase, `[A-Za-z0-9]`) and field names (snake_case, `[a-z0-9_]`) cannot
legally contain `~` or `/`, so the check always rejects escaped segments as
unknown entities/fields anyway. But it's a correctness concern for a function
named "resolve JSON Pointer" — a downstream refactor that loosens the
entity/field name charset (e.g., allowing dot-separated namespaces) could
become silently incorrect.

Also, `resolveJsonPointerPrefix` is called with the same user-supplied pointer
that may legitimately contain deeper path segments including escapes; the
current "only validate the prefix" contract is fine, but the prefix itself
should still be RFC-6901-correctly decoded.

**Fix:**
```typescript
import { decodeSegment } from "../primitives/path.ts";

function resolveJsonPointerPrefix(spec: Spec, pointer: string): boolean {
  if (!pointer.startsWith("/")) return false;
  const parts = pointer.slice(1).split("/").map(decodeSegment);
  if (parts.length < 2) return false;
  const [entityName, fieldName] = parts;
  if (!entityName || !fieldName) return false;
  const entity = spec.data.entities.find((e) => e.name === entityName);
  if (!entity) return false;
  return entity.fields.some((f) => f.name === fieldName);
}
```

## Info

### IN-01: Zod v4 `invalid_key` code is missing from `ZOD_CODE_MAP`

**File:** `src/model/zod-issue-adapter.ts:29-45`
**Issue:** Zod v4 emits `code: "invalid_key"` when a `z.record()` key fails its
key-schema (e.g., a non-snake_case action id in the actions registry).
Confirmed empirically against `zod@4.3.6`:
```
ACTIONS.safeParse({ BadKey: { kind: 'dismiss' } })
  → issues[0].code === "invalid_key"
```
This code is NOT in `ZOD_CODE_MAP`, so it falls through to `ZOD_INVALID_KEY`
rather than a semantic `SPEC_*` code. Since action-id keys in the registry
must be snake_case, a user typo like `actions: { SignIn: {...} }` surfaces as
an opaque `ZOD_INVALID_KEY` rather than a friendlier
`SPEC_INVALID_ACTION_ID`.
**Fix:** Add `invalid_key: "SPEC_INVALID_KEY"` (or
`SPEC_INVALID_RECORD_KEY`) to the map.

### IN-02: `JSON.stringify(undefined)` bypasses the size check silently

**File:** `src/model/invariants.ts:38`
**Issue:** `JSON.stringify(undefined)` returns `undefined` (not a string).
The guard `typeof serialized === "string" && serialized.length > MAX_INPUT_BYTES`
correctly skips non-string results, so undefined falls through to
`SpecSchema.safeParse(undefined)` which produces a clean error diagnostic.
This is technically correct but worth an explicit comment: the fact that the
size check is gated on `typeof serialized === "string"` is intentional (it's
how we tolerate `undefined` / `function` / `symbol` top-level inputs without
an extra branch). A one-line comment near the `typeof` check would prevent
a future refactor from tightening the guard and breaking the hostile-input
test cases.
**Fix:** Add a comment above `if (typeof serialized === "string" && ...)`:
```typescript
// NOTE: JSON.stringify(undefined/function/symbol) returns undefined, not a
// string. The typeof guard is intentional — such inputs skip the size cap
// and fall through to SpecSchema.safeParse, which emits a clean diagnostic.
```

### IN-03: `resolveJsonPointerPrefix` documentation over-promises

**File:** `src/model/cross-reference.ts:179-195` (docstring) and `:196-205` (impl)
**Issue:** The doc comment says *`"/KnownEntity/ghost_field"` → false*, which
is correct, but is implicitly comparing field names LITERALLY (no RFC 6901
decode — see WR-03). The comment block at the top of the function claims
"JSON Pointer" resolution semantics without disclosing the "no decode applied"
caveat. Minor documentation-vs-code drift.
**Fix:** Add a line to the docstring: *"Note: entity and field names cannot
legally contain `~` or `/`, so RFC 6901 unescaping is a no-op for valid
inputs. Adversarial escaped segments fall through to the 'unknown entity/field'
branch."* — OR fix WR-03 and remove the caveat.

### IN-04: `Spec.navigation.root` cross-ref uses `SPEC_UNRESOLVED_ACTION` code (semantic mismatch)

**File:** `src/model/cross-reference.ts:368-375`
**Issue:** When `spec.navigation.root` names a non-existent screen, the code
emitted is `SPEC_UNRESOLVED_ACTION`, but `navigation.root` is NOT an action
reference — it's a screen reference. Same applies to nav edge `from`/`to`
(`:381-397`) and `trigger` (`:397-404`): `from`/`to` reuse the
`SPEC_UNRESOLVED_ACTION` code when they are screen refs; only `trigger` is
actually an action ref.

The behavior is correct — validation still rejects the spec — but the
diagnostic code is misleading for downstream consumers who want to style
nav-error messages differently from action-error messages.
**Fix:** Introduce `SPEC_UNRESOLVED_SCREEN` (or `SPEC_UNRESOLVED_NAV_TARGET`)
for navigation.root, nav.edge.from, nav.edge.to, and navigate.screen. Keep
`SPEC_UNRESOLVED_ACTION` only for things that actually resolve against the
actions registry (nav.edge.trigger and interactable component `action` refs).

### IN-05: Migration chain runner uses `throw` — breaks never-throws guarantee if called from `validateSpec` caller chain

**File:** `src/migrations/index.ts:28`
**Issue:** `runMigrations()` throws `Error("No migration path from v${v} …")`
on an unreachable migration path. `validateSpec()` guarantees never-throws,
but `runMigrations` is the OTHER entry point on the public API surface
(exported from `src/index.ts:11`). Callers who sequence migrations before
validation need to wrap this in try/catch; the public contract is split
between "safe" (`validateSpec`) and "throws" (`runMigrations`), which is
a usability trap.

This matches the existing comment in `migrations/index.ts:6-7` ("callers MUST
re-validate"), so it's a deliberate choice, not a bug. Worth calling out for
Phase 2 to reconsider once there's an actual v2 — the contract asymmetry will
become more visible when real migrations exist.
**Fix:** (Defer to Phase 2.) Consider returning
`{ spec: unknown; error: Diagnostic | null }` from `runMigrations` to match
the `validateSpec` error-result pattern, or documenting the throw in JSDoc.

### IN-06: `ActionId` keys in `spec.actions` iteration use `Object.entries` — no ordering guarantee for diagnostic output

**File:** `src/model/cross-reference.ts:308-365`
**Issue:** `Object.entries(spec.actions)` returns keys in insertion order for
string keys (ES2015+), so this is actually deterministic — but the test
snapshot (`tests/malformed.test.ts:34-37`) sorts diagnostics explicitly by
`code` + `path` before snapshotting, which is good defensive practice.

Not a bug; just note that if any non-test consumer of `validateSpec`
diagnostics relies on cross-ref ordering, they'll depend on insertion order
of the incoming spec's action keys, which for YAML-parsed data depends on
`eemeli/yaml` preserving key order (it does by default). Fine for now;
document if it ever becomes a contract.
**Fix:** No code change. Optionally add a comment in `crossReferencePass`:
```typescript
// Iteration order of spec.actions is insertion order (ES2015+). The test
// suite sorts diagnostics before snapshotting to insulate against any
// future reorder.
```

---

_Reviewed: 2026-04-17_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
