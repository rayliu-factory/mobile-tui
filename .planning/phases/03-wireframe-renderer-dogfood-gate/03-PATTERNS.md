# Phase 3: Wireframe Renderer & Dogfood Gate — Pattern Map

**Mapped:** 2026-04-18
**Files analyzed:** 28 new files (18 emitters + 5 support modules + 1 CLI + 3 integration tests + 20 .wf.txt + 2 sidecars, collapsed into representative patterns)
**Analogs found:** 28 / 28 (exact or role-match for every new file; `.wf.txt` fixture corpus has no prior analog — noted below)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/emit/wireframe/index.ts` | barrel | re-export | `src/serialize/index.ts` | exact |
| `src/emit/wireframe/layout.ts` | utility | pure transform | `src/primitives/path.ts` + `src/serialize/body.ts` | exact (pure-helper module) |
| `src/emit/wireframe/variants.ts` | orchestrator | composition | `src/serialize/parse.ts` (multi-step pipeline) + `src/model/cross-reference.ts` (variant switch) | exact |
| `src/emit/wireframe/text-style.ts` | utility | pure transform | `src/primitives/path.ts` (encodeSegment/decodeSegment) | exact |
| `src/emit/wireframe/overflow.ts` | utility | pure transform | `src/primitives/path.ts` (single-concern helper module) | exact |
| `src/emit/wireframe/components/button.ts` | emitter (leaf) | tree → string[] | `src/model/cross-reference.ts` `visitNode` per-kind dispatch | role-match |
| `src/emit/wireframe/components/text-field.ts` | emitter (leaf) | tree → string[] | same as button.ts | role-match |
| `src/emit/wireframe/components/toggle.ts` | emitter (leaf) | tree → string[] | same as button.ts | role-match |
| `src/emit/wireframe/components/segmented-control.ts` | emitter (leaf) | tree → string[] | same as button.ts | role-match |
| `src/emit/wireframe/components/text.ts` | emitter (leaf) | tree → string[] | same as button.ts | role-match |
| `src/emit/wireframe/components/icon.ts` | emitter (leaf) | tree → string[] | same as button.ts | role-match |
| `src/emit/wireframe/components/divider.ts` | emitter (leaf) | tree → string[] | same as button.ts | role-match |
| `src/emit/wireframe/components/spacer.ts` | emitter (leaf) | tree → string[] | same as button.ts | role-match |
| `src/emit/wireframe/components/image.ts` | emitter (leaf) | tree → string[] | same as button.ts | role-match |
| `src/emit/wireframe/components/column.ts` | emitter (recursive) | tree → string[] | `src/model/cross-reference.ts` `walkComponentTree` (recursive descent) | exact |
| `src/emit/wireframe/components/row.ts` | emitter (recursive) | tree → string[] | same as column.ts | exact |
| `src/emit/wireframe/components/card.ts` | emitter (recursive) | tree → string[] | same as column.ts (single-child variant) | exact |
| `src/emit/wireframe/components/list.ts` | emitter (recursive) | tree → string[] | same as column.ts | exact |
| `src/emit/wireframe/components/list-item.ts` | emitter (recursive) | tree → string[] | same as column.ts | exact |
| `src/emit/wireframe/components/nav-bar.ts` | emitter (recursive) | tree → string[] | same as column.ts (leading/trailing slots) | exact |
| `src/emit/wireframe/components/tab-bar.ts` | emitter (leaf, inline items) | tree → string[] | `src/model/cross-reference.ts` TabBar-items branch | exact |
| `src/emit/wireframe/components/modal.ts` | emitter (recursive) | tree → string[] | same as card.ts | exact |
| `src/emit/wireframe/components/sheet.ts` | emitter (recursive) | tree → string[] | same as card.ts | exact |
| `src/emit/wireframe/components/*.test.ts` | test (unit, snapshot) | pure-fn assertion | `src/primitives/path.test.ts` + `src/model/component.test.ts` | exact |
| `src/emit/wireframe/layout.test.ts` | test (unit) | pure-fn assertion | `src/serialize/body.test.ts` | exact |
| `src/emit/wireframe/variants.test.ts` | test (unit) | pure-fn assertion | `src/serialize/frontmatter.test.ts` | exact |
| `scripts/render-wireframe.ts` | CLI entry | argv → parse → render → stdout | (no prior CLI in repo) — closest: `src/serialize/parse.ts` caller shape | partial (novel file type) |
| `tests/wireframe-catalog.test.ts` | test (integration) | catalog coverage | `tests/catalog-coverage.test.ts` | exact |
| `tests/wireframe-ascii-baseline.test.ts` | test (integration) | regex over fixtures | `tests/fidelity.test.ts` (fixture-file readback + assertion) | role-match |
| `tests/dogfood-gate.test.ts` | test (integration) | file-count + parse | `tests/fixtures.test.ts` + `tests/round-trip.test.ts` (fixture-matrix) | role-match |
| `fixtures/wireframes/*/*.wf.txt` × 20 | fixture artefact | golden file | `fixtures/targets/habit-tracker.swift` + `fixtures/targets/habit-tracker.kt` | role-match (golden-file fixture pattern) |
| `fixtures/wireframes/README.md` | doc sidecar | index | (no prior analog) | none |
| `fixtures/wireframes/SHARED.md` | dogfood sidecar | evidence log | (no prior analog — novel) | none |

**No changes to:** `package.json` (no new deps per RESEARCH §Standard Stack); `vitest.config.ts` (existing `src/**/*.test.ts` + `tests/**/*.test.ts` globs already match new files); `tsconfig.json`; `biome.json`.

## Pattern Assignments

### `src/emit/wireframe/index.ts` (barrel, re-export)

**Analog:** `src/serialize/index.ts`

**Pattern — EXPLICIT-NAMED barrel (NOT `export *`)** (lines 1-21):
```typescript
// src/serialize/index.ts — public barrel for the L3 Serialize layer.
// …
// Barrel follows the EXPLICIT-NAMED pattern per src/model/index.ts
// (NOT `export *`), so adding a new public name is a deliberate edit
// here rather than an implicit broadening of the surface area.
export type { AstHandle, ClosingDelimiterTerminator, LineEndingStyle } from "./ast-handle.ts";
export { SERDE_CODES, type SerdeCode } from "./diagnostics.ts";
export { type ParseResult, parseSpecFile } from "./parse.ts";
export { type WriteResult, writeSpecFile } from "./write.ts";
```

**Apply verbatim:**
- Top-of-file comment explaining the layer's consumers + the "explicit-named, not `export *`" policy
- `export type { … } from "./leaf.ts"` for types; `export { fn, type Result } from "./leaf.ts"` for functions + result types
- Keep co-located leaf modules importable from tests; this file is the one-way outward seam

**Expected exports for Phase 3:**
```typescript
export { type RenderOptions, render, renderAllVariants } from "./variants.ts";
// Emitters stay internal — downstream consumers never import individual kind emitters.
// Planner decides if `truncate`, `padRight`, etc. are re-exported (probably no; Phase 4 doesn't need them).
```

**Gotcha:** Do NOT `export * from "./components/button.ts"` — that broadens the surface accidentally. Match `src/primitives/index.ts` (which uses `export *`) only for the internal-to-layer primitives barrel, not the public surface.

---

### `src/emit/wireframe/layout.ts` (utility, pure transform)

**Analogs:** `src/primitives/path.ts` (single-concern pure-helper module) + `src/serialize/body.ts` (pure string-slicing primitive)

**Pattern — pure-function module with small surface + heavy header comment** (`src/primitives/path.ts` lines 1-16):
```typescript
// JSON Pointer (RFC 6901) branded type + RFC-compliant segment helpers.
//
// Scope:
//   - `JsonPointer` branded string + `JsonPointerSchema` Zod validator
//   - `encodeSegment` / `decodeSegment` for RFC 6901 §3 + §4 escaping
//   - `pathToJsonPointer(path)` — adapter from Zod `issue.path` to our
//     Diagnostic.path field. This is the ONLY allowed conversion.
//
// Runtime get / has / set: callers import directly from `jsonpointer` —
// see RESEARCH §Don't Hand-Roll. This module does not re-implement pointer
// resolution, only the wire-format string layer.
```

**Pattern — small named exports + inline regex constants** (`src/primitives/path.ts` lines 18-28):
```typescript
export type JsonPointer = string & { readonly __brand: "JsonPointer" };

const JSON_POINTER = /^(\/([^~/]|~[01])*)*$/;

export const JsonPointerSchema = z
  .string()
  .regex(JSON_POINTER, "invalid JSON Pointer (RFC 6901)")
  .transform((s) => s as JsonPointer);
```

**Pattern — deterministic string-building with explicit-gotcha comments** (`src/serialize/body.ts` lines 42-82):
```typescript
const DELIMITER_REGEX = /^---+[ \t]*$/m;

export interface FrontmatterBounds {
  start: number;
  end: number;
  closingTerminator: "\n" | "\r\n" | "";
}

export function findFrontmatterBounds(origBytes: string): FrontmatterBounds | null {
  const openMatch = origBytes.match(DELIMITER_REGEX);
  if (!openMatch || openMatch.index === undefined) return null;
  // …explicit arithmetic with inline comments…
}
```

**Apply to `layout.ts`:**
- Scope header listing the handful of exported names (`buildVariantHeader`, `padRight`, `drawFrame`, maybe `PHONE_WIDTH = 60`)
- Pure functions; no IO, no clock, no `process.env` (honors RESEARCH Pitfall 3)
- One concern only — the frame-composition math. Text-style and overflow split into sibling files per the same module-per-concern precedent (`src/model/{action,screen,variant,component}.ts`)
- Width arithmetic documented in doc comments, per RESEARCH Pitfall 4 ("nested-width drift")
- Export a `const PHONE_WIDTH = 60` — mirror `MAX_INPUT_BYTES` export style at `src/model/invariants.ts:30`

---

### `src/emit/wireframe/variants.ts` (orchestrator, composition)

**Analog:** `src/serialize/parse.ts` (multi-step orchestrator pipeline)

**Pattern — numbered-step pipeline with top-level doc block** (`src/serialize/parse.ts` lines 1-57):
```typescript
// src/serialize/parse.ts
// `parseSpecFile(path)` — Phase-2 public read entry point.
//
// GUARANTEES:
//   - NEVER throws on schema-error inputs; every error path returns
//     Diagnostic[]. Exceptions ONLY for:
//       * ENOENT / EACCES from fs.readFile
//       * YAML.parseDocument syntax errors (unrecoverable)
//       * .tmp-suffixed input path (authoring mistake, Open Q#4)
//   - Returns { spec, astHandle, diagnostics, body }.
//   - spec is null iff Stage A (validateSpec) fails OR the file had no
//     frontmatter delimiters at all.
//
// PIPELINE (matches RESEARCH §Architecture Patterns data-flow on PARSE):
//   1. Reject .tmp paths (authoring mistake, not IO)
//   2. Read file bytes
//   3. splitFrontmatter → ParsedFrontmatter …
```

**Pattern — step body with `// Step N —` comment markers** (`src/serialize/parse.ts` lines 81-127):
```typescript
export async function parseSpecFile(path: string): Promise<ParseResult> {
  // Step 1 — Reject .tmp paths (Open Q#4).
  if (path.endsWith(".tmp")) { … }

  // Step 2 — Read file.
  const raw = await fs.readFile(abs, "utf8");

  // Step 3 — splitFrontmatter.
  const parsed = splitFrontmatter(raw);

  // Step 4 — Orphan .tmp detection.
  // Step 5 — BLOCKER fix #2: delimiters completely absent?
  // …
}
```

**Apply to `variants.ts` `renderScreen` / `render`:**
- Top doc block stating GUARANTEES (pure; never throws except on unknown screenId) + PIPELINE (step 1: locate screen, step 2: stack 4 variants, step 3: null → N/A marker, step 4: append acceptance footer if content)
- Each step preceded by a `// Step N —` comment
- Throw only on CLI-caller errors (screenId absent), mirroring `parse.ts` step 1's ".tmp throw" policy

**Pattern — variant walker (match by key in closed set)** (`src/model/cross-reference.ts` lines 260-305):
```typescript
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
if (variants.loading) { … variants.loading.when.async … }
if (variants.error)   { … variants.error.when.field_error … }
```

**Apply to variant stacking:**
- Same `if (variants.X)` pattern per-variant — enforces D-39 "null variants render as N/A marker, not omitted" by having an explicit `else` branch producing the `(N/A)` frame
- `when` access paths match Phase 1 exactly: `variants.empty.when.collection`, `variants.loading.when.async`, `variants.error.when.field_error` (D-41 header trigger)

---

### `src/emit/wireframe/text-style.ts` + `src/emit/wireframe/overflow.ts` (utility, pure transform)

**Analog:** `src/primitives/path.ts` (single-concern pure-helper module with two or three exported fns + doc header)

**Pattern — tight scope, exported fns documented inline with RFC/decision refs** (`src/primitives/path.ts` lines 29-41):
```typescript
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

**Apply to `text-style.ts`:**
- `applyTextStyle(text: string, style?: "heading-1" | "heading-2" | "body" | "caption"): string`
- Doc comment cites `D-43` (not an RFC, same shape)
- Heading-1 → `text.toUpperCase()`, caption → `\`(${text})\``, body → `text` (identity), heading-2 → `text` (identity; D-43 says "respect author capitalization")

**Apply to `overflow.ts`:**
- `truncate(s: string, width: number): string` citing D-44
- Match the body: `if (s.length <= width) return s; return s.slice(0, width - 3) + "...";`
- Sibling doc block cites the RESEARCH §Pitfall 6 constraint: "the `[BROKEN LINK]` marker is load-bearing; other content gives way first" — this is the file where that rule is enforced.

---

### `src/emit/wireframe/components/*.ts` (emitter, tree → string[])

**Analogs:**
- `src/model/cross-reference.ts` `visitNode` (lines 64-117) — exhaustive `switch (node.kind)` per-kind dispatch
- `src/model/component.ts` `ComponentNodeSchema` (lines 187-274) — the authoritative discriminated union every emitter narrows against
- `src/model/cross-reference.ts` `walkComponentTree` (lines 52-62) — recursive descent into children arrays

**Pattern — exhaustive-switch dispatch with `never` fallback** (`src/model/cross-reference.ts` lines 79-116):
```typescript
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
    for (let i = 0; i < node.items.length; i++) { … }
    break;
  case "Modal":
  case "Sheet":
    visitNode(node.child, [...path, "child"], ctx);
    break;
  default:
    break; // leaf kinds
}
```

**Pattern — TabBar items are inline sigils (never full nodes)** (`src/model/cross-reference.ts` lines 97-107, `src/model/component.ts` lines 119-123 + 127):
```typescript
// src/model/component.ts line 119:
| {
    kind: "TabBar";
    items: Array<{ label: string; action: string; testID: string; icon?: string }>;
  }

// src/model/cross-reference.ts lines 97-107:
case "TabBar":
  for (let i = 0; i < node.items.length; i++) {
    const item = node.items[i];
    if (!item) continue;
    const itemPath = [...path, "items", i];
    registerTestID(item.testID, [...itemPath, "testID"], ctx);
    registerActionRef(item.action, [...itemPath, "action"], ctx);
  }
  break;
```

**Apply to `renderNode` dispatcher (probably lives inside `variants.ts` or a private `dispatch.ts`):**
```typescript
export function renderNode(node: ComponentNode, width: number): string[] {
  switch (node.kind) {
    case "Text": return renderText(node, width);
    case "Icon": return renderIcon(node, width);
    // … 16 more …
    case "Sheet": return renderSheet(node, width);
    default: {
      const _exhaustive: never = node; // compile error if a kind is missing
      throw new Error(`unreachable: ${(_exhaustive as { kind: string }).kind}`);
    }
  }
}
```
The `never` fallback is the enforcement mechanism — adding a kind to `COMPONENT_KINDS` triggers a TS error here. Already present precedent at `src/model/zod-issue-adapter.ts` (search for `never` in the adapter).

**Pattern — per-kind type narrowing via `Extract`** (Phase 3 research §Code Examples + `src/model/component.ts` ComponentNode union):
```typescript
export function renderButton(
  node: Extract<ComponentNode, { kind: "Button" }>,
  width: number,
): string[] { … }
```
`Extract<ComponentNode, { kind: "Button" }>` narrows to the single-branch shape without manual casts. This mirrors how `visitNode` uses `"testID" in node` runtime guards where narrowing gets verbose — but per-kind emitters get a clean typed param.

**Gotcha (RESEARCH Pitfall 7):** Every emitter MUST return a `string[]` of length ≥ 1 and every line must be exactly `width` chars. The contract is uniform so `join("\n")` at the parent emits rectangular output. Add per-emitter unit test: `expect(result.every(l => l.length === width)).toBe(true)`.

---

### `src/emit/wireframe/components/column.ts` / `row.ts` / `card.ts` (recursive emitters)

**Analog:** `src/model/cross-reference.ts` `walkComponentTree` (lines 52-62) — the canonical recursive descent pattern

**Pattern — recursion over children with explicit index path** (`src/model/cross-reference.ts` lines 52-62):
```typescript
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

**Apply to `renderColumn`:**
```typescript
export function renderColumn(
  node: Extract<ComponentNode, { kind: "Column" }>,
  width: number,
): string[] {
  const gapLines = gapToLines(node.gap);
  const lines: string[] = [];
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    if (!child) continue;                            // mirror the `if (!n) continue` guard
    const childLines = renderNode(child, width);     // recurse via dispatcher
    lines.push(...childLines);
    if (i < node.children.length - 1) {
      for (let j = 0; j < gapLines; j++) lines.push(" ".repeat(width));
    }
  }
  return lines;
}
```

**Gotcha:** Every `ComponentNode[]` iterator in the codebase uses the `if (!n) continue` guard (see `cross-reference.ts:59`) even though TypeScript rarely admits `undefined` slots. This is defense against sparse-array inputs — preserve the pattern for consistency.

---

### `src/emit/wireframe/components/*.test.ts` (co-located emitter test)

**Analogs:** `src/primitives/path.test.ts` (small pure-function tests) + `src/model/component.test.ts` (schema-shape tests, similar describe/it shape)

**Pattern — co-located `.test.ts` next to source** (`src/primitives/path.test.ts` lines 1-9):
```typescript
// Tests for RFC 6901 JSON Pointer — segment encode/decode, pathToJsonPointer
// adapter, and JsonPointerSchema branded validation.
// Key gotcha covered: decode order is ~1 BEFORE ~0 (RFC 6901 §4).
import { describe, expect, it } from "vitest";
import { decodeSegment, encodeSegment, JsonPointerSchema, pathToJsonPointer } from "./path.ts";

describe("encodeSegment (RFC 6901 §3)", () => {
  it("passes plain strings through", () => {
    expect(encodeSegment("foo")).toBe("foo");
  });
```

**Pattern — describe-per-concern, it-per-case, inline `expect` assertions with clear rationale string** (same file, lines 7-43).

**Apply to `src/emit/wireframe/components/button.ts.test.ts` (candidate name `button.test.ts` — match Phase 1/2 convention of matching file stem):**
```typescript
// Tests for renderButton — D-34 glyph alphabet (primary [[ ]], secondary [ ],
// text bare); D-42 action/testID hidden; D-44 truncate-at-width-3.
import { describe, expect, it } from "vitest";
import { renderButton } from "./button.ts";

describe("renderButton", () => {
  it("renders primary variant as [[ label ]]", () => {
    const result = renderButton(
      { kind: "Button", label: "Save", action: "save_habit", testID: "save_btn", variant: "primary" },
      60,
    );
    expect(result).toMatchSnapshot();
  });
  // …
});
```

**Snapshot-file location:** Vitest default is `__snapshots__/` next to the test file. Existing precedent: `tests/__snapshots__/malformed.test.ts.snap`. Planner may consider `toMatchInlineSnapshot()` for 5-10-line outputs per RESEARCH Open Question 4; default to external `.snap` for consistency with Phase 2.

---

### `src/emit/wireframe/layout.test.ts` / `variants.test.ts` (co-located utility test)

**Analog:** `src/serialize/body.test.ts`

**Pattern — describe per exported fn, explicit edge-case `it` blocks** (`src/serialize/body.test.ts` lines 6-40):
```typescript
describe("body.ts — findFrontmatterBounds", () => {
  it("locates opening and closing --- with LF; captures closingTerminator='\\n'", () => {
    const raw = "---\nfoo: 1\n---\n# body\n";
    const bounds = findFrontmatterBounds(raw);
    if (bounds === null) throw new Error("expected bounds to be non-null");
    expect(bounds.start).toBe(0);
    expect(bounds.closingTerminator).toBe("\n");
    expect(raw.slice(bounds.end)).toBe("# body\n");
  });

  it("locates opening and closing --- with CRLF; captures closingTerminator='\\r\\n'", () => { … });
  it("captures closingTerminator='' when file ends at closing --- with no newline (BLOCKER fix #1)", () => { … });
  it("returns null when opening --- missing", () => { … });
  it("returns null when closing --- missing", () => { … });
});
```

**Apply to `layout.test.ts`:**
- `describe("buildVariantHeader", () => { … })` — covers RESEARCH Pitfall 5 "header overflow" explicitly: 3 cases at 60 cols (fits), 61 cols (needs `-+`), 120 cols (needs truncate + `...`)
- `describe("padRight", () => { … })` — empty input, input exactly width, input over width (delegates to truncate)
- `describe("drawFrame", () => { … })` — snapshot of minimal frame + frame with 1 body line

---

### `scripts/render-wireframe.ts` (CLI entry)

**Analog:** No prior CLI script in repo. Closest = the sample CLI in RESEARCH.md lines 814-841 + the `parseSpecFile` caller shape in `src/serialize/parse.ts`.

**Pattern — minimal stdout CLI wrapping `parseSpecFile`** (RESEARCH §Code Examples + `src/serialize/parse.ts` step ordering):
```typescript
// scripts/render-wireframe.ts
// CLI: npx tsx scripts/render-wireframe.ts <spec-path> <screen-id>
// Emits fixed-60-col ASCII wireframe for the named screen to stdout.
// `[BROKEN LINK]` markers injected inline when parseSpecFile returns
// Stage-B error diagnostics; renderer never throws except on unknown screenId.

import { parseSpecFile } from "../src/serialize/index.ts";
import { render } from "../src/emit/wireframe/index.ts";

async function main() {
  const [specPath, screenId] = process.argv.slice(2);
  if (!specPath || !screenId) {
    process.stderr.write("usage: render-wireframe <spec-path> <screen-id>\n");
    process.exit(2);
  }
  const result = await parseSpecFile(specPath);
  if (!result.spec) {
    process.stderr.write(
      `parse failed:\n${result.diagnostics
        .map((d) => `  ${d.code} @ ${d.path}: ${d.message}`)
        .join("\n")}\n`,
    );
    process.exit(1);
  }
  const out = render(result.spec, screenId, { diagnostics: result.diagnostics });
  process.stdout.write(out);
}

main().catch((err) => {
  process.stderr.write(`error: ${(err as Error).message}\n`);
  process.exit(1);
});
```

**Gotchas:**
- Directory `scripts/` does not exist yet. First task must create it.
- No `bin` entry in `package.json` for v1 per CONTEXT.md D-Claude "CLI form". Invoke via `npx tsx scripts/render-wireframe.ts`.
- Planner may add `"wireframe": "tsx scripts/render-wireframe.ts"` to `package.json` scripts so `npm run wireframe -- <spec> <screen>` works. This is a tiny package.json edit, not a new dep.
- Exit codes: 0 on success (including Stage-B errors — render with BROKEN LINK markers); 1 on `spec === null` or unexpected throw; 2 on usage error. RESEARCH Open Q 3 recommendation.

---

### `tests/wireframe-catalog.test.ts` (integration, catalog coverage)

**Analog:** `tests/catalog-coverage.test.ts` (lines 1-78)

**Pattern — walk Spec collecting kinds, assert every `COMPONENT_KINDS` entry appears** (`tests/catalog-coverage.test.ts` lines 9-60):
```typescript
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { COMPONENT_KINDS, type ComponentKind } from "../src/model/component.ts";
import { parseSpecFile } from "../src/serialize/index.ts";

const CANONICAL = ["habit-tracker", "todo", "social-feed"] as const;

async function collectKindsFromFixture(name: string): Promise<Set<string>> {
  const { spec } = await parseSpecFile(resolve(`fixtures/${name}.spec.md`));
  if (!spec) throw new Error(`catalog coverage: canonical fixture ${name} failed validateSpec`);
  const kinds = new Set<string>();

  function walk(node: unknown): void {
    if (!node || typeof node !== "object") return;
    const n = node as Record<string, unknown>;
    if (typeof n.kind === "string") kinds.add(n.kind);
    for (const v of Object.values(n)) {
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === "object") walk(v);
    }
  }
  // …
  return kinds;
}

describe("catalog coverage (SPEC-01)", () => {
  it("every kind in COMPONENT_KINDS appears in at least one canonical fixture", async () => {
    const allKinds = new Set<string>();
    for (const name of CANONICAL) {
      const kinds = await collectKindsFromFixture(name);
      for (const k of kinds) allKinds.add(k);
    }
    const missing = COMPONENT_KINDS.filter((k) => !allKinds.has(k));
    // …
    expect(missing).toEqual([]);
  });
});
```

**Apply to `tests/wireframe-catalog.test.ts`:**
- Same imports, same `CANONICAL` + `composites/nested-col-row` etc. arrays
- Walk each canonical fixture; for each kind encountered, render it via `renderNode(node, 60)` and assert the output matches snapshot
- Assert ALL 18 in `COMPONENT_KINDS` are covered: `expect(COMPONENT_KINDS.filter(k => !snapshottedKinds.has(k))).toEqual([])`
- 5 composite fixtures (nested-col-row, card-in-list, navbar-tabbar, modal-over-content, sheet) render through `render(spec, screenId)` and snapshot — same `it.each(COMPOSITES)` pattern as `tests/round-trip.test.ts` line 81 (`it.each(FIXTURES)("round-trips %s …", async (fixturePath) => { … })`).

**Gotcha:** The closed-catalog guarantee means `default` in the `renderNode` switch is a TypeScript-level gate. The test is a belt-and-suspenders check: if a kind is added to `COMPONENT_KINDS` but no emitter file exists, TS fails at compile. This test catches the reverse direction — emitter exists but no fixture exercises it.

---

### `tests/wireframe-ascii-baseline.test.ts` (integration, regex-over-fixtures)

**Analog:** `tests/fidelity.test.ts` (fixture-file readback + regex/contains assertion)

**Pattern — read file, assert character set** (`tests/fidelity.test.ts` lines 42-52):
```typescript
it("every Screen.id + testID from habit-tracker.spec.md appears in habit-tracker.swift", async () => {
  const { spec } = await parseSpecFile(resolve("fixtures/habit-tracker.spec.md"));
  if (!spec) throw new Error("fidelity: habit-tracker fixture failed validateSpec");
  const ids = collectTestIDsAndScreenIds(spec);
  const swift = readFileSync(resolve("fixtures/targets/habit-tracker.swift"), "utf8");
  const missing = [...ids].filter((id) => !swift.includes(id));
  if (missing.length > 0) {
    console.error("[swift] missing identifiers:", missing);
  }
  expect(missing).toEqual([]);
});
```

**Pattern — glob + readFileSync + regex** (recommended approach; synthesize from Phase-1 `fidelity.test.ts` + `node:fs/promises` readdir):
```typescript
import { readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ASCII_BASELINE = /^[|\-+. \x20-\x7E\n]*$/;
const WIREFRAME_ROOT = resolve("fixtures/wireframes");

async function allWireframeFiles(): Promise<string[]> {
  const out: string[] = [];
  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const abs = join(dir, e.name);
      if (e.isDirectory()) await walk(abs);
      else if (e.isFile() && e.name.endsWith(".wf.txt")) out.push(abs);
    }
  }
  await walk(WIREFRAME_ROOT);
  return out;
}

describe("wireframe ASCII-baseline (WIREFRAME-02)", () => {
  it("every .wf.txt file matches ^[|\\-+. \\x20-\\x7E\\n]*$", async () => {
    const files = await allWireframeFiles();
    expect(files.length).toBeGreaterThanOrEqual(20);
    for (const f of files) {
      const content = readFileSync(f, "utf8");
      if (!ASCII_BASELINE.test(content)) {
        const bad = [...content].filter((c) => !/[|\-+. \x20-\x7E\n]/.test(c));
        throw new Error(`[${f}] non-ASCII-baseline chars: ${JSON.stringify(bad)}`);
      }
    }
  });
});
```

**Gotcha:** Match the `console.error`-before-throw diagnostic style of `tests/fidelity.test.ts` line 49 + `tests/round-trip.test.ts` lines 90-92 — dump the offending chars so a CI failure is self-diagnosing.

---

### `tests/dogfood-gate.test.ts` (integration, file-count + parse)

**Analogs:** `tests/fixtures.test.ts` (zero-error parse assertion) + `tests/round-trip.test.ts` (fixture-matrix count assertion, line 75-77)

**Pattern — asserting a precise fixture count** (`tests/round-trip.test.ts` lines 74-78):
```typescript
describe("SERDE-05: matrix sanity", () => {
  it("FIXTURES.length === 20 (full round-trip matrix per INFO #9)", () => {
    expect(FIXTURES.length).toBe(20);
  });
});
```

**Pattern — parse + count shareable entries** (synthesize from `tests/fixtures.test.ts` lines 18-27 + RESEARCH Open Q 5 recommendation):
```typescript
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import matter from "gray-matter";
import YAML from "yaml";

describe("dogfood gate (WIREFRAME-06 + D-49)", () => {
  it("fixtures/wireframes/ contains exactly 20 .wf.txt files", async () => {
    const files = await allWireframeFiles(); // helper shared with wireframe-ascii-baseline.test.ts
    expect(files.length).toBe(20);
  });

  it("SHARED.md parses with schema: mobile-tui/shared/1 and ≥3 shareable verdicts", async () => {
    const raw = await readFile(resolve("fixtures/wireframes/SHARED.md"), "utf8");
    const parsed = matter(raw, {
      engines: {
        yaml: {
          parse: (s: string) => YAML.parse(s),
          stringify: () => { throw new Error("no writes from dogfood-gate test"); },
        },
      },
    });
    const data = parsed.data as { schema?: string; shared?: Array<{ verdict?: string }> };
    expect(data.schema).toBe("mobile-tui/shared/1");
    const shareable = (data.shared ?? []).filter((e) => e.verdict === "shareable");
    expect(shareable.length).toBeGreaterThanOrEqual(3);
  });
});
```

**Gotcha:** SHARED.md schema shape (Open Q 5) — RESEARCH recommendation is YAML frontmatter with a `shared:` list. Planner locks the shape in plan 03-12.

---

### `fixtures/wireframes/*/*.wf.txt` × 20 (golden file)

**Analog:** `fixtures/targets/habit-tracker.swift` + `fixtures/targets/habit-tracker.kt` — existing "golden code artefact" fixtures (verified via `fidelity.test.ts`)

**Pattern — hand-committed golden artefact, consumed by integration tests:**
- Not referenced via `.toMatchSnapshot()` — hand-committed files in git
- Test reads via `readFileSync(resolve(…), "utf8")` and does assertion
- One file per scenario; directory structure mirrors the logical slice (fixture slug / screen-variant)

**Apply:**
```
fixtures/wireframes/habit-tracker/home-content.wf.txt
fixtures/wireframes/habit-tracker/home-empty.wf.txt
fixtures/wireframes/habit-tracker/home-loading.wf.txt
fixtures/wireframes/habit-tracker/home-error.wf.txt
fixtures/wireframes/habit-tracker/new_habit-content.wf.txt
…
fixtures/wireframes/composites/nested-col-row.wf.txt
fixtures/wireframes/composites/card-in-list.wf.txt
…
```

**Authoring:** Generated by running `npx tsx scripts/render-wireframe.ts <spec> <screen> > fixtures/wireframes/<slug>/<screen>-<variant>.wf.txt`. Regenerated on renderer change (same rule as snapshot updates). Planner chooses exact 20-file breakdown per D-46 (~7 habit-tracker + ~7 todo + ~6 social-feed + 5 composites, adjusted to hit exactly 20).

**Gotcha (RESEARCH Pitfall 2):** LF line endings enforced via `.gitattributes`. Phase 2 already added `*.md text eol=lf`; Phase 3 must extend to `*.wf.txt text eol=lf` (a 1-line `.gitattributes` edit). If the project doesn't have `.gitattributes`, create it with both entries.

---

### `fixtures/composites/*.spec.md` (composite fixture source specs)

**Analog:** `fixtures/round-trip/*.spec.md` (hand-authored spec fixtures under subfolder)

**Pattern — minimal spec file that validates cleanly** (existing `fixtures/round-trip/comments-inline.spec.md` etc. — 15 such files).

**Apply:** Planner authors 5 tight composite specs under `fixtures/composites/` that exercise the specific nesting shapes per RESEARCH §Composite Fixture Proposals 1-5. Each spec must pass `parseSpecFile` with zero error-severity diagnostics (same bar as `tests/fixtures.test.ts`).

**Open Question from RESEARCH §Open Questions 1:** Whether composite specs live on disk or as programmatic literals inside the catalog test. Recommended: on disk (`fixtures/composites/*.spec.md`) for re-use by Phase 4 editor tests. Planner locks this in plan 03-11.

---

### `fixtures/wireframes/README.md` and `fixtures/wireframes/SHARED.md`

**Analog:** No prior in-repo analog for either. Nearest in-repo precedent for structured-markdown-sidecars: the `.planning/phases/XX/*.md` plan documents (but those are workflow artefacts, not fixtures).

**Pattern — README.md as 20-entry index:** Freeform markdown table; no test parses it (only `tests/dogfood-gate.test.ts` counts the `.wf.txt` files). Planner composes a clean 1-line-per-entry format.

**Pattern — SHARED.md as YAML-frontmatter + markdown body:** RESEARCH §Open Question 5 recommended shape. Consumed by `tests/dogfood-gate.test.ts`. See that section's excerpt above.

**Gotcha:** SHARED.md is seeded empty in Plan 03-12; the author fills in ≥3 shareable entries during Wave 4 (dogfood evidence collection, non-plan human work) before Phase 4 planning can start (D-49).

---

## Shared Patterns

### Pattern: Pure-function layer with deterministic output

**Source:** `src/model/invariants.ts` + `src/serialize/parse.ts` (GUARANTEES blocks)

**Apply to:** every `src/emit/wireframe/**` source file

**Excerpt (`src/model/invariants.ts` lines 4-17):**
```typescript
// GUARANTEES:
//   - NEVER throws for any input (null, undefined, primitives, arrays, cyclic,
//     BigInt, huge strings). Every error path returns Diagnostic[].
//   - Returns `{ spec: Spec | null, diagnostics: Diagnostic[] }`.
```

Phase 3 variant:
```typescript
// GUARANTEES:
//   - `render(spec, screenId, opts?)` returns a string deterministically.
//   - Throws ONLY on unknown screenId (CLI-caller error, Phase-1 01-06 decision).
//   - Stage-B errors (from opts.diagnostics) inject inline `!!BROKEN:` markers,
//     never throw.
//   - No Date, no process.env, no fs, no randomness.
```

---

### Pattern: EXPLICIT-NAMED barrel exports

**Source:** `src/model/index.ts` + `src/serialize/index.ts`

**Apply to:** `src/emit/wireframe/index.ts`

**Rule:** Never `export *`. Every exported name is an explicit edit to the barrel. This is stated verbatim in `src/serialize/index.ts` lines 14-16.

---

### Pattern: Co-located `.test.ts` next to source

**Source:** All of `src/**/*.ts` — every source file has a sibling `.test.ts`

**Apply to:** every new source file in `src/emit/wireframe/`

**Evidence:** `ls src/model/` shows `action.ts` + `action.test.ts`, `component.ts` + `component.test.ts`, etc. `ls src/serialize/` same pattern. `vitest.config.ts:6` includes both `src/**/*.test.ts` and `tests/**/*.test.ts`.

---

### Pattern: Closed-vocabulary + exhaustive switch + `never` fallback

**Source:** `src/model/component.ts` `COMPONENT_KINDS` (lines 28-47) + `src/model/cross-reference.ts` `visitNode` switch (lines 79-116)

**Apply to:** `renderNode` dispatcher

**Rule:** Adding a kind to `COMPONENT_KINDS` MUST break compilation in the renderer until a case is added. Enforced via `default: { const _exhaustive: never = node; … }`.

---

### Pattern: TDD commit pairs `test(03-XX): RED` → `feat(03-XX): GREEN`

**Source:** CONTEXT.md §Established Patterns + recent git log
`5a5af55 docs(phase-02): complete phase execution`
`efd5e52 feat(02-05): GREEN — 20-fixture round-trip suite + prototype-pollution save-block gate`
`55f2228 test(02-05): RED — round-trip matrix + upgraded prototype-pollution security test`

**Apply to:** every plan in Phase 3

**Rule:** Plan decomposition splits by `test(03-NN): RED` commit, then `feat(03-NN): GREEN` commit (or multiple GREEN commits in a wave). Grep-reconstructable — commit message includes the plan ID.

---

### Pattern: Zero-warnings green gate

**Source:** CONTEXT.md §Established Patterns ("Biome + vitest + tsc clean gate")

**Apply to:** every Phase 3 plan closure

**Rule:** Before any wave merge + before `/gsd-verify-work`:
```bash
npx vitest run && npx tsc --noEmit && npx biome check .
```
All three must exit 0.

---

## No Analog Found

Files / concepts with no close match in the codebase (planner should use RESEARCH.md patterns + CONTEXT.md D-Claude decisions directly):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `scripts/` directory | CLI scripts home | N/A | No `scripts/` dir exists yet. Create + add Node/tsx script inside. RESEARCH §Code Examples provides the template verbatim. |
| `.gitattributes` (potential new file or edit) | build-metadata | N/A | Repo may not have one. RESEARCH Pitfall 2 requires `*.wf.txt text eol=lf`. Inspect `.gitattributes` on disk during Plan 03-11 fixture-authoring step. |
| `fixtures/wireframes/README.md` (20-entry index) | doc sidecar | human-readable index | No prior index-file convention for fixture subdirs. Planner composes freeform. |
| `fixtures/wireframes/SHARED.md` evidence schema | dogfood evidence log | human-edited YAML+MD | Novel artefact per D-48. RESEARCH Open Question 5 recommends `schema: mobile-tui/shared/1` + `shared: [{screen, target, date, verdict, notes}]`. Planner locks shape in Plan 03-12. |
| Optional `npm run wireframe` script entry in package.json | CLI shortcut | N/A | Tiny addition to `"scripts"` block if planner wants `npm run wireframe -- <spec> <screen>`. No new dep; mirrors the existing `"typecheck"`, `"test"`, `"lint"` entries. |

---

## Metadata

**Analog search scope:**
- `src/model/*.ts` + `src/model/*.test.ts` (18 files)
- `src/serialize/*.ts` + `src/serialize/*.test.ts` (20 files)
- `src/primitives/*.ts` + `src/primitives/*.test.ts` (6 files)
- `src/index.ts`
- `tests/*.test.ts` (7 files: catalog-coverage, fidelity, fixtures, malformed, no-js-yaml, round-trip, plus __snapshots__)
- `fixtures/**/*.spec.md` (22 files) + `fixtures/targets/*` (golden-file precedent)
- `package.json`, `vitest.config.ts`

**Files directly read for excerpts:**
- `src/model/index.ts` (barrel shape)
- `src/model/component.ts` (18-kind catalog + ComponentNode union + InteractableBase)
- `src/model/cross-reference.ts` (walkComponentTree recursion + visitNode kind-switch)
- `src/model/variant.ts` (4-variant factory)
- `src/model/screen.ts` (Screen shape with back_behavior + acceptance)
- `src/model/invariants.ts` (validateSpec guarantees block)
- `src/primitives/path.ts` (pure-helper module pattern)
- `src/primitives/path.test.ts` (co-located test pattern)
- `src/primitives/diagnostic.ts` (error/warning/info factories)
- `src/primitives/index.ts` (internal `export *` barrel — anti-pattern for Phase 3 index)
- `src/serialize/index.ts` (EXPLICIT-NAMED barrel — pattern for Phase 3 index)
- `src/serialize/parse.ts` (numbered-step pipeline)
- `src/serialize/body.ts` (pure-transform primitive with gotcha-heavy docs)
- `src/serialize/body.test.ts` (describe-per-fn test shape)
- `src/serialize/frontmatter.ts` + `frontmatter.test.ts` (gray-matter integration, CRLF/LF handling)
- `src/serialize/sigil.ts` (regex + INTERACTABLE_KINDS set)
- `src/serialize/atomic.ts` (atomic write, not directly relevant to renderer but shows error-handling idiom)
- `src/serialize/diagnostics.ts` (SERDE_CODES registry pattern)
- `src/index.ts` (top-level public API shape)
- `tests/catalog-coverage.test.ts` (kind walker + COMPONENT_KINDS assertion)
- `tests/fidelity.test.ts` (fixture readback + regex)
- `tests/fixtures.test.ts` (canonical-fixture zero-error assertion)
- `tests/malformed.test.ts` (cross-ref regression + .toMatchSnapshot for Diagnostic[])
- `tests/round-trip.test.ts` (it.each matrix, FIXTURES.length assertion)
- `package.json` (no new deps verification)
- `vitest.config.ts` (test-path globs)

**Pattern extraction date:** 2026-04-18

## PATTERN MAPPING COMPLETE
