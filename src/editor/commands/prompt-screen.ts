// src/editor/commands/prompt-screen.ts
// Side-effect action for `:prompt screen <id> <target>`.
// NOT a Command<T>. Wired as triggerPromptScreen() in RootCanvas (Plan 08-04).

import { assemblePrompt } from "../../emit/handoff/index.ts";
import type { Spec } from "../../model/index.ts";

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
