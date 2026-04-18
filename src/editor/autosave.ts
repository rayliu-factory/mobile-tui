// src/editor/autosave.ts
// 500ms trailing-edge debounce over writeSpecFile (D-65) + beforeExit
// safety net (D-66). Closes SERDE-06 debounce half per Phase 2 D-32.
//
// SCOPE:
//   - createAutosave(store, path, delayMs=500, deps?): subscribe-driven debounce loop
//   - flush(): cancels pending timer, writes immediately
//   - dispose(): removes process.on("beforeExit") and unsubscribes from store
//
// CONTRACT: After every store.subscribe() notification, a new 500ms trailing-edge
// timer replaces any prior one. The timer fires writeSpecFile with the CURRENT
// { spec, astHandle } from store.getState() at fire time (T-04-07).
//
// FAILURE MODES:
//   - beforeExit does NOT fire on process.exit() / uncaught exceptions / SIGINT.
//     cli-edit uses explicit `await store.flush()` as the primary guarantee (D-66).
//     beforeExit is the second safety net for single-shot scripts.
//   - concurrent writes: second timer firing mid-write produces 2 overlapping
//     atomicWrite invocations. Atomic-rename (Phase 2 D-29) makes this safe —
//     target either has old bytes or full new bytes, never partial.
//     Phase 9 wraps in withFileMutationQueue to serialize concurrent writes.
//   - writeSpecFile returns { written: false } when save-gate blocks (D-31):
//     autosave does not retry; the next apply() will schedule a new flush.
//
// THREATS:
//   T-04-06 (DoS — beforeExit handler not removed): dispose() calls
//     process.off("beforeExit", handler) to prevent memory leak.
//   T-04-07 (stale spec after rapid undo): store.getState() is called at
//     doWrite() fire time — always gets the current state, never a stale closure.
//
// RELATED: store.ts (subscriber), write.ts (writeSpecFile), atomic.ts (atomic rename)
import type { Spec } from "../model/index.ts";
import type { AstHandle } from "../serialize/ast-handle.ts";
import type { WriteResult } from "../serialize/write.ts";
import { writeSpecFile } from "../serialize/write.ts";
import type { Store } from "./types.ts";

/**
 * Public interface returned by createAutosave.
 */
export interface Autosave {
  /** Cancel any pending timer and write immediately. Returns the WriteResult. */
  flush(): Promise<WriteResult>;
  /**
   * Unsubscribe from the store, clear any pending timer, and remove the
   * beforeExit handler. Safe to call multiple times.
   */
  dispose(): void;
}

/**
 * Dependency injection surface for testing. The `write` function replaces
 * `writeSpecFile` — avoids vi.mock() on module exports (simpler, no mock
 * complexity). Production callers pass no deps (defaults to writeSpecFile).
 */
export interface AutosaveDeps {
  write?: (path: string, spec: Spec, astHandle: AstHandle) => Promise<WriteResult>;
}

/**
 * Create a trailing-edge debounce autosave module (D-65, D-66).
 *
 * @param store    - The editor store to subscribe to.
 * @param path     - Absolute path of the spec file to write.
 * @param delayMs  - Debounce delay in milliseconds. Default: 500.
 * @param deps     - Optional dep injection (for testing). Defaults to { write: writeSpecFile }.
 */
export function createAutosave(
  store: Store,
  path: string,
  delayMs = 500,
  deps: AutosaveDeps = {},
): Autosave {
  const doWriteFn = deps.write ?? writeSpecFile;
  let timer: NodeJS.Timeout | null = null;

  /**
   * Execute the write. Always reads store.getState() at call time (T-04-07).
   */
  async function doWrite(): Promise<WriteResult> {
    const { spec, astHandle } = store.getState();
    return doWriteFn(path, spec, astHandle);
  }

  /**
   * Schedule a trailing-edge write. Replaces any existing pending timer
   * (coalescing: only the last apply() in a burst triggers a write).
   */
  function schedule(): void {
    if (timer !== null) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = null;
      void doWrite();
    }, delayMs);
  }

  /**
   * Cancel any pending timer and write immediately.
   */
  async function flush(): Promise<WriteResult> {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    return doWrite();
  }

  // Register beforeExit safety net (D-66). NOT fired on process.exit() / SIGINT.
  const beforeExitHandler = (): void => {
    void flush();
  };
  process.on("beforeExit", beforeExitHandler);

  // Subscribe to store — schedule on every notify tick
  const unsubscribe = store.subscribe(() => schedule());

  return {
    flush,
    dispose(): void {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      unsubscribe();
      process.off("beforeExit", beforeExitHandler);
    },
  };
}
