---
phase: 04-editor-store-commands-undo
reviewed: 2026-04-18T00:00:00Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - package.json
  - scripts/cli-edit.ts
  - src/editor/autosave.ts
  - src/editor/commands/_path-utils.ts
  - src/editor/commands/add-screen.ts
  - src/editor/commands/delete-screen.ts
  - src/editor/commands/add-nav-edge.ts
  - src/editor/commands/delete-nav-edge.ts
  - src/editor/commands/index.ts
  - src/editor/diagnostics.ts
  - src/editor/index.ts
  - src/editor/store.ts
  - src/editor/types.ts
  - src/editor/undo.ts
  - tests/cli-edit.test.ts
  - tests/editor-store.test.ts
  - tests/editor-diagnostics.test.ts
  - tests/autosave-debounce.test.ts
findings:
  critical: 0
  warning: 6
  info: 5
  total: 11
status: issues_found
---

# Phase 04: Code Review Report

**Reviewed:** 2026-04-18
**Depth:** standard
**Files Reviewed:** 18
**Status:** issues_found

## Summary

Reviewed the Phase-4 editor store, command implementations, undo/redo, autosave debounce, and CLI integration layer. The architecture is sound: the hand-rolled signal store, immutable spec updates with parallel AST mutations, Zod arg validation, and 200-entry undo cap are all correctly implemented.

Six warnings were found — none are data-loss bugs on the happy path, but several represent correctness gaps that can cause subtle misbehavior in edge cases (redo clearing the redo stack after one entry, silent error swallowing in subscribers, null navigation root after last screen deletion, unused dead code in `_path-utils.ts`). Five informational items cover type-safety shortcuts and test coverage gaps.

No critical security vulnerabilities were found. The prototype-pollution mitigation (T-04-23) in `cli-edit.ts` and the `Object.create(null)` guard are correctly applied.

## Warnings

### WR-01: `store.redo()` calls `applyImpl` which calls `clearRedo` — second redo always silently no-ops

**File:** `src/editor/store.ts:254-258`
**Issue:** `redo()` pops an entry off the redo stack, then calls `applyImpl(entry.commandName, entry.args, resolve)`. The `applyImpl` pipeline at step 6 calls `clearRedo(redoStack)` unconditionally (line 144). This means the first `redo()` call clears all remaining redo entries. Subsequent `redo()` calls return `null` even when more redo entries existed before the first redo. This is documented as "acknowledged MVP behavior" in the test, but the current implementation loses redo entries silently — the caller receives `null` with no diagnostic, making the truncation invisible to the user.

The real correctness issue: when `redo()` calls `applyImpl`, it passes `entry.args` as the raw (pre-Zod-parse) value, but `applyImpl` re-parses and re-validates it. If args have been round-tripped through JSON or coercion changed the shape, the re-parse may produce subtly different `parsed.data`. This means redo may apply a slightly different version of the original command.

**Fix:** For MVP, at minimum document in `Store` interface that only single redo is supported and add a comment in `redo()` explaining why `clearRedo` is intentionally called via `applyImpl`. For the correctness fix, `redo()` should bypass `clearRedo` and instead call `command.apply(spec, astHandle, parsedArgs)` directly (or a dedicated `reapplyImpl` that does not clear the redo stack).

### WR-02: `notify()` swallows subscriber exceptions silently — errors are unobservable

**File:** `src/editor/store.ts:83-95`
**Issue:** The `notify()` helper catches all per-subscriber exceptions and discards them with no logging:
```ts
} catch {
  // Per-subscriber failure MUST NOT affect other subscribers.
}
```
While the isolation goal is correct (T-04-03), completely discarding errors means subscriber bugs become invisible. In production, if the autosave subscriber or the diagnostics pane subscriber throws, the store continues operating with the error silently dropped — the user never knows a write was skipped due to a subscriber crash. There is no way to observe or diagnose the failure.

**Fix:** At minimum, log to `console.error` inside the catch block so the error surfaces in the terminal during development:
```ts
} catch (err) {
  console.error("[store] subscriber error:", err);
}
```
For Phase 9, thread the error through a store-level error event or expose an `onSubscriberError` hook.

### WR-03: `delete-screen` leaves navigation root as `null` cast to `ScreenId` when all screens are deleted

**File:** `src/editor/commands/delete-screen.ts:81`
**Issue:** When the last screen is deleted (i.e., `spec.screens.find((s) => s.id !== id)` returns `undefined`), the code sets:
```ts
newRoot = firstRemaining ? firstRemaining.id : (null as unknown as ScreenId);
```
The `null as unknown as ScreenId` type cast produces a `null` value in a field typed as `ScreenId` (a branded string). Downstream code that reads `spec.navigation.root` without a null check (e.g., `doc.setIn(["navigation", "root"], newRoot)` at line 109) skips the `setIn` when `newRoot` is falsy — so the AST retains the old root value while the spec value is `null`. This creates a spec/AST divergence at the boundary case.

Additionally, the `invert()` function at line 154 reads `spec.navigation.root` which is now `null`, and `rootChanged` may have been set to `true` — restoring `prevRoot` (the deleted screen's id) back into both spec and AST, which is correct. However, the intermediate state with `null` root is never reflected in the AST, creating potential inconsistency if `flush()` is called before `undo()`.

**Fix:** When all screens are deleted, explicitly set the AST root to null (or an empty string sentinel) to keep spec and AST synchronized:
```ts
if (rootChanged) {
  astHandle.doc.setIn(["navigation", "root"], newRoot ?? null);
}
```

### WR-04: `delete-nav-edge.apply()` returns `{ spec }` unchanged when edge not found — undo will incorrectly restore `null` edge

**File:** `src/editor/commands/delete-nav-edge.ts:33-38`
**Issue:** When `args.index` is out of bounds, `apply()` returns `inverseArgs: { index, edgeJSON: null as unknown as NavEdge }`. The `invert()` function at line 58 guards against this with `if (!edgeJSON) return { spec }` — which is a silent no-op. This means the undo stack receives an entry for an operation that did nothing, consuming an undo slot. After 200 such no-op deletes, the undo stack is full of null-edge entries that silently no-op, displacing real undo entries.

More importantly, `apply()` should signal failure to the caller via a diagnostic rather than silently returning `ok:true` with an empty mutation. The store pipeline always calls `command.apply()` and assumes it succeeded — there is no mechanism for `apply()` to return an error diagnostic to the store.

**Fix:** Either throw an error (which the store's `applyImpl` does not currently catch — it would bubble up to the `main().catch` handler), or document in `Command<T>` that `apply()` can throw on invalid preconditions. The better fix is to have `apply()` throw when the edge does not exist, so the store's unhandled exception path rejects the promise. Then add a `try/catch` around `command.apply()` in `applyImpl` to convert thrown errors into `{ ok: false, diagnostics }`:
```ts
// In applyImpl, step 4:
let applyResult: { spec: Spec; inverseArgs: unknown };
try {
  applyResult = command.apply(spec, astHandle, parsed.data);
} catch (err) {
  resolve({ ok: false, spec, diagnostics: [error(EDITOR_CODES.EDITOR_COMMAND_NOT_FOUND, "" as JsonPointer, (err as Error).message)] });
  return;
}
```

### WR-05: `_path-utils.ts` contains dead code that is unreachable by design

**File:** `src/editor/commands/_path-utils.ts:130-136`
**Issue:** The `else` branch for named segments in the middle of `resolvePathOnSpec` contains dead code:
```ts
} else {
  // Named property — move into an array property
  const prevNode =
    currentAstPath.length > baseAstPath.length
      ? null // already deep
      : null;
  // Check current "array" context for a property named seg
  void prevNode;
  return null; // unsupported — segments must alternate index/property
}
```
`prevNode` is always `null` (both branches of the ternary return `null`), then `void prevNode` discards it, and the function immediately returns `null`. This code was clearly written as a placeholder and never completed. The `void prevNode` suppression of the unused-variable warning confirms this.

**Fix:** Remove the dead code entirely. The `else` branch can be simplified to just `return null;`. If named-segment-first paths need to be supported in the future, implement it properly at that time.

### WR-06: `cli-edit.ts` uses `process.exitCode = 1` in the `.catch` handler but the comment says exit 1 — inconsistent with other error paths that use `process.exit(1)`

**File:** `scripts/cli-edit.ts:138-142`
**Issue:** The `.catch` handler at the bottom uses `process.exitCode = 1` (assignment, not `process.exit(1)`):
```ts
main().catch((err) => {
  process.stderr.write(`error: ${(err as Error).message}\n`);
  process.exitCode = 1;
});
```
For unhandled exceptions from `main()`, this is technically correct — the process will exit with code 1 after the event loop drains. However, when `main()` throws synchronously (before the first `await`), Node.js will handle the rejection asynchronously via the microtask queue. If there are any pending timers or I/O (e.g., the `beforeExit` autosave handler), the process may not exit promptly. The inconsistency between `process.exit(1)` (used at lines 66, 75, 85, 95, 116) and `process.exitCode = 1` (catch handler) means error paths behave differently depending on where the error originates.

The comment at line 8 states: "1 — CLI-layer failure: ... Uses process.exit(1)." The `.catch` handler violates this contract.

**Fix:** Use `process.exit(1)` in the `.catch` handler to match the documented contract and ensure consistent behavior:
```ts
main().catch((err) => {
  process.stderr.write(`error: ${(err as Error).message}\n`);
  process.exit(1);
});
```

## Info

### IN-01: `addScreenInverse` and `DeleteScreenInverse` interfaces are local to command files but not exported — makes cross-file testing harder

**File:** `src/editor/commands/add-screen.ts:32-34`, `src/editor/commands/delete-screen.ts:37-43`
**Issue:** `AddScreenInverse` and `DeleteScreenInverse` are local interfaces used as `unknown` at the `Command<T>` boundary. Tests that want to inspect `inverseArgs` directly must cast through `unknown`. This is intentional (the `Command<T>.invert` signature uses `unknown` for `inverseArgs`), but the lack of exports makes it impossible to write type-safe invert tests without repeating the interface definition.
**Fix:** Consider exporting these interfaces for test-file use, or accept the current design as intentional since `inverseArgs` is an opaque store internal.

### IN-02: `EMPTY_VARIANTS` in `add-screen.ts` is a module-level shared object — mutating it would corrupt all added screens

**File:** `src/editor/commands/add-screen.ts:36-41`
**Issue:** `EMPTY_VARIANTS` is a `const` object declared at module scope and assigned directly to `newScreen.variants`. Since `newScreen` is a plain object and `variants` holds a reference to `EMPTY_VARIANTS`, if any downstream code ever mutates `screen.variants.content.tree` (adding a component in-place rather than via immutable spread), all screens sharing the reference would be corrupted. The `content` variant has a mutable `tree: []` array.

At present, all command `apply()` functions produce new spec objects via spread — so mutations to the live tree do not affect `EMPTY_VARIANTS`. However, this is a fragile invariant that is not enforced by the type system.
**Fix:** Wrap `EMPTY_VARIANTS` in a factory function to return a fresh object per call:
```ts
function emptyVariants() {
  return {
    content: { kind: "content" as const, tree: [] as ComponentNode[] },
    empty: null,
    loading: null,
    error: null,
  };
}
```

### IN-03: `store.ts` applies `pushUndo` even when `command.apply` throws — undo stack receives phantom entries

**File:** `src/editor/store.ts:136-144`
**Issue:** In `applyImpl`, steps 4 and 6 are:
```ts
const { spec: newSpec, inverseArgs } = command.apply(spec, astHandle, parsed.data); // step 4
// ...
pushUndo(undoStack, { commandName, args, inverseArgs }); // step 6
```
If `command.apply()` throws (e.g., `delete-screen` throws `"screen not found"` at line 57 of `delete-screen.ts`), the exception propagates out of `applyImpl` unhandled, rejects the promise, and is caught by `main().catch`. Steps 5–9 do not execute. The undo stack is NOT corrupted in the throw case — `pushUndo` never runs. However, the rejected promise is converted to `process.exitCode = 1` (see WR-06), not `process.exit(1)`, meaning the process may hang.

The real gap: `command.apply()` that throws will also have already mutated `astHandle.doc` (partially). In `delete-screen.apply()`, the `astHandle.doc.deleteIn` calls happen after the guard at line 54. If the screen does not exist, the throw happens before any AST mutations — this is safe. But for commands that do partial AST mutations before throwing, the spec and AST would diverge. Currently only `delete-screen` throws; all others return with invalid `inverseArgs`.
**Fix:** Document clearly in `Command<T>` that `apply()` must not mutate `astHandle.doc` before any precondition checks. Add a `try/catch` in `applyImpl` around `command.apply()` (see WR-04 fix for the pattern).

### IN-04: `tests/editor-diagnostics.test.ts` save-gate tests use conditional assertions that never fail

**File:** `tests/editor-diagnostics.test.ts:153-159`, `186-194`
**Issue:** Multiple save-gate tests use the pattern:
```ts
if (hasError) {
  expect(flushResult.written).toBe(false);
}
// Either way: apply was NOT blocked.
expect(applyResult.ok).toBe(true);
```
The `if (hasError)` branch means if `validateSpec` does not emit an error for a dangling nav edge (e.g., because cross-ref validation is not yet strict for nav-edge `to`), the assertion inside is never evaluated and the test still passes. These tests do not actually verify the save-gate contract — they only verify that the assertions are consistent if errors happen to occur.

A dedicated test at line 165 (`"direct save-gate test"`) is also wrapped in `if (hasError)`. If `validateSpec` is lenient, this test is effectively a no-op.
**Fix:** Either confirm `validateSpec` does produce errors for dangling nav-edge refs and remove the `if (hasError)` guards (making the assertions unconditional), or add a fixture/mock that forces `validateSpec` to return an error diagnostic and assert `written === false` unconditionally.

### IN-05: `autosave-debounce.test.ts` does not test the `beforeExit` handler actually calling `flush()`

**File:** `tests/autosave-debounce.test.ts:150-172`
**Issue:** The `beforeExit handler` test only verifies that `process.on("beforeExit", ...)` and `process.off("beforeExit", ...)` were called — it does not verify that the registered handler actually calls `writeSpy`. The `beforeExitHandler` in `autosave.ts` calls `void flush()` (fire-and-forget). A test that triggers the registered handler would confirm the write actually executes.
**Fix:** After capturing the handler via `onSpy.mock.calls`, extract the registered callback and invoke it directly:
```ts
const [, handler] = beforeExitOnCalls[0];
await (handler as () => Promise<void>)();
expect(writeSpy).toHaveBeenCalledTimes(1);
```

---

_Reviewed: 2026-04-18_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
