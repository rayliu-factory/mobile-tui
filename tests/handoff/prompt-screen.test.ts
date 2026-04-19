// tests/handoff/prompt-screen.test.ts
// HANDOFF-02: :prompt screen emits a token-bounded LLM-ready prompt to stdout/clipboard
// Implementations wired in Plan 08-03 — stubs here per Nyquist rule.

import { resolve } from "node:path";
import { describe, it } from "vitest";
// TODO(08-03): import { runPromptScreen } from "../../src/editor/commands/prompt-screen.ts";
// TODO(08-02): import { assemblePrompt } from "../../src/emit/handoff/assembler.ts";
import type { Spec } from "../../src/model/index.ts";
import { parseSpecFile } from "../../src/serialize/index.ts";

async function loadFixture(name: string): Promise<Spec> {
	const r = await parseSpecFile(resolve(`fixtures/${name}.spec.md`));
	if (!r.spec) throw new Error(`fixture ${name} failed to parse`);
	return r.spec;
}

describe("HANDOFF-02 :prompt screen", () => {
	it.todo("emits prompt under 2000 tokens measured by gpt-tokenizer");
	it.todo("screen spec section is never truncated");
	it.todo("tests target includes ## Actions & TestIDs section");
	it.todo(
		"swiftui and compose targets do not include ## Actions & TestIDs section",
	);
});
