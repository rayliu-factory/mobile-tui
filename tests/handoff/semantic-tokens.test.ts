// tests/handoff/semantic-tokens.test.ts
// HANDOFF-04: assembled prompt uses only semantic design tokens (no pixel values)
// Implementations wired in Plan 08-02 — stubs here per Nyquist rule.

import { resolve } from "node:path";
import { describe, it } from "vitest";
// TODO(08-02): import { SEMANTIC_TOKENS } from "../../src/emit/handoff/semantic-tokens.ts";
// TODO(08-02): import { assemblePrompt } from "../../src/emit/handoff/assembler.ts";
import type { Spec } from "../../src/model/index.ts";
import { parseSpecFile } from "../../src/serialize/index.ts";

async function loadFixture(name: string): Promise<Spec> {
	const r = await parseSpecFile(resolve(`fixtures/${name}.spec.md`));
	if (!r.spec) throw new Error(`fixture ${name} failed to parse`);
	return r.spec;
}

describe("HANDOFF-04 semantic tokens", () => {
	it.todo(
		"emitted prompt contains no pixel values matching /[0-9]+(?:px|pt|dp|rem|#[0-9a-fA-F]{3,6})/",
	);
	it.todo(
		"all prop values in <!-- spec-props: {...} --> comment are members of SEMANTIC_TOKENS",
	);
	it.todo(
		"SEMANTIC_TOKENS covers Button.variant, Text.style, Column.gap, Row.gap, Spacer.size, Column.align, Row.align",
	);
});
