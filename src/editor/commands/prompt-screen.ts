// src/editor/commands/prompt-screen.ts
// Side-effect action for `:prompt screen <id> <target>`.
// Wired as triggerPromptScreen() in RootCanvas (Plan 08-04).
// Also registered as promptScreenCommand in COMMANDS for palette discoverability (D-208).

import { z } from "zod";
import { assemblePrompt } from "../../emit/handoff/index.ts";
import type { Spec } from "../../model/index.ts";
import type { Command } from "../types.ts";

export type PromptTarget = "swiftui" | "compose" | "tests";

export interface PromptScreenResult {
	ok: boolean;
	message: string;
	/** The assembled prompt string, available for display or further processing. */
	prompt?: string;
}

/**
 * Assemble a self-contained LLM prompt for a screen and return it via the result.
 * The prompt is ≤ 2000 BPE tokens (enforced by assemblePrompt's degradation logic).
 */
export async function runPromptScreen(
	spec: Spec,
	screenId: string,
	target: PromptTarget,
): Promise<PromptScreenResult> {
	let prompt: string;
	try {
		prompt = assemblePrompt(spec, screenId, target);
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		return { ok: false, message: `Prompt failed: ${msg}` };
	}
	return { ok: true, message: `Prompt ready (${target}) ✓`, prompt };
}

// ---------------------------------------------------------------------------
// COMMANDS-compatible entry for palette discoverability (D-208).
// apply() fires the runner as a side effect — spec is not mutated.
// _onResult is wired by RootCanvas constructor to surface results on the
// status line via emitStatus (D-211).
// ---------------------------------------------------------------------------

const promptScreenArgsSchema = z.object({
	screenId: z.string(),
	target: z.enum(["swiftui", "compose", "tests"]),
});

export const promptScreenCommand: Command<typeof promptScreenArgsSchema> & {
	_onResult?: (r: { ok: boolean; message: string }) => void;
} = {
	name: "prompt-screen",
	argsSchema: promptScreenArgsSchema,
	apply(spec, _astHandle, args) {
		void runPromptScreen(spec, args.screenId, args.target).then((result) => {
			promptScreenCommand._onResult?.(result);
		});
		return { spec, inverseArgs: null };
	},
	invert(spec, _astHandle, _inverseArgs) {
		return { spec };
	},
	_onResult: undefined,
};
