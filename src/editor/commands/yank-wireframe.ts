// src/editor/commands/yank-wireframe.ts
// Side-effect action for `:yank wireframe <screen-id>`.
// Wired as triggerYankWireframe() in RootCanvas (Plan 08-04).
// Also registered as yankWireframeCommand in COMMANDS for palette discoverability (D-208).
//
// SECURITY:
//   T-8-03-clipboard: ASCII-baseline wireframe guaranteed by WIREFRAME-02;
//   renderSingleVariant(content) returns only | - + . chars.

import clipboardy from "clipboardy";
import { z } from "zod";
import { renderSingleVariant } from "../../emit/wireframe/index.ts";
import type { Spec } from "../../model/index.ts";
import type { Command } from "../types.ts";

export interface YankWireframeResult {
	ok: boolean;
	message: string;
}

/**
 * Render the content-variant wireframe for a screen and write it to the OS clipboard.
 *
 * Uses renderSingleVariant() (NOT render()) so only the base/content block is copied —
 * not all 4 variant blocks concatenated (RESEARCH Pitfall 6).
 */
export async function runYankWireframe(
	spec: Spec,
	screenId: string,
): Promise<YankWireframeResult> {
	// 1. Pure emit — content variant only (WIREFRAME-02: ASCII baseline guaranteed)
	let text: string;
	try {
		text = renderSingleVariant(spec, screenId, "content");
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		return { ok: false, message: `Screen not found: ${msg}` };
	}

	// 2. Side-effect: write to OS clipboard
	await clipboardy.write(text);
	return { ok: true, message: "Wireframe yanked ✓" };
}

// ---------------------------------------------------------------------------
// COMMANDS-compatible entry for palette discoverability (D-208).
// apply() fires the runner as a side effect — spec is not mutated.
// _onResult is wired by RootCanvas constructor to surface results on the
// status line via emitStatus (D-211).
// ---------------------------------------------------------------------------

const yankWireframeArgsSchema = z.object({
	screenId: z.string(),
});

export const yankWireframeCommand: Command<typeof yankWireframeArgsSchema> & {
	_onResult?: (r: { ok: boolean; message: string }) => void;
} = {
	name: "yank-wireframe",
	argsSchema: yankWireframeArgsSchema,
	apply(spec, _astHandle, args) {
		// Fire runner as side effect — result delivered via _onResult callback (D-211)
		void runYankWireframe(spec, args.screenId).then((result) => {
			yankWireframeCommand._onResult?.(result);
		});
		return { spec, inverseArgs: null }; // unchanged spec — no mutation
	},
	invert(spec, _astHandle, _inverseArgs) {
		return { spec }; // no-op — side effects cannot be undone
	},
	_onResult: undefined,
};
