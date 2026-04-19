---
phase: 07-maestro-emitter
reviewed: 2026-04-19T00:00:00Z
depth: standard
files_reviewed: 22
files_reviewed_list:
  - fixtures/habit-tracker.spec.md
  - fixtures/todo.spec.md
  - flows/add_habit_flow.android.yaml
  - flows/add_habit_flow.ios.yaml
  - flows/ios_permission_flow.android.yaml
  - flows/ios_permission_flow.ios.yaml
  - flows/toggle_done_flow.android.yaml
  - flows/toggle_done_flow.ios.yaml
  - src/canvas/root.ts
  - src/editor/commands/emit-maestro.ts
  - src/editor/store.ts
  - src/editor/types.ts
  - src/emit/maestro/emitter.ts
  - src/emit/maestro/index.ts
  - src/emit/maestro/platform-filter.ts
  - src/emit/maestro/step-mapper.ts
  - src/model/cross-reference.ts
  - src/model/index.ts
  - src/model/spec.ts
  - src/serialize/unknown.test.ts
  - tests/maestro-emitter.test.ts
  - tests/store-state-filepath.test.ts
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 07: Code Review Report

**Reviewed:** 2026-04-19T00:00:00Z
**Depth:** standard
**Files Reviewed:** 22
**Status:** issues_found

## Summary

Phase 7 delivers the Maestro emitter pipeline: pure-function `emitMaestroFlows`, the `runEmitMaestro` side-effect action, platform filtering, testID resolution via tree walking, and wire-up in `RootCanvas`. The architecture is clean: the emitter is a pure function (no IO, no Date, deterministic), security mitigations are documented and defensively layered (path sanitization, ANSI stripping, shell-injection prevention via `execFileSync`), and cross-reference checks are extended to validate test flow steps before emission.

Three warnings and three info-level items were found. No critical security issues. The most actionable finding is a golden fixture file that contradicts the test assertion for `ios_permission_flow` platform branching — this will cause the golden-fixture test to fail.

## Warnings

### WR-01: Golden fixture `ios_permission_flow.ios.yaml` contradicts platform-branching test assertion

**File:** `flows/ios_permission_flow.ios.yaml:6`

**Issue:** The committed golden file contains `done_toggle` on line 6:
```yaml
- tapOn:
    id: done_toggle
```
The `ios_permission_flow` fixture (`fixtures/habit-tracker.spec.md`, lines 201-209) defines that step with `platform: android` — meaning `done_toggle` must NOT appear in the `.ios.yaml` output. The test at `tests/maestro-emitter.test.ts:107` explicitly asserts:
```typescript
expect(permFlow.ios).not.toContain("done_toggle");
```
This assertion will fail when the golden fixture test suite runs against the emitter output, because the emitter correctly excludes the android-only step from `ios` output, but the committed golden file was written with the wrong content. The golden file and the emitter disagree on what the correct `.ios.yaml` should be for this flow.

**Fix:** Regenerate the golden file. After confirming the emitter correctly filters `platform: android` steps, the correct `ios_permission_flow.ios.yaml` should only contain:
```yaml
# Replace com.example.app with your bundle identifier
appId: com.example.app
---
- launchApp
- tapOn:
    id: add_habit_btn
```
(The `done_toggle` step, which is `platform: android`, must be absent from the ios file.)

---

### WR-02: `execFileSync` in `runSyntaxCheck` has no timeout — can block the event loop indefinitely

**File:** `src/editor/commands/emit-maestro.ts:33`

**Issue:** `execFileSync("maestro", ["check-syntax", filePath], { stdio: ["ignore", "pipe", "pipe"] })` runs synchronously with no `timeout` option. If the `maestro` binary is present but hangs (e.g. JVM startup stall, corrupt install), the Node.js event loop blocks permanently. Since this is called from an `async` function via `await`, the entire extension becomes unresponsive until the OS kills the subprocess.

**Fix:** Add a `timeout` option to cap the subprocess lifetime:
```typescript
execFileSync("maestro", ["check-syntax", filePath], {
  stdio: ["ignore", "pipe", "pipe"],
  timeout: 10_000, // 10 s — JVM cold start is typically ~3-5 s
});
```
Alternatively, switch to the async `execFile` from `node:child_process/promises` so the blocking is off the main thread. Either approach prevents the hang.

---

### WR-03: `node.testID as string` unsafe cast silently passes `undefined` into YAML output

**File:** `src/emit/maestro/step-mapper.ts:39`

**Issue:** The check `"action" in node && "testID" in node` confirms the keys are present, but `in` only confirms the key exists — it does not confirm the value is non-`undefined`. Several component schemas declare `testID` as optional (`testID?: string`). If a component node has `testID: undefined` (e.g. a `ListItem` used as a container with `testID` key omitted but structurally present), the cast `node.testID as string` returns `undefined` at runtime. This produces `tapOn: { id: undefined }` in the YAML output, which is a structurally valid call to `YAML.stringify` but generates an invalid Maestro step (`id: null` or omitted key).

**Fix:** Add a type-narrowing check after the `in` guards:
```typescript
if (
  "action" in node &&
  "testID" in node &&
  node.action === actionId &&
  typeof node.testID === "string" &&
  node.testID.length > 0
) {
  return node.testID;
}
```
This is consistent with how `collectTestID` in `cross-reference.ts:128` already guards with `typeof node.testID === "string"`.

---

## Info

### IN-01: `emitter.ts` — partial-lines accumulation on step-map failure is silently discarded

**File:** `src/emit/maestro/emitter.ts:83-92`

**Issue:** In `buildPlatformLines`, when `mapStep` returns `ok: false` the loop calls `continue` and appends the diagnostic, but continues accumulating any subsequent `ok: true` step lines. The caller `emitMaestroFlow` discards these partial lines because it returns `ok: false` when `allDiags.length > 0`. This is correct behavior, but the asymmetry (partial lines built up then thrown away) makes the code harder to reason about and makes it possible to add a future `result.lines` member to `FlowResult` and accidentally include partial output.

**Fix:** Returning early from `buildPlatformLines` on the first diagnostic would make the intent explicit. Alternatively, a comment at line 83 noting "partial lines are intentionally discarded by the caller on error" would suffice.

---

### IN-02: `yamlListItem` in `emitter.ts` assumes `YAML.stringify` always produces a non-empty string

**File:** `src/emit/maestro/emitter.ts:43-45`

**Issue:** `YAML.stringify(obj).trimEnd().split("\n")` uses `lines[0] ?? ""` as a fallback. If `YAML.stringify` returns an empty or whitespace-only string (not expected for a well-formed `{ tapOn: {...} }` object, but possible with unusual YAML options or future library changes), the emitted list item becomes `"- "` — a valid YAML string but not a valid Maestro step.

**Fix:** Add a guard that returns a diagnostic or throws if `first` is empty:
```typescript
if (!first) {
  throw new Error(`yamlListItem: YAML.stringify produced empty output for ${JSON.stringify(obj)}`);
}
```
This turns a silent bad-output scenario into a loud failure that would surface in tests.

---

### IN-03: `todo.spec.md` fixture — `Project.tasks` field typed as `string` instead of a collection type

**File:** `fixtures/todo.spec.md:192`

**Issue:** The `Project` entity declares a `tasks` field with `type: string`, but the `push_task_to_project` action targets `/Project/tasks` with `op: push`. A `push` mutation on a `string` field is semantically incorrect — `push` implies a collection/array. This mismatch means `crossReferencePass` will accept the field reference (it only validates the `/Entity/field` prefix exists, not the op compatibility) but the spec carries a logic error.

This is a fixture quality issue, not a production code bug. The fixture is used in tests to exercise a push-mutate path. The data model is incorrect as authored.

**Fix:** Change the `tasks` field type to `array` or adjust to a relationship (`has_many`) rather than an inline scalar field:
```yaml
- name: tasks
  type: reference
  of: Task
```
Or use the `relationships` key (already modeled in `Habit`). The `string` type alongside a `push` op should also be flagged by a future semantic-validation pass on mutate op/type compatibility.

---

_Reviewed: 2026-04-19T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
