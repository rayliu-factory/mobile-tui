// src/editor/commands/extract-screen.ts
// Side-effect action for `:extract --screen <id>`.
// Wired as triggerExtractScreen() in RootCanvas (Plan 08-04).
// Also registered as extractScreenCommand in COMMANDS for palette discoverability (D-208).
//
// SECURITY:
//   T-8-01-path-traversal: screenId is sanitized to [a-z0-9_-] + basename().
//   Pattern mirrors emit-maestro.ts T-7-path-traversal mitigation.

import { mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { z } from "zod";
import { assemblePrompt } from "../../emit/handoff/index.ts";
import type { Spec } from "../../model/index.ts";
import type { Command } from "../types.ts";

export type ExtractTarget = "swiftui" | "compose" | "tests";

export interface ExtractScreenResult {
	ok: boolean;
	message: string;
	outPath?: string;
}

/**
 * Assemble an LLM prompt for a screen and write it to ./prompts/<id>-<target>.md
 * next to the spec file. Overwrites silently (dev tracks drift via git diff).
 *
 * Output: {specDir}/prompts/{sanitized-screenId}-{target}.md
 */
export async function runExtractScreen(
	spec: Spec,
	specFilePath: string,
	screenId: string,
	target: ExtractTarget,
): Promise<ExtractScreenResult> {
	// 1. Pure emit
	let prompt: string;
	try {
		prompt = assemblePrompt(spec, screenId, target);
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		return { ok: false, message: `Extract failed: ${msg}` };
	}

	// 2. Path construction with sanitization (T-8-01-path-traversal)
	// Step a: replace any char outside [a-z0-9_-] with underscore
	const sanitizedId = screenId.replace(/[^a-z0-9_-]/g, "_");
	// Step b: apply basename() to strip any remaining path separators (belt-and-suspenders)
	const safeName = basename(`${sanitizedId}-${target}`);
	const promptsDir = join(dirname(specFilePath), "prompts");
	const outPath = join(promptsDir, `${safeName}.md`);

	// 3. Write
	await mkdir(promptsDir, { recursive: true });
	await writeFile(outPath, prompt, "utf8");

	return {
		ok: true,
		message: `Prompted → ./prompts/${safeName}.md ✓`,
		outPath,
	};
}

// ---------------------------------------------------------------------------
// COMMANDS-compatible entry for palette discoverability (D-208).
// apply() fires the runner as a side effect — spec is not mutated.
// _onResult is wired by RootCanvas constructor to surface results on the
// status line via emitStatus (D-211).
// _specFilePath is set by RootCanvas constructor from store.getState().filePath
// so the runner receives the spec path without it needing to be in apply() args.
// ---------------------------------------------------------------------------

const extractScreenArgsSchema = z.object({
	screenId: z.string(),
	target: z.enum(["swiftui", "compose", "tests"]),
});

export const extractScreenCommand: Command<typeof extractScreenArgsSchema> & {
	_onResult?: (r: { ok: boolean; message: string }) => void;
	_specFilePath?: string;
} = {
	name: "extract-screen",
	argsSchema: extractScreenArgsSchema,
	apply(spec, _astHandle, args) {
		const filePath = extractScreenCommand._specFilePath ?? "";
		void runExtractScreen(spec, filePath, args.screenId, args.target).then((result) => {
			extractScreenCommand._onResult?.(result);
		});
		return { spec, inverseArgs: null };
	},
	invert(spec, _astHandle, _inverseArgs) {
		return { spec };
	},
	_onResult: undefined,
	_specFilePath: undefined,
};
