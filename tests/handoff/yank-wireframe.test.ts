// tests/handoff/yank-wireframe.test.ts
// HANDOFF-01: :yank wireframe copies ASCII-baseline wireframe to OS clipboard
// Implementations wired in Plan 08-03 — stubs here per Nyquist rule.

import { resolve } from "node:path";
import { describe, it } from "vitest";
// TODO(08-03): import { runYankWireframe } from "../../src/editor/commands/yank-wireframe.ts";
import type { Spec } from "../../src/model/index.ts";
import { parseSpecFile } from "../../src/serialize/index.ts";

async function loadFixture(name: string): Promise<Spec> {
	const r = await parseSpecFile(resolve(`fixtures/${name}.spec.md`));
	if (!r.spec) throw new Error(`fixture ${name} failed to parse`);
	return r.spec;
}

describe("HANDOFF-01 :yank wireframe", () => {
	it.todo("copies ASCII-baseline wireframe to clipboard (no Unicode glyphs)");
	it.todo(
		"clipboard content matches regex /^[|\\-+. \\x20-\\x7E\\n]*$/ (ASCII only)",
	);
	it.todo("throws / returns error for unknown screenId");
});
