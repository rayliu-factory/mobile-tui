# Phase 2: Serialization & Round-Trip — Pattern Map

**Mapped:** 2026-04-18
**Files analyzed:** 28 new/modified source + test + fixture files
**Analogs found:** 22 / 28 (6 files are net-new shapes with no close Phase-1 analog — flagged in §No Analog Found; planner uses RESEARCH.md Code Examples)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/serialize/parse.ts` | IO + adapter orchestrator | `string path → { spec, astHandle, diagnostics, body }` (request-response; never-throws Result) | `src/model/invariants.ts` (`validateSpec` orchestrator) | role-match (both orchestrators returning `{ spec, diagnostics }`); IO wrapper is new |
| `src/serialize/parse.test.ts` | test (unit) | Given `.spec.md` bytes → assert `{ spec, astHandle, diagnostics, body }` shape | `src/model/invariants.test.ts` (via `tests/fixtures.test.ts` integration) + `src/primitives/diagnostic.test.ts` (unit shape) | role-match |
| `src/serialize/write.ts` | IO + stateful (AST mutation) + save-gate | `(path, spec, astHandle) → Promise<{ written, diagnostics }>`; gated on severity | `src/model/invariants.ts` (never-throws Result; severity semantics) + `src/migrations/index.ts` (chain orchestrator) | role-match (save-gate is new; Result contract and severity logic are Phase-1 native) |
| `src/serialize/write.test.ts` | test (unit + save-gate) | Simulated schema + AST → assert diff-apply + gate behavior | `src/model/invariants.test.ts` (Stage A vs B semantics) + `src/migrations/index.test.ts` (chain runner tests) | role-match |
| `src/serialize/body.ts` | pure-function | `(origBytes: string, parsedMatter: string) → bodyBytes: string` (byte-level splice) | `src/primitives/path.ts` (pure string transform: `encodeSegment`/`decodeSegment`) | role-match (pure transform; no Phase-1 byte-offset splicer exists) |
| `src/serialize/body.test.ts` | test (unit) | String-in / string-out parity + edge cases | `src/primitives/path.test.ts` (encode/decode round-trips + edge cases) | exact |
| `src/serialize/sigil.ts` | pure-function + stateful (WeakMap) | AST node → normalized triple + origin annotation | `src/model/component.ts` (`InteractableBase` + kind enumeration) + `src/primitives/ids.ts` (branded regex patterns) | role-match (regex-driven transform on nodes; WeakMap side-channel is new) |
| `src/serialize/sigil.test.ts` | test (unit) | YAML scalar string → {label, action, testID} parse + origin assertion | `src/primitives/ids.test.ts` (regex-driven schema accept/reject table) | role-match |
| `src/serialize/unknown.ts` | pure-function | `Document → { knownSubset, unknownKeys }` (AST partition) | `src/model/cross-reference.ts` (`walkComponentTree` context-carrying walker) | role-match (both walk a tree and partition into contexts; Phase-1 walks `ComponentNode[]`, this walks `doc.contents.items`) |
| `src/serialize/unknown.test.ts` | test (unit) | Map-shaped inputs → assert known/unknown partition | `src/model/cross-reference.test.ts` (walker output assertion) | role-match |
| `src/serialize/schema-inject.ts` | pure-function (AST mutation, idempotent) | `Document → Document` (prepends `schema: mobile-tui/1` if absent) | `src/migrations/v1_to_v2.ts` (idempotent transform: "no-op in Phase 1") + `src/model/version.ts` (SCHEMA_VERSION literal) | role-match (idempotent transform; AST-level mutation is new) |
| `src/serialize/schema-inject.test.ts` | test (unit) | absent → inject; present → no-op | `src/migrations/index.test.ts` ("same-version returns unchanged" idempotency tests) | role-match |
| `src/serialize/frontmatter.ts` | adapter (library wiring) | `string → { doc, matterStr, bodyBytes, origBytes, isEmpty }` via gray-matter | `src/model/zod-issue-adapter.ts` (Zod→Diagnostic adapter; bridges external lib shape to internal types) | role-match (both are thin lib-wrapper adapters at a module boundary) |
| `src/serialize/frontmatter.test.ts` | test (unit) | Given raw string → assert split + Document preserved | `src/model/zod-issue-adapter.test.ts` (covers lib→internal mapping surface) | role-match |
| `src/serialize/atomic.ts` | IO primitive | `(path, contents) → Promise<AtomicWriteResult>` via `.tmp` + `rename` | None in Phase 1 (no IO primitives exist yet) | **no analog** — use RESEARCH §Example 5 |
| `src/serialize/atomic.test.ts` | test (unit, IO with spies) | Crash-mid-write simulation via `fs.rename` spy | None in Phase 1 | **no analog** — use RESEARCH §Pitfalls (D-32 simulated crash pattern) |
| `src/serialize/ast-handle.ts` | type definition | opaque-to-downstream type carrying `doc`, `bodyBytes`, `sigilOrigins`, `origBytes` | `src/model/spec.ts` (top-level type composition; re-exports via barrel) | role-match (pure type file; Phase-1 precedent for "one file per shape concern") |
| `src/serialize/diagnostics.ts` | type definition + re-export | New `SERDE_*` / `SPEC_*` codes + re-export Phase-1 `diagnostic()` factory | `src/primitives/diagnostic.ts` (code-factory pattern) + `src/primitives/index.ts` (barrel re-export) | exact |
| `src/serialize/index.ts` | barrel (public surface) | re-exports for `src/index.ts` | `src/model/index.ts` (explicit-named re-export pattern, NOT `export *`) + `src/primitives/index.ts` (`export *` pattern) | exact |
| `tests/round-trip.test.ts` | integration test (golden fixture driver) | `each fixture` → parse → write → `Buffer.equals(original, written)` | `tests/fixtures.test.ts` (`it.each(CANONICAL)` fixture driver) + `tests/malformed.test.ts` (snapshot + sorted assertions) | role-match |
| `tests/no-js-yaml.test.ts` | integration test (dependency audit) | Read `package.json` → assert absence of `js-yaml` | `tests/catalog-coverage.test.ts` (architectural invariant asserted via file read + set comparison) | role-match |
| `tests/fixtures.test.ts` (modified) | test migration (replace `readFixture` → `parseSpecFile`) | Same fixture input; swap import surface | Itself — Phase-1 version | exact (drop-in replacement) |
| `tests/malformed.test.ts` (modified) | test migration | Same as above + regenerate `__snapshots__/malformed.test.ts.snap` | Itself | exact |
| `tests/catalog-coverage.test.ts` (modified) | test migration | Same as above | Itself | exact |
| `tests/fidelity.test.ts` (modified) | test migration | Same as above | Itself | exact |
| `fixtures/round-trip/*.spec.md` (new) + `fixtures/sigil/*.spec.md` (new) | fixture (golden) | Hand-authored `.spec.md` | `fixtures/habit-tracker.spec.md` (triple-form canonical) | exact |
| `src/index.ts` (modified) | barrel (add serialize re-exports) | Existing barrel extended | Itself | exact |
| `vitest.config.ts` (modified) | config | Widen `include` glob | Itself | exact |
| `package.json` (modified) | config | Add `yaml@^2.8.3` + `gray-matter@^4.0.3` deps | Itself | exact |
| `.gitignore` + `.gitattributes` (new/modified) | config | Ignore `tests/tmp/`; force LF on `*.spec.md` | None | **no analog** — RESEARCH §Pitfall 5 / Open Q #2/3 |

## Pattern Assignments

### `src/serialize/parse.ts` (IO + adapter orchestrator, request-response)

**Analog:** `src/model/invariants.ts`

**Module-header pattern to copy** (invariants.ts lines 1-23):

```typescript
// src/model/invariants.ts
// `validateSpec()` — the public SPEC-09 contract.
//
// GUARANTEES:
//   - NEVER throws for any input (null, undefined, primitives, arrays, cyclic,
//     BigInt, huge strings). Every error path returns Diagnostic[].
//   - Returns `{ spec: Spec | null, diagnostics: Diagnostic[] }`.
//   - `spec` is null iff Stage A (Zod `safeParse`) failed.
//   - Cross-ref errors (Stage B) are reported in `diagnostics` but DO NOT null
//     the spec — the shape is still structurally valid and usable for read-only
//     operations (e.g., Phase 2 serializer can still emit from it; the save
//     gate blocks write-through on severity === "error").
//
// Two-stage pipeline per RESEARCH §Pattern 3 Option B:
//   A. `SpecSchema.safeParse(input)` → structural errors as Diagnostic[]
//   B. `crossReferencePass(parsed.data)` → reference / collision / resolution
//      errors
//
// THREAT T-01-01 MITIGATION: input-size cap at 5 MB of serialized JSON.
```

Apply to `parse.ts`: lead with a contract comment stating:
- `parseSpecFile(path)` NEVER throws on schema-error inputs; exceptions reserved only for `ENOENT` / permission / unrecoverable YAML syntax errors.
- Returns `{ spec, astHandle, diagnostics, body }`.
- Pipeline: read → gray-matter split → YAML.parseDocument → unknown-partition → sigil normalize → validateSpec.
- Threat model: 5 MB cap still applies (reuse Phase-1 constant `MAX_INPUT_BYTES`).

**Never-throws Result pattern** (invariants.ts lines 32-66):

```typescript
export function validateSpec(input: unknown): { spec: Spec | null; diagnostics: Diagnostic[] } {
  try {
    const serialized = JSON.stringify(input);
    if (typeof serialized === "string" && serialized.length > MAX_INPUT_BYTES) {
      return {
        spec: null,
        diagnostics: [
          {
            code: "SPEC_INPUT_TOO_LARGE",
            severity: "error",
            path: "",
            message: `spec input exceeds maximum size (${MAX_INPUT_BYTES} bytes)`,
          },
        ],
      };
    }
  } catch {
    return {
      spec: null,
      diagnostics: [
        {
          code: "SPEC_INPUT_NOT_SERIALIZABLE",
          severity: "error",
          path: "",
          message: "spec input could not be serialized (possibly cyclic or contains non-JSON values)",
        },
      ],
    };
  }
  // Stage A: ...
  const parsed = SpecSchema.safeParse(input);
  if (!parsed.success) {
    return { spec: null, diagnostics: zodIssuesToDiagnostics(parsed.error.issues) };
  }
  // Stage B: ...
  return { spec: parsed.data, diagnostics: crossReferencePass(parsed.data) };
}
```

Apply to `parse.ts`: same try/catch wrapper at every fallible stage. YAML syntax errors from `eemeli/yaml` are the ONE legitimate throw (unrecoverable IO per Phase-1 contract), but every Stage-A/B diagnostic must short-circuit into `{ spec: null, astHandle: null, diagnostics: [...], body: "" }`.

**Core-pipeline recipe** — RESEARCH §Architecture Patterns data-flow diagram (lines 165-215). Parser orchestrator wires: `fs.readFile` → `frontmatter.splitFrontmatter` → `unknown.partitionTopLevel` → `sigil.normalizeSigils` → YAML-1.1 gotcha lint → `validateSpec(knownSubset)` → `detectOrphanTmp` diagnostic.

---

### `src/serialize/write.ts` (IO + save-gate, request-response never-throws)

**Analog:** `src/model/invariants.ts` (Result contract) + `src/migrations/index.ts` (chain runner with step pattern)

**Save-gate pattern** — modeled on `invariants.ts` Stage-A/B severity semantics:

```typescript
// Pattern derived from invariants.ts lines 68-85:
//   Stage A failure → spec is null; Stage B errors → spec is NOT null but
//   diagnostics carry severity: 'error'.
// write.ts extends this: any severity: 'error' blocks disk write (D-31).

export async function writeSpecFile(
  path: string,
  spec: Spec,
  astHandle: AstHandle,
): Promise<{ written: boolean; diagnostics: Diagnostic[] }> {
  const { diagnostics } = validateSpec(spec);
  const hasError = diagnostics.some((d) => d.severity === "error");
  if (hasError) {
    return { written: false, diagnostics };
  }
  // ... diff-and-apply, atomic write ...
  return { written: true, diagnostics };
}
```

**Chain-runner step pattern** — `migrations/index.ts` lines 15-38 shows how to orchestrate a sequence of transforms with a single Result at the end:

```typescript
export function runMigrations(
  spec: unknown,
  fromVersion: SpecVersion,
  toVersion: SpecVersion,
): unknown {
  if (fromVersion === toVersion) return spec;
  let current: unknown = spec;
  let v: string = fromVersion;
  while (v !== toVersion) {
    const step = MIGRATIONS.find((m) => m.from === v);
    if (!step) throw new Error(`No migration path from v${v} toward v${toVersion}`);
    current = step.run(current as never);
    v = step.to;
  }
  return current;
}
```

Apply to `write.ts`: sequence transform passes as discrete steps — (1) save-gate → (2) `schema-inject.injectSchemaIfAbsent(doc)` → (3) diff-apply scalar edits via `CST.setScalarValue` → (4) sigil re-emit pass → (5) SERDE-07 auto-quote pass → (6) `doc.toString()` → (7) manual body splice → (8) `atomic.atomicWrite`. Each step is an exported function, testable in isolation.

**Idempotency** — `migrations/index.ts` line 20 (`if (fromVersion === toVersion) return spec`) establishes the "same-in-same-out" pattern that `schema-inject.ts` must mirror for the "schema already present" case (D-28 idempotency).

---

### `src/serialize/body.ts` (pure-function, byte-level transform)

**Analog:** `src/primitives/path.ts` (pure string transform — encode/decode segments)

**Pure-transform module header + helper pattern** (path.ts lines 1-42):

```typescript
// JSON Pointer (RFC 6901) branded type + RFC-compliant segment helpers.
//
// Scope:
//   - `encodeSegment` / `decodeSegment` for RFC 6901 §3 + §4 escaping
//   - `pathToJsonPointer(path)` — adapter from Zod `issue.path` to our
//     Diagnostic.path field.

// RFC 6901 §3 — encode: `~` MUST be escaped before `/` so that the fresh
// `~1` produced by a literal-slash replace is not re-escaped back to `~0~1`.
export function encodeSegment(s: string): string {
  return s.replace(/~/g, "~0").replace(/\//g, "~1");
}

// RFC 6901 §4 — decode: `~1` MUST be decoded BEFORE `~0`.
// Otherwise "a~01b" (literal `~1` with a preceding `~0` escape) would
// collapse to "a/b" — a data-corruption round-trip failure.
export function decodeSegment(s: string): string {
  return s.replace(/~1/g, "/").replace(/~0/g, "~");
}
```

Apply to `body.ts`: lead with a contract comment per RESEARCH §Pitfalls #2 and #7 (gray-matter strips leading `\n` after closing `---`; body-bytes extraction must come from `file.orig`, NOT `file.content`). Each helper is a pure `(string) → string` transform with the "why-order-matters" comment style above. Core helper shape:

```typescript
// Extract body-bytes verbatim from origBytes (everything after the closing
// `---` delimiter). Never read from file.content — gray-matter strips
// leading whitespace inconsistently (Pitfall #7).
export function extractBodyBytes(origBytes: string): string { /* ... */ }
```

---

### `src/serialize/sigil.ts` (pure-function + WeakMap side-channel)

**Analog:** `src/model/component.ts` (interactable-kind enumeration + regex constants) + `src/primitives/ids.ts` (regex with anchor + non-backtrack rationale)

**Regex-constant pattern with anti-ReDoS rationale** (ids.ts lines 1-20):

```typescript
// Branded ID types for the Spec model.
// Case conventions per CONTEXT.md Claude's Discretion "ID case conventions":
//   - screen / action / testID ids: snake_case (/^[a-z][a-z0-9_]*$/)
//
// Threat T-01-01 mitigation: all patterns are anchored (^...$) and
// non-backtracking (no alternation × quantifier combinations). Safe against
// ReDoS on adversarial 100kB inputs (covered by ids.test.ts).

export const SNAKE_CASE = /^[a-z][a-z0-9_]*$/;
export const PASCAL_CASE = /^[A-Z][A-Za-z0-9]*$/;
```

Apply to `sigil.ts`:

```typescript
// Sigil grammar per D-01..D-04. Anchored + non-backtracking — threat T-01-01.
// Label is printable ASCII only (D-03); escape rules for literal `→`/`]` in
// labels are deferred (D-03). Non-greedy `.+?` ends at FIRST ` →`.
export const SIGIL_REGEX = /^\[(.+?) →([a-z][a-z0-9_]*) test:([a-z][a-z0-9_]*)\]$/;
```

**Closed-vocabulary enum pattern** (component.ts lines 28-50):

```typescript
// 18-kind closed catalog — add kinds ONLY by updating this list AND the
// ComponentNode discriminated union type AND the ComponentNodeSchema union.
export const COMPONENT_KINDS = [
  "Column", "Row", "Text", "Button", "TextField", "List", "ListItem",
  "Card", "Image", "Icon", "Divider", "Toggle", "SegmentedControl",
  "TabBar", "NavBar", "Modal", "Sheet", "Spacer",
] as const;
export type ComponentKind = (typeof COMPONENT_KINDS)[number];
```

Apply to `sigil.ts` — enumerate `INTERACTABLE_KINDS` from the subset of `COMPONENT_KINDS` that carry `InteractableBase`:

```typescript
// Subset of COMPONENT_KINDS that carry (label, action, testID). TabBar items
// are inline-extended and handled separately per D-01. Reference authority:
// src/model/component.ts lines 58-62 (InteractableBase).
export const INTERACTABLE_KINDS = new Set([
  "Button", "TextField", "Toggle", "SegmentedControl", "ListItem",
] as const);
```

Verify the exact set at plan-writing time by re-reading `src/model/component.ts` lines 67-124 (ComponentNode union — find every branch carrying the triple `{label, action, testID}`). RESEARCH §Assumption A1 flags this as the verification point.

**Test table pattern** (ids.test.ts lines 20-40) — use `describe.each(schemas)` structure:

```typescript
// Apply to sigil.test.ts — enumerate accept/reject cases inline:
describe("SIGIL_REGEX", () => {
  it.each([
    ["[Open Detail →open_detail test:habit_row]", { label: "Open Detail", action: "open_detail", testID: "habit_row" }],
    // ... more rows ...
  ])("parses %s", (input, expected) => { /* ... */ });
  it.each([
    "[ →action test:id]",      // empty label
    "[Label →Action test:id]", // PascalCase action — rejected
    "Label →action test:id",   // missing brackets
  ])("rejects %s", (input) => { /* ... */ });
});
```

---

### `src/serialize/unknown.ts` (pure-function, tree-walker partition)

**Analog:** `src/model/cross-reference.ts` (context-carrying walker)

**Walker with context-carrying struct** (cross-reference.ts lines 30-62):

```typescript
// ---------- Walker context ----------
interface WalkContext {
  declaredActions: Set<string>;
  testIDRegistry: Map<string, string>; // testID → first-seen JSON Pointer
  diagnostics: Diagnostic[];
}

// ---------- Recursive component walker (RESEARCH Pitfall #3) ----------
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
```

Apply to `unknown.ts`: the partition is single-level (top of `doc.contents.items`), so the "walker" is a for-loop over `items` — but the same context struct + closed-set-membership pattern applies:

```typescript
// KNOWN_TOP_LEVEL_KEYS — closed vocabulary mirroring SpecSchema's 5 top-level
// keys. If a new key lands in Phase N+1 (schema v2), update this set AND
// SpecSchema in lockstep.
export const KNOWN_TOP_LEVEL_KEYS = ["schema", "screens", "actions", "data", "navigation"] as const;
const KNOWN_SET: ReadonlySet<string> = new Set(KNOWN_TOP_LEVEL_KEYS);

export interface PartitionResult {
  knownSubset: Record<string, unknown>;
  unknownKeys: string[];
}

export function partitionTopLevel(doc: Document): PartitionResult { /* ... */ }
```

**Explicit-kind-enumeration discipline** (cross-reference.ts lines 77-80) — the visitor switches explicitly on `node.kind` with NO default fallthrough. Apply to `unknown.ts`: explicitly check `isMap(doc.contents)` up front and early-return `{ knownSubset: {}, unknownKeys: [] }` for non-map documents (RESEARCH §Example 3 lines 789-791).

---

### `src/serialize/schema-inject.ts` (pure-function, idempotent AST mutation)

**Analog:** `src/migrations/v1_to_v2.ts` (idempotent empty-op transform with future-extensibility anchor) + `src/model/version.ts` (SCHEMA_VERSION literal)

**Idempotent-transform anchor** (v1_to_v2.ts lines 1-21):

```typescript
// src/migrations/v1_to_v2.ts
// SERDE-08 anchor: this file exists from commit 1, even though v1 has nothing
// to migrate. When a v2 schema lands in a future phase, this function transforms
// v1-shaped input to v2-shaped output.

import type { Spec } from "../model/spec.ts";
type SpecV1 = Spec;
type SpecV2 = Spec;

export function migrate(input: SpecV1): SpecV2 {
  // No-op in Phase 1. Future migrations: transform v1-shaped input to v2-shaped output.
  return input as unknown as SpecV2;
}
```

Apply to `schema-inject.ts`: same "idempotent + extension-anchor" shape — first-save inject; subsequent saves no-op. Implementation follows RESEARCH §Example 4 lines 836-856 verbatim:

```typescript
import { isMap } from "yaml";
import type { Document } from "yaml";
import { SCHEMA_VERSION } from "../model/index.ts";

export function injectSchemaIfAbsent(doc: Document): boolean {
  if (doc.has("schema")) return false; // idempotent
  // ... doc.createPair("schema", SCHEMA_VERSION) + items.unshift(...)
  // ... then doc.contents.items[1].spaceBefore = true (D-28 blank line)
  return true;
}
```

**Import the SCHEMA_VERSION literal, never inline the string** — version.ts lines 1-4 establishes SCHEMA_VERSION as the single source of truth. `schema-inject.ts` imports this; fidelity test (`tests/fidelity.test.ts` lines 75-82) already cross-checks that the literal `"mobile-tui/1"` appears in emitted targets.

---

### `src/serialize/frontmatter.ts` (adapter, library wiring)

**Analog:** `src/model/zod-issue-adapter.ts` (bridges external library shape to internal types)

**Adapter module-header pattern** (zod-issue-adapter.ts lines 1-21):

```typescript
// src/model/zod-issue-adapter.ts
// Maps Zod v4 `issue[]` → our `Diagnostic[]` shape.
//
// This is Stage A's output translator for `validateSpec()`. Zod's SafeParseError
// carries `error.issues: $ZodIssue[]`, each with:
//   - `code`: discriminator string (invalid_type, invalid_union, etc.)
//   - `path`: `(string | number)[]` pointing to the offending node
//   - `message`: human-readable string
//
// We map `code → SPEC_*` where it makes semantic sense, convert `path` to an
// RFC 6901 JSON Pointer via `pathToJsonPointer`, and surface Zod's sanitized
// message as-is. Zod's default messages describe expected vs. received TYPES
// and do NOT embed raw input values — per RESEARCH §Security Domain V8 we
// rely on that.
```

Apply to `frontmatter.ts`: lead with an adapter contract comment — "This module bridges `gray-matter@^4.0.3`'s file-split surface to our internal `ParsedFrontmatter` shape. Quirks isolated here: (1) gray-matter strips one `\r?\n` after closing `---` (RESEARCH §Pitfall 2); (2) gray-matter's `engines.yaml` contract passes parse return value directly to `file.data` without wrapping (RESEARCH §Assumption A3)."

**Lib-wiring recipe** — RESEARCH §Example 1 lines 652-714 is verbatim code. Copy the shape; annotate where Phase-1 patterns apply:

```typescript
import matter from "gray-matter";
import YAML from "yaml";

export interface ParsedFrontmatter {
  doc: YAML.Document;
  matterStr: string;
  bodyBytes: string;
  origBytes: string;
  isEmpty: boolean;
}

export function splitFrontmatter(raw: string): ParsedFrontmatter {
  const file = matter(raw, {
    engines: {
      yaml: {
        parse: (str: string): unknown =>
          YAML.parseDocument(str, { version: "1.2", keepSourceTokens: true }),
        stringify: () => {
          throw new Error(
            "gray-matter.stringify is not part of the write path — " +
              "see src/serialize/write.ts for manual-splice emission.",
          );
        },
      },
    },
  });
  // ... bodyBytes extraction from file.orig ...
}
```

---

### `src/serialize/diagnostics.ts` (type definition + re-export)

**Analog:** `src/primitives/diagnostic.ts` (code-factory pattern) + `src/primitives/index.ts` (barrel re-export)

**Code-factory + enum pattern** (diagnostic.ts lines 1-45):

```typescript
// Diagnostic shape per CONTEXT.md Claude's Discretion "Diagnostic codes":
//   - code: SCREAMING_SNAKE_CASE, namespaced (e.g. SPEC_UNKNOWN_COMPONENT)
//   - severity: error | warning | info (closed enum; no "hint" / "fatal")
//   - path: JSON Pointer (RFC 6901) string — branded JsonPointer upstream
//   - message: non-empty human-readable string
//
// SPEC-09 contract: validateSpec() returns Diagnostic[] and never throws.
// The save-gating logic (error-severity blocks save) lives in Phase 2;
// this module just defines the shape and construction helpers.

// SCREAMING_SNAKE_CASE, anchored + non-backtracking (threat T-01-01).
const DIAGNOSTIC_CODE = /^[A-Z][A-Z0-9_]*$/;

// Factory helpers — consistent construction, fewer typos than object literals.
export function error(code: string, path: JsonPointer, message: string): Diagnostic {
  return { code, severity: "error", path, message };
}
export function warning(code: string, path: JsonPointer, message: string): Diagnostic { /* ... */ }
export function info(code: string, path: JsonPointer, message: string): Diagnostic { /* ... */ }
```

Apply to `src/serialize/diagnostics.ts`: re-export `{ error, warning, info, type Diagnostic, DiagnosticSchema }` from `../primitives/diagnostic.ts`; add Phase-2-specific code constants as typed string literals (no factory needed — Phase 2 reuses the Phase-1 factory):

```typescript
// Phase 2 diagnostic code registry. These augment — but do not replace —
// Phase 1's SPEC_* codes in src/primitives/diagnostic.ts. New in Phase 2:
//   - SPEC_ORPHAN_TEMP_FILE (info, D-30)
//   - SPEC_SIGIL_PARTIAL_DROPPED (info, D-24)
//   - SPEC_UNKNOWN_TOP_LEVEL_KEY (error — emerges from Phase-1 .strict(),
//     re-named here for Phase-2 call sites that need the explicit code)
//   - SERDE_YAML11_GOTCHA (info, D-Discretion)
//   - SERDE_BYTE_DRIFT_DETECTED (error, CI-assertion helper)
//   - SERDE_MISSING_DELIMITER (error, A7 mitigation)
//
// All codes SCREAMING_SNAKE_CASE per Phase-1 DIAGNOSTIC_CODE regex.
export const SERDE_CODES = {
  SPEC_ORPHAN_TEMP_FILE: "SPEC_ORPHAN_TEMP_FILE",
  SPEC_SIGIL_PARTIAL_DROPPED: "SPEC_SIGIL_PARTIAL_DROPPED",
  SPEC_UNKNOWN_TOP_LEVEL_KEY: "SPEC_UNKNOWN_TOP_LEVEL_KEY",
  SERDE_YAML11_GOTCHA: "SERDE_YAML11_GOTCHA",
  SERDE_BYTE_DRIFT_DETECTED: "SERDE_BYTE_DRIFT_DETECTED",
  SERDE_MISSING_DELIMITER: "SERDE_MISSING_DELIMITER",
} as const;

// Re-export Phase-1 factory for callers that just want
//   import { error, info } from "./diagnostics.ts"
export { error, info, warning, type Diagnostic, DiagnosticSchema } from "../primitives/diagnostic.ts";
```

---

### `src/serialize/index.ts` (barrel)

**Analog:** `src/model/index.ts` (explicit named re-export — preferred) + `src/primitives/index.ts` (`export *` — simpler)

**Explicit-named re-export pattern** (model/index.ts lines 1-10, 38):

```typescript
// src/model/index.ts — public barrel for the model layer.
//
// Downstream consumers (Phase 2 serializer, Phase 3 wireframe renderer, Phase 9
// pi extension, npm package consumers) import from `mobile-tui` which re-exports
// from here via `src/index.ts`. Each schema file stays internal-import-able
// (`./screen.ts`, `./variant.ts`) for co-located tests, but the public surface
// converges here.
//
// Ordering: schema constants + types first, then validator entry points last
// so the shape of the public API is immediately legible at the top of the file.
export { MAX_INPUT_BYTES, validateSpec } from "./invariants.ts";
// ... etc ...
```

Apply to `src/serialize/index.ts`: follow the explicit-named pattern (Phase-1 comment at model/index.ts line 16-17 explicitly warns against `export *` where internal symbols would leak). Public Phase-2 surface:

```typescript
// src/serialize/index.ts — public barrel for L3 Serialize layer.
// Consumers: src/index.ts (top-level npm surface), Phase 3 (wireframe
// renderer), Phase 4 (editor store), Phase 7 (Maestro emitter via Phase 4).
// Each leaf stays import-able via ./parse.ts etc. for co-located tests.
export { parseSpecFile } from "./parse.ts";
export { writeSpecFile } from "./write.ts";
export type { AstHandle } from "./ast-handle.ts";
export { SERDE_CODES } from "./diagnostics.ts";
```

Do NOT re-export internals like `partitionTopLevel`, `normalizeSigils`, `splitFrontmatter`, `atomicWrite`, `injectSchemaIfAbsent`, `extractBodyBytes`. Those are implementation details — co-located tests import them directly from leaf modules.

---

### `tests/round-trip.test.ts` (integration test, golden fixture driver)

**Analog:** `tests/fixtures.test.ts` (`it.each` driver over canonical set) + `tests/malformed.test.ts` (snapshot + assertion shape)

**`it.each` driver pattern** (fixtures.test.ts lines 9-23):

```typescript
// tests/fixtures.test.ts
import { describe, expect, it } from "vitest";
import { validateSpec } from "../src/index.ts";
import { readFixture } from "./helpers/parse-fixture.ts";

const CANONICAL = ["habit-tracker", "todo", "social-feed"] as const;

describe("canonical fixtures validate with zero error diagnostics (success criterion #1)", () => {
  it.each(CANONICAL)("%s.spec.md — zero errors", async (name) => {
    const spec = await readFixture(`fixtures/${name}.spec.md`);
    const { spec: result, diagnostics } = validateSpec(spec);
    const errors = diagnostics.filter((d) => d.severity === "error");
    if (errors.length > 0) {
      console.error(`[${name}] unexpected errors:`, JSON.stringify(errors, null, 2));
    }
    expect(errors).toEqual([]);
    expect(result).not.toBeNull();
  });
});
```

Apply to `round-trip.test.ts`: use `it.each(FIXTURES)` where `FIXTURES` is an array of relative paths. Error surfacing via `console.error` before the assertion (lines 17-19) is the Phase-1 convention — keep it for drift-detection readability. Replace `readFixture` with `parseSpecFile` + the write path from RESEARCH §Example 6.

**Snapshot + sort pattern** (malformed.test.ts lines 30-38):

```typescript
it("snapshots the full Diagnostic[] for regression protection", async () => {
  const spec = await readFixture("fixtures/malformed.spec.md");
  const { diagnostics } = validateSpec(spec);
  // Sort for stability across insertion-order changes in the cross-ref walker.
  const sorted = [...diagnostics].sort((a, b) =>
    a.code !== b.code ? a.code.localeCompare(b.code) : a.path.localeCompare(b.path),
  );
  expect(sorted).toMatchSnapshot();
});
```

Apply to `round-trip.test.ts`: the primary assertion is `Buffer.equals(originalBytes, roundTrippedBytes)` per SERDE-05 (RESEARCH §Example 6 lines 993-995). No snapshot needed — byte-equality is the stable assertion. BUT: add a secondary snapshot test for the 4 `SERDE_YAML11_GOTCHA` fixtures asserting the info-severity diagnostic list matches expected (sort by `code`, `path`).

---

### `tests/no-js-yaml.test.ts` (integration test, dependency audit)

**Analog:** `tests/catalog-coverage.test.ts` (architectural invariant asserted by reading artifacts + set comparison)

**Architectural-invariant assertion pattern** (catalog-coverage.test.ts lines 39-56):

```typescript
describe("catalog coverage (SPEC-01)", () => {
  it("every kind in COMPONENT_KINDS appears in at least one canonical fixture", async () => {
    const allKinds = new Set<string>();
    for (const name of CANONICAL) {
      const kinds = await collectKindsFromFixture(name);
      for (const k of kinds) allKinds.add(k);
    }
    const missing = COMPONENT_KINDS.filter((k) => !allKinds.has(k));
    if (missing.length > 0) {
      console.error(
        "[catalog coverage] kinds missing from fixtures:",
        missing,
        "\nextend a fixture to include them (see D-14).",
      );
    }
    expect(missing).toEqual([]);
  });
});
```

Apply to `no-js-yaml.test.ts`:

```typescript
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("SERDE-02: js-yaml is banned at the dependency level", () => {
  it("package.json has NO js-yaml in any dependency field", () => {
    const pkg = JSON.parse(readFileSync(resolve("package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
      optionalDependencies?: Record<string, string>;
    };
    const allDeps = {
      ...(pkg.dependencies ?? {}),
      ...(pkg.devDependencies ?? {}),
      ...(pkg.peerDependencies ?? {}),
      ...(pkg.optionalDependencies ?? {}),
    };
    expect(allDeps["js-yaml"]).toBeUndefined();
    expect(allDeps["@types/js-yaml"]).toBeUndefined();
  });

  it("no source file imports js-yaml (grep gate)", () => {
    // rg -l "from ['\"]js-yaml" src/ tests/ should return 0 files.
    // Implementation: walk fs or shell-out; choose one.
  });
});
```

Use `console.error` "why it failed" pre-amble before the assertion (catalog-coverage.test.ts lines 49-55) to match Phase-1 failure-ergonomics.

---

### Migrated tests: `tests/{fixtures,malformed,catalog-coverage,fidelity}.test.ts`

**Analog:** themselves (Phase-1 versions); switching from `readFixture` (a `Promise<unknown>`) to `parseSpecFile` (a `Promise<{ spec, astHandle, diagnostics, body }>`).

**Migration pattern** — the callsite swap is small; diffs look like:

```typescript
// BEFORE (Phase 1):
import { readFixture } from "./helpers/parse-fixture.ts";
const spec = await readFixture(`fixtures/${name}.spec.md`);
const { spec: result, diagnostics } = validateSpec(spec);

// AFTER (Phase 2):
import { parseSpecFile } from "../src/serialize/index.ts";
const { spec, diagnostics } = await parseSpecFile(resolve(`fixtures/${name}.spec.md`));
// spec is already the validated shape (or null on error); diagnostics already surfaced
```

Two behavioral differences to plan for:
1. **validateSpec is no longer called twice** — `parseSpecFile` already runs `validateSpec` internally. The old test body `validateSpec(spec)` must drop, or the test must use `astHandle.doc.toJSON()` as a raw intermediary if the test's intent was to validate a mutated clone (e.g. malformed.test.ts Stage-A cases lines 49-86).
2. **Snapshot regeneration** — `tests/__snapshots__/malformed.test.ts.snap` should be bit-for-bit identical after sort; if the parser path changes diagnostic ordering, it's a regeneration not a regression.

Keep `fixtures.test.ts` line 27-31 shape checks (`spec.screens.length === 3`, etc.) — but consume `spec` directly from `parseSpecFile`, not from `readFixture`'s `unknown` return.

---

## Shared Patterns

### Module-header contract block

**Source:** `src/model/invariants.ts` (lines 1-23), `src/primitives/diagnostic.ts` (lines 1-10), `src/model/component.ts` (lines 1-21)

**Apply to:** Every new `src/serialize/*.ts` file.

**Shape:**
```typescript
// src/serialize/{file}.ts
// {One-line purpose — what this module owns.}
//
// GUARANTEES / CONTRACT / SCOPE:
//   - {Concrete invariant 1}
//   - {Concrete invariant 2}
//
// THREAT {T-XX-YY} MITIGATION: {one-liner}
//
// RELATED: {sibling module names, tests, decisions D-NN}
```

Every Phase-1 source file uses this shape. Enforces traceability from file → decisions → tests. The `// THREAT T-XX-YY` line surfaces the threat-model linkage (Phase 1 used T-01-01 ReDoS and T-01-02 input-sanitization). Phase 2 adds T-02 threats for: path traversal (trust the caller per RESEARCH §Security), YAML alias DoS (eemeli/yaml 1.2 mode), partial-write (atomic primitive).

---

### Closed-vocabulary SCREAMING_SNAKE_CASE diagnostic codes

**Source:** `src/primitives/diagnostic.ts` (line 19) + `src/model/zod-issue-adapter.ts` (ZOD_CODE_MAP lines 29-45)

**Apply to:** `src/serialize/diagnostics.ts` + every call site in `parse.ts`, `write.ts`, `unknown.ts`, `atomic.ts`.

```typescript
// SCREAMING_SNAKE_CASE, anchored + non-backtracking (threat T-01-01).
const DIAGNOSTIC_CODE = /^[A-Z][A-Z0-9_]*$/;
```

New Phase-2 codes all namespaced:
- `SPEC_*` = spec-file-level concerns (unknown key, orphan tmp, sigil partial drop)
- `SERDE_*` = serialize-path concerns (YAML 1.1 gotcha, byte drift, missing delimiter)

The Phase-1 Zod adapter (zod-issue-adapter.ts line 29) already defines the `SPEC_*` namespace. Phase-2 codes SHOULD NOT overlap — every new code is new surface.

---

### Never-throws at module boundary

**Source:** `src/model/invariants.ts` (entire file is the canonical example)

**Apply to:** `parseSpecFile`, `writeSpecFile`. Both return `{ ..., diagnostics }` Result shapes. Exceptions ONLY for unrecoverable IO:
- `ENOENT` (file not found) — caller's bug
- `EACCES` (permission denied) — caller's bug
- YAML syntax error thrown by `eemeli/yaml.parseDocument` — unrecoverable; caller sees the throw and decides

Phase-1 precedent (invariants.ts lines 51-65): `JSON.stringify` throw on cycles is caught and converted to `{ spec: null, diagnostics: [{ code: "SPEC_INPUT_NOT_SERIALIZABLE", ... }] }`. Phase-2 analog: YAML version mismatch / unknown-top-level-key during AST partition → stash as a diagnostic, don't throw.

---

### Test file layout: co-located `*.test.ts` + integration in `tests/`

**Source:** Phase-1 layout — every `src/model/*.ts` has `src/model/*.test.ts` sibling; integration tests in `tests/`.

**Apply to:** Every new `src/serialize/*.ts` gets a `src/serialize/*.test.ts` sibling; integration tests land in `tests/round-trip.test.ts` and `tests/no-js-yaml.test.ts`.

**Test-file header pattern** (fixtures.test.ts lines 1-3):

```typescript
// tests/{file}.test.ts
// {Success criterion / requirement ID this test owns.}
// {1-2 sentences on what the test asserts.}
import { describe, expect, it } from "vitest";
```

Always named imports from `vitest` (globals disabled in vitest.config.ts line 4). Never use `test.skip` or `describe.skip` — per CLAUDE.md unwritten discipline, disabled tests are a smell.

---

### TDD RED → GREEN commit pair convention

**Source:** Phase-1 git history — `test(01-XX): RED …` followed by `feat(01-XX): GREEN …`.

**Apply to:** Every Phase-2 task. Commit pair examples:
- `test(02-01): RED — package.json includes yaml + gray-matter` / `feat(02-01): GREEN — add deps`
- `test(02-03): RED — splitFrontmatter parses habit-tracker.spec.md` / `feat(02-03): GREEN — implement frontmatter.ts`
- `test(02-07): RED — writeSpecFile gates on severity: error` / `feat(02-07): GREEN — save-gate`

Recent `git log --oneline | grep '01-'` confirms the cadence. Planner must honor it for Phase 2.

---

### Zod v4 consumed only, not extended

**Source:** CONTEXT.md code_context + RESEARCH.md §Project Constraints line 123

**Apply to:** Every `src/serialize/*.ts` file. Phase 2 imports `{ Spec, SpecSchema, validateSpec, SCHEMA_VERSION, Diagnostic }` from `../model/index.ts` and `../primitives/diagnostic.ts`. NO `z.object({...})` calls anywhere in `src/serialize/`. The `AstHandle` type is hand-written TypeScript (per RESEARCH §Recommended Structure line 318).

---

### Import-convention: `.ts` extensions + explicit `type` keyword

**Source:** Every Phase-1 file — `import { … } from "./file.ts"`, `import type { … } from "./file.ts"`.

**Apply to:** Every Phase-2 file. tsconfig.json line 11 (`verbatimModuleSyntax: true`) enforces the `import type { ... }` discipline at compile time. Examples from zod-issue-adapter.ts lines 22-24:

```typescript
import type { z } from "zod";
import type { Diagnostic } from "../primitives/diagnostic.ts";
import { pathToJsonPointer } from "../primitives/path.ts";
```

---

## No Analog Found

Files with no close match in the Phase-1 codebase (planner should use RESEARCH.md Code Examples + Pitfalls sections):

| File | Role | Data Flow | Reason | RESEARCH Reference |
|------|------|-----------|--------|--------------------|
| `src/serialize/atomic.ts` | IO primitive | `(path, contents) → Promise<AtomicWriteResult>` | No filesystem-mutation primitive exists in Phase 1 (only `readFileSync` in test helpers) | §Example 5 lines 860-916; §Pitfall 5 (CRLF drift) |
| `src/serialize/atomic.test.ts` | test (spy-based crash simulation) | Mock `fs.rename` throw → assert target untouched | No Phase-1 test uses `vi.spyOn` on Node built-ins | D-32 spec; Open Q #2 (per-test tmp paths via `crypto.randomUUID()`) |
| `src/serialize/ast-handle.ts` | opaque type (YAML.Document + WeakMap + bytes) | — | No Phase-1 analog to an opaque-state-carrier type across parse/write boundary | §Architecture lines 213-215 (AstHandle shape) |
| `.gitattributes` (addition) | VCS config | Force `*.spec.md text eol=lf` | No .gitattributes file exists | §Pitfall 5; Open Q #3 |
| `.gitignore` (modification) | VCS config | Add `tests/tmp/` | Phase 1 .gitignore untouched | Open Q #2 |
| `fixtures/round-trip/*.spec.md` new fixtures | golden fixture | Hand-authored YAML + markdown with edge cases | Phase-1 fixtures don't exercise comments, reordering, YAML-1.1 gotchas, or unknown-top-level-keys | §20-fixture composition in CONTEXT.md Claude's Discretion + RESEARCH §Example 6 fixture list |

For these files, the planner copies verbatim from RESEARCH.md code examples and annotates with the same module-header pattern used elsewhere (§Shared Patterns above). The atomic-write primitive in particular is RESEARCH §Example 5 lines 872-904 copied 1:1.

---

## Metadata

**Analog search scope:**
- `src/primitives/*.ts` (diagnostic factory, branded IDs, JsonPointer path)
- `src/model/*.ts` (validateSpec orchestrator, zod-issue-adapter, cross-reference walker, version constant, barrel pattern)
- `src/migrations/*.ts` (chain runner idempotency, empty-op anchor)
- `tests/*.test.ts` (it.each driver, snapshot + sort, architectural-invariant, helper-delete migration)
- `fixtures/*.spec.md` (Phase-1 golden baseline)
- `package.json`, `vitest.config.ts`, `tsconfig.json`, `biome.json` (config conventions)

**Files scanned:** 33 source + test files; 4 fixtures; 4 config files.

**Pattern extraction date:** 2026-04-18

**Key insight:** Phase 2 is a **mirror-layer phase** to Phase 1 — same per-file discipline (one concern per file, co-located test, SCREAMING_SNAKE_CASE diagnostic codes, never-throws Result contract, explicit-named barrels, TDD RED→GREEN commits) applied to a new directory (`src/serialize/`). The 22 strong analogs mean the planner can largely copy the Phase-1 module-header shape + Result-contract discipline verbatim. The 6 "no analog" files (atomic IO primitive, AstHandle type, 2 VCS config files, new fixtures) are the only places where RESEARCH.md examples become the authority instead of Phase-1 code.
