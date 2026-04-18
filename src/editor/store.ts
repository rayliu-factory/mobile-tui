// src/editor/store.ts
// `createStore(initial, commands)` — Phase-4 hand-rolled signal store (D-50).
//
// GUARANTEES:
//   - NEVER throws on command-apply errors; all diagnostics returned in
//     ApplyResult and emitted to subscribers.
//   - Subscribers receive the full new Spec + diagnostics on every commit (D-51).
//   - AstHandle is store-owned and opaque to shells (D-52).
//   - Store scope is spec-only: { spec, astHandle, diagnostics, dirty,
//     undoStack, redoStack }. No mode, wizardStep, or focus fields (D-53).
//
// PIPELINE (apply — D-50 + D-57 + D-62 + research §1 + §5):
//   1. Re-entrancy guard: if notifying, queue via queueMicrotask (Option B).
//   2. Look up commandName in commands registry; return EDITOR_COMMAND_NOT_FOUND if missing.
//   3. argsSchema.safeParse(args); return EDITOR_COMMAND_ARG_INVALID per issue on fail.
//   4. command.apply(spec, astHandle, parsedArgs) → { spec: newSpec, inverseArgs }
//      NOTE: apply() MUST mutate astHandle.doc too (D-62).
//   5. validateSpec(newSpec) — does NOT block apply; save-gate (D-31) handles that.
//   6. pushUndo(undoStack, entry); clearRedo(redoStack) — D-64.
//   7. spec = newSpec; diagnostics = newDiag; dirty = true.
//   8. notify(snapshot) — iterate [...subscribers] snapshot (T-04-03).
//   9. Return { ok: true, spec, diagnostics }.
//
// THREATS:
//   T-04-01 (args tampering): argsSchema.safeParse(args) before command.apply.
//   T-04-02 (DoS via undo overflow): pushUndo enforces 200-cap via shift().
//   T-04-03 (subscriber mutation during notify): iterate [...subscribers] snapshot.
//   T-04-04 (re-entrant apply during notify): notifying flag + queueMicrotask.
import type { z } from "zod";
import type { Spec } from "../model/index.ts";
import { validateSpec } from "../model/index.ts";
import type { Diagnostic } from "../primitives/diagnostic.ts";
import { error } from "../primitives/diagnostic.ts";
import type { JsonPointer } from "../primitives/path.ts";
import type { AstHandle } from "../serialize/ast-handle.ts";
import type { WriteResult } from "../serialize/write.ts";
import { writeSpecFile } from "../serialize/write.ts";
import { COMMANDS } from "./commands/index.ts";
import { EDITOR_CODES } from "./diagnostics.ts";
import type { ApplyResult, Command, Snapshot, Store, StoreState } from "./types.ts";
import type { UndoEntry } from "./undo.ts";
import { clearRedo, pushUndo } from "./undo.ts";

// biome-ignore lint/suspicious/noExplicitAny: command registry uses any for ZodObject type parameter
type AnyCommand = Command<z.ZodObject<any>>;
type CommandRegistry = Record<string, AnyCommand>;

/**
 * Create a reactive editor store (D-50).
 *
 * @param initial - Initial { spec, astHandle, filePath } loaded via parseSpecFile.
 * @param commands - Command registry (keyed by command name). Defaults to COMMANDS barrel.
 *   Tests may inject a partial registry for isolation.
 */
export function createStore(
  initial: { spec: Spec; astHandle: AstHandle; filePath: string },
  commands: CommandRegistry = COMMANDS,
): Store {
  // ── Internal closure state (D-53) ──────────────────────────────────────
  let spec = initial.spec;
  const astHandle = initial.astHandle;
  const filePath = initial.filePath;
  let diagnostics: Diagnostic[] = [];
  let dirty = false;
  let lastWriteResult: WriteResult | undefined;

  const undoStack: UndoEntry[] = [];
  const redoStack: UndoEntry[] = [];

  // Subscriber set (D-50). T-04-03: notify() iterates a snapshot.
  const subscribers = new Set<(s: Snapshot) => void>();

  // Re-entrancy guard (T-04-04, research §5 Option B).
  let notifying = false;

  // ── Internal helpers ────────────────────────────────────────────────────

  /**
   * Iterate a SNAPSHOT of the subscriber set (T-04-03: mid-notification
   * mutations don't corrupt in-flight iteration). Swallow per-subscriber errors
   * so one bad subscriber never blocks others.
   */
  function notify(snapshot: Snapshot): void {
    notifying = true;
    const listeners = [...subscribers]; // snapshot
    for (const fn of listeners) {
      try {
        fn(snapshot);
      } catch {
        // Per-subscriber failure MUST NOT affect other subscribers.
        // Subscribers that want error reporting can wrap themselves.
      }
    }
    notifying = false;
  }

  function currentSnapshot(): Snapshot {
    return { spec, diagnostics, dirty, lastWriteResult };
  }

  /**
   * Core apply implementation. Separated so it can be called both directly
   * and via queueMicrotask for re-entrancy queuing (Option B).
   */
  async function applyImpl(
    commandName: string,
    args: unknown,
    resolve: (result: ApplyResult) => void,
  ): Promise<void> {
    // Step 2: look up command
    const command = commands[commandName];
    if (!command) {
      const diag: Diagnostic[] = [
        error(
          EDITOR_CODES.EDITOR_COMMAND_NOT_FOUND,
          "" as JsonPointer,
          `Unknown command: ${commandName}`,
        ),
      ];
      resolve({ ok: false, spec, diagnostics: diag });
      return;
    }

    // Step 3: validate args via Zod
    const parsed = command.argsSchema.safeParse(args);
    if (!parsed.success) {
      const diag: Diagnostic[] = parsed.error.issues.map((issue) => {
        const path =
          issue.path.length > 0 ? (`/${issue.path.join("/")}` as JsonPointer) : ("" as JsonPointer);
        return error(EDITOR_CODES.EDITOR_COMMAND_ARG_INVALID, path, issue.message);
      });
      resolve({ ok: false, spec, diagnostics: diag });
      return;
    }

    // Step 4: apply command (mutates spec + astHandle.doc per D-62)
    const {
      spec: newSpec,
      inverseArgs,
      diagnostics: cmdDiag,
    } = command.apply(spec, astHandle, parsed.data);

    // Step 5: validate new spec (does NOT block apply — only save-gate blocks)
    // Merge command-level diagnostics (e.g. EDITOR_REF_CASCADE_INCOMPLETE) with
    // validateSpec results so callers see the full picture in one list.
    const { diagnostics: specDiag } = validateSpec(newSpec);
    const newDiag = [...(cmdDiag ?? []), ...specDiag];

    // Step 6: undo/redo stack discipline (D-64)
    pushUndo(undoStack, { commandName, args, inverseArgs });
    clearRedo(redoStack);

    // Step 7: update state
    spec = newSpec;
    diagnostics = newDiag;
    dirty = true;

    // Step 8: notify subscribers (T-04-03: snapshot the set inside notify())
    notify(currentSnapshot());

    // Step 9: return result
    resolve({ ok: true, spec, diagnostics });
  }

  /**
   * Core invert/redo implementation.
   */
  async function invertImpl(
    entry: UndoEntry,
    pushToStack: UndoEntry[],
    resolve: (result: ApplyResult) => void,
  ): Promise<void> {
    const command = commands[entry.commandName];
    if (!command) {
      // Command was removed from registry after being applied — can't invert.
      resolve({
        ok: false,
        spec,
        diagnostics: [
          error(
            EDITOR_CODES.EDITOR_COMMAND_NOT_FOUND,
            "" as JsonPointer,
            `Cannot invert: command not found: ${entry.commandName}`,
          ),
        ],
      });
      return;
    }

    const { spec: newSpec } = command.invert(spec, astHandle, entry.inverseArgs);
    const { diagnostics: newDiag } = validateSpec(newSpec);

    pushToStack.push(entry);

    spec = newSpec;
    diagnostics = newDiag;
    dirty = true;

    notify(currentSnapshot());
    resolve({ ok: true, spec, diagnostics });
  }

  // ── Public Store interface ─────────────────────────────────────────────

  const store: Store = {
    getState(): StoreState {
      return { spec, astHandle, diagnostics, dirty };
    },

    subscribe(fn: (s: Snapshot) => void): () => void {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },

    apply(commandName: string, args: unknown): Promise<ApplyResult> {
      return new Promise((resolve) => {
        // T-04-04: if called during notification, queue to next microtask
        if (notifying) {
          queueMicrotask(() => {
            void applyImpl(commandName, args, resolve);
          });
        } else {
          void applyImpl(commandName, args, resolve);
        }
      });
    },

    async undo(): Promise<ApplyResult | null> {
      const entry = undoStack.pop();
      if (!entry) return null;

      return new Promise((resolve) => {
        void invertImpl(entry, redoStack, resolve);
      });
    },

    async redo(): Promise<ApplyResult | null> {
      const entry = redoStack.pop();
      if (!entry) return null;

      const command = commands[entry.commandName];
      if (!command) {
        return {
          ok: false,
          spec,
          diagnostics: [
            error(
              EDITOR_CODES.EDITOR_COMMAND_NOT_FOUND,
              "" as JsonPointer,
              `Cannot redo: command not found: ${entry.commandName}`,
            ),
          ],
        };
      }

      // Re-apply original args for redo
      const parsed = command.argsSchema.safeParse(entry.args);
      if (!parsed.success) {
        return { ok: false, spec, diagnostics: [] };
      }

      return new Promise((resolve) => {
        void applyImpl(entry.commandName, entry.args, resolve);
      });
    },

    async flush(): Promise<WriteResult> {
      const result = await writeSpecFile(filePath, spec, astHandle);
      lastWriteResult = result;
      if (result.written) {
        dirty = false;
      }
      notify(currentSnapshot());
      return result;
    },
  };

  return store;
}
