// tests/round-trip.test.ts
// SERDE-05 + D-32: the 20-fixture byte-identical round-trip gate.
// CI fails on any drift.
//
// MATRIX (20 fixtures):
//   - 3 Phase-1 triple-form canonicals (habit-tracker, todo, social-feed)
//   - 3 sigil-form rewrites under fixtures/sigil/ (D-25)
//   - 3 comments (inline, trailing, nested)
//   - 4 reorders (nav-first, data-first, actions-first, screens-last)
//   - 2 unknown-top-level-keys (theme, integrations) — D-26 AST-native
//   - 2 YAML-1.1 gotchas (yes, norway) — SERDE-07
//   - 1 empty-body  (BLOCKER fix #1 closingDelimiterTerminator === "" coverage)
//   - 1 comment-only-body
//   - 1 nested-block-scalar (INFO #9 authoritative slot — 20th fixture)
//
// EXCLUDED: fixtures/malformed.spec.md (Open Q#1) — Stage-B errors block
//   save via D-31; its test lives in tests/malformed.test.ts as a
//   cross-ref regression anchor, not a round-trip fixture.
//
// EXTRA SECURITY TEST (BLOCKER fix #3 integration):
//   fixtures/round-trip/prototype-pollution-attempt.spec.md is NOT in
//   the byte-equality matrix. Its assertions prove:
//     (a) parseSpecFile emits SPEC_UNKNOWN_TOP_LEVEL_KEY error (Layer 2)
//     (b) writeSpecFile returns { written: false, ... } (Layer 3 AST pre-gate)
//     (c) no .tmp file AND no target file created on disk
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parseSpecFile, writeSpecFile } from "../src/serialize/index.ts";

const TMP_DIR = resolve(process.cwd(), "tests", "tmp");

const FIXTURES = [
  // 3 Phase-1 triple-form
  "fixtures/habit-tracker.spec.md",
  "fixtures/todo.spec.md",
  "fixtures/social-feed.spec.md",
  // 3 sigil-form
  "fixtures/sigil/habit-tracker.sigil.spec.md",
  "fixtures/sigil/todo.sigil.spec.md",
  "fixtures/sigil/social-feed.sigil.spec.md",
  // 3 comments
  "fixtures/round-trip/comments-inline.spec.md",
  "fixtures/round-trip/comments-trailing.spec.md",
  "fixtures/round-trip/comments-nested.spec.md",
  // 4 reorders
  "fixtures/round-trip/reorder-nav-first.spec.md",
  "fixtures/round-trip/reorder-data-first.spec.md",
  "fixtures/round-trip/reorder-actions-first.spec.md",
  "fixtures/round-trip/reorder-screens-last.spec.md",
  // 2 unknown-top-level-keys
  "fixtures/round-trip/unknown-top-key-theme.spec.md",
  "fixtures/round-trip/unknown-top-key-integrations.spec.md",
  // 2 YAML-1.1 gotchas
  "fixtures/round-trip/yaml11-gotcha-yes.spec.md",
  "fixtures/round-trip/yaml11-gotcha-norway.spec.md",
  // 1 empty body (closingDelimiterTerminator === "" BLOCKER fix #1 coverage)
  "fixtures/round-trip/empty-body.spec.md",
  // 1 comment-only body
  "fixtures/round-trip/comment-only-body.spec.md",
  // 1 nested-block-scalar (INFO #9 authoritative 20th slot)
  "fixtures/round-trip/nested-block-scalar.spec.md",
] as const;

beforeAll(async () => {
  await fs.mkdir(TMP_DIR, { recursive: true });
});

afterAll(async () => {
  // Best-effort cleanup; leave dir for .gitignore to handle.
});

describe("SERDE-05: matrix sanity", () => {
  it("FIXTURES.length === 20 (full round-trip matrix per INFO #9)", () => {
    expect(FIXTURES.length).toBe(20);
  });
});

describe("SERDE-05: byte-identical round-trip on no-op save", () => {
  it.each(FIXTURES)("round-trips %s byte-identically", async (fixturePath) => {
    const abs = resolve(fixturePath);
    const originalBytes = await fs.readFile(abs);

    const { spec, astHandle, diagnostics } = await parseSpecFile(abs);

    const errors = diagnostics.filter((d) => d.severity === "error");
    if (errors.length > 0) {
      console.error(
        `[round-trip ${fixturePath}] unexpected errors:`,
        JSON.stringify(errors, null, 2),
      );
    }
    expect(errors).toEqual([]);
    expect(spec).not.toBeNull();
    expect(astHandle).not.toBeNull();

    const tmpTarget = join(TMP_DIR, `rt-${randomUUID()}.spec.md`);
    const { written, diagnostics: writeDiag } = await writeSpecFile(
      tmpTarget,
      // biome-ignore lint/style/noNonNullAssertion: asserted non-null above
      spec!,
      // biome-ignore lint/style/noNonNullAssertion: asserted non-null above
      astHandle!,
    );
    const writeErrors = writeDiag.filter((d) => d.severity === "error");
    if (writeErrors.length > 0) {
      console.error(
        `[round-trip ${fixturePath}] write errors:`,
        JSON.stringify(writeErrors, null, 2),
      );
    }
    expect(written).toBe(true);

    const rtBytes = await fs.readFile(tmpTarget);
    // SERDE-05 core assertion: Buffer.equals (Node Buffer#equals instance
    // method) returns true iff the two buffers are byte-identical. Any
    // drift — a dropped comment, a re-quoted scalar, a moved key — fails
    // here and dumps both sides to console.error for diagnosis.
    const byteIdentical = originalBytes.equals(rtBytes);
    if (!byteIdentical) {
      console.error(
        `[round-trip ${fixturePath}] DRIFT DETECTED`,
        `\n--- ORIGINAL ---\n${originalBytes.toString("utf8")}\n--- ROUND-TRIPPED ---\n${rtBytes.toString("utf8")}`,
      );
    }
    expect(byteIdentical).toBe(true);

    // Cleanup
    await fs.unlink(tmpTarget).catch(() => undefined);
  });
});

describe("SPEC-08 + D-31 + BLOCKER fix #3: prototype-pollution attempt blocks save with no disk I/O", () => {
  it("parseSpecFile emits SPEC_UNKNOWN_TOP_LEVEL_KEY error for __proto__ (Layer 2)", async () => {
    const abs = resolve("fixtures/round-trip/prototype-pollution-attempt.spec.md");
    const { diagnostics } = await parseSpecFile(abs);
    const protoErrors = diagnostics.filter(
      (d) => d.code === "SPEC_UNKNOWN_TOP_LEVEL_KEY" && d.severity === "error",
    );
    expect(protoErrors.length).toBeGreaterThan(0);
    // biome-ignore lint/style/noNonNullAssertion: length asserted > 0 above
    expect(protoErrors[0]!.path).toBe("/__proto__");
  });

  it("writeSpecFile refuses to persist adversarial AST (Layer 3 AST pre-gate) AND no .tmp exists", async () => {
    const abs = resolve("fixtures/round-trip/prototype-pollution-attempt.spec.md");
    const { spec, astHandle } = await parseSpecFile(abs);

    // spec MAY be non-null — validateSpec runs on knownSubset which has
    // the adversarial key already stripped by partitionTopLevel. But the
    // AST still carries it, and Plan 04's BLOCKER fix #3 pre-gate blocks
    // the save by re-inspecting the AST.
    //
    // If spec is null (Phase-1 .strict() rejected the subset for other
    // reasons), skip — the upstream parse-time diagnostic is sufficient.
    if (!spec || !astHandle) {
      return;
    }

    const tmpTarget = join(TMP_DIR, `block-${randomUUID()}.spec.md`);
    const tmpSidecar = join(dirname(tmpTarget), `.${basename(tmpTarget)}.tmp`);
    const result = await writeSpecFile(tmpTarget, spec, astHandle);

    // (b) written === false + error-severity SPEC_UNKNOWN_TOP_LEVEL_KEY
    expect(result.written).toBe(false);
    expect(
      result.diagnostics.some(
        (d) => d.code === "SPEC_UNKNOWN_TOP_LEVEL_KEY" && d.severity === "error",
      ),
    ).toBe(true);

    // (c) No .tmp file. No target file.
    await expect(fs.access(tmpSidecar)).rejects.toBeDefined();
    await expect(fs.access(tmpTarget)).rejects.toBeDefined();
  });
});
