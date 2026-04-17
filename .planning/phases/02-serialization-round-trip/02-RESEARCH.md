---
phase: 02
phase_name: Serialization & Round-Trip
research_date: 2026-04-18
domain: YAML Document AST round-trip + Markdown frontmatter split + atomic file writes
confidence: HIGH
---

# Phase 2 Research: Serialization & Round-Trip

**Researched:** 2026-04-18
**Domain:** `eemeli/yaml@2.8.3` Document/CST round-trip, `gray-matter@4.0.3` frontmatter split, POSIX atomic writes, sigil ↔ triple normalization
**Confidence:** HIGH on load-bearing decisions; MEDIUM-HIGH on diff-and-apply strategy (one library-level truth flips the approach — see Research Area 2); HIGH on the sigil grammar and atomic-write primitives.

## Executive Summary

Three findings dominate everything else in this phase:

1. **`eemeli/yaml`'s `Document` API does NOT preserve whitespace byte-identically on `toString()`.** The maintainer states this explicitly in discussion #510: *"the Document level does not preserve whitespace."* Byte-identical round-trip requires the **CST API** (`keepSourceTokens: true` → `node.srcToken` → `CST.setScalarValue()` → `doc.toString()` or `CST.stringify()`). The CONTEXT.md "Claude's Discretion" wiring (`engines.yaml.stringify = (doc) => doc.toString()`) will work for the **no-op case** (parse → stringify with no edits preserves source via retained CST tokens when `keepSourceTokens: true` is set AND no Document-level mutations touched the scalar), but **scalar edits via `doc.setIn(...)` will cause re-stringification** of the edited scalar's formatting. The planner must lock the hybrid pattern: reads via `Document`, edits via `CST.setScalarValue(node.srcToken, ...)`, serialize via `doc.toString()`. `[VERIFIED: github.com/eemeli/yaml discussions/510 + docs/07_parsing_yaml.md]`

2. **`gray-matter` re-normalises delimiter whitespace on `matter.stringify(data, content, opts)`** — leading `\r?\n` after the closing `---` is stripped on parse, and the stringifier uses a `newline()` normalizer. This means **gray-matter.stringify cannot be used for byte-identical round-trip.** The correct pattern is: use `gray-matter` for the split-and-detect pass only (read `file.matter`, `file.content`, `file.orig`), then do our own manual byte-level assembly: locate the exact frontmatter span in `file.orig`, splice the edited frontmatter string in, re-emit the rest verbatim. Gray-matter's engine contract passes parse return-value through to `file.data` with zero validation — so returning a `YAML.Document` from the engine is acceptable for reads, but we ignore `file.data` entirely on save (we hold the Document via our own `astHandle`, not via gray-matter's side). `[VERIFIED: github.com/jonschlinkert/gray-matter lib/parse.js + lib/stringify.js]`

3. **Sigil ↔ triple normalization lives on the AST-handle side, NOT on the Spec type.** Phase-1's `SpecSchema` accepts only the triple form `{ label, action, testID }` — adding a sigil-form branch would require a schema change Phase 1 explicitly closed. The parser pre-processes YAML-string values on Button/TextField/Toggle/SegmentedControl/ListItem/TabBar-item nodes BEFORE calling `validateSpec()`: if the YAML scalar at `label` matches `/^\[(.+) →(\w+) test:(\w+)\]$/`, it is split into three keys and an `_sigilOrigin: "sigil"` annotation is attached to the AST pair. On emit, the serializer consults the AST annotation and re-assembles the sigil string only if all three keys are present (D-24). `[ASSUMED]` on exact schema location — verified Phase-1's 18-kind catalog but did not confirm which specific kinds carry the (label, action, testID) triple today; Phase-1 `src/model/component.ts` is the authority.

**Primary recommendation:** Adopt the **hybrid Document+CST pattern** for the serializer. Use `parseDocument(str, { version: '1.2', keepSourceTokens: true })` for reads, hold the resulting `YAML.Document` as the opaque `astHandle`, iterate top-level `doc.contents.items` to stash unknowns before Phase-1 validation, and write via `CST.setScalarValue()` on `node.srcToken` for scalar edits + `doc.toString()` final emit. Use `gray-matter` for split-only; never call `matter.stringify()`. Build manual byte-level assembly from `file.orig` substrings to guarantee SERDE-05 byte-identity. `fs.writeFile(.tmp) + fs.rename()` is atomic on same-device POSIX; cross-device EXDEV is Phase 9's problem (per D-30).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Read spec file from disk | L3 Serialize (`parse.ts`) | — | L3 owns file I/O per ARCHITECTURE §1; L2 model never touches disk |
| Split frontmatter / body | L3 Serialize (`frontmatter.ts`) | — | gray-matter wrapper; isolates gray-matter's quirks from the rest of the codebase |
| YAML Document parse | L3 Serialize (`parse.ts`) | — | eemeli/yaml `Document` wrapping — astHandle opaque outside L3 |
| Sigil ↔ triple normalization | L3 Serialize (`sigil.ts`) | L2 Model (consumes triple) | Pre-validation mutation; Model sees only triples per D-23 |
| Validate via validateSpec() | L2 Model (via `../model/invariants.ts`) | L3 Serialize (caller) | Phase-1 contract; L3 gates save-write on severity |
| Save-gate on error severity | L3 Serialize (`write.ts`) | — | D-31; never touches disk when gate fails |
| Diff-and-apply over Document | L3 Serialize (`write.ts`) | — | Core of SERDE-03; touches AST via CST + Document APIs |
| Atomic write (.tmp + rename) | L3 Serialize (`atomic.ts`) | — | `fs.writeFile` + `fs.rename`; POSIX atomic on same device |
| Unknown-top-level-key preservation | L3 Serialize (`unknown.ts`) | — | Pure AST-side stash; never visible to L2 model per D-26 |
| `schema: mobile-tui/1` injection | L3 Serialize (`schema-inject.ts`) | — | First-save operation; prepend to `doc.contents.items` per D-28 |
| Body opaque-string splice | L3 Serialize (`body.ts`) | — | D-18; no body AST in Phase 2 |
| Orphan `.tmp` detection | L3 Serialize (`parse.ts`) | — | D-30; info diagnostic, non-blocking |

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SPEC-08 | Spec has `schema: mobile-tui/1` from first serialized output; unknown top-level frontmatter keys preserved via `_unknown:` bucket mechanism | Research Area 6 (unknown-key AST retention); Research Area 7 (schema injection prepend); both are AST-level per D-26/D-28 |
| SPEC-09 | `validateSpec()` returns `Diagnostic[]` (never throws); write-through save gated on `severity !== "error"` | Research Area 5 (atomic write pattern includes gate-before-write per D-31); Phase-1 `validateSpec()` already implements the never-throw contract |
| SERDE-01 | Single Markdown+YAML file; file IS source of truth (no hidden cache) | Research Area 8 (gray-matter split/splice; no separate storage) |
| SERDE-02 | `gray-matter` with `engines.yaml` wired to `eemeli/yaml`'s Document AST parser; `js-yaml` banned | Research Area 1 (engine wiring recipe); package.json audit test enforces ban |
| SERDE-03 | Serializing uses diff-and-apply against retained `YAML.Document`; no `YAML.stringify(spec)` | Research Area 2 (hybrid Document + CST pattern; scalar edits via `CST.setScalarValue`) |
| SERDE-04 | Markdown body treated as opaque text spliced on HTML-comment anchors | Research Area 8 (Phase 2 ships opaque-slab only per D-18; anchor mechanism deferred to Phase 4/5 per D-19) |
| SERDE-05 | ≥20 golden fixtures round-trip byte-identically; CI fails on drift | Research Area 3 (20-fixture matrix; `Buffer.equals` assertion shape) |
| SERDE-06 | Writes atomic (`.tmp` + rename); `session_shutdown` forces flush | Research Area 5 (atomic-write primitive only per D-29; debounce+flush in Phase 4) |
| SERDE-07 | YAML 1.2 pinned in parser; emission escapes 1.1-would-misinterpret values | Research Area 9 (version pin + auto-quote on emit for gotcha scalars) |

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Body Anchor & Splice Contract:**
- **D-18:** Body is a **single opaque slab** in Phase 2 — `parseSpecFile` exposes `body: string` verbatim; serializer writes it back byte-for-byte. No anchor recognition, no per-screen structure.
- **D-19:** Anchor mechanism (`<!-- screen:ID --> … <!-- /screen:ID -->` HTML-comment pairs) is deferred to Phase 4/5.
- **D-20:** Prose outside any (future) anchor round-trips verbatim byte-identically forever. No diagnostics, no orphan-prose warnings.
- **D-21:** When Phase 4/5 adds anchor support, new-screen blocks append at end of body (deterministic, no reorder).

**Sigil Shorthand Policy in Phase 2:**
- **D-22:** Parser accepts **both** sigil form `[Label →action test:id]` (as a single YAML string value on interactable components) **and** triple form `{ label, action, testID }` on read. Both normalise to the same in-memory triple on the Spec node.
- **D-23:** Serializer preserves origin — each interactable component node carries an internal `_sigilOrigin: "sigil" | "triple"` annotation on the AST handle (NOT on the `Spec` type). On write, the serializer emits the node in the same form it was read.
- **D-24:** Sigil is emitted **only when all three fields (label, action, testID) are present**. If any is missing, serializer falls back to triple form regardless of origin. `_sigilOrigin: "sigil"` with a missing field becomes a `SPEC_SIGIL_PARTIAL_DROPPED` info diagnostic (non-blocking).
- **D-25:** Phase-1 fixtures (`habit-tracker`, `todo`, `social-feed`) stay triple-form; Phase 2 adds **at least 3 new sigil-form fixtures** at `fixtures/sigil/*.spec.md`. Zero rewrite churn on Phase-1 snapshots.

**`_unknown:` Bucket Mechanism (SPEC-08):**
- **D-26:** Unknown top-level frontmatter keys are preserved **AST-natively** — they stay in the `eemeli/yaml` `Document` at their original position with their original comments and blank lines. No literal `_unknown:` key is ever written. The in-memory `Spec` type never surfaces them.
- **D-27:** Scope is **top-level frontmatter keys only**. Nested unknowns remain rejected by the Phase-1 `.strict()` root. Parser strips top-level unknowns into an internal stash BEFORE calling `validateSpec()`.
- **D-28:** First-save `schema: mobile-tui/1` injection lands at the **top of the frontmatter, as the first key**, followed by a blank line before the next key.

**Atomic Write + Debounce Contract:**
- **D-29:** Phase 2 ships the **atomic-write primitive only**: `writeSpecFile(path, spec, astHandle): Promise<{ written: boolean, diagnostics: Diagnostic[] }>`. No debounce, no queue, no flush. Phase 4 wires debounce + `session_shutdown`.
- **D-30:** Temp-file naming: **`.{basename}.tmp` fixed suffix** (e.g. `.habit-tracker.spec.md.tmp`). Orphan detection on next parse surfaces `SPEC_ORPHAN_TEMP_FILE` info diagnostic (non-blocking).
- **D-31:** Save-gate: `severity === 'error'` → `writeSpecFile` returns `{ written: false, diagnostics }` without touching disk. Warnings and info never block. Never throws on schema-error blocks.
- **D-32:** Success criterion #5 debounce half moves to Phase 4. Phase 2 tests "atomic write never produces partial writes" via simulated crash-mid-write (spy on `fs.rename` to throw after `writeFile`).

### Claude's Discretion

- **Library wiring:** `gray-matter@^4.0.3` with `engines: { yaml: { parse: YAML.parseDocument, stringify: (doc) => doc.toString() } }` → `eemeli/yaml@^2.8.3`. `js-yaml` banned at dependency level (enforced by repo-root `package.json` audit test).
- **YAML version:** pin `1.2` in `parseDocument` options (`{ version: "1.2" }`).
- **SERDE-07 gotcha handling:** serializer auto-quotes `yes|no|on|off|y|n|true|false` (case-insensitive) when they appear as string values during AST diff-apply of a scalar replacement. Parser-side lint pass (info severity, non-blocking) identifies unquoted-would-be-trouble scalars on read.
- **20-fixture golden composition:** 4 Phase-1 base + 3 sigil variants + 3 hand-edited-with-comments + 3 reordered-keys + 2 unknown-top-level-key + 2 nested-comments + 2 YAML-1.1-gotcha + 1 empty-body + 1 comment-only body. Tunable during planning.
- **Byte-identical definition:** `Buffer.equals(before, after)` after `parseSpecFile → writeSpecFile` with no semantic change.
- **Cross-ref errors on save:** Stage-B diagnostics carry `severity === 'error'` per Phase 1 convention → save blocked per D-31. Phase 2 does NOT relax this.
- **Sigil-label escape rules:** stay deferred per Phase 1 (D-03 ASCII-only).

### Deferred Ideas (OUT OF SCOPE)

- Body anchor mechanism (`<!-- screen:ID -->` pairs) — Phase 4/5.
- Debounced save loop + `session_shutdown` flush — Phase 4.
- `withFileMutationQueue` coordination with pi tools — Phase 9.
- Sigil-label escape rules for Unicode / literal `→` / literal `]` — Phase 1 deferred; Phase 2 fixtures stay ASCII-only.
- Cross-device rename fallback (EXDEV) — ignored in Phase 2 per same-dir `.tmp` convention.
- `.rejected` sibling file for blocked writes — rejected for FS litter.
- Literal `_unknown:` key semantics — rejected in favour of AST-native preservation.
- Auto-quote-on-emit for every YAML-1.1 gotcha scalar (wider palette: sexagesimal, `.inf`/`.nan`, non-ASCII country codes) — deferred post-Phase-2.
- Migration promotion of unknowns → known — out-of-scope until v2 begins.
- Per-screen body-edit commands — Phase 4/5 territory.

## Project Constraints (from CLAUDE.md)

Extracted verbatim from `./CLAUDE.md` — the planner MUST verify these directives are honored. These carry the same authority as locked CONTEXT.md decisions.

- **Tech stack pinned:** `@mariozechner/pi-coding-agent@^0.67.6` (peer, not used in Phase 2), `@mariozechner/pi-tui@^0.67.6` (peer, not used in Phase 2), `zod@^4.3.6`, `yaml@^2.8.3` (eemeli/yaml — not js-yaml), `gray-matter@^4.0.3`. Node >= 20.
- **BANNED at dependency level: `js-yaml`.** CLAUDE.md What NOT to Use §: *"js-yaml as the round-trip writer — Cannot preserve comments or blank lines; writing the file back will silently destroy user annotations. Spec file is git-tracked and human-edited — destroying comments is a correctness bug."* Phase 2 MUST add a `package.json` audit test asserting `js-yaml` is absent from dependencies and devDependencies.
- **`eemeli/yaml` is the ONLY YAML library.** CLAUDE.md explicitly cites Pitfall 4.1 as the project-breaker scenario if js-yaml is ever introduced.
- **No SQLite / persistent store.** The spec file on disk is the state.
- **No file watchers (chokidar).** We are the only writer; Phase 9 coordinates with pi tools via `withFileMutationQueue`.
- **No dotenv / env config.** Settings come from `pi.registerFlag(...)` (Phase 9).
- **TypeScript `^5.6` with strict mode.** `npx tsc --noEmit` must stay green. jiti loads `.ts` at pi runtime; tsc is the compile-time gate.
- **Biome + Vitest green gate.** `npx biome check .` and `npx vitest run` must stay green at phase close.
- **GSD workflow enforcement:** no direct repo edits outside a GSD command. Use `/gsd-execute-phase` for planned work.
- **One file per schema concern** — Phase-1 precedent in `src/model/{action,variant,component,...}.ts`. Phase 2 mirrors at `src/serialize/{parse,write,body,sigil,unknown,schema-inject,frontmatter,atomic}.ts` per CONTEXT.md layout.
- **Never throws at the validation boundary.** `validateSpec`, `parseSpecFile`, `writeSpecFile` return typed Result-like shapes. Exceptions reserved for unrecoverable IO.
- **Zod v4 stays in the model layer only.** Phase 2 adds NO new Zod schemas.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `yaml` (eemeli) | `^2.8.3` | YAML parse/stringify via `Document` + CST APIs; comment preservation | Only mainstream JS lib preserving comments, key order, blank lines. Document-level round-trip has known whitespace-drift edges (discussion #510) — use CST for byte-identity. Version verified on npm registry 2026-04-18. |
| `gray-matter` | `^4.0.3` | Frontmatter / body split + detect; access to `file.matter`, `file.content`, `file.orig` | Industry standard (VitePress, Astro, 11ty). Custom `engines.yaml` override wires to `eemeli/yaml`. `file.orig` gives byte-level source access we splice against. Version verified on npm registry 2026-04-18. |

**Installation:**
```bash
npm install yaml@^2.8.3 gray-matter@^4.0.3
npm install --save-dev @types/gray-matter  # if needed; yaml ships its own types
```

**Version verification (verified via `npm view` 2026-04-18):**
- `yaml@2.8.3` — published 2026-03-21 (current stable).
- `gray-matter@4.0.3` — stable since 2019; no newer major; widely-adopted frozen version.

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `node:fs/promises` (built-in) | Node >= 20 | Async file I/O: `readFile`, `writeFile`, `rename`, `access`, `stat` | All disk I/O. No external file-I/O library needed. `fs.writeFile` → `fs.rename` is the atomic primitive. |
| `node:path` (built-in) | Node >= 20 | `resolve`, `dirname`, `basename`, `extname` for temp-file naming | `.{basename}.tmp` sibling path construction per D-30. |
| `node:buffer` (built-in) | Node >= 20 | `Buffer.equals(a, b)` for byte-identical CI assertion | SERDE-05 round-trip test assertion. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `gray-matter` | `remark-frontmatter + unified` | More complex; adds full markdown AST. Only relevant if Phase 4/5 anchor mechanism grows into body AST editing. Phase 2 does not need this. |
| `eemeli/yaml` Document + CST hybrid | `yaml` pure `parse()/stringify()` | Pure-object approach fails SERDE-03 immediately — comments gone, key order gone, blank lines gone. CLAUDE.md explicitly bans this path via the js-yaml ban rationale (same failure mode). |
| `fs.writeFile` + `fs.rename` atomic primitive | `write-file-atomic` npm package | Adds a dep. Our atomic needs are trivial (single file, same dir); the npm package's value is handling rename-across-device (EXDEV) which CONTEXT.md D-30 explicitly defers to Phase 9. Use built-ins. |
| Hybrid Document + CST | Pure CST-only | Pure CST means hand-walking tokens for every read — fragile. Hybrid gives us Document's ergonomics for reads/unknown-stash and CST's fidelity for edits. |

## Architecture Patterns

### System Architecture Diagram

Data flow through Phase 2 serializer on PARSE:

```
spec.md (bytes on disk)
        │
        ▼
fs.promises.readFile(path, 'utf8')
        │
        ▼
frontmatter.ts: matter(str, { engines.yaml })
        │
        │  gray-matter splits into { matter, content, orig, empty }
        │  YAML engine invoked with raw frontmatter string →
        │    YAML.parseDocument(str, { version: '1.2', keepSourceTokens: true })
        │    → returns YAML.Document (the AST; gray-matter stores in file.data)
        │
        ▼
parse.ts: orchestrator
        │
        ├──► .tmp orphan check (fs.access on `.{basename}.tmp` sibling)
        │       → SPEC_ORPHAN_TEMP_FILE info diagnostic (non-blocking)
        │
        ├──► unknown.ts: stash top-level unknown keys
        │       iterate doc.contents.items →
        │         partition into { known: [...Spec fields...], unknown: [...] }
        │       build plain-JS `knownSubset` from known pairs only
        │       unknown pairs STAY in the Document AST (they already do; we only
        │         need to remember WHICH pairs are in-schema for step below)
        │
        ├──► sigil.ts: normalize sigil strings on interactable component nodes
        │       walk component tree in knownSubset →
        │         if node is Button/TextField/Toggle/SegmentedControl/ListItem
        │         AND `label` is a YAML scalar matching SIGIL_REGEX →
        │           split into { label, action, testID }
        │           record _sigilOrigin: "sigil" on AST pair (via WeakMap keyed
        │             by the AST node — not on the Spec type)
        │         else:
        │           record _sigilOrigin: "triple"
        │
        ├──► YAML-1.1 gotcha lint pass (read-only, info severity):
        │       walk scalars → if value matches /yes|no|on|off|y|n|true|false/i
        │         AND node is plain (not quoted) → SERDE_YAML11_GOTCHA info
        │         (non-blocking, helpful to author, read-only)
        │
        ├──► validateSpec(knownSubset) → { spec, diagnostics }
        │       (Phase-1 contract: Stage A Zod + Stage B cross-ref)
        │
        ▼
return { spec, astHandle: { doc, origBytes, bodyBytes, sigilOrigins, orphanTemp },
         diagnostics, body: content }
```

Data flow on WRITE:

```
writeSpecFile(path, spec, astHandle)
        │
        ▼
validateSpec(spec) → { diagnostics }
        │
        ├──► if any diagnostic.severity === 'error':
        │       return { written: false, diagnostics } — DISK UNTOUCHED (D-31)
        │
        ▼
write.ts: diff-and-apply
        │
        ├──► diffSpec(astHandle.lastProjected, spec) → { set[], delete[] }
        │       (structured diff of known-schema subset only; unknowns in AST
        │        are invisible to the diff because they're not in lastProjected)
        │
        ├──► for each op:
        │       if op.kind === 'set':
        │         try to find existing node via doc.getIn(path, /*keepNode*/true)
        │         if found AND op is scalar replacement AND srcToken present:
        │           CST.setScalarValue(node.srcToken, newValue, {
        │             type: node.srcToken.type  // preserves QUOTE_DOUBLE etc
        │           })
        │         else:
        │           doc.setIn(path, newValue)
        │           (re-stringifies edited subtree; accept — the diff localised
        │            the edit, unchanged siblings still use retained srcToken)
        │       if op.kind === 'delete':
        │         doc.deleteIn(path)
        │
        ├──► sigil re-emit pass:
        │       for each interactable with _sigilOrigin: "sigil":
        │         if all three (label, action, testID) present AND edit didn't
        │         touch the pair → leave srcToken scalar unchanged (preserves
        │         the original sigil string byte-for-byte)
        │         if edit DID touch any of the three → re-emit as sigil string
        │         if any missing → emit as triple + SPEC_SIGIL_PARTIAL_DROPPED info
        │
        ├──► schema-inject.ts: first-save injection (only if absent from doc)
        │       if !doc.has('schema'):
        │         schemaPair = doc.createPair('schema', SCHEMA_VERSION)
        │         doc.contents.items.unshift(schemaPair)
        │         schemaPair.value.spaceBefore = true  // or on next pair
        │         (D-28: blank line between schema and next key)
        │
        ├──► SERDE-07 auto-quote pass:
        │       for each scalar changed in this write:
        │         if value matches /^(yes|no|on|off|y|n|true|false)$/i AND
        │            current type is not QUOTE_DOUBLE/QUOTE_SINGLE:
        │           set node.type = 'QUOTE_DOUBLE'
        │           (forces emit as "yes" not yes)
        │
        ├──► emit YAML string:
        │       newMatter = doc.toString({ version: '1.2' })
        │       (Document.toString preserves retained srcTokens for unchanged
        │        subtrees; edited subtrees re-emit but localised)
        │
        ├──► manual byte assembly (BYPASS gray-matter.stringify per Research Area 8):
        │       output =
        │         '---\n' +
        │         newMatter +              // already ends with '\n' per YAML convention
        │         '---' +
        │         bodyBytes                // verbatim from parse — includes leading whitespace
        │
        ▼
atomic.ts: atomic write
        │
        ├──► tmpPath = path.join(dir, `.${basename}.tmp`)
        ├──► fs.promises.writeFile(tmpPath, output, 'utf8')
        ├──► fs.promises.rename(tmpPath, path)  // POSIX atomic on same device
        │       (if rename fails: tmpPath remains as orphan — detected on next parse)
        │
        ▼
return { written: true, diagnostics: [] }
```

### Recommended Project Structure

Per CONTEXT.md code_context §New Code Layout:

```
src/serialize/                          # L3 per ARCHITECTURE
├── parse.ts                            # parseSpecFile(path) orchestrator
├── parse.test.ts                       # unit tests for parse
├── write.ts                            # writeSpecFile(path, spec, astHandle)
├── write.test.ts                       # unit tests for write (including save-gate)
├── body.ts                             # opaque-string body extract/splice (D-18)
├── body.test.ts
├── sigil.ts                            # sigil ↔ triple normaliser + origin tracking
├── sigil.test.ts
├── unknown.ts                          # AST-native unknown-key stash
├── unknown.test.ts
├── schema-inject.ts                    # first-save `schema: mobile-tui/1` insertion
├── schema-inject.test.ts
├── frontmatter.ts                      # gray-matter wiring with engines.yaml override
├── frontmatter.test.ts
├── atomic.ts                           # fs.writeFile + fs.rename atomic primitive
├── atomic.test.ts
├── diagnostics.ts                      # Phase 2's new diagnostic codes (see below)
├── ast-handle.ts                       # AstHandle type definition + helpers
└── index.ts                            # barrel export

tests/
├── round-trip.test.ts                  # 20-fixture golden suite driver
└── helpers/
    └── (parse-fixture.ts DELETED per D-25)

fixtures/
├── habit-tracker.spec.md               # Phase-1 triple-form (unchanged)
├── habit-tracker.spec.json             # DELETED per Phase-2 scope
├── todo.spec.md                        # Phase-1 triple-form (unchanged)
├── todo.spec.json                      # DELETED
├── social-feed.spec.md                 # Phase-1 triple-form (unchanged)
├── social-feed.spec.json               # DELETED
├── malformed.spec.md                   # Phase-1 cross-ref regression (unchanged)
├── malformed.spec.json                 # DELETED
├── sigil/
│   ├── habit-tracker.sigil.spec.md     # sigil-form rewrite
│   ├── todo.sigil.spec.md              # sigil-form rewrite
│   └── social-feed.sigil.spec.md       # sigil-form rewrite
├── round-trip/
│   ├── comments-inline.spec.md         # hand-edited with # TODO inline comments
│   ├── comments-trailing.spec.md       # trailing key comments
│   ├── comments-nested.spec.md         # comments between list items
│   ├── reorder-nav-first.spec.md       # navigation: before screens:
│   ├── reorder-data-first.spec.md      # data: before screens:
│   ├── reorder-actions-first.spec.md   # actions: before screens:
│   ├── unknown-top-key-theme.spec.md   # theme: "dark"
│   ├── unknown-top-key-integrations.spec.md  # integrations: {...}
│   ├── yaml11-gotcha-yes.spec.md       # value `yes` → string
│   ├── yaml11-gotcha-norway.spec.md    # value `NO` → string (Norway problem)
│   ├── empty-body.spec.md              # frontmatter only, no body
│   └── comment-only-body.spec.md       # body is only HTML comments
└── targets/                            # Phase-1 artifacts (unchanged)
    ├── habit-tracker.swift
    └── habit-tracker.kt

src/model/                              # Phase 1 — DO NOT MODIFY
└── (full Phase-1 tree unchanged)
```

### Pattern 1: Hybrid Document + CST Round-Trip (load-bearing)

**What:** Use `parseDocument(str, { keepSourceTokens: true })` for reads (Document API ergonomics). For scalar edits, use `CST.setScalarValue(node.srcToken, ...)` to edit at the source-token level. For structural changes (add/remove keys), fall back to `doc.setIn(...) / doc.deleteIn(...)`. Serialize via `doc.toString()`.

**When to use:** Every read and every write. This is the ONLY save path. No `YAML.stringify(spec)` calls allowed.

**Example:**
```typescript
// Source: github.com/eemeli/yaml docs/07_parsing_yaml.md + WebFetch result
import YAML, { CST, isScalar } from "yaml";

// PARSE
const doc = YAML.parseDocument(frontmatterStr, {
  version: "1.2",
  keepSourceTokens: true,   // CRITICAL — enables srcToken on every node
});

// EDIT — scalar replacement preserving formatting
const node = doc.getIn(["screens", 0, "title"], true); // true = return Node not value
if (isScalar(node) && node.srcToken) {
  CST.setScalarValue(node.srcToken, "New Title", {
    type: node.srcToken.type,  // preserves QUOTE_DOUBLE, PLAIN, etc.
  });
}

// SERIALIZE — emits with srcTokens intact for untouched subtrees
const newStr = doc.toString({ version: "1.2" });
```

**Trade-offs:**
- Pro: Byte-identical round-trip on no-op (all srcTokens unchanged → source substrings re-concatenated).
- Pro: Localised edits — only the edited scalar's formatting can change; siblings are untouched.
- Con: Structural edits (`setIn` on a not-yet-present path, `deleteIn`, collection additions) DO re-stringify the affected subtree. This is acceptable per SERDE-03 intent: "comments, key order, blank lines survive on a **no-op save**" — edits legitimately change the file.
- Con: `keepSourceTokens: true` bloats Document memory (source token strings retained). Not a concern for Phase-2 scale (<1MB specs).

### Pattern 2: gray-matter as Split-Only, Manual Stringify

**What:** Call `matter(str, opts)` once per file to split frontmatter/body and detect empty-frontmatter case. Read `file.matter` (raw pre-parse frontmatter), `file.content` (body), `file.orig` (entire input). NEVER call `matter.stringify()`. Build the output string manually.

**When to use:** All save paths.

**Example:**
```typescript
// Source: github.com/jonschlinkert/gray-matter README + lib/parse.js + lib/stringify.js
import matter from "gray-matter";
import YAML from "yaml";

const raw = await fs.readFile(path, "utf8");

const file = matter(raw, {
  engines: {
    yaml: {
      // Contract: parse(str) → any; gray-matter assigns return directly to file.data.
      // Return a Document so downstream code gets the AST, not a plain object.
      parse: (str: string) =>
        YAML.parseDocument(str, { version: "1.2", keepSourceTokens: true }),
      // stringify is never called by our code path; throw defensively if gray-matter
      // ever reaches for it.
      stringify: () => {
        throw new Error("gray-matter.stringify is not used — serialize via Document.toString + manual splice");
      },
    },
  },
});

// file.data is now a YAML.Document
// file.content is the body string (leading \r?\n after --- stripped)
// file.matter is the raw frontmatter string (between the ---s)
// file.orig is the full input bytes

// ON WRITE, reconstruct manually:
const newMatter = (file.data as YAML.Document).toString({ version: "1.2" });
// newMatter ends with newline; we build:
const output =
  "---\n" +
  newMatter +
  "---" +
  savedBody;   // savedBody includes the leading newline(s) we captured separately

// To preserve leading whitespace after ---, we need to capture it at parse time
// from file.orig (since file.content has it stripped). See Research Area 8.
```

**Trade-offs:**
- Pro: Clean separation — gray-matter owns the delimiter regex edge cases we'd have to reinvent.
- Pro: Bypasses gray-matter's re-normalisation on stringify.
- Con: Have to capture original delimiter whitespace separately (extract from `file.orig` between closing `---` and first body char).

### Pattern 3: AST-Native Unknown-Key Preservation (D-26)

**What:** Iterate `doc.contents.items` at parse time to partition top-level pairs into known (schema-defined) vs unknown. Build a clean `knownSubset` plain-JS object from known pairs only and hand THAT to `validateSpec()`. Unknown pairs stay in the Document AST at their original position. On write, unknowns are untouched by `setIn/deleteIn` (their paths are never visited) → they round-trip by construction.

**When to use:** Every parse, before calling `validateSpec()`. Every write leaves unknowns alone.

**Example:**
```typescript
// Source: eemeli/yaml docs + CST analysis (Research Area 6)
import YAML, { isMap, isScalar } from "yaml";

const KNOWN_TOP_LEVEL_KEYS = new Set([
  "schema", "screens", "actions", "data", "navigation",
] as const);

function extractKnownSubset(doc: YAML.Document): {
  known: unknown;
  unknownKeys: string[];
} {
  if (!isMap(doc.contents)) {
    return { known: {}, unknownKeys: [] };
  }

  const unknownKeys: string[] = [];
  const known: Record<string, unknown> = {};

  for (const pair of doc.contents.items) {
    const keyStr = isScalar(pair.key) ? String(pair.key.value) : String(pair.key);
    if (KNOWN_TOP_LEVEL_KEYS.has(keyStr as never)) {
      // Use toJS to get plain-object projection of the value branch.
      // This is where Document's comments/ordering within a known subtree are
      // intentionally lost for VALIDATION ONLY — the AST still holds them for
      // the subsequent write path.
      known[keyStr] = pair.value?.toJSON ? pair.value.toJSON() : pair.value;
    } else {
      unknownKeys.push(keyStr);
    }
  }

  return { known, unknownKeys };
}
```

**Trade-offs:**
- Pro: Zero schema churn. Phase-1's `.strict()` root survives because the parser hands it a clean shape.
- Pro: No literal `_unknown:` key ever written (D-26).
- Pro: Unknown keys retain their comments, blank lines, position (AST stays intact).
- Con: We hold TWO representations of known-schema data during validation (Document AST + plain-JS `known` subset). Memory trivial; cognitive-load worth the insurance.

### Pattern 4: Sigil Normalization via WeakMap (D-23)

**What:** Sigil origin annotation lives in a WeakMap<AstNode, "sigil" | "triple">, NOT on the Spec type. The parser detects sigil-form values on interactable nodes and rewrites the Document AST's pair values into triple form before calling `validateSpec()`. The WeakMap records the origin so the serializer re-emits correctly.

**When to use:** Parse-time normalization on every interactable component. Serialize-time re-emission consults WeakMap.

**Example:**
```typescript
// Source: CONTEXT.md D-22/D-23; Phase-1 component.ts (18-kind catalog — load authority)
const SIGIL_REGEX = /^\[(.+?) →([a-z][a-z0-9_]*) test:([a-z][a-z0-9_]*)\]$/;
//                    ^label    ^action           ^testID
// D-03 constrains label to printable ASCII. Regex uses non-greedy .+? so the
// label ends at the FIRST " →". Escape rules for literal → in labels are
// deferred per D-03; Phase 2 fixtures avoid this surface.

const INTERACTABLE_KINDS = new Set([
  "Button", "TextField", "Toggle", "SegmentedControl", "ListItem",
  // TabBar items are inline-extended per 01-04 decision — handled separately
]);

// Keyed by the YAMLMap pair that represents the component node.
// WeakMap so entries GC with the Document.
export const sigilOrigins = new WeakMap<unknown, "sigil" | "triple">();

function normalizeSigilOnNode(componentPair: unknown): void {
  // Walk: componentPair.value is a YAMLMap with `kind`, `label`, ...
  // If `kind` is in INTERACTABLE_KINDS and `label` is a single scalar string
  // matching SIGIL_REGEX → split into label/action/testID fields, set
  // sigilOrigins.set(componentPair, "sigil"). Else set "triple".
}
```

**Trade-offs:**
- Pro: Zero Spec type leak — downstream (Phase 3, Phase 7) consume the canonical triple per D-04.
- Pro: Sigil ↔ triple symmetric; either authoring form is a valid fixture.
- Con: WeakMap bookkeeping is implicit state; documented in `sigil.ts` module header.

### Anti-Patterns to Avoid

- **`YAML.stringify(spec)` on save.** Destroys every aspect of SERDE-03 (comments, key order, blank lines, anchors). CLAUDE.md and PITFALLS §4.1 are unambiguous.
- **`matter.stringify(data, content, opts)`.** Re-normalises delimiter whitespace — we'd chase phantom byte-drift in round-trip tests. Replaced by manual splice (Pattern 2).
- **Body AST parsing.** D-18 says opaque slab. Any `remark`/`markdown-it`/`mdast-util-from-markdown` import in Phase 2 is an anti-pattern.
- **Returning the Spec from the parser WITH unknown keys attached.** Phase-1 `.strict()` root would reject. Unknowns MUST stash AST-side (D-26/D-27); Spec stays clean.
- **Writing `.spec.md.tmp` during a crash-abort path.** Per D-30, the fixed suffix `.{basename}.tmp` is the only temp path. Don't introduce random suffixes, pid-based suffixes, or `.bak` files.
- **Throwing on save-gate failure (D-31 violation).** `writeSpecFile` returns `{ written: false, diagnostics }` on severity-error. Callers (Phase 4 editor store) pattern-match on `.written`.
- **Mutating Phase-1 canonical fixtures.** D-25: Phase-1 fixtures stay triple-form; Phase 2 adds sigil-form as new files.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| YAML comment-preserving round-trip | Custom comment-tracker | `eemeli/yaml` Document + CST hybrid | Comment/blank-line preservation is non-trivial; eemeli/yaml + CST is the proven path. Attempting to hand-roll = rebuilding a YAML parser. |
| Frontmatter detection (`---` boundary) | Manual regex / hand-split | `gray-matter` for split only | Edge cases: `---` in body content, BOM handling, CRLF normalization, empty frontmatter, escaped delimiters. gray-matter is battle-tested (VitePress, Astro, Docusaurus). |
| Sigil string parsing | Full parser combinator | Single regex `/^\[(.+?) →(\w+) test:(\w+)\]$/` + ASCII-only D-03 constraint | The grammar is fixed and tiny. Phase-1 defers escape rules; Phase 2 inherits the deferral. Regex is sufficient. |
| Atomic file write | `write-file-atomic` npm package | `fs.writeFile(.tmp)` + `fs.rename()` | Our atomic needs are trivial (same-dir, single file). `write-file-atomic` handles cross-device EXDEV which D-30 explicitly defers to Phase 9. Using built-ins keeps the dep footprint tight and aligns with CLAUDE.md's "no chokidar / no file watchers" posture. |
| Diff-and-apply over Spec | Deep-equals library + custom path-walker | Hand-written structured diff keyed by Phase-1's Spec shape | The Spec shape is closed and known. A 200-LOC recursive diff is simpler than wiring a general-purpose lib. Phase-1 tests give us a stable target. |
| Markdown body ASTification | `remark`, `markdown-it`, `mdast-util-*` | Opaque string per D-18 | Phase 2 intentionally has no body AST. Anchor mechanism is Phase 4/5's problem. |
| Debounced autosave | RxJS, lodash.debounce, custom timer pool | — (deferred to Phase 4) | D-29 explicitly splits the primitive (Phase 2) from the debounce loop (Phase 4). Do not build it here. |

**Key insight:** Phase 2's "don't hand-roll" posture is narrower than Phase 1's. Phase 1 had a lot of primitive construction; Phase 2's primitives (YAML AST, frontmatter split, atomic write) all have proven libs or built-ins. The temptation here is to hand-roll the DIFF ALGORITHM — resist; keep it simple and typed to the Phase-1 Spec shape.

## Runtime State Inventory

> Phase 2 is a **greenfield** feature phase. No rename/refactor/migration — no stored-data re-registration is needed. This section is kept non-empty to confirm the check was done, not skipped.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — spec file on disk IS the state; no DB, no cache | None. |
| Live service config | None — Phase 2 makes no external service calls | None. |
| OS-registered state | None — Phase 2 registers no tasks, processes, or daemons. Phase 9's pi extension registers `/spec` command but that is out-of-scope here. | None. |
| Secrets/env vars | None — no credentials, no auth tokens, no env vars read | None. |
| Build artifacts | `tests/helpers/parse-fixture.ts` (Phase-1-only helper) + `fixtures/*.spec.json` siblings are **deleted** this phase (D-25 + CONTEXT.md code_context §Reusable Assets) — this is a source-tree deletion, not a runtime-state migration. Also: `tests/__snapshots__/malformed.test.ts.snap` regenerates because the parser path changes (real YAML vs `.spec.json` read) — content should match (Diagnostic[] sorted); structural regeneration is acceptable. | Plan task to remove `tests/helpers/parse-fixture.ts`, remove `fixtures/*.spec.json` (4 files), regenerate malformed snapshot. Document removal in task summaries. Also: every Phase-1 test that imports `parse-fixture.ts` must switch to `parseSpecFile`. Caller list: `git grep -l parse-fixture tests/`. |

**Canonical question — "after every file is updated, what runtime systems still have the old string cached?"** Answer: nothing. Phase 2 is a pure-code phase with deterministic on-disk artifacts. The only "state" is the spec file itself, which Phase 2 defines the write path for.

## Common Pitfalls

### Pitfall 1: Document-level `setIn()` re-stringifies subtree formatting

**What goes wrong:** Developer writes `doc.setIn(["screens", 0, "title"], "New")` expecting byte-identical output. Actual: the scalar gets re-stringified in whatever the emit path's defaultStringType chooses (usually PLAIN), dropping any original quoting style. Round-trip test fails.

**Why it happens:** Document `setIn` bypasses the source-token retention — it creates a brand-new Scalar node without an srcToken. Only CST-level edits (`CST.setScalarValue(node.srcToken, ...)`) preserve the scalar's original quoting style and position.

**How to avoid:** For scalar replacements, always read the existing node first (`doc.getIn(path, true)` with keepNode flag) and check `node.srcToken` — if present, use `CST.setScalarValue()`. Only fall back to `doc.setIn()` when the path is brand new or the replacement is a collection.

**Warning signs:** Round-trip test diffs show single-line drift — same value, different quoting/indent. Byte-drift in `fixtures/round-trip/comments-inline.spec.md` is the leading indicator.

### Pitfall 2: `gray-matter` strips leading newline after closing `---`

**What goes wrong:** Developer does `matter(orig) → edit data → matter.stringify(content, data)` and compares output to orig byte-wise. Bytes differ by a `\n` right after the closing `---`.

**Why it happens:** gray-matter's parse path explicitly removes one `\r?\n` after the closing delimiter (see `lib/index.js`). Its stringify path uses a `newline()` normalizer that doesn't put the leading byte back in the same way.

**How to avoid:** Never use `matter.stringify()`. Build the output string manually: `"---\n" + newMatter + "---" + preservedBodyPrefix + file.content`. Capture the delimiter-to-first-body-char bytes from `file.orig` at parse time (substring between the end of the closing `---` and position of first non-whitespace body byte, or `file.orig.length` if empty body).

**Warning signs:** Round-trip tests that add one `\n` to the expected output to make byte-compare pass. If that patch is needed, the splice logic is wrong.

### Pitfall 3: `parseDocument({ version: '1.2' })` does NOT parse `yes`/`no`/`on`/`off` as booleans — but the AUTHOR might think they do

**What goes wrong:** Author hand-edits spec and writes `active: yes`. eemeli/yaml 1.2 parses this as the string `"yes"`. Phase-1 schema (strict-typed boolean via Zod) rejects at Stage A. Diagnostic says "expected boolean, got string" which is confusing — "but YAML is supposed to accept yes as boolean!"

**Why it happens:** YAML 1.1 implicit-type rules treat `yes/no/on/off` as booleans; YAML 1.2 core schema treats them as plain strings. Pinning 1.2 is correct (it's a stricter, less-surprise contract) but authors used to 1.1-style YAML files may be confused.

**How to avoid:** Implement the SERDE-07 read-side lint pass per D-33-discretion: scan scalars, flag `yes|no|on|off|y|n|true|false` (case-insensitive) that appear **unquoted** as info-severity diagnostics. Code: `SERDE_YAML11_GOTCHA`. Non-blocking; points the author at the fix ("quote it or use an explicit boolean `true`/`false`"). On emit, auto-quote these values as string scalars so a write never regresses to a YAML-1.1 gotcha.

**Warning signs:** Author files a bug: "my spec sets active: yes but validation fails with a string/boolean mismatch." The SERDE_YAML11_GOTCHA diagnostic at parse time pre-empts this.

### Pitfall 4: `setIn()` throws on paths where intermediate collections don't exist

**What goes wrong:** Developer calls `doc.setIn(["actions", "new_action", "kind"], "navigate")` when `actions.new_action` doesn't exist yet. Early yaml versions (and sometimes current) throw "Expected YAML collection at actions. Remaining path: new_action".

**Why it happens:** Known issue #345 in eemeli/yaml — documented behavior ("creates missing collections") doesn't always match actual behavior for nested paths with multiple missing parents.

**How to avoid:** Before `setIn`, use `hasIn` to check. For multi-level missing paths, build the intermediate collection explicitly: `doc.setIn(["actions", "new_action"], doc.createNode({})) → doc.setIn(["actions", "new_action", "kind"], "navigate")`. For Phase 2, collection additions are rare (mostly scalar edits on existing keys); document this workaround in write.ts for the edge case.

**Warning signs:** Tests fail with `Expected YAML collection at X` errors. The edit path is adding a new parent and a new child in a single call.

### Pitfall 5: CRLF line endings on Windows drift round-trip

**What goes wrong:** Fixture file authored on Windows has CRLF line endings. Our writer emits LF. `Buffer.equals` fails.

**Why it happens:** Node's default `fs.readFile(path, 'utf8')` returns the bytes verbatim — CRLF stays CRLF. But `YAML.parseDocument → toString()` normalises to LF, and our manual splice assumes LF in `"---\n"` prefix.

**How to avoid:** Detect line-ending style at parse time (first `\r\n` vs `\n` in `file.orig`), store in `astHandle.lineEndingStyle`, use it when constructing output. OR: commit fixtures with LF only and add a `.gitattributes` rule forcing LF for `*.spec.md`. Simpler; locks the test surface.

**Warning signs:** Windows contributor's PR shows byte-drift on fixtures that pass on macOS/Linux CI.

### Pitfall 6: `doc.contents.items.unshift(newPair)` for schema injection — spaceBefore placement

**What goes wrong:** First-save injection puts `schema: mobile-tui/1` at position 0 via `unshift`, but the original first-key (say, `screens`) retained its `spaceBefore: false` — resulting in two keys with no blank line between schema and screens. D-28 says there MUST be a blank line.

**Why it happens:** `unshift` doesn't touch adjacent items. The blank-line semantics live on THEIR spaceBefore, not on ours.

**How to avoid:** After `unshift`, explicitly set `doc.contents.items[1].spaceBefore = true` to force a blank line separating schema from the original first key. Test: fixture without `schema:` → save → expected output has exact `schema: mobile-tui/1\n\n{rest of matter}`.

**Warning signs:** First-save test for schema-injection fixture shows schema and next key on adjacent lines with no blank between.

### Pitfall 7: Markdown body leading whitespace stripped by gray-matter is permanent loss unless captured from `file.orig`

**What goes wrong:** File has `---\n<blank line>\n\n# Title` (two blank lines after frontmatter). `file.content` starts at `# Title` — gray-matter stripped ALL leading whitespace. On write, we emit `---{body starting at #Title}` → one blank line gained/lost vs original.

**Why it happens:** gray-matter's parse path consumes ONE `\r?\n` after the closing `---`. Further whitespace is in `file.content`. BUT if the body starts with a blank line (e.g., `\n\n# Title`), gray-matter may strip it or may not — inconsistent edges.

**How to avoid:** Ignore `file.content` for the write-path and instead extract body-bytes directly from `file.orig`: find the byte offset of the end of the closing `---` marker, capture everything from there to EOF as `astHandle.bodyBytes`. On write, `output = '---\n' + newMatter + '---' + bodyBytes`. Guarantees byte-identity of body.

**Warning signs:** A fixture with unusual delimiter whitespace (multiple blank lines, trailing spaces on the `---` line) drifts despite sigil/unknown/known all untouched.

## Code Examples

Verified patterns from official sources. Each example is load-bearing for a specific Research Area.

### Example 1: gray-matter + eemeli/yaml engine wiring

```typescript
// Source: verified — github.com/jonschlinkert/gray-matter README (custom engines);
// github.com/eemeli/yaml docs/04_documents.md (parseDocument signature)
// File: src/serialize/frontmatter.ts
import matter from "gray-matter";
import YAML from "yaml";

export interface ParsedFrontmatter {
  doc: YAML.Document;            // the AST with comments/order intact
  matterStr: string;             // raw YAML between ---s (from file.matter)
  bodyBytes: string;             // body from file.orig (NOT file.content)
  origBytes: string;             // full input
  isEmpty: boolean;              // matter was empty
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

  // file.data is our YAML.Document (since parse returned one).
  // file.matter is the raw frontmatter string between ---s.
  // file.content has been leading-newline-stripped; we want the UNSTRIPPED body.

  // Compute body-bytes directly from file.orig:
  //   locate closing '---' offset, take substring to EOF.
  // Regex matches the SECOND --- (closing delimiter).
  // gray-matter uses a robust delimiter-detection; we only need end-of-matter.
  // Approach: offset = indexOf('---') after matterStart; past that, take rest.
  const origBytes = typeof file.orig === "string" ? file.orig : file.orig.toString("utf8");

  // Delimiter pattern (mirrors gray-matter's internals): /^---+\s*$/m
  // We find the SECOND match after the opening one.
  let bodyBytes = "";
  const firstDelimMatch = origBytes.match(/^---+\s*$/m);
  if (firstDelimMatch) {
    const afterFirst = firstDelimMatch.index! + firstDelimMatch[0].length;
    const rest = origBytes.slice(afterFirst);
    const closingMatch = rest.match(/^---+\s*$/m);
    if (closingMatch) {
      // Byte position of EOL of closing ---
      const closingEnd = afterFirst + closingMatch.index! + closingMatch[0].length;
      bodyBytes = origBytes.slice(closingEnd);
    }
  }

  return {
    doc: file.data as YAML.Document,
    matterStr: file.matter ?? "",
    bodyBytes,
    origBytes,
    isEmpty: !!file.isEmpty,
  };
}
```

### Example 2: CST-level scalar replacement for byte-identical round-trip

```typescript
// Source: eemeli/yaml docs/07_parsing_yaml.md + WebFetch result (CST overview);
// confirmed via issue #345 that Document setIn is insufficient for round-trip.
// File: src/serialize/write.ts (snippet)
import YAML, { CST, isScalar, isNode } from "yaml";

/**
 * Replace a scalar at the given path. Prefers CST-level edit (preserves quoting
 * and position byte-for-byte) when the path exists. Falls back to Document-level
 * setIn when the path is new.
 */
function setScalarPreserving(
  doc: YAML.Document,
  path: (string | number)[],
  newValue: string | number | boolean | null,
): void {
  const node = doc.getIn(path, /* keepNode */ true);

  if (isScalar(node) && node.srcToken && typeof newValue === "string") {
    // Happy path: CST edit preserves formatting
    CST.setScalarValue(node.srcToken, newValue, {
      type: node.srcToken.type, // preserves QUOTE_DOUBLE, PLAIN, BLOCK_LITERAL
    });
    // Also update Document-level value so doc.toJSON() stays consistent
    node.value = newValue;
    return;
  }

  // Fallback: new path or non-scalar — Document-level set
  doc.setIn(path, newValue);
}

/**
 * Delete a key preserving surrounding formatting.
 */
function deletePreserving(doc: YAML.Document, path: (string | number)[]): void {
  // deleteIn removes from both AST and retains-adjacent-CST when possible.
  // No CST-level delete API in yaml 2.8.3; Document handles this correctly
  // for most cases (issue: https://github.com/eemeli/yaml/issues/174).
  doc.deleteIn(path);
}
```

### Example 3: Unknown-top-level-key stash (D-26)

```typescript
// Source: eemeli/yaml docs/04_documents.md (YAMLMap.items structure);
// CONTEXT.md D-26/D-27.
// File: src/serialize/unknown.ts
import { isMap, isScalar } from "yaml";
import type { Document } from "yaml";

export const KNOWN_TOP_LEVEL_KEYS = [
  "schema",
  "screens",
  "actions",
  "data",
  "navigation",
] as const;
type KnownKey = (typeof KNOWN_TOP_LEVEL_KEYS)[number];

const KNOWN_SET: ReadonlySet<string> = new Set(KNOWN_TOP_LEVEL_KEYS);

export interface PartitionResult {
  /** Plain-JS projection of known-schema subset — goes to validateSpec(). */
  knownSubset: Record<string, unknown>;
  /** Names of unknown top-level keys (diagnostic only; their positions stay in AST). */
  unknownKeys: string[];
}

export function partitionTopLevel(doc: Document): PartitionResult {
  if (!isMap(doc.contents)) {
    return { knownSubset: {}, unknownKeys: [] };
  }

  const knownSubset: Record<string, unknown> = {};
  const unknownKeys: string[] = [];

  for (const pair of doc.contents.items) {
    const keyStr = isScalar(pair.key)
      ? String(pair.key.value)
      : String(pair.key);

    if (KNOWN_SET.has(keyStr)) {
      // Project the value branch to plain JS for validation. toJSON walks
      // the AST and produces a plain-object shape — losing comments ONLY in
      // this transient copy. The Document AST itself is untouched; retains
      // comments for the write path.
      knownSubset[keyStr] = pair.value && "toJSON" in pair.value
        ? (pair.value as { toJSON: (ctx?: unknown) => unknown }).toJSON()
        : pair.value;
    } else {
      unknownKeys.push(keyStr);
    }
  }

  return { knownSubset, unknownKeys };
}
```

### Example 4: `schema: mobile-tui/1` first-save injection (D-28)

```typescript
// Source: WebFetch on eemeli/yaml — doc.createPair + items.unshift + spaceBefore;
// CONTEXT.md D-28.
// File: src/serialize/schema-inject.ts
import { isMap } from "yaml";
import type { Document } from "yaml";
import { SCHEMA_VERSION } from "../model/index.ts";

/**
 * Inject `schema: mobile-tui/1` at the top of the frontmatter if absent.
 * Idempotent — no-op if schema key already present.
 * Post-condition: if injected, the ORIGINAL first key now has spaceBefore: true
 * so the emit has a blank line between schema and the rest.
 */
export function injectSchemaIfAbsent(doc: Document): boolean {
  if (doc.has("schema")) return false;

  if (!isMap(doc.contents)) {
    // Empty document — create a map with just the schema key
    doc.contents = doc.createNode({ schema: SCHEMA_VERSION }, { flow: false });
    return true;
  }

  const schemaPair = doc.createPair("schema", SCHEMA_VERSION);
  doc.contents.items.unshift(schemaPair);

  // D-28: blank line after schema before next key
  if (doc.contents.items.length > 1) {
    const nextPair = doc.contents.items[1];
    if (nextPair && "key" in nextPair && nextPair.key && "spaceBefore" in nextPair.key) {
      (nextPair.key as { spaceBefore?: boolean }).spaceBefore = true;
    }
  }

  return true;
}
```

### Example 5: Atomic write (.tmp + rename)

```typescript
// Source: Node.js fs API docs; github.com/npm/write-file-atomic for validation
// of the pattern; CONTEXT.md D-29/D-30.
// File: src/serialize/atomic.ts
import { promises as fs } from "node:fs";
import { basename, dirname, join } from "node:path";

export interface AtomicWriteResult {
  written: boolean;
  tmpOrphan: string | null; // path of orphan if rename failed AFTER writeFile
}

export async function atomicWrite(
  targetPath: string,
  contents: string,
): Promise<AtomicWriteResult> {
  const dir = dirname(targetPath);
  const base = basename(targetPath);
  const tmpPath = join(dir, `.${base}.tmp`); // D-30 fixed suffix

  try {
    // Step 1: write full content to tmp. On any failure here, tmp may or may
    // not exist — we clean it up best-effort and treat the write as failed.
    await fs.writeFile(tmpPath, contents, { encoding: "utf8" });
  } catch (err) {
    // Clean up partial tmp if it exists; swallow cleanup errors
    await fs.unlink(tmpPath).catch(() => undefined);
    throw err;
  }

  try {
    // Step 2: POSIX-atomic rename. On same-device macOS/Linux this is atomic;
    // partial-write state is impossible — target either points at old bytes
    // or new bytes, never truncated.
    await fs.rename(tmpPath, targetPath);
    return { written: true, tmpOrphan: null };
  } catch (err) {
    // Rename failed AFTER writeFile succeeded → orphan tmp left on disk.
    // D-30 says: surface as SPEC_ORPHAN_TEMP_FILE on next parse. We return
    // the orphan path so the caller can include it in diagnostics if useful,
    // but we do NOT unlink it — a successful writeFile means user-content
    // exists we shouldn't discard silently.
    return { written: false, tmpOrphan: tmpPath };
  }
}

export async function detectOrphanTmp(targetPath: string): Promise<string | null> {
  const dir = dirname(targetPath);
  const tmpPath = join(dir, `.${basename(targetPath)}.tmp`);
  try {
    await fs.access(tmpPath);
    return tmpPath;
  } catch {
    return null;
  }
}
```

### Example 6: 20-fixture round-trip driver

```typescript
// Source: CONTEXT.md Claude's Discretion §20-fixture golden composition;
// ARCHITECTURE.md §4 round-trip test discipline.
// File: tests/round-trip.test.ts
import { promises as fs } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseSpecFile, writeSpecFile } from "../src/serialize/index.ts";
import { resolve } from "node:path";
import { glob } from "node:fs/promises" in globalThis
  ? { glob: async () => [] /* use fast-glob in CI if needed */ }
  : { glob: async () => [] };

async function discoverFixtures(): Promise<string[]> {
  // Flat enumeration — fixtures/, fixtures/sigil/, fixtures/round-trip/
  const roots = [
    "fixtures/habit-tracker.spec.md",
    "fixtures/todo.spec.md",
    "fixtures/social-feed.spec.md",
    "fixtures/malformed.spec.md",
    // NOTE: malformed has Stage-B errors. Round-trip test MUST accept fixtures
    // with error-severity diagnostics — we are testing the parse/write bytes,
    // not the save gate. Use parseSpecFile + an internal "write-bytes-only"
    // path that bypasses the validateSpec gate, OR keep malformed out of the
    // round-trip matrix and cover cross-ref separately.
    // DECISION for planner: exclude malformed from byte-identical RT suite;
    // its job is cross-ref regression (tests/malformed.test.ts already exists).
    "fixtures/sigil/habit-tracker.sigil.spec.md",
    "fixtures/sigil/todo.sigil.spec.md",
    "fixtures/sigil/social-feed.sigil.spec.md",
    "fixtures/round-trip/comments-inline.spec.md",
    "fixtures/round-trip/comments-trailing.spec.md",
    "fixtures/round-trip/comments-nested.spec.md",
    "fixtures/round-trip/reorder-nav-first.spec.md",
    "fixtures/round-trip/reorder-data-first.spec.md",
    "fixtures/round-trip/reorder-actions-first.spec.md",
    "fixtures/round-trip/unknown-top-key-theme.spec.md",
    "fixtures/round-trip/unknown-top-key-integrations.spec.md",
    "fixtures/round-trip/yaml11-gotcha-yes.spec.md",
    "fixtures/round-trip/yaml11-gotcha-norway.spec.md",
    "fixtures/round-trip/empty-body.spec.md",
    "fixtures/round-trip/comment-only-body.spec.md",
  ];
  return roots;
}

describe("SERDE-05: byte-identical round-trip on no-op save", () => {
  it("exercises ≥20 fixtures", async () => {
    const fixtures = await discoverFixtures();
    expect(fixtures.length).toBeGreaterThanOrEqual(20);
  });

  for (const fixturePath of [
    // ... actual list, expanded inline ...
  ]) {
    it(`round-trips ${fixturePath} byte-identically`, async () => {
      const abs = resolve(fixturePath);
      const originalBytes = await fs.readFile(abs);

      // Parse into memory.
      const { spec, astHandle, diagnostics } = await parseSpecFile(abs);

      // Round-trip fixtures shouldn't have error-severity diagnostics.
      // If they do, the fixture is wrong or the parser is wrong — surface loudly.
      const errs = diagnostics.filter((d) => d.severity === "error");
      expect(errs).toEqual([]);

      // Write to a temp path (not over the fixture!) with no modifications.
      const tmpPath = resolve("tests/tmp", `${fixturePath.replace(/[\/\\]/g, "_")}.tmp`);
      await fs.mkdir(resolve("tests/tmp"), { recursive: true });
      const { written } = await writeSpecFile(tmpPath, spec, astHandle);
      expect(written).toBe(true);

      // Compare bytes.
      const roundTrippedBytes = await fs.readFile(tmpPath);
      expect(Buffer.equals(originalBytes, roundTrippedBytes)).toBe(true);

      // Cleanup
      await fs.unlink(tmpPath);
    });
  }
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `js-yaml.load` + `js-yaml.dump` | `eemeli/yaml` Document + CST hybrid | eemeli/yaml reached stable parity ~2022; CST API refined through 2.x | Non-negotiable for this project — CLAUDE.md explicitly bans js-yaml |
| Document-only `setIn` for edits | CST.setScalarValue via `keepSourceTokens` srcToken | `keepSourceTokens` introduced in yaml@2.0 (late 2022); `CST.setScalarValue` added 2.1; canonical round-trip pattern documented 2024 | Must adopt — Document-only edits fail SERDE-05 byte-identity |
| `matter.stringify()` for save | Manual byte-splice from `file.orig` | gray-matter.stringify behavior unchanged since 4.0.x (2019) — not a fix; just not used by us | Saves us from chasing phantom delimiter-whitespace drift |
| Coordinate-based Maestro taps | testID sigils embedded in spec | Maestro best practices 2024+ | Only relevant to Phase 7; Phase 2's sigil-normalization sets the shape |
| `writeFileSync` overwrite | `fs.writeFile(.tmp) + fs.rename()` | POSIX atomic rename is 1990s-era; Node `fs.rename` stable | Adopted per D-29; trivial to implement |

**Deprecated/outdated:**
- `js-yaml` 4.x — strips comments on round-trip; documented non-feature. CLAUDE.md bans at dep level.
- eemeli/yaml pre-2.0 `parseDocument` — no `keepSourceTokens`; byte-identical round-trip impossible. Not a concern (we pin `^2.8.3`).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Phase 2 test execution | ✓ | Node 20+ (CLAUDE.md `engines.node: >=20`) | — |
| `yaml` npm package | `src/serialize/*.ts` | ✗ (to be added) | `^2.8.3` target | None — mandatory via CLAUDE.md |
| `gray-matter` npm package | `src/serialize/frontmatter.ts` | ✗ (to be added) | `^4.0.3` target | None — mandatory via CLAUDE.md |
| `js-yaml` | — (banned) | — | — | — (banned at dep level) |
| `npm` registry | `npm install yaml gray-matter` | ✓ | — | — |
| POSIX rename syscall | `fs.promises.rename` atomic | ✓ on macOS/Linux; Windows has less-strong semantics but acceptable for v1 | Node built-in | Cross-device EXDEV handling deferred to Phase 9 per D-30 |
| Git (for committing artifacts) | — | ✓ | — | — |

**Missing dependencies with no fallback:**
- `yaml@^2.8.3` + `gray-matter@^4.0.3` — Phase 2's opening plan task MUST add these to `package.json`. No fallback is viable.

**Missing dependencies with fallback:**
- None.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `vitest@^4.1.4` (already installed Phase 1) |
| Config file | `vitest.config.ts` (exists; may need to widen `include` to pick up `src/serialize/*.test.ts`) |
| Quick run command | `npx vitest run src/serialize` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| SERDE-01 | Single Markdown+YAML file is SOT (no hidden cache) | Integration (architectural) | `npx vitest run src/serialize/parse.test.ts` — no alternative reader; no DB init | ❌ Wave 0 |
| SERDE-02 | `gray-matter` with `engines.yaml` → eemeli/yaml; `js-yaml` banned | Unit + architectural audit | `npx vitest run src/serialize/frontmatter.test.ts` + `npx vitest run tests/no-js-yaml.test.ts` | ❌ Wave 0 |
| SERDE-03 | diff-and-apply; no `YAML.stringify(spec)` | Unit + grep gate | `npx vitest run src/serialize/write.test.ts` + `! grep -r "YAML.stringify\|stringify(spec)" src/serialize/` | ❌ Wave 0 |
| SERDE-04 | Markdown body opaque slab (D-18) | Unit | `npx vitest run src/serialize/body.test.ts` | ❌ Wave 0 |
| SERDE-05 | ≥20 golden fixtures byte-identical; CI fails on drift | Golden-fixture suite | `npx vitest run tests/round-trip.test.ts` | ❌ Wave 0 |
| SERDE-06 | Atomic `.tmp` + rename; `session_shutdown` flush | Unit (atomic-primitive only; debounce is Phase 4) | `npx vitest run src/serialize/atomic.test.ts` | ❌ Wave 0 |
| SERDE-07 | YAML 1.2 pinned; emit escapes 1.1-gotcha values | Unit + integration | `npx vitest run src/serialize/write.test.ts -t "yaml11"` + golden fixtures `fixtures/round-trip/yaml11-gotcha-*.spec.md` | ❌ Wave 0 |
| SPEC-08 | `schema: mobile-tui/1` first-save injection; unknown top-level keys preserved via AST | Unit + integration | `npx vitest run src/serialize/schema-inject.test.ts` + `npx vitest run src/serialize/unknown.test.ts` + golden fixtures with unknown-top-key | ❌ Wave 0 |
| SPEC-09 | `validateSpec()` never-throws; severity-error blocks save | Unit | `npx vitest run src/serialize/write.test.ts -t "save-gate"` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run src/serialize` (≈ 1-5s; unit tests only, no fixture I/O)
- **Per wave merge:** `npx vitest run` (full suite; includes 20-fixture round-trip and cross-phase regression — estimate ≤ 15s)
- **Phase gate (pre-`/gsd-verify-work`):** Full suite green + `npx tsc --noEmit` + `npx biome check .` + `npx vitest run --coverage` (target ≥ 95% stmts on `src/serialize/`)

### Wave 0 Gaps

All Phase 2 tests are net-new. Wave 0 must establish:

- [ ] `package.json` — add `yaml@^2.8.3` + `gray-matter@^4.0.3` to `dependencies`; add `no-js-yaml` audit.
- [ ] `src/serialize/` directory and all leaf files listed in §Recommended Project Structure (empty stubs; wave 1+ implements).
- [ ] `src/serialize/index.ts` — barrel.
- [ ] `src/serialize/ast-handle.ts` — `AstHandle` type definition.
- [ ] `src/serialize/diagnostics.ts` — new codes: `SPEC_ORPHAN_TEMP_FILE`, `SPEC_SIGIL_PARTIAL_DROPPED`, `SERDE_YAML11_GOTCHA`, `SERDE_BYTE_DRIFT_DETECTED` (CI-assertion helper), plus `diagnostic()` factory re-export from Phase 1.
- [ ] `tests/round-trip.test.ts` — 20-fixture driver (test file; implementation pending fixtures).
- [ ] `tests/no-js-yaml.test.ts` — audit test asserting no `js-yaml` in package.json dependencies / devDependencies / transitives.
- [ ] `fixtures/sigil/` directory.
- [ ] `fixtures/round-trip/` directory.
- [ ] 16 new fixture files (see §Recommended Project Structure for full list; deletion of `.spec.json` siblings is a separate task).
- [ ] Delete `tests/helpers/parse-fixture.ts`.
- [ ] Delete `fixtures/*.spec.json` (4 files).
- [ ] Regenerate `tests/__snapshots__/malformed.test.ts.snap` via `npx vitest run tests/malformed.test.ts --update` after Phase-1 tests switch to `parseSpecFile`.
- [ ] Migrate Phase-1 tests that use `parse-fixture.ts` → `parseSpecFile`: `tests/fixtures.test.ts`, `tests/malformed.test.ts`, `tests/catalog-coverage.test.ts`, `tests/fidelity.test.ts` (per D-25 + CONTEXT.md code_context).

**No framework install needed** — vitest, biome, TypeScript already present from Phase 1.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No auth surface in Phase 2 (spec file local I/O only) |
| V3 Session Management | no | No sessions |
| V4 Access Control | no | No access control — user owns both read and write |
| V5 Input Validation | **yes** | Zod v4 via Phase-1 `validateSpec()`; Phase 2 adds YAML-parser-level validation via eemeli/yaml's strict mode |
| V6 Cryptography | no | No crypto in Phase 2 |
| V7 Error Handling | **yes** | Never-throws contract at parse/write boundary (D-31, Phase-1 precedent); all errors → Diagnostic[] |
| V8 Data Protection | partial | Spec file may contain app design info; no secrets; git-tracked is user's choice |
| V12 Files & Resources | **yes** | File I/O is the core of Phase 2 |
| V14 Configuration | partial | YAML version pinned to 1.2 (SERDE-07) to narrow attack surface |

### Known Threat Patterns for Phase 2 stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| YAML billion-laughs (alias-expansion DoS) | Denial-of-Service | `eemeli/yaml` parses aliases but has no exploitable expansion bomb by default in 1.2 mode. Phase-1's `MAX_INPUT_BYTES = 5 MB` cap at `validateSpec()` entry is additive. No `!!js/function` tag support in yaml@2.x — cannot execute arbitrary code via crafted spec. `[VERIFIED: eemeli/yaml docs — no function tag; github issue tracker does not show an unresolved billion-laughs CVE]` |
| Path traversal via `.spec.md` filename | Tampering | Phase 2 writes to the exact path given by the caller. Path validation (reject `..` segments, enforce cwd-containment) is Phase 9 territory (pi extension boundary). Phase 2 primitive trusts its caller; the caller must be trustworthy. |
| Race with pi's own `edit`/`write` tool | Tampering | Phase 2 atomic-write primitive is queue-agnostic per D-29. Phase 9 wraps writeSpecFile in `withFileMutationQueue(absPath, fn)`. In Phase 2's isolated scope: no mitigation needed because no concurrent writers exist. |
| Partial write on crash | Data Integrity | `fs.writeFile(.tmp) + fs.rename` — atomic on POSIX same-device. Target either has old bytes or full new bytes, never truncated. D-32 tests this via simulated crash (spy on `fs.rename`). |
| Malicious YAML crafted to bypass schema (e.g., prototype pollution via `__proto__` top-level key) | Tampering | Phase-1 `.strict()` root schema rejects unknown top-level keys INCLUDING `__proto__`, `constructor`, `prototype`. Phase 2's unknown-key stash runs AFTER `partitionTopLevel` but BEFORE `validateSpec()` — unknowns that ARE known-adversarial (like `__proto__`) are passed through as-is into `knownSubset`; Phase-1's strict schema rejects them. Phase 2 does NOT bypass this check. Phase 2 should add a test: fixture with `__proto__` top-level frontmatter key → `validateSpec` emits error, save blocked. |
| CRLF injection in diagnostic messages | Tampering | Diagnostic `message` field is never emitted into YAML output; it's a diagnostic-channel concern. No cross-contamination possible. |
| TOCTOU on orphan `.tmp` detection | Race | `detectOrphanTmp` → `fs.access` is best-effort info-only per D-30. Non-blocking by design. |
| Disk-full mid-write | Resource Exhaustion | `fs.writeFile` throws; atomic.ts catches, cleans up `.tmp`, throws to caller. Spec file on disk unchanged. Acceptable behavior — user sees clear error. |

**Phase-2-specific additional test:** Fixture `fixtures/round-trip/prototype-pollution-attempt.spec.md` with `__proto__: evil` at top-level → `parseSpecFile` returns `diagnostics: [{ code: "SPEC_UNKNOWN_TOP_LEVEL_KEY" or similar, severity: "error" }]` (via Phase-1 `.strict()`), save blocked via D-31 gate.

## Open Questions Resolved

The Phase-1 Open Questions Q#2 (anchor convention) and Q#6 (debounce semantics) that Phase 2 was supposed to close:

- **Q#2: HTML-comment anchor convention vs heading-based markdown body keying.** **Resolved by D-19 deferral.** Phase 2 ships nothing anchor-aware. Body is opaque slab (D-18). The HTML-comment form is the chosen future shape (D-19/D-21), but it lands Phase 4/5. Phase 2 reserves the convention; does not implement.
- **Q#6: Exact debounce + atomic-rename save semantics.** **Resolved by D-29/D-32 split.** Phase 2 ships the atomic-write primitive only. The 500ms debounce, coalescing, and `session_shutdown` flush are Phase 4's scope (editor store). Phase 2's verifiable version of success criterion #5 is: "atomic-write primitive produces fully-written target OR leaves existing target untouched — never a partial write" (D-32).

## Open Questions Remaining for Planning

These emerged during Phase-2 research and are new (not in Phase-1's Open Q list). The planner must decide:

1. **Malformed fixture in round-trip suite?** — `fixtures/malformed.spec.md` has Stage-B error-severity diagnostics. D-31 says save is BLOCKED on error severity. But SERDE-05 says the byte-identical round-trip test should cover "every Stage-A-valid fixture." **Recommendation for planner:** EXCLUDE malformed from the 20-fixture byte-identical suite. Its purpose is cross-ref regression (`tests/malformed.test.ts` already exists). Adjust §20-fixture composition: the 20th fixture becomes an additional reorder or unknown-key variant, not malformed.
2. **Test isolation: where does the test suite write its tmp files?** — The round-trip test writes to `tests/tmp/` and reads back. Concurrent test runs (vitest default parallelism) could collide on filename. **Recommendation:** per-test unique tmp paths via `crypto.randomUUID()` or vitest's per-test cwd; add `tests/tmp/` to `.gitignore`.
3. **Line ending style: commit LF or preserve whatever the fixture has?** — Related to Pitfall 5. **Recommendation:** add `.gitattributes` with `*.spec.md text eol=lf` and document in fixture-authoring guide. Simpler than runtime detection.
4. **What happens when `parseSpecFile` is called on a file that is itself `.tmp`?** — Orphan detection looks for `.{basename}.tmp`. If the caller passes `./foo.spec.md.tmp` directly, the detection logic would look for `..foo.spec.md.tmp.tmp`. **Recommendation:** reject paths ending in `.tmp` at `parseSpecFile` entry with a clear error — it's an authoring mistake not an IO scenario.
5. **`withFileMutationQueue` integration shape** — D-29 defers this to Phase 9, but the PUBLIC signature of `writeSpecFile` must be queue-wrappable. **Recommendation:** keep the signature as `writeSpecFile(path, spec, astHandle): Promise<{ written, diagnostics }>` exactly. Phase 9 wraps by calling it inside a queue callback. No Phase 2 change needed — this is a non-issue as long as the function is pure w.r.t. its args (it is).
6. **Empty-body fixture edge case: must body be spliced back as literal empty string, or is `\n` acceptable?** — The fixture `fixtures/round-trip/empty-body.spec.md` has frontmatter only (ends at closing `---`). On write, is output `---\n{matter}---` or `---\n{matter}---\n`? **Recommendation:** capture `bodyBytes` verbatim from `file.orig`. If original ends at `---` (no trailing newline), output likewise. If original ends at `---\n`, output likewise. Byte-for-byte.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Phase-1's 18-kind `COMPONENT_KINDS` catalog includes Button/TextField/Toggle/SegmentedControl/ListItem as the interactable set carrying (label, action, testID) | Pattern 4 (Sigil Normalization), Research Area 4 | If the set is different (e.g., different kinds carry different sigil shapes), the `INTERACTABLE_KINDS` set in sigil.ts needs adjustment. **Mitigation:** verify at plan-writing time by reading `src/model/component.ts` directly. The Phase-1 summary says "TabBar items INLINE-extend InteractableBase"; confirm which other kinds carry InteractableBase. |
| A2 | eemeli/yaml `Document.contents.items` for a top-level map is a standard JS array supporting `unshift()` | Example 4 (schema injection) | If `items` is a proxy-backed collection, `unshift` may not work. **Mitigation:** verified via WebFetch on docs/04_documents.md — `items: Pair<K,V>[]` is a plain array. HIGH confidence. |
| A3 | `gray-matter`'s parse function passes engine.parse return-value through to `file.data` without wrapping or validation | Example 1 (frontmatter wiring), Pattern 2 | If gray-matter post-processes the parse return into a plain object (e.g., via `Object.assign({}, result)`), we'd lose the Document AST. **Mitigation:** verified via `lib/parse.js` WebFetch — return is passed through verbatim. HIGH confidence. |
| A4 | Node.js `fs.rename` is atomic on macOS/Linux when source + target are on the same filesystem | Example 5 (atomic write) | If rename is non-atomic on some POSIX configuration, partial-write state is possible. **Mitigation:** standard POSIX guarantee; Node wraps rename(2); validated via github.com/npm/write-file-atomic issue #64 discussion and Hacker News durability threads. HIGH confidence. |
| A5 | `eemeli/yaml` 2.8.3 does NOT have known critical round-trip bugs introduced since 2.8.0 | State of the Art | If 2.8.3 introduced a regression, byte-identity may drift. **Mitigation:** verified 2.8.0-2.8.3 changelog via GitHub releases page — no round-trip regressions listed. MEDIUM-HIGH confidence. Recommend pinning exactly `2.8.3` in package.json (caret-range ok since 2.8.x is bugfix-only per semver, but any 2.9 bump should re-validate). |
| A6 | `CST.setScalarValue(token, value, { type })` preserves the scalar's adjacent whitespace and comments byte-identically when called with the matching type | Example 2 (CST edit) | If setScalarValue normalizes whitespace (unlikely per docs claim "best efforts made to retain any comments previously associated"), minor byte-drift on edits. **Mitigation:** adds a unit test — fixture with scalar + inline `# comment`, edit scalar, assert comment survives position-wise. MEDIUM confidence. |
| A7 | gray-matter's delimiter-detection regex `/^---+\s*$/m` matches the same delimiter positions as gray-matter's internal parsing, so we can extract body-bytes reliably from `file.orig` | Example 1 (body bytes extraction) | If gray-matter supports exotic delimiters (`+++` for TOML) and we assume `---`, custom-delimiter specs would break our splice. **Mitigation:** Phase-2 scope is YAML frontmatter only (CLAUDE.md + SERDE-02 pins yaml engine); `---` is fixed. Add a schema-check: reject files whose first non-whitespace line is not `---` as `SERDE_MISSING_DELIMITER`. |

## Sources

### Primary (HIGH confidence)

**Library documentation:**
- eemeli/yaml docs — https://eemeli.org/yaml/v2/ — parseDocument signature, Document API, options list (WebFetch verified)
- eemeli/yaml docs/04_documents.md — https://github.com/eemeli/yaml/blob/main/docs/04_documents.md — setIn/deleteIn, Pair structure, items array (WebFetch verified)
- eemeli/yaml docs/07_parsing_yaml.md — https://github.com/eemeli/yaml/blob/main/docs/07_parsing_yaml.md — CST API, Parser, Composer, CST.setScalarValue (WebFetch verified)
- eemeli/yaml docs/03_options.md — https://github.com/eemeli/yaml/blob/main/docs/03_options.md — keepSourceTokens, version, schema, stringify options (WebFetch verified)
- eemeli/yaml GitHub releases — https://github.com/eemeli/yaml/releases — 2.8.0-2.8.3 changelog (WebFetch verified)
- gray-matter README — https://github.com/jonschlinkert/gray-matter — engines.yaml custom override, API surface (WebFetch verified)
- gray-matter lib/parse.js — https://raw.githubusercontent.com/jonschlinkert/gray-matter/master/lib/parse.js — engine invocation, return pass-through (WebFetch verified)
- gray-matter lib/stringify.js — https://raw.githubusercontent.com/jonschlinkert/gray-matter/master/lib/stringify.js — normalization behavior (WebFetch verified)

**Maintainer statements (from official discussions):**
- Discussion #510: "Document level does not preserve whitespace" — https://github.com/eemeli/yaml/discussions/510 — CST is required for byte-identity (WebFetch verified)
- Discussion #473: parseDocument + setIn → toString pattern for blank-line preservation — https://github.com/eemeli/yaml/discussions/473 (WebFetch verified)

**Project-internal (verified this session):**
- `src/model/index.ts`, `src/model/spec.ts`, `src/model/invariants.ts` — Phase-1 barrel and SpecSchema shape
- `src/primitives/diagnostic.ts` — Diagnostic factory pattern
- `fixtures/habit-tracker.spec.md`, `fixtures/malformed.spec.md` — existing fixture shape (triple-form, no body AST)
- `package.json` — current dependency baseline (`zod@^4.3.6`, `jsonpointer@^5.0.1`)
- `.planning/phases/02-serialization-round-trip/02-CONTEXT.md` — all 15 locked D-18..D-32 decisions
- `.planning/phases/01-spec-model-invariants/01-CONTEXT.md` — D-01..D-17 including sigil grammar reference
- `CLAUDE.md` — stack pinning, js-yaml ban, "What NOT to Use"

### Secondary (MEDIUM confidence)

- npm registry direct `npm view yaml version` → `2.8.3` (command-line verified 2026-04-18)
- npm registry direct `npm view gray-matter version` → `4.0.3` (command-line verified 2026-04-18)
- GitHub issue #345 (setIn on non-existent paths) — https://github.com/eemeli/yaml/issues/345 (WebFetch verified; the "creates missing collections" documented behavior has edge cases with deep new paths)
- GitHub issue #174 (Document.setIn empty contents) — https://github.com/eemeli/yaml/issues/174
- Node.js fs docs — https://nodejs.org/api/fs.html — fs.rename atomicity
- write-file-atomic issue #64 — https://github.com/npm/write-file-atomic/issues/64 — "Rename atomicity is not enough" (durability beyond atomicity; Phase 2 accepts write-only atomic, not flush-durability)

### Tertiary (LOW confidence — flagged for validation during planning)

- None. The load-bearing claims (CST round-trip, gray-matter delimiter stripping, fs.rename atomicity) are all HIGH/MEDIUM-HIGH.

## Metadata

**Confidence breakdown:**
- Standard stack (yaml@2.8.3 + gray-matter@4.0.3): HIGH — npm registry verified + CLAUDE.md pins
- Diff-and-apply strategy (hybrid Document + CST): MEDIUM-HIGH — discussion #510 + docs/07 are authoritative; one unknown is whether `CST.setScalarValue` preserves byte-identical position in ALL cases (A6 assumption)
- gray-matter wiring and body-bytes extraction: HIGH — source code verified via WebFetch
- Unknown-top-level preservation: HIGH — Phase-1 `.strict()` shape confirmed; AST retention is default eemeli behavior
- Sigil normalization: MEDIUM — requires confirming Phase-1's `INTERACTABLE_KINDS` set at plan-writing time (A1)
- Schema injection via `unshift`: HIGH — `items` array is plain JS array (A2 confirmed)
- Atomic write: HIGH — POSIX standard; A4 confirmed
- 20-fixture round-trip composition: MEDIUM — fixture matrix is reasonable but may shift during planning (Open Q #1)
- SERDE-07 auto-quote: MEDIUM — implementation path clear, but eemeli's per-scalar type-forcing on emit via `node.type = 'QUOTE_DOUBLE'` should be verified with a unit test before committing
- Security posture: MEDIUM-HIGH — standard Node/YAML hygiene; no novel surface

**Research date:** 2026-04-18
**Valid until:** 2026-05-18 (30 days for a stable library ecosystem). Re-verify npm versions and yaml release notes if the phase extends beyond that window.
