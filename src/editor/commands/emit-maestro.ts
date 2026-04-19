// src/editor/commands/emit-maestro.ts
// Side-effect action for `:emit maestro` — NOT a Command<T>.
//
// RATIONALE: emit-maestro does NOT mutate the spec and has no invert().
// It is wired as a special action in RootCanvas.handleInput (like Ctrl+Q for quit),
// not via store.apply(). See RESEARCH.md Pattern 4 and Pitfall 6.
//
// SECURITY:
//   T-7-shell-inject: execFileSync("maestro", args) — never exec("maestro " + args)
//   T-7-path-traversal: safeName = flow.name.replace(/[^a-z0-9_]/g, "_") + path.basename()
//   T-7-04-ansi: ANSI_SGR strip regex applied to maestro stderr before surfacing to canvas

import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { emitMaestroFlows } from "../../emit/maestro/index.ts";
import type { Spec } from "../../model/index.ts";
import type { Diagnostic } from "../../primitives/diagnostic.ts";

export interface EmitMaestroResult {
  ok: boolean;
  message: string; // for canvas status line (D-114)
  diagnostics: Diagnostic[];
}

// ANSI code stripper for maestro check-syntax stderr (RESEARCH Pitfall 5 / T-7-04-ansi)
// RegExp constructor required: regex literal would trigger noControlCharactersInRegex on \x1b
// biome-ignore lint/complexity/useRegexLiterals: must use constructor to avoid noControlCharactersInRegex
const ANSI_SGR = new RegExp("\x1b\\[[0-9;]*m", "g");

function runSyntaxCheck(filePath: string): Diagnostic | null {
  try {
    execFileSync("maestro", ["check-syntax", filePath], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    return null; // exit 0 = valid
  } catch (err: unknown) {
    const stderr = (err as { stderr?: Buffer }).stderr?.toString() ?? "";
    const clean = stderr.replace(ANSI_SGR, "").split("\n")[0] ?? "";
    return {
      code: "MAESTRO_SYNTAX_ERROR",
      severity: "error",
      path: "",
      message: `maestro check-syntax: ${clean.slice(0, 200)}`,
    };
  }
}

/**
 * Run the Maestro emitter: write .ios.yaml and .android.yaml files to ./flows/
 * next to the spec file, then optionally validate via `maestro check-syntax`.
 *
 * This is NOT a Command<T> — it has side effects (file writes, subprocess) and
 * does not mutate the spec. Wired as a special handleInput action in RootCanvas.
 *
 * @param spec       The current spec from store.getState().spec
 * @param specFilePath  Absolute path to the spec file (from store.getState().filePath)
 */
export async function runEmitMaestro(spec: Spec, specFilePath: string): Promise<EmitMaestroResult> {
  // 1. Pure emission (no IO)
  const result = emitMaestroFlows(spec);
  if (!result.ok) {
    return {
      ok: false,
      message: result.diagnostics[0]?.message ?? "emit failed",
      diagnostics: result.diagnostics,
    };
  }

  if (result.flows.length === 0) {
    return {
      ok: true,
      message: "Emitted 0 flow(s) → ./flows/",
      diagnostics: [],
    };
  }

  // 2. Write files to ./flows/ next to the spec
  const flowsDir = join(dirname(specFilePath), "flows");
  await mkdir(flowsDir, { recursive: true });

  for (const flow of result.flows) {
    // T-7-path-traversal: sanitize to [a-z0-9_] only, then apply basename to
    // strip any remaining path separators (belt-and-suspenders)
    const safeName = basename(flow.name.replace(/[^a-z0-9_]/g, "_"));
    const iosPath = join(flowsDir, `${safeName}.ios.yaml`);
    const androidPath = join(flowsDir, `${safeName}.android.yaml`);

    await writeFile(iosPath, flow.ios, "utf8");
    await writeFile(androidPath, flow.android, "utf8");

    // 3. MAESTRO_CLI=1 gate (MAESTRO-04): validate emitted files
    if (process.env.MAESTRO_CLI === "1") {
      const iosDiag = runSyntaxCheck(iosPath);
      if (iosDiag) return { ok: false, message: iosDiag.message, diagnostics: [iosDiag] };
      const androidDiag = runSyntaxCheck(androidPath);
      if (androidDiag)
        return { ok: false, message: androidDiag.message, diagnostics: [androidDiag] };
    }
  }

  return {
    ok: true,
    message: `Emitted ${result.flows.length} flow(s) → ./flows/`,
    diagnostics: [],
  };
}
