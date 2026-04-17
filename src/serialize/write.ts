// src/serialize/write.ts
// `writeSpecFile(path, spec, astHandle)` — Phase-2 public save entry.
//
// GUARANTEES (Plan 02-04 implements):
//   - D-31 save-gate: severity:error in validateSpec(spec) returns
//     { written: false, diagnostics } without touching disk.
//   - D-29 single-shot atomic write; debounce is Phase 4.
//   - NEVER throws on schema errors; only on unrecoverable IO.
//
// RELATED: atomic.ts (primitive), schema-inject.ts (first-save inject),
//          sigil.ts (re-emit), ../model/invariants.ts (gate source).
import type { Spec } from "../model/index.ts";
import type { AstHandle } from "./ast-handle.ts";
import type { Diagnostic } from "./diagnostics.ts";

export interface WriteResult {
  written: boolean;
  diagnostics: Diagnostic[];
}

export async function writeSpecFile(
  _path: string,
  _spec: Spec,
  _astHandle: AstHandle,
): Promise<WriteResult> {
  throw new Error("writeSpecFile: not yet implemented — see Plan 02-04");
}
