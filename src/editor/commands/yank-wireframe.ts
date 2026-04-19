// src/editor/commands/yank-wireframe.ts
// Side-effect action for `:yank wireframe <screen-id>`.
// NOT a Command<T> — has no apply()/invert() and does not mutate the spec.
// Wired as triggerYankWireframe() in RootCanvas (Plan 08-04).
//
// SECURITY:
//   T-8-03-clipboard: ASCII-baseline wireframe guaranteed by WIREFRAME-02;
//   renderSingleVariant(content) returns only | - + . chars.

import clipboardy from "clipboardy";
import { renderSingleVariant } from "../../emit/wireframe/index.ts";
import type { Spec } from "../../model/index.ts";

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
