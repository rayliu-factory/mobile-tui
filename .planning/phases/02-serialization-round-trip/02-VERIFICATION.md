---
phase: 02-serialization-round-trip
verified: 2026-04-18T10:30:00Z
status: passed
score: 5/5 success criteria verified (+ 9/9 requirement IDs complete)
overrides_applied: 0
re_verification: null
---

# Phase 02: Serialization Round-Trip — Verification Report

**Phase Goal (ROADMAP.md §Phase 2):** The spec file on disk is the single source of truth, and a no-op load→save round-trips byte-identically — comments, key order, blank lines, anchors all survive.

**Verified:** 2026-04-18T10:30:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Success Criteria (Observable Truths)

| #   | Truth                                                                                                          | Status     | Evidence                                                                                                                                                                                                                            |
| --- | -------------------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | ≥20 golden fixtures round-trip byte-identically; CI fails on drift                                             | VERIFIED   | `tests/round-trip.test.ts` FIXTURES array has 20 entries (matrix-sanity assertion `expect(FIXTURES.length).toBe(20)`), each run through `originalBytes.equals(rtBytes)`. `npx vitest run tests/round-trip.test.ts` → 23/23 green.   |
| 2   | Unknown top-level frontmatter key from a future version lands preserved and re-emits in original position      | VERIFIED   | `fixtures/round-trip/unknown-top-key-theme.spec.md` (theme: dark between schema: and screens:) + `unknown-top-key-integrations.spec.md` both in matrix at indices 14-15, byte-identical via AST-native preservation. Zero `_unknown:` literal anywhere in fixtures/ (grep confirmed). |
| 3   | First save of a `schema:`-less fixture injects `schema: mobile-tui/1` at top; remainder byte-identical         | VERIFIED   | `src/serialize/schema-inject.ts:37` uses `doc.contents.items.unshift(schemaPair)`. Unit test `schema-inject.test.ts:23-41` asserts items[0].key.value === "schema"; idempotent on re-entry (line 74-76); emits `/^schema: mobile-tui\/1\n\nscreens:/` with D-28 blank line. |
| 4   | `validateSpec()` returning any `severity: error` blocks write-through save; warnings don't                      | VERIFIED   | `src/serialize/write.ts:158-164` save-gate returns `{written: false, diagnostics}` when any `severity === "error"`. Prototype-pollution fixture test (round-trip.test.ts:146-176) three-assertion check: parse emits error → write returns `written: false` → no `.tmp` AND no target file on disk. write.ts contains NO `throw` statements in code (only in comments). |
| 5   | Atomic write produces fully-written target or leaves existing untouched — never partial (debounce deferred per D-32) | VERIFIED   | `src/serialize/atomic.test.ts:91-104` simulated-crash test uses `vi.spyOn(fs, "rename").mockRejectedValueOnce(EACCES)` and asserts `fs.readFile(target) === "OLD CONTENT"` unchanged + orphan tmp carries new content. D-32 invariant explicit. |

**Score:** 5/5 success criteria verified.

### Requirements Traceability

| Requirement | Source Plan  | Description                                               | Status   | Evidence                                                                                    |
| ----------- | ------------ | --------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------- |
| SPEC-08     | Plan 02-05   | schema: mobile-tui/1 top key; AST-native unknown preservation | SATISFIED | injectSchemaIfAbsent + partitionTopLevel + 20-fixture round-trip matrix validates theme/integrations. REQUIREMENTS.md:130 marks Complete (Plan 02-05). |
| SPEC-09     | Plan 02-04   | validateSpec returns Diagnostic[]; save gated on severity !== "error" | SATISFIED | write.ts:158-164 save-gate; never throws contract (no `throw` in write.ts code). REQUIREMENTS.md:131 marks Complete (Plan 02-04). |
| SERDE-01    | Plan 02-05   | Single .spec.md file is SOT; `.spec.json` siblings retired | SATISFIED | fixtures/*.spec.json siblings deleted (4 files); parseSpecFile reads .spec.md directly via gray-matter + eemeli/yaml. REQUIREMENTS.md:133 Complete. |
| SERDE-02    | Plan 02-01   | gray-matter + eemeli/yaml; js-yaml banned                  | SATISFIED | package.json has `gray-matter: ^4.0.3` + `yaml: ^2.8.3` + NO js-yaml direct dep. `tests/no-js-yaml.test.ts` (3-assert audit) green. REQUIREMENTS.md:134 Complete. |
| SERDE-03    | Plan 02-04   | Diff-and-apply via Document AST; never YAML.stringify(spec) | SATISFIED | `grep -rE "YAML\.stringify" src/serialize/` → 0 matches. setScalarPreserving uses CST.setScalarValue + doc.setIn. REQUIREMENTS.md:135 Complete. |
| SERDE-04    | Plan 02-05   | Markdown body opaque slab, re-spliced byte-identically     | SATISFIED | write.ts:254 manual splice preserves bodyBytes verbatim; empty-body + comment-only-body + nested-block-scalar fixtures in matrix all pass Buffer.equals. REQUIREMENTS.md:136 Complete. |
| SERDE-05    | Plan 02-05   | 20-fixture round-trip matrix; CI fails on drift            | SATISFIED | tests/round-trip.test.ts it.each(FIXTURES) with `originalBytes.equals(rtBytes)`; 20/20 + matrix-sanity + 2 prototype-pollution all green. REQUIREMENTS.md:137 Complete. |
| SERDE-06    | Plan 02-04   | Atomic write via .{basename}.tmp + fs.rename (debounce deferred to Phase 4) | SATISFIED | atomic.ts:41-45 tmpPathFor uses `.${basename}.tmp`; 6/6 atomic tests green. REQUIREMENTS.md:138 Complete (debounce Phase 4). |
| SERDE-07    | Plan 02-04   | YAML 1.2 pinned; YAML 1.1 gotcha scalars auto-quoted        | SATISFIED | write.ts:85 `YAML11_GOTCHA_RE = /^(yes\|no\|on\|off\|y\|n\|true\|false)$/i` + forced QUOTE_DOUBLE in setScalarPreserving. yaml11-gotcha-yes + yaml11-gotcha-norway fixtures round-trip. REQUIREMENTS.md:139 Complete. |

**Orphan requirements check:** REQUIREMENTS.md table rows 130-139 all claim Phase 2 except SERDE-08 (Phase 1). No Phase-2 requirement is orphaned — all 9 required IDs are traced to a source plan and validated by evidence. SPEC-08 and SPEC-09 are accounted for via Plan 02-05 and 02-04 respectively, matching the phase-level requirement list `{SPEC-08, SPEC-09, SERDE-01..07}`.

### Required Artifacts

| Artifact                                 | Expected                                                          | Status     | Details                                                                                                                                    |
| ---------------------------------------- | ----------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/serialize/parse.ts`                 | Real parseSpecFile orchestrator wiring all Wave 1/2/3 primitives  | VERIFIED   | Imports all 5 wave primitives (validateSpec, detectOrphanTmp, splitFrontmatter, normalizeSigilsOnDoc, partitionTopLevel). Uses `!parsed.hasFrontmatter` (BLOCKER fix #2 line 117). ESM-only yaml import. |
| `src/serialize/write.ts`                 | writeSpecFile orchestrator with 9-step pipeline                    | VERIFIED   | Step 0 ADVERSARIAL_KEYS pre-gate (lines 143-156); Step 1 save-gate (158-164); Step 2 schema inject (171); Step 7 manual body splice with closingDelimiterTerminator (BLOCKER fix #1 line 254); Step 8 atomicWrite. Zero `throw` in code (only comments). |
| `src/serialize/unknown.ts`               | partitionTopLevel + ADVERSARIAL_KEYS export                        | VERIFIED   | Exports both; Object.create(null) (line 71) for Layer-1 defense. KNOWN_TOP_LEVEL_KEYS list matches schema; ADVERSARIAL_KEYS = __proto__/constructor/prototype. |
| `src/serialize/schema-inject.ts`         | injectSchemaIfAbsent with items.unshift (D-28)                    | VERIFIED   | Line 37 `doc.contents.items.unshift(schemaPair)`. spaceBefore: true on items[1].key for blank line. Idempotent via `doc.has("schema")` short-circuit (line 28). |
| `src/serialize/atomic.ts`                | POSIX atomic write primitive + orphan detection                    | VERIFIED   | tmpPathFor returns `${dir}/.${basename}.tmp` (D-30 fixed suffix). rename-failure branch leaves .tmp + returns tmpOrphan path. No setTimeout/setInterval/debounce in src/serialize (D-29). |
| `src/serialize/sigil.ts`                 | WeakMap origin tracking (D-22/D-23, NOT on Spec type)              | VERIFIED   | `createSigilOriginsMap(): WeakMap<object, "sigil" \| "triple">` (line 76). No sigilOrigin field in src/model/*.ts (grep confirmed). |
| `tests/round-trip.test.ts`               | 20-fixture Buffer.equals matrix + prototype-pollution integration | VERIFIED   | FIXTURES.length === 20 matrix-sanity; `originalBytes.equals(rtBytes)` on each; 3-assertion prototype-pollution block test (lines 134-177). |
| `tests/no-js-yaml.test.ts`               | Architectural-invariant audit (SERDE-02)                           | VERIFIED   | 3 its: package.json direct dep check + required-deps version pins + source-import grep. All green. |
| `fixtures/round-trip/*.spec.md`          | 15 edge-case fixtures (14 matrix + 1 security)                    | VERIFIED   | `ls fixtures/round-trip/ \| wc -l` = 15. Includes all 14 matrix files + prototype-pollution-attempt.spec.md. |
| `fixtures/sigil/*.spec.md`               | 3 sigil-form canonicals (D-25)                                     | VERIFIED   | `ls fixtures/sigil/ \| wc -l` = 3: habit-tracker, todo, social-feed sigil variants. |
| `tests/helpers/parse-fixture.ts`         | DELETED (Wave-0 stub retired)                                     | VERIFIED   | `ls tests/helpers/` → No such file or directory. `grep -rn "parse-fixture" tests/ src/` → 0 matches. |
| `fixtures/*.spec.json`                   | DELETED (Phase-1 scaffolding retired)                              | VERIFIED   | `ls fixtures/*.spec.json` → no matches. 4 deleted siblings (habit-tracker, todo, social-feed, malformed). |

### Key Link Verification

| From                                                | To                                                | Via                                                                       | Status | Details                                                                                            |
| --------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------- |
| `src/serialize/parse.ts`                            | all Wave 1/2/3 primitives                         | compose splitFrontmatter + partitionTopLevel + normalizeSigilsOnDoc + validateSpec + detectOrphanTmp | WIRED  | parse.ts:63-70 imports all 5; pipeline comments 1-9 reference each step. |
| `src/serialize/parse.ts`                            | ParsedFrontmatter.hasFrontmatter                  | emit SERDE_MISSING_DELIMITER iff !parsed.hasFrontmatter (BLOCKER fix #2) | WIRED  | parse.ts:117 `if (!parsed.hasFrontmatter)` gate. |
| `src/serialize/write.ts`                            | ADVERSARIAL_KEYS AST pre-gate                     | re-scan astHandle.doc before save-gate                                    | WIRED  | write.ts:74 imports; lines 143-156 pre-gate consumer. |
| `src/serialize/write.ts`                            | atomicWrite                                        | Step 8 rename-target write                                                | WIRED  | write.ts:72 imports atomic.ts; line 257 atomicWrite call. |
| `tests/round-trip.test.ts`                          | parseSpecFile + writeSpecFile                     | it.each(FIXTURES) → parse → write → Buffer.equals                         | WIRED  | round-trip.test.ts:30 imports both; lines 81-131 drive every fixture through full pipeline with `originalBytes.equals(rtBytes)`. |
| `fixtures/round-trip/prototype-pollution-attempt.spec.md` | tests/round-trip.test.ts                    | asserts both parse-time error AND writeSpecFile block + no .tmp         | WIRED  | round-trip.test.ts:134-177 three assertions for `__proto__` key. |

### Data-Flow Trace (Level 4)

| Artifact                        | Data Variable          | Source                                    | Produces Real Data | Status   |
| ------------------------------- | ---------------------- | ----------------------------------------- | ------------------ | -------- |
| `src/serialize/parse.ts`        | `astHandle.doc`        | `YAML.parseDocument(matterStr)` from disk | Yes                | FLOWING  |
| `src/serialize/parse.ts`        | `spec`                 | `validateSpec(knownSubset)` after partition | Yes                | FLOWING  |
| `src/serialize/parse.ts`        | `body`                 | `parsed.body` (raw string slice)          | Yes                | FLOWING  |
| `src/serialize/write.ts`        | `newMatter`            | CST.stringify over Parser.parse tokens   | Yes                | FLOWING  |
| `src/serialize/write.ts`        | `output`               | `---${LE}${newMatter}---${terminator}${bodyBytes}` | Yes                | FLOWING  |
| `src/serialize/atomic.ts`       | target file bytes      | `fs.rename(tmpPath, targetPath)`          | Yes                | FLOWING  |
| `src/serialize/unknown.ts`      | `knownSubset`          | `Object.create(null)` + AST traversal     | Yes                | FLOWING  |

### Behavioral Spot-Checks

| Behavior                                                                         | Command                                                           | Result            | Status  |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------- | ------- |
| 20-fixture round-trip matrix passes                                              | `npx vitest run tests/round-trip.test.ts`                         | 23/23 green (394ms) | PASS    |
| Atomic-write primitive passes D-29/D-30/D-32 contract                            | `npx vitest run src/serialize/atomic.test.ts`                     | 6/6 green         | PASS    |
| Full vitest suite (Phase-1 regression + Phase-2 suite)                           | `npx vitest run`                                                  | 30 files / 425 tests green (1.11s) | PASS    |
| Typecheck clean                                                                   | `npx tsc --noEmit`                                                | exit 0 (empty output) | PASS    |
| Biome check clean                                                                 | `npx biome check .`                                               | exit 0; 1 INFO (useTemplate style suggestion, non-blocking) | PASS    |
| Coverage ≥95% stmts on src/serialize/                                             | `npx vitest run --coverage`                                       | serialize=95.06% stmts (above threshold); overall 95.86% | PASS    |
| Phase-1 regression tests consume real parseSpecFile                               | `npx vitest run tests/fixtures.test.ts tests/malformed.test.ts tests/catalog-coverage.test.ts tests/fidelity.test.ts` | 26/26 green | PASS    |
| No YAML.stringify(spec) anywhere in src/serialize                                 | `grep -rE "YAML\.stringify" src/serialize/`                       | 0 matches         | PASS    |
| js-yaml direct dep absent from package.json                                       | `grep "js-yaml" package.json`                                     | 0 matches         | PASS    |
| No literal `_unknown:` key in any fixture                                         | `grep -l "_unknown:" fixtures/`                                    | 0 files           | PASS    |
| No debounce/setTimeout/setInterval in src/serialize (D-29)                        | `grep -rE "setTimeout\|setInterval\|debounce" src/serialize/`      | 0 hits in code (only 2 comment references) | PASS    |
| `.tmp` suffix convention `.{basename}.tmp` (D-30)                                 | inspect atomic.ts tmpPathFor                                      | `${dir}/.${base}.tmp` confirmed | PASS    |

### CONTEXT.md Decision Fidelity

| Decision | Requirement                                                                     | Status     | Evidence                                                                                                                                             |
| -------- | ------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-18     | Body opaque slab; no anchor parsing in Phase 2                                  | HONORED    | body.ts extracts raw string; write.ts step 7 splices astHandle.bodyBytes verbatim. No markdown AST in src/serialize/. |
| D-22/D-23 | WeakMap origin tracking, NOT on Spec type                                       | HONORED    | sigil.ts `createSigilOriginsMap(): WeakMap<object, "sigil" \| "triple">`. `grep sigilOrigin src/model/` → 0 matches. |
| D-26     | AST-native unknown preservation; no literal `_unknown:` key                      | HONORED    | unknown.ts partitions via Object.create(null); AST keeps unknown pairs at original position. 0 `_unknown:` literals in fixtures/. |
| D-28     | schema: injected at TOP (items.unshift)                                          | HONORED    | schema-inject.ts:37 `items.unshift(schemaPair)` + spaceBefore on items[1] for blank line. |
| D-29     | Atomic primitive only; no debounce loop in src/serialize                        | HONORED    | atomic.ts single-shot; comments at write.ts:15 + atomic.ts:29 explicit ("Phase 2 ships single-shot only"). |
| D-30     | Fixed `.{basename}.tmp` suffix                                                   | HONORED    | atomic.ts:41-45 tmpPathFor; test atomic.test.ts:49-60 asserts `.test.spec.md.tmp` exact path. |
| D-31     | Save-gate returns Result, never throws for schema errors                        | HONORED    | write.ts:158-164 returns `{written: false, diagnostics}`. Zero `throw` statements in write.ts code. Prototype-pollution test confirms zero disk I/O on block. |
| D-32     | Phase-2 half: atomic-write primitive never partial (debounce deferred to P4)     | HONORED    | atomic.test.ts:91-104 simulated-crash test asserts OLD CONTENT preserved on rename failure. D-32 invariant explicit. |

### Anti-Patterns Found

| File                         | Line | Pattern                              | Severity | Impact                                                                                   |
| ---------------------------- | ---- | ------------------------------------ | -------- | ---------------------------------------------------------------------------------------- |
| `src/serialize/write.ts`     | 254  | `biome.useTemplate` style suggestion | Info     | Non-blocking biome info (exit code 0). Concatenation `+ astHandle.bodyBytes` is readable and intentional. |

No blocker or warning anti-patterns. No TODO/FIXME/PLACEHOLDER markers added by Phase 2. No empty handlers, no console.log-only implementations, no hardcoded empty data in production code paths.

### Phase-1 Regression Baseline

- Phase 1's human_needed items (translation fidelity, SPEC-10 prose readability) are not re-verified here (not in Phase 2 scope).
- Phase 1's 297 tests ran successfully through the real `parseSpecFile` (migration complete). Full suite is now 425/425 green — regression baseline preserved.
- `tests/helpers/parse-fixture.ts` is deleted; all 4 Phase-1 test files (fixtures, malformed, catalog-coverage, fidelity) import `parseSpecFile` from `../src/serialize/index.ts` directly.

### Human Verification Required

None. Every success criterion and requirement is programmatically verifiable. All Phase 2 goals are code-testable: byte-identical round-trip (Buffer.equals), save-gate behavior (written: false), atomic-write invariant (vi.spyOn crash simulation), temp-file convention (exact-path assertion). No visual, real-time, or subjective quality judgments are required for Phase 2 closure.

### Gaps Summary

No gaps. The 20-fixture Buffer.equals gate — Phase 2's headline success criterion — is green. All 9 requirement IDs (SPEC-08, SPEC-09, SERDE-01..07) are Complete with source plans cited in REQUIREMENTS.md:130-139. All 8 user decisions (D-18, D-22, D-23, D-26, D-28, D-29, D-30, D-31, D-32) honored. Phase-1 regression baseline preserved through the migration from Wave-0 stub to real parser.

---

_Verified: 2026-04-18T10:30:00Z_
_Verifier: Claude (gsd-verifier)_
