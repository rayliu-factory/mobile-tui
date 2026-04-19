// tests/handoff/extract-screen.test.ts
// HANDOFF-03: :extract screen writes prompt to ./prompts/<screenId>-<target>.md
// Implementations wired in Plan 08-03 — stubs here per Nyquist rule.

import { resolve } from "node:path";
import { describe, it } from "vitest";
// TODO(08-03): import { runExtractScreen } from "../../src/editor/commands/extract-screen.ts";
import type { Spec } from "../../src/model/index.ts";
import { parseSpecFile } from "../../src/serialize/index.ts";

async function loadFixture(name: string): Promise<Spec> {
	const r = await parseSpecFile(resolve(`fixtures/${name}.spec.md`));
	if (!r.spec) throw new Error(`fixture ${name} failed to parse`);
	return r.spec;
}

describe("HANDOFF-03 :extract screen", () => {
	it.todo(
		"writes file to ./prompts/<screenId>-<target>.md next to spec",
	);
	it.todo("output file is valid Markdown (starts with ## Task)");
	it.todo(
		"sanitizes screenId with /[^a-z0-9_-]/g replacement before file write",
	);
	it.todo("overwrites existing file silently");
});
