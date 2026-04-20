---
phase: 260420-gqk
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/extension.ts
autonomous: true
requirements:
  - WIZARD-01
  - PI-04
  - PI-06
  - WIZARD-05
must_haves:
  truths:
    - "/spec command launches wizard on a project with no SPEC.md (no ENOENT error)"
    - "Graduating wizard → canvas writes session with mode=canvas and live stepCursor"
    - "store.flush() writes through withFileMutationQueue, not bypassing it"
  artifacts:
    - path: "src/extension.ts"
      provides: "All three integration fixes applied"
      contains: "createSeedSpec"
  key_links:
    - from: "src/extension.ts wizard branch"
      to: "src/wizard/seed-spec.ts"
      via: "createSeedSpec() import + call on ENOENT"
    - from: "src/extension.ts onGraduate"
      to: "src/session.ts writeSession"
      via: "writeSession called with root.getStepCursor() before done(true)"
    - from: "src/extension.ts createStore call"
      to: "src/editor/store.ts deps.withMutationQueue"
      via: "withFileMutationQueue passed as third-arg dep"
---

<objective>
Fix three broken integration points in src/extension.ts:
  1. BROKEN-1 (WIZARD-01): New project wizard crashes with ENOENT because parseSpecFile is called before any SPEC.md exists.
  2. BROKEN-2 (PI-06, WIZARD-05): Wizard→canvas graduation fires done(true) without persisting session; sessionState helper reads stale wizardStep from startup session.
  3. MISSING-1 (PI-04): createStore is constructed without withFileMutationQueue, so store.flush() writes outside the mutation queue.

Purpose: Make the extension actually runnable for new projects and correct per the PI/WIZARD requirement IDs.
Output: Corrected src/extension.ts.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@src/extension.ts
@src/wizard/seed-spec.ts
@src/session.ts
@src/wizard/root.ts
@src/editor/store.ts
@src/serialize/write.ts
</context>

<interfaces>
<!-- Key signatures extracted from codebase. Use these directly — no exploration needed. -->

From src/wizard/seed-spec.ts:
```typescript
export function createSeedSpec(): Spec
// Returns a fresh minimal valid Spec. Call on ENOENT to bootstrap a new project.
```

From src/serialize/write.ts:
```typescript
export async function writeSpecFile(
  path: string,
  spec: Spec,
  astHandle: AstHandle,
): Promise<WriteResult>
```

From src/editor/store.ts — createStore third argument:
```typescript
export function createStore(
  initial: { spec: Spec; astHandle: AstHandle; filePath: string },
  commands: CommandRegistry = COMMANDS,
  deps: { withMutationQueue?: (absPath: string, fn: () => Promise<void>) => Promise<void> } = {},
): Store
// deps.withMutationQueue is the injection point. Pass withFileMutationQueue here.
```

From src/session.ts:
```typescript
export async function writeSession(cwd: string, state: SessionState): Promise<void>
export interface SessionState {
  specPath: string;
  mode: "wizard" | "canvas";
  wizardStep: number;
  focusedScreenIndex: number;
  focusedPane: "screens" | "inspector" | "preview";
}
```

From src/wizard/root.ts:
```typescript
// stepCursor is private. Access via:
getStepCursor(): number   // returns current 0-based step index
// onGraduate is set by extension.ts after construction — the callback that fires Ctrl+G
onGraduate?: () => void
```
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Fix BROKEN-1 — seed SPEC.md on ENOENT in wizard startMode</name>
  <files>src/extension.ts</files>
  <action>
Add import for `createSeedSpec` from `"./wizard/seed-spec.ts"` at the top of the file alongside existing imports.

Change the `parseSpecFile` block (currently lines ~72-83) to handle ENOENT differently when `startMode === "wizard"`.

Current behavior: any error from `parseSpecFile` shows a "cannot open spec" notification and returns.

New behavior:
1. Wrap `parseSpecFile` in a try/catch that distinguishes ENOENT from other errors.
2. If the error is ENOENT (`err instanceof Error && (err as NodeJS.ErrnoException).code === "ENOENT"`) AND `startMode === "wizard"`:
   - Write a minimal seed file to disk at `absSpecPath` using `node:fs/promises` `writeFile` (already imported as `stat` — add `writeFile` to the import).
   - The seed file content is a minimal YAML frontmatter string. Use `import YAML from "yaml"` is NOT available here — instead, write a static template string. The exact content is:
     ```
     ---\nschema: mobile-tui/1\n\nscreens:\n  - id: placeholder\n    title: TODO\n    kind: regular\n    variants:\n      content:\n        kind: content\n        tree: []\n      empty: null\n      loading: null\n      error: null\n\nactions: {}\n\ndata:\n  entities: []\n\nnavigation:\n  root: placeholder\n  edges: []\n---\n
     ```
   - After writing the seed file to disk, call `parseSpecFile(absSpecPath)` again to get the proper `ParseResult` with `astHandle`. Assign to `parseResult`.
   - NOTE: this is one parse (on the freshly written seed), not two — do not try to avoid this re-parse; the seed template write + single parse is the correct approach.
3. If the error is ENOENT but `startMode === "canvas"` (existing SPEC.md was deleted mid-session), fall through to the existing error notification behavior.
4. If the error is NOT ENOENT, fall through to the existing "cannot open spec" notification.

After the try/catch block, the null-check `if (!parseResult.spec || !parseResult.astHandle)` remains unchanged.

Do NOT import `yaml` for this task — use a static template string as the seed file content.
  </action>
  <verify>
    <automated>cd /Users/rayliu/dev/mobile-tui && npx tsc --noEmit 2>&1 | head -40</automated>
  </verify>
  <done>
    - `createSeedSpec` is imported in extension.ts (even if unused by the template-string approach, keep the import for documentation clarity — or remove it if unused after implementation; tsc decides).
    - ENOENT path in wizard startMode writes seed file + re-parses without showing error notification.
    - ENOENT path in canvas startMode still shows error notification.
    - Non-ENOENT errors still show error notification.
    - `npx tsc --noEmit` passes.
  </done>
</task>

<task type="auto">
  <name>Task 2: Fix BROKEN-2 — persist session on graduation; fix stale wizardStep</name>
  <files>src/extension.ts</files>
  <action>
Two sub-fixes in the wizard branch of the routing loop (lines ~120–139):

**Sub-fix A — writeSession on graduation:**
The `onGraduate` callback currently just calls `done(true)`. Change it to an `async` closure that:
1. Calls `await autosave.flush()` (matches onQuit pattern for safety).
2. Builds the session state with `mode: "canvas"` and the live step from the root component.
3. Calls `await writeSession(ctx.cwd, ...)`.
4. Then calls `done(true)`.

The issue is that `root` is not accessible inside the callback until after construction. The `ctx.ui.custom` factory receives a `(tui, theme, _kb, done)` function that returns a Component. After `const root = new WizardRoot(...)`, set:

```typescript
root.onGraduate = async () => {
  const liveStep = root.getStepCursor();
  await autosave.flush();
  await writeSession(ctx.cwd, {
    specPath: "./SPEC.md",
    mode: "canvas",
    wizardStep: liveStep,
    focusedScreenIndex: session?.focusedScreenIndex ?? 0,
    focusedPane: (session?.focusedPane ?? "screens") as "screens" | "inspector" | "preview",
  });
  done(true);
};
```

Note: `done` is called AFTER flush and writeSession — consistent with T-09-03-01.

**Sub-fix B — fix stale wizardStep in sessionState helper:**
The `sessionState` helper at line ~108 reads `session?.wizardStep ?? 0`. This is correct for the onQuit path in wizard mode where we want to persist the current step. However, the helper is currently used only in onQuit paths and the graduation path is now handled inline (Sub-fix A above), so no further change is needed to `sessionState` itself.

BUT: verify the wizard onQuit path also uses a live step. Currently it calls `sessionState("wizard")` which reads `session?.wizardStep ?? 0` — the stale value. Fix this:

Replace the wizard `onQuit` with:
```typescript
root.onQuit = async () => {
  await autosave.flush();
  await writeSession(ctx.cwd, {
    specPath: "./SPEC.md",
    mode: "wizard",
    wizardStep: root.getStepCursor(),
    focusedScreenIndex: session?.focusedScreenIndex ?? 0,
    focusedPane: (session?.focusedPane ?? "screens") as "screens" | "inspector" | "preview",
  });
  done(false);
};
```

After these changes, the `sessionState` helper function (lines ~108–114) is no longer used at all. Remove it to avoid dead code — but first verify it is not called anywhere else in the canvas onQuit path. The canvas onQuit currently calls `sessionState("canvas")` — update it too:

```typescript
root.onQuit = async () => {
  await autosave.flush();
  await writeSession(ctx.cwd, {
    specPath: "./SPEC.md",
    mode: "canvas",
    wizardStep: session?.wizardStep ?? 0,
    focusedScreenIndex: session?.focusedScreenIndex ?? 0,
    focusedPane: (session?.focusedPane ?? "screens") as "screens" | "inspector" | "preview",
  });
  done(undefined);
};
```

Once all three onQuit/onGraduate paths are inlined, delete the `sessionState` helper function entirely.
  </action>
  <verify>
    <automated>cd /Users/rayliu/dev/mobile-tui && npx tsc --noEmit 2>&1 | head -40</automated>
  </verify>
  <done>
    - `onGraduate` calls flush + writeSession(mode: "canvas", wizardStep: root.getStepCursor()) before done(true).
    - Wizard `onQuit` uses root.getStepCursor() for wizardStep (not stale session value).
    - Canvas `onQuit` is functionally equivalent to before (uses session values for canvas-specific fields).
    - `sessionState` helper is removed.
    - `npx tsc --noEmit` passes.
  </done>
</task>

<task type="auto">
  <name>Task 3: Fix MISSING-1 — wire withFileMutationQueue into createStore</name>
  <files>src/extension.ts</files>
  <action>
`createStore` already accepts a `deps.withMutationQueue` parameter (third argument). It is currently called without this argument:

```typescript
// Current (lines ~93–97):
const store = createStore({
  spec: parseResult.spec,
  astHandle: parseResult.astHandle,
  filePath: absSpecPath,
});
```

Change to pass `withFileMutationQueue` as the mutation queue dep:

```typescript
const store = createStore(
  {
    spec: parseResult.spec,
    astHandle: parseResult.astHandle,
    filePath: absSpecPath,
  },
  undefined, // use default COMMANDS registry
  { withMutationQueue: (absPath, fn) => withFileMutationQueue(absPath, fn) },
);
```

`withFileMutationQueue` is already imported at line 21 of extension.ts:
```typescript
import { withFileMutationQueue } from "@mariozechner/pi-coding-agent";
```

The type of `withFileMutationQueue` from pi is `(path: string, fn: () => Promise<void>) => Promise<void>` which matches the `deps.withMutationQueue` signature exactly. The lambda wrapper `(absPath, fn) => withFileMutationQueue(absPath, fn)` avoids any potential `this`-binding issues.

No other files need changing — store.ts already supports this injection point at line 58–60.
  </action>
  <verify>
    <automated>cd /Users/rayliu/dev/mobile-tui && npx tsc --noEmit 2>&1 | head -40 && npx vitest run --reporter=verbose 2>&1 | tail -30</automated>
  </verify>
  <done>
    - `createStore` call passes `{ withMutationQueue: ... }` as third argument.
    - `withFileMutationQueue` is used (no unused-import warning).
    - `npx tsc --noEmit` passes.
    - Vitest test suite passes (no regressions in store or serialization tests).
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| wizard seed write | Writing a static string to disk — no user input, no injection vector |
| session JSON write | SessionState fields are all literal strings/numbers from internal state, not user-controlled |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-qk-01 | Tampering | seed file write path | accept | absSpecPath is resolve(ctx.cwd, "SPEC.md") — already validated as within cwd by the stat() check earlier in the handler |
| T-qk-02 | Denial of Service | writeFile seed + parseSpecFile in ENOENT path | accept | Adds one extra disk write on first run only; not a hot path |
| T-qk-03 | Information Disclosure | session.json wizardStep | accept | session.json is already gitignored (ensureGitignore); no sensitive data in step cursor integer |
</threat_model>

<verification>
After all three tasks:

1. `npx tsc --noEmit` — zero type errors
2. `npx vitest run` — all existing tests pass (no regressions in store, serialize, or session tests)
3. Manual smoke test (if pi is available): run `/spec` in a project directory with no SPEC.md — wizard should open, not error
</verification>

<success_criteria>
- BROKEN-1: ENOENT on missing SPEC.md is caught in wizard-mode path; seed file is written to disk; `parseSpecFile` succeeds on the seed; wizard opens.
- BROKEN-2: Graduating wizard calls `flush` + `writeSession(mode: "canvas", wizardStep: root.getStepCursor())` before `done(true)`. Wizard and canvas `onQuit` use live step values.
- MISSING-1: `store.flush()` routes through `withFileMutationQueue` via the injected dep. The autosave write path (already using `withFileMutationQueue`) and the store flush path now both coordinate through the queue.
- `sessionState` helper dead code removed.
- TypeScript compiles clean. Vitest passes.
</success_criteria>

<output>
After completion, create `.planning/quick/260420-gqk-fix-broken-integration-flows-in-extensio/260420-gqk-SUMMARY.md`
</output>
