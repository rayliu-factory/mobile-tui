// tests/handoff/yank-wireframe.test.ts
// HANDOFF-01: :yank wireframe copies ASCII-baseline wireframe to OS clipboard
// Implementations wired in Plan 08-03.

import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runYankWireframe } from "../../src/editor/commands/yank-wireframe.ts";
import type { Spec } from "../../src/model/index.ts";
import { parseSpecFile } from "../../src/serialize/index.ts";

vi.mock("clipboardy", () => ({
	default: {
		write: vi.fn().mockResolvedValue(undefined),
		read: vi.fn().mockResolvedValue(""),
	},
}));

import clipboardy from "clipboardy";

async function loadFixture(name: string): Promise<Spec> {
	const r = await parseSpecFile(resolve(`fixtures/${name}.spec.md`));
	if (!r.spec) throw new Error(`fixture ${name} failed to parse`);
	return r.spec;
}

describe("HANDOFF-01 :yank wireframe", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("copies ASCII-baseline wireframe to clipboard (no Unicode glyphs)", async () => {
		const spec = await loadFixture("habit-tracker");
		const firstScreenId = spec.screens[0]!.id;
		const result = await runYankWireframe(spec, firstScreenId);
		expect(result.ok).toBe(true);
		expect(clipboardy.write).toHaveBeenCalledOnce();
		const writtenText = (clipboardy.write as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
		expect(typeof writtenText).toBe("string");
		expect(writtenText.length).toBeGreaterThan(0);
	});

	it("clipboard content matches regex /^[|\\-+. \\x20-\\x7E\\n]*$/ (ASCII only)", async () => {
		const spec = await loadFixture("habit-tracker");
		const firstScreenId = spec.screens[0]!.id;
		await runYankWireframe(spec, firstScreenId);
		const writtenText = (clipboardy.write as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
		expect(writtenText).toMatch(/^[|\-+. \x20-\x7E\n]*$/);
	});

	it("returns error for unknown screenId", async () => {
		const spec = await loadFixture("habit-tracker");
		const result = await runYankWireframe(spec, "nonexistent_screen_xyz");
		expect(result.ok).toBe(false);
		expect(result.message).toMatch(/Screen not found/);
	});
});
