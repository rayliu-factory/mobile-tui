// src/editor/index.ts — public barrel for the L5 Editor layer.
//
// Consumers:
//   - scripts/cli-edit.ts (argv dispatch — imports createStore, COMMANDS, COMMAND_NAMES)
//   - Phase-5 canvas (TUI command palette — imports COMMANDS, COMMAND_NAMES, subscribeDiagnostics)
//   - Phase-6 wizard (wizard step applicators — imports createStore, createAutosave)
//   - Phase-9 pi extension (extension host integration — imports all)
//
// Barrel follows the EXPLICIT-NAMED pattern per src/serialize/index.ts and
// src/model/index.ts (NOT `export *`), so adding a new public name is a
// deliberate edit here rather than an implicit broadening of the surface area.
//
// Internal helpers (pushUndo, clearRedo, the store's private state, etc.) are
// intentionally NOT re-exported — co-located tests import them directly from
// leaf modules.
export { type Autosave, createAutosave } from "./autosave.ts";
export { COMMAND_NAMES, COMMANDS, type CommandName } from "./commands/index.ts";
export { EDITOR_CODES, type EditorCode, subscribeDiagnostics } from "./diagnostics.ts";
export { createStore } from "./store.ts";
export type { ApplyResult, Command, Snapshot, Store, StoreState } from "./types.ts";
export type { UndoEntry } from "./undo.ts";
