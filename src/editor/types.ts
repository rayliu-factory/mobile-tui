// src/editor/types.ts
// Phase-4 editor store type contracts.
//
// SCOPE:
//   - Command<T> — per-command interface (argsSchema + apply + invert)
//   - Snapshot — subscriber payload ({ spec, diagnostics, dirty, lastWriteResult? })
//   - ApplyResult — return type of store.apply / store.undo / store.redo
//   - StoreState — return type of store.getState
//   - Store — the public editor store interface
//
// Per D-52: AstHandle is store-owned and opaque to shells.
// Per D-51: subscribers receive full spec + diagnostics on every commit.
// Per D-53: store scope is spec-only ({ spec, astHandle, diagnostics, dirty, undoStack, redoStack }).
//           No mode, wizardStep, or focus fields.
import type { z } from "zod";
import type { Spec } from "../model/index.ts";
import type { Diagnostic } from "../primitives/diagnostic.ts";
import type { AstHandle } from "../serialize/ast-handle.ts";
import type { WriteResult } from "../serialize/write.ts";

/**
 * Per-command interface (D-56). Each command file exports a `Command<T>` where
 * T is the command's `z.ZodObject` argsSchema.
 *
 * apply() mutates BOTH spec (pure value) AND astHandle.doc (via CST primitives)
 * per D-62. invert() must reverse both.
 */
// biome-ignore lint/suspicious/noExplicitAny: Generic interface requires any for ZodObject type parameter
export interface Command<T extends z.ZodObject<any>> {
  name: string;
  argsSchema: T;
  apply(spec: Spec, astHandle: AstHandle, args: z.infer<T>): { spec: Spec; inverseArgs: unknown };
  invert(spec: Spec, astHandle: AstHandle, inverseArgs: unknown): { spec: Spec };
}

/**
 * Payload delivered to every subscriber on each apply/undo/redo/flush.
 * Per D-51: full-value replacement; no patch/delta.
 * `lastWriteResult` is present after `flush()` — supports Phase-5 canvas
 * save indicator (CANVAS-04 per research §9.4).
 */
export interface Snapshot {
  spec: Spec;
  diagnostics: Diagnostic[];
  dirty: boolean;
  lastWriteResult?: WriteResult;
}

/**
 * Return type of store.apply / store.undo / store.redo.
 * `ok: false` if argsSchema.safeParse failed or command not found.
 */
export interface ApplyResult {
  spec: Spec;
  diagnostics: Diagnostic[];
  ok: boolean;
}

/**
 * Return type of store.getState — full internal state sans undo/redo stacks.
 * Per D-52: AstHandle is opaque to shells, but getState exposes it for internal
 * use (autosave, cli-edit). Shells only see spec via subscribe.
 */
export interface StoreState {
  spec: Spec;
  astHandle: AstHandle;
  diagnostics: Diagnostic[];
  dirty: boolean;
}

/**
 * The public editor store interface (D-50).
 * Hand-rolled signal; no external dep.
 */
export interface Store {
  /** Return current state snapshot. */
  getState(): StoreState;
  /**
   * Subscribe to state changes. Returns an unsubscribe function.
   * Subscribers receive the full Snapshot on every apply/undo/redo.
   * Per T-04-03: subscribers are iterated over a snapshot of the Set —
   * mutations during notification don't corrupt the in-flight iteration.
   */
  subscribe(fn: (s: Snapshot) => void): () => void;
  /**
   * Apply a named command with runtime args. Returns ApplyResult.
   * Per T-04-01: args are validated by argsSchema.safeParse before reaching command.apply.
   * Per T-04-04: if called during a subscriber notification, queued via queueMicrotask.
   */
  apply(commandName: string, args: unknown): Promise<ApplyResult>;
  /** Undo the last command. Returns null if the undo stack is empty. */
  undo(): Promise<ApplyResult | null>;
  /** Redo the last undone command. Returns null if the redo stack is empty. */
  redo(): Promise<ApplyResult | null>;
  /**
   * Cancel any pending debounce timer and write immediately.
   * Phase-9 session_shutdown + cli-edit main() use this explicitly per D-66.
   */
  flush(): Promise<WriteResult>;
}
