# Phase 2: Serialization & Round-Trip — Context

**Gathered:** 2026-04-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Turn the spec file on disk into the single source of truth. Ship:

- `parseSpecFile(path): { spec, astHandle, diagnostics, body }` — reads a `.spec.md`, splits frontmatter from markdown body via `gray-matter` (with `engines.yaml` wired to `eemeli/yaml`'s Document AST), normalises sigil shorthand to Phase-1's triple form, and surfaces Phase-1 `validateSpec()` diagnostics.
- `writeSpecFile(path, spec, astHandle): Promise<{ written, diagnostics }>` — single-shot atomic write via `.tmp` + `rename`, gated on `validateSpec()` severity. Diff-and-apply over the retained `YAML.Document` (never `YAML.stringify(spec)`), opaque-string body splice, first-save `schema: mobile-tui/1` injection.
- A 20-fixture round-trip golden suite asserting byte-identical no-op round-trip (hand-edited-with-comments, reordered keys, unknown top-level keys, nested comments, empty body, YAML-1.1-gotcha values).
- `.spec.json` sibling helper (`tests/helpers/parse-fixture.ts`) deleted; every Phase-1 fixture graduates to real YAML-parser-driven loads.

**In scope (this phase):** `src/serialize/` (parser + serializer + save-gate + atomic write primitive), `fixtures/*.spec.md` as the authoritative source, 20-fixture golden suite, SPEC-08 (`schema:` injection + AST-native unknown-key preservation), SPEC-09 (save-gate on Diagnostic severity).

**Explicitly NOT in scope:** debounce loop + `session_shutdown` orchestration (Phase 4 editor store), anchor-based body splicing (Phase 4/5 when a command needs per-screen edits), `withFileMutationQueue` coordination with pi tools (Phase 9), wireframe rendering (Phase 3), Maestro emission (Phase 7).

**Requirements covered:** SPEC-08, SPEC-09, SERDE-01, SERDE-02, SERDE-03, SERDE-04, SERDE-05, SERDE-06, SERDE-07.

</domain>

<decisions>
## Implementation Decisions

### Body Anchor & Splice Contract

- **D-18:** Body is a **single opaque slab** in Phase 2 — `parseSpecFile` exposes `body: string` verbatim; serializer writes it back byte-for-byte. No anchor recognition, no per-screen structure. Satisfies PITFALLS §4.2 ("treat markdown body as opaque string") at minimum scope.
- **D-19:** Anchor mechanism (`<!-- screen:ID --> … <!-- /screen:ID -->` HTML-comment pairs) is **deferred to Phase 4/5** — it only becomes useful when a command edits one screen's prose without touching others. Phase 2 ships nothing anchor-aware; the convention is reserved for the future phase.
- **D-20:** Prose outside any (future) anchor — preamble text, paragraphs between blocks, trailing content — **round-trips verbatim byte-identically** forever. No diagnostics, no orphan-prose warnings. User-authored narrative is sacred.
- **D-21:** When Phase 4/5 adds anchor support, new-screen blocks **append at end of body** (deterministic, no reorder of existing content). Locked now so the future phase doesn't re-litigate.

### Sigil Shorthand Policy in Phase 2

- **D-22:** Parser accepts **both** sigil form `[Label →action test:id]` (as a single YAML string value on interactable components) **and** triple form `{ label, action, testID }` (Phase-1 convention) on read. Both normalise to the same in-memory triple on the Spec node.
- **D-23:** Serializer **preserves origin** — each interactable component node carries an internal `_sigilOrigin: "sigil" | "triple"` annotation on the AST handle (NOT on the `Spec` type visible to downstream consumers). On write, the serializer emits the node in the same form it was read. Guarantees byte-identical round-trip whether the human author prefers sigil or triple.
- **D-24:** Sigil is emitted **only when all three fields (label, action, testID) are present** on a component. If any is missing, serializer falls back to triple form regardless of origin. Enforces D-03's all-or-nothing sigil rule at the serializer boundary; `_sigilOrigin: "sigil"` with a missing field becomes a `SPEC_SIGIL_PARTIAL_DROPPED` info diagnostic (informational; no save-gate impact).
- **D-25:** Phase-1 fixtures (`habit-tracker`, `todo`, `social-feed`) **stay triple-form**; they become the triple-origin golden fixtures. Phase 2 adds **at least 3 new sigil-form fixtures** (either hand-written new specs, or sigil rewrites of the canonical three stored as `fixtures/sigil/*.spec.md`) so both origin paths are exercised by the 20-fixture suite. Zero rewrite churn on Phase-1 snapshots.

### `_unknown:` Bucket Mechanism (SPEC-08)

- **D-26:** Unknown top-level frontmatter keys are preserved **AST-natively** — they stay in the `eemeli/yaml` `Document` at their original position with their original comments and blank lines. The serializer's diff-and-apply never visits these nodes, so they survive round-trip by construction. **No literal `_unknown:` key is ever written to a user's file.** The in-memory `Spec` type never surfaces them; they are strictly a parser/serializer implementation detail.
- **D-27:** Scope is **top-level frontmatter keys only**. Nested unknowns (inside `screens[i]`, inside a component node, inside an action) remain rejected by the Phase-1 `.strict()` root — the forward-compat story is additive at the top level. Parser strips top-level unknowns into an internal stash BEFORE calling `validateSpec()` so `.strict()` sees a clean shape; serializer consults the AST on write.
- **D-28:** First-save `schema: mobile-tui/1` injection (success criterion #3) lands at the **top of the frontmatter, as the first key**, followed by a blank line before the next key. Convention matches Jekyll/Hugo/Astro frontmatter norms. Byte-identical on the rest of the document.

### Atomic Write + Debounce Contract

- **D-29:** Phase 2 ships the **atomic-write primitive only**: `writeSpecFile(path, spec, astHandle): Promise<{ written: boolean, diagnostics: Diagnostic[] }>`. Single-shot — no debounce, no queue, no flush. Phase 4's editor store wires the 500ms debounce loop, coalescing, and `session_shutdown` flush hook; Phase 9 adds `withFileMutationQueue` coordination.
- **D-30:** Temp-file naming: **`.{basename}.tmp` fixed suffix** (e.g. `.habit-tracker.spec.md.tmp`). Parser on next open detects orphan `.tmp` siblings and surfaces `SPEC_ORPHAN_TEMP_FILE` as an info diagnostic (non-blocking; user decides whether to keep or discard). Concurrent-save races are Phase 9's problem via `withFileMutationQueue`.
- **D-31:** Save-gate: when `validateSpec()` returns any `severity === 'error'` diagnostic, `writeSpecFile` returns `{ written: false, diagnostics }` **without touching disk** (no tmp file created, no rename attempted). Warnings and info never block. **Never throws** on schema-error blocks — mirrors Phase 1's `validateSpec()` never-throws contract. Caller inspects `.written` and routes diagnostics to its own surface.
- **D-32:** Success criterion #5 (debounce-mid-save + `session_shutdown` flush) — the **debounce half moves to Phase 4**'s test suite. Phase 2's verifiable version of #5 is: atomic-write primitive produces a fully-written target OR leaves the existing target untouched — never a partial write. Test via simulated crash-mid-write (spy on `fs.rename` to throw after `writeFile`) confirming target bytes are the original or the full new content, never truncated. Noted in VERIFICATION.md cross-reference when Phase 4 closes out the debounce half.

### Claude's Discretion (defaults unless researcher or planner flags otherwise)

- **Library wiring:** `gray-matter@^4.0.3` with `engines: { yaml: { parse: YAML.parseDocument, stringify: (doc) => doc.toString() } }` override wiring to `eemeli/yaml@^2.8.3`. `js-yaml` is banned at the dependency level (enforced by a repo-root `package.json` audit test).
- **YAML version:** pin `1.2` in `parseDocument` options (`{ version: "1.2" }`). Rejects implicit YAML-1.1 booleans (`yes/no/on/off`) as strings unless explicitly quoted; reduces the SERDE-07 gotcha surface by default.
- **SERDE-07 gotcha handling:** serializer auto-quotes `yes|no|on|off|y|n|true|false` (case-insensitive) when they appear as string values during AST diff-apply of a scalar replacement, so a round-trip that changes `mode: Production` to `mode: on` emits `mode: "on"`, not `mode: on`. Parser-side lint pass (info severity, non-blocking) identifies unquoted-would-be-trouble scalars on read so authors get a warning.
- **20-fixture golden composition:** Phase 2 starts from Phase-1's 4 (`habit-tracker`, `todo`, `social-feed` canonical + `malformed`) and adds ~16: 3 sigil-form variants of canonical; 3 hand-edited-with-comments (inline `# TODO:` + trailing `# note:`); 3 reordered-keys (`navigation:` before `screens:`, etc.); 2 unknown-top-level-key (`theme: "dark"`, `integrations: {...}`); 2 nested-comments (between list items, above block-scalar values); 2 YAML-1.1-gotcha (`active: on`, `region: NO`); 1 empty-body; 1 comment-only body. Final mix tunable during the planning pass.
- **Byte-identical definition:** compared via `Buffer.equals(before, after)` after `parseSpecFile → writeSpecFile` round-trip with no semantic change. CI fails on any byte drift; golden fixtures ship as committed byte sequences.
- **Cross-ref errors on save:** Stage-B diagnostics (unresolved action, testID collision, etc.) carry `severity === 'error'` per Phase 1 convention → save blocked per D-31. Phase 2 does NOT relax this; Phase 3 preview-render path calls `parseSpecFile` but ignores diagnostics (renders with `[BROKEN LINK]` markers per 01-06 decision).
- **Sigil-label escape rules:** stay deferred per Phase 1 (D-03 already locks ASCII-only labels; escape rules for literal `→`/`]` remain "address when a fixture needs them"). Phase 2 fixtures will NOT stress this surface.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents (researcher, planner, executor) MUST read these before planning or implementing.**

### Project-level contract
- `.planning/PROJECT.md` — core value, "spec IS state" constraint, out-of-scope boundaries
- `.planning/REQUIREMENTS.md` §Serialization — SERDE-01..07 full text; §Spec model — SPEC-08, SPEC-09
- `.planning/ROADMAP.md` §Phase 2 — goal statement, success criteria #1–5, dependency posture

### Phase 1 contract (MUST read — defines the Spec shape Phase 2 serialises)
- `.planning/phases/01-spec-model-invariants/01-CONTEXT.md` §decisions — D-01..D-17 (sigil grammar, variant closed union, action intent union, fixture set)
- `.planning/phases/01-spec-model-invariants/01-VERIFICATION.md` — Phase 1 success criteria already met; what's imported from `src/model/`
- `src/model/` barrel and component schemas (read-only; do not modify)
- `src/model/version.ts` — `SCHEMA_VERSION = "mobile-tui/1"` literal for injection

### Research corpus (synthesised 2026-04-17)
- `.planning/research/SUMMARY.md` §Phase 2 build-order, Open Q#2 (anchor convention — resolved by D-19 deferring), Open Q#6 (debounce semantics — resolved by D-29 splitting scope to Phase 2 vs 4)
- `.planning/research/PITFALLS.md` §4 (round-trip pitfalls) — §4.1 (`eemeli/yaml` AST-diff; js-yaml banned), §4.2 (opaque-string body), §4.3 (no derived fields), §4.4 (YAML 1.1/1.2 divergence)
- `.planning/research/STACK.md` §YAML round-trip + §Frontmatter — `yaml@^2.8.3`, `gray-matter@^4.0.3` with `engines.yaml` override
- `.planning/research/ARCHITECTURE.md` §L3 Serialize layer — diff-and-apply strategy rationale
- `.planning/research/FEATURES.md` §MVP Table Stakes — "Spec read/write" and "Spec schema v1"

### External standards + library docs
- `eemeli/yaml` README — `parseDocument`, `Document`, `setIn`/`deleteIn`, comment preservation guarantees. https://github.com/eemeli/yaml
- `gray-matter` README — `engines.yaml` custom-engine override. https://github.com/jonschlinkert/gray-matter
- YAML 1.2 spec — implicit-type rules for `on/off/yes/no`. https://yaml.org/spec/1.2.2/
- RFC 6901 (JSON Pointer) — already Phase 1 canonical; Phase 2 does not re-open
- Node `fs.rename` semantics — same-device atomic; cross-device `EXDEV` is Phase 9 coordination, not Phase 2

### Session artefacts (read-only context)
- `.planning/STATE.md` — current position; Phase 1 closed pending `/gsd-verify-work`
- `CLAUDE.md` §Tech Stack — matches STACK.md; §What NOT to Use reinforces `js-yaml` ban

### User-referenced docs during this discussion
None — all decisions above are locked here with no new external refs surfaced in Q&A.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets (from Phase 1)

- **`src/model/` barrel** — Phase 2 imports `Spec`, `SpecSchema`, `validateSpec`, `SCHEMA_VERSION`, `Diagnostic`, `DiagnosticSchema` as a single `import { ... } from "../model/index.js"` line. No new primitives needed at the model layer.
- **`src/primitives/diagnostic.ts`** — Phase 2 authors new diagnostic codes (`SPEC_ORPHAN_TEMP_FILE`, `SPEC_SIGIL_PARTIAL_DROPPED`, `SERDE_YAML11_GOTCHA`, `SERDE_BYTE_DRIFT_DETECTED`) via the existing `diagnostic()` factory. Same severity scale (`error | warning | info`) per D-01.
- **`src/primitives/path.ts`** — `pathToJsonPointer` helper already exists; cross-reference diagnostics from Phase 1 use it. Phase 2 parser-side error-path mapping reuses.
- **`src/migrations/index.ts`** — `runMigrations(spec, fromVersion, toVersion)` scaffold; Phase 2's first-save injection may chain through `runMigrations(spec, null, "1")` (or short-circuit since v1 is the anchor). Hook exists; Phase 2 decides whether to wire now or defer.
- **Phase-1 fixtures** at `fixtures/*.spec.md` — become the triple-origin golden round-trip corpus. `.spec.json` siblings are **dropped** in Phase 2 (per 01-08 decision); `tests/helpers/parse-fixture.ts` is deleted and replaced by `parseSpecFile` direct calls.
- **Snapshot tests** at `tests/__snapshots__/malformed.test.ts.snap` — Phase 2 regenerates since the parser path changes (real YAML parse vs `.spec.json` read). Content should be identical (Diagnostic[] sorted); structural regeneration is acceptable.

### Established Patterns (from STACK.md, ARCHITECTURE.md, Phase 1 conventions — follow, don't invent)

- **Never throws at the validation boundary.** `validateSpec` and Phase 2's `parseSpecFile` + `writeSpecFile` return typed Result-like shapes (`{ spec, diagnostics }`, `{ written, diagnostics }`) rather than throwing on schema errors. Exceptions reserved for unrecoverable IO (missing file, permission denied, YAML syntax parse failure from `eemeli/yaml` itself).
- **Closed vocabularies.** Diagnostic codes are `SCREAMING_SNAKE_CASE` namespaced `SPEC_*` or `SERDE_*`. No free-form strings.
- **One file per schema concern.** Phase 1 lays out `src/model/{action,variant,component,screen,navigation,spec}.ts`; Phase 2 mirrors at `src/serialize/{parse,write,body,sigil,unknown,atomic}.ts` etc. Co-located `.test.ts` per file; integration tests in `tests/`.
- **TDD per-task commit pairs.** `test(02-XX): RED` → `feat(02-XX): GREEN` convention established in Phase 1 (reconstructable via `git log --oneline | grep '02-'`).
- **Zod v4 stays in the model layer only.** Phase 2 does NOT add new Zod schemas; it consumes Phase 1's types via `z.infer<typeof SpecSchema>` and hand-written TypeScript types for AST handles.
- **Biome + vitest + tsc clean gate.** Phase 2 must hold the Phase-1 green line on `npx tsc --noEmit`, `npx vitest run`, `npx biome check`.

### Integration Points

- **Phase 3 (wireframe renderer)** imports `parseSpecFile` to feed the `render-wireframe <spec> <screen-id>` CLI. Consumes `{ spec, diagnostics }`; renders `[BROKEN LINK]` markers on cross-ref errors rather than refusing to render (per 01-06 decision).
- **Phase 4 (editor store)** wraps `writeSpecFile` in a debounced save loop; owns the `session_shutdown` flush; surfaces `{ written: false, diagnostics }` as a "save blocked" indicator. Phase 2's atomic primitive is the lowest-level write call.
- **Phase 7 (Maestro emitter)** imports `parseSpecFile` indirectly via Phase 4's store when canvas triggers `:emit maestro`. Consumes the normalised triple form for test-ID selectors; sigil origin is invisible here.
- **Phase 9 (pi integration)** wraps every `writeSpecFile` call in `withFileMutationQueue(absPath, fn)` to coordinate with pi's own `edit`/`write` tool. Phase 2's primitive is designed to be queue-wrapped, not to own the queue.
- **`.spec.json` sibling helper deletion** — `tests/helpers/parse-fixture.ts` is removed and every Phase 1 test that used it switches to `parseSpecFile`. This is a structural Phase 2 task; callers listed in `git grep -l parse-fixture`.

### New Code Layout

- `src/serialize/` (new directory — L3 per ARCHITECTURE):
  - `parse.ts` — `parseSpecFile(path)` orchestrator
  - `write.ts` — `writeSpecFile(path, spec, astHandle)` + atomic `.tmp`-rename
  - `body.ts` — opaque-string body extractor (per D-18)
  - `sigil.ts` — sigil ↔ triple normaliser + origin tracking (per D-22..D-24)
  - `unknown.ts` — AST-native unknown-key stash (per D-26..D-27)
  - `schema-inject.ts` — first-save `schema: mobile-tui/1` insertion (per D-28)
  - `frontmatter.ts` — `gray-matter` wiring with `engines.yaml` override
  - `index.ts` — barrel
  - Co-located `*.test.ts` for unit tests
- `tests/round-trip.test.ts` — 20-fixture golden suite driver
- `fixtures/` — add ~16 new golden fixtures covering the full edge-case matrix per Claude's Discretion above
- `fixtures/sigil/` — new subdirectory for sigil-origin fixtures (D-25)

</code_context>

<specifics>
## Specific Ideas

- **Byte-identical round-trip is the hard bar.** CI fails on any drift per SERDE-05. The serializer's contract is: same in + no semantic change = same out, down to the last byte. Comments, key order, blank lines, anchors, indent style — all survive.
- **Body-as-opaque-string (D-18) is load-bearing for SERDE-04.** Parsing the markdown body into any kind of AST — even just anchor-indexing — is the top risk for accidental reformat. Phase 2 deliberately ships nothing that re-tokenises body text; the full string passes through untouched.
- **Sigil origin annotation (D-23) lives on the AST handle, not on the `Spec` type.** Downstream consumers (wireframe renderer, Maestro emitter, editor store) never see `_sigilOrigin`; they see the normalised triple. Only `writeSpecFile` consults it, and only when re-emitting.
- **`_unknown:` is an AST fact, never a literal file key (D-26).** If a future user writes a literal `_unknown: { ... }` key in their file, it's just another unknown top-level key — preserved AST-natively. No magic, no conflict.
- **Save-gate is Result-typed, not exception-typed (D-31).** Every saving caller handles `{ written: false, diagnostics }` as a first-class path, not a catch-block. Prevents the "we forgot to try/catch" class of bug in Phase 4's editor store.
- **The `.spec.json` sibling resolver dies in Phase 2.** Its existence was explicit Phase-1 scaffolding per 01-01 decision; Phase 2's parser-drop is the forcing function. Every Phase 1 test that touches `tests/helpers/parse-fixture.ts` migrates to `parseSpecFile` as part of Phase 2's task list.
- **`.tmp` orphan diagnostic is informational, not blocking.** A crash leaves `.habit-tracker.spec.md.tmp` next to the target; next parse flags it but doesn't refuse to load. User (or Phase 9 `session_start`) decides whether to reconcile.

</specifics>

<deferred>
## Deferred Ideas

- **Body anchor mechanism** — HTML-comment pair form `<!-- screen:ID --> … <!-- /screen:ID -->` is the chosen future shape; ships in Phase 4/5 when a command (add-screen, edit-screen-prose) needs per-screen splicing. New-screen auto-insert appends at end of body (D-21 pre-locked).
- **Debounced save loop + `session_shutdown` flush** — Phase 4 (editor store) owns the timer, coalescing, and shutdown hook. Phase 2 ships the atomic-write primitive that Phase 4 wraps.
- **`withFileMutationQueue` coordination** — Phase 9 (pi integration) wraps every `writeSpecFile` call so pi's `edit`/`write` tools don't race with the extension. Phase 2's primitive is queue-agnostic.
- **Sigil-label escape rules for Unicode / literal `→` / literal `]`** — Phase 1 deferred; Phase 2 fixtures stay within ASCII-only labels so the question stays open. First fixture that needs escaping is the forcing function.
- **Cross-device rename fallback (EXDEV)** — ignored in Phase 2 per "temp file in same dir as target" convention (D-30). Cross-device support belongs to `withFileMutationQueue` if ever needed; most likely never.
- **`.rejected` sibling file for blocked writes** — briefly considered as a third save-gate option; rejected for file-system litter. If Phase 4 observes real authoring pain from silent save-blocks, revisit then.
- **Literal `_unknown:` key semantics** — rejected in favour of AST-native preservation (D-26). If a future version wants a visible forward-compat escape hatch, revisit then.
- **Auto-quote-on-emit for every YAML-1.1 gotcha scalar** — Claude's Discretion picks the common set (`yes|no|on|off|y|n|true|false`). A wider palette (sexagesimal numbers, `.inf`/`.nan`, non-ASCII `NO` in country codes per Norway-problem) is deferred to post-Phase-2 observed issues.
- **Migration promotion of unknowns → known** — if a mobile-tui/2 ships that adds a previously-unknown top-level key, the migration runner needs hooks to "promote" the AST node. v1/v2 logic is out-of-scope until v2 actually begins.
- **Per-screen body-edit commands** — Phase 4/5 territory; requires the anchor mechanism landed.

</deferred>

---

*Phase: 02-serialization-round-trip*
*Context gathered: 2026-04-18*
