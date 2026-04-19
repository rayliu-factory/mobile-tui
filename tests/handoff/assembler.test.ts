// tests/handoff/assembler.test.ts
// Assembler internals: determinism, section ordering, and degradation behaviour.
// Implementations wired in Plan 08-02 — stubs here per Nyquist rule.

import { resolve } from "node:path";
import { describe, it } from "vitest";
// TODO(08-02): import { assemblePrompt } from "../../src/emit/handoff/assembler.ts";
// TODO(08-02): import type { AssembleResult } from "../../src/emit/handoff/assembler.ts";
import type { Spec } from "../../src/model/index.ts";
import { parseSpecFile } from "../../src/serialize/index.ts";

async function loadFixture(name: string): Promise<Spec> {
	const r = await parseSpecFile(resolve(`fixtures/${name}.spec.md`));
	if (!r.spec) throw new Error(`fixture ${name} failed to parse`);
	return r.spec;
}

describe("assembler internals", () => {
	it.todo(
		"assemblePrompt returns same output on two calls with same input (determinism)",
	);
	it.todo(
		"section order is Task → Screen Spec → Acceptance Criteria → Navigation Neighbors → Data Entities",
	);
	it.todo(
		"degrades neighbors to name-only when full prompt exceeds 2000 tokens",
	);
	it.todo(
		"degrades entities to name+type only when full prompt exceeds 2000 tokens",
	);
	it.todo(
		"never drops screen spec or acceptance criteria during degradation",
	);
	it.todo(
		"<!-- spec-props: {...} --> comment block is present in all targets",
	);
});
