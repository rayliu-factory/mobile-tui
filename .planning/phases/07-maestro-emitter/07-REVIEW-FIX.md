---
phase: 07-maestro-emitter
fixed_at: 2026-04-19T00:00:00Z
review_path: .planning/phases/07-maestro-emitter/07-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 2
skipped: 1
status: partial
---

# Phase 07: Code Review Fix Report

**Fixed at:** 2026-04-19T00:00:00Z
**Source review:** .planning/phases/07-maestro-emitter/07-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 3
- Fixed: 2
- Skipped: 1

## Fixed Issues

### WR-02: `execFileSync` in `runSyntaxCheck` has no timeout

**Files modified:** `src/editor/commands/emit-maestro.ts`
**Commit:** 683382e
**Applied fix:** Added `timeout: 10_000` option to the `execFileSync` call inside `runSyntaxCheck` at line 33-36. This caps the subprocess lifetime at 10 seconds, preventing the Node.js event loop from blocking indefinitely if the `maestro` JVM hangs on startup.

### WR-03: `node.testID as string` unsafe cast silently passes `undefined` into YAML output

**Files modified:** `src/emit/maestro/step-mapper.ts`
**Commit:** 4184846
**Applied fix:** Replaced the single-line `if ("action" in node && "testID" in node && node.action === actionId)` check (which used an unsafe `node.testID as string` cast) with an expanded guard that adds `typeof node.testID === "string" && node.testID.length > 0` conditions before returning. The `as string` cast was removed entirely — the narrowed type now flows through without coercion. This is consistent with how `collectTestID` in `cross-reference.ts` already guards testID values.

## Skipped Issues

### WR-01: Golden fixture `ios_permission_flow.ios.yaml` contradicts platform-branching test assertion

**File:** `flows/ios_permission_flow.ios.yaml:6`
**Reason:** Code context differs from review — the golden file is already correct.
**Original issue:** The review described `flows/ios_permission_flow.ios.yaml` as containing a `tapOn: { id: done_toggle }` step (an android-only step), which would contradict the test assertion at `tests/maestro-emitter.test.ts:107`. However, inspection of the actual committed file shows it contains only:

```yaml
# Replace com.example.app with your bundle identifier
appId: com.example.app
---
- launchApp
- tapOn:
    id: add_habit_btn
```

The `done_toggle` step is absent. The android golden (`flows/ios_permission_flow.android.yaml`) correctly contains `done_toggle`. The committed state already matches the intended fix — no change required.

---

_Fixed: 2026-04-19T00:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
