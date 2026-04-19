---
phase: 08-llm-handoff-commands
reviewed: 2026-04-20T00:00:00Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - package.json
  - src/canvas/root.ts
  - src/editor/commands/extract-screen.ts
  - src/editor/commands/index.ts
  - src/editor/commands/prompt-screen.ts
  - src/editor/commands/yank-wireframe.ts
  - src/emit/handoff/assembler.ts
  - src/emit/handoff/index.ts
  - src/emit/handoff/semantic-tokens.ts
  - src/emit/handoff/token-budget.ts
  - tests/handoff/assembler.test.ts
  - tests/handoff/extract-screen.test.ts
  - tests/handoff/prompt-screen.test.ts
  - tests/handoff/semantic-tokens.test.ts
  - tests/handoff/yank-wireframe.test.ts
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 08: Code Review Report

**Reviewed:** 2026-04-20
**Depth:** standard
**Files Reviewed:** 15
**Status:** issues_found

## Summary

This phase implements the LLM handoff commands (`yank-wireframe`, `prompt-screen`, `extract-screen`) along with the `assemblePrompt` pure function, semantic token allowlist, and token-budget helpers. The overall structure is clean: side-effect commands are clearly separated from spec-mutating commands, the path sanitization for extract-screen is thorough, and the token degradation path is well-tested.

Three warnings were found: a subtle logic bug in the navigation-neighbor edge lookup that can report the wrong transition type, a singleton mutation pattern on module-level command objects that creates a hidden ordering dependency between `RootCanvas` instances, and a leaked `setTimeout` handle that fires after `onQuit`. Three info items cover a missing mock teardown, dead code, and a magic constant.

---

## Warnings

### WR-01: Wrong transition type reported for incoming-only navigation neighbors

**File:** `src/emit/handoff/assembler.ts:89-92`

**Issue:** In `buildNeighborsSection`, when an outgoing edge `screenId → id` does not exist, the fallback `edges.find((e) => e.to === id)` matches ANY edge that points at `id`, not just the one connecting `screenId` to `id`. For an incoming edge `id → screenId`, the edge where `to === screenId` is in `edges` (because `edges` was already filtered to edges touching `screenId`), but not the edge `id → screenId`. The real problem is for screens that are neighbors through an incoming edge: the fallback should be `edges.find((e) => e.from === id && e.to === screenId)` to get the reverse edge, but instead it picks whichever edge in `edges` has `to === id`, which could be a completely unrelated edge or pick nothing meaningful.

Concrete scenario: spec has edges `A → B` (transition: `push`) and `C → B` (transition: `modal`). If we assemble for screen `C`, `edges` = `[C→B]`, neighbor `B` is found, first find (`from === C && to === B`) succeeds — fine. Now for screen `D` that has only `B → D` (transition: `sheet`), `edges` = `[B→D]`, first find (`from === D && to === B`) fails, fallback `to === B` also fails (no edge in `edges` has `to === B`). Result is `"unknown"` — minor, but the fallback as written is misleading and would mis-report if `edges` contained a second entry ending at `id`.

**Fix:**
```typescript
const edge =
  edges.find((e) => e.from === screenId && e.to === id) ??
  edges.find((e) => e.from === id && e.to === screenId); // reverse edge
const transition = edge?.transition ?? "unknown";
```

---

### WR-02: Module-level singleton mutation creates hidden ordering dependency

**File:** `src/canvas/root.ts:138-141`, `src/editor/commands/extract-screen.ts:79-97`

**Issue:** `RootCanvas` constructor mutates properties directly on the exported module-singleton objects `yankWireframeCommand._onResult`, `promptScreenCommand._onResult`, `extractScreenCommand._onResult`, and `extractScreenCommand._specFilePath`. These are the same objects referenced by `COMMANDS` in the barrel. If two `RootCanvas` instances were ever alive at the same time (which the codebase comment in `wizard/root.ts` suggests is a sequence, not a simultaneous condition — but is fragile), the second instance would silently overwrite the first's callbacks. Additionally `extractScreenCommand._specFilePath` is set once at construction time and never updated if the store's `filePath` changes after construction.

This is an architectural warning rather than an immediate crash. The pattern works today because there is only ever one `RootCanvas` alive at a time, but it is invisible global state.

**Fix:** Pass the callbacks and `specFilePath` into `apply()` via a closure captured at construction time rather than writing to the module singleton. For example, capture `store` in a closure inside `apply`:

```typescript
// In RootCanvas constructor, instead of mutating the singleton:
// Define local command adapters that close over `this` and `store`:
private makeExtractCommand() {
  const self = this;
  return {
    ...extractScreenCommand,
    apply(spec: Spec, astHandle: unknown, args: ExtractScreenArgs) {
      const filePath = self.store.getState().filePath;
      void runExtractScreen(spec, filePath, args.screenId, args.target)
        .then((r) => self.notifySideEffectResult(r));
      return { spec, inverseArgs: null };
    },
  };
}
```

Or, more minimally, set `_specFilePath` lazily inside `apply()` by reading `store.getState().filePath` at call time rather than at construction time.

---

### WR-03: `emitStatusTimer` is not cancelled when `onQuit` fires

**File:** `src/canvas/root.ts:69, 229-235`

**Issue:** `onQuit` calls `store.flush()` and then `done(undefined)`, tearing down the canvas. But `emitStatusTimer` (a 3-second `setTimeout`) is never cancelled in the quit path. If the user presses Ctrl+Q within 3 seconds of triggering any of the five side-effect commands (`triggerEmitMaestro`, `triggerYankWireframe`, `triggerPromptScreen`, `triggerExtractScreen`, `notifySideEffectResult`), the timer callback fires after teardown and calls `this.tui?.requestRender()` on an already-closed canvas. This is benign today (the optional chain guards the call), but leaves a dangling timer reference.

**Fix:** Add a `cleanup()` method and call it at the start of `onQuit`:

```typescript
private cleanup(): void {
  if (this.emitStatusTimer !== null) {
    clearTimeout(this.emitStatusTimer);
    this.emitStatusTimer = null;
  }
}

// In the onQuit handler wiring:
rootCanvas.onQuit = async () => {
  rootCanvas.cleanup();   // <-- add this
  await store.flush();
  done(undefined);
};
```

---

## Info

### IN-01: Clipboardy mock in `yank-wireframe.test.ts` has no `afterAll` teardown

**File:** `tests/handoff/yank-wireframe.test.ts:11-16`

**Issue:** `vi.mock("clipboardy", ...)` is module-scoped and the mock is never restored. The `beforeEach` calls `vi.clearAllMocks()` which resets call counts, but does not restore the original module. Since no global `restoreMocks: true` is set in `vitest.config.ts`, if a future test file in the same worker imports `clipboardy` expecting the real implementation, it would receive the mock. This is a low-risk test isolation issue, not a production bug.

**Fix:** Add `afterAll(() => vi.restoreAllMocks())` or configure `vitest.config.ts` with `restoreMocks: true`.

---

### IN-02: `buildPropsComment` silently emits empty JSON object when screen has no semantic props

**File:** `src/emit/handoff/assembler.ts:153-159`

**Issue:** When a screen has no components with semantic prop values in `SEMANTIC_TOKENS`, `collectProps` produces an empty `propMap` and `buildPropsComment` emits `<!-- spec-props: {} -->`. This is technically valid but a low-signal comment. It is not incorrect, but consuming tooling or tests that check for `spec-props` content may find this confusing. No test currently exercises a spec with no semantic props.

**Fix:** Consider omitting the comment when `propMap` is empty:
```typescript
function buildPropsComment(spec: Spec, screenId: string): string {
  const screen = spec.screens.find((s) => s.id === screenId);
  const propMap: Record<string, string> = {};
  if (screen) collectProps(screen, propMap);
  if (Object.keys(propMap).length === 0) return "";
  return `<!-- spec-props: ${JSON.stringify(propMap)} -->`;
}
```

---

### IN-03: Magic constant `TOKEN_BUDGET = 2000` duplicated in assembler and tests

**File:** `src/emit/handoff/assembler.ts:32`, `tests/handoff/assembler.test.ts:25`, `tests/handoff/prompt-screen.test.ts:19`

**Issue:** The budget limit `2000` is hardcoded in the assembler module-private constant and then re-hardcoded independently in multiple test files. If the budget changes, test assertions and the implementation diverge silently. The constant is not exported from `token-budget.ts` or `index.ts`.

**Fix:** Export the constant from `token-budget.ts` and import it in both the assembler and the test files:
```typescript
// src/emit/handoff/token-budget.ts
export const DEFAULT_TOKEN_BUDGET = 2000;
```
```typescript
// src/emit/handoff/assembler.ts
import { isWithinBudget, DEFAULT_TOKEN_BUDGET } from "./token-budget.ts";
const TOKEN_BUDGET = DEFAULT_TOKEN_BUDGET;
```

---

_Reviewed: 2026-04-20_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
