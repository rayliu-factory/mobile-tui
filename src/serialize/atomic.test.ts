// src/serialize/atomic.test.ts
// Unit tests for the POSIX atomic-write primitive (D-29, D-30, D-32).
//
// Covers:
//   - happy-path atomic rename (writeFile .tmp → rename to target)
//   - fixed `.{basename}.tmp` temp-path convention (D-30)
//   - writeFile failure cleans up partial .tmp + re-throws
//   - rename failure AFTER writeFile leaves .tmp on disk (D-30 orphan branch)
//   - simulated-crash invariant: existing target bytes preserved on rename
//     failure (D-32 observable: pre-existing target bytes == post-failure bytes)
//   - detectOrphanTmp returns path when present, null otherwise
//
// THREAT T-02-PartialWrite: vi.spyOn(fs, "rename") simulates a crash after
// the writeFile syscall succeeded. We cannot actually crash the process
// mid-syscall, so we assert via the observable: the target file either has
// OLD bytes (pre-write) or FULL NEW bytes — never partial.
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { atomicWrite, detectOrphanTmp } from "./atomic.ts";

const TMP_DIR = join(process.cwd(), "tests", "tmp");
let sandbox = "";

beforeEach(async () => {
  await fs.mkdir(TMP_DIR, { recursive: true });
  sandbox = join(TMP_DIR, randomUUID());
  await fs.mkdir(sandbox, { recursive: true });
});

afterEach(async () => {
  vi.restoreAllMocks();
  // Best-effort cleanup; missing dir is fine.
  await fs.rm(sandbox, { recursive: true, force: true }).catch(() => undefined);
});

describe("atomic.ts — atomicWrite happy path", () => {
  it("writes via .tmp and renames to target", async () => {
    const target = join(sandbox, "habit-tracker.spec.md");
    const result = await atomicWrite(target, "hello world\n");
    expect(result).toEqual({ written: true, tmpOrphan: null });
    expect(await fs.readFile(target, "utf8")).toBe("hello world\n");
    // Tmp should no longer exist (rename consumed it).
    const tmpPath = join(sandbox, ".habit-tracker.spec.md.tmp");
    await expect(fs.access(tmpPath)).rejects.toBeDefined();
  });

  it("temp path uses .{basename}.tmp fixed suffix (D-30)", async () => {
    const target = join(sandbox, "test.spec.md");
    // Spy on rename so we can observe the source path.
    const renameSpy = vi.spyOn(fs, "rename");
    await atomicWrite(target, "x");
    expect(renameSpy).toHaveBeenCalled();
    const firstCall = renameSpy.mock.calls[0];
    if (!firstCall) throw new Error("rename was not called");
    const [from, to] = firstCall;
    expect(String(from)).toBe(join(sandbox, ".test.spec.md.tmp"));
    expect(String(to)).toBe(target);
  });
});

describe("atomic.ts — atomicWrite failure modes", () => {
  it("cleans up tmp on writeFile failure and re-throws", async () => {
    const target = join(sandbox, "fail-write.spec.md");
    const writeSpy = vi
      .spyOn(fs, "writeFile")
      .mockRejectedValueOnce(Object.assign(new Error("ENOSPC"), { code: "ENOSPC" }));
    await expect(atomicWrite(target, "x")).rejects.toThrow("ENOSPC");
    expect(writeSpy).toHaveBeenCalledTimes(1);
    // No target, no tmp.
    await expect(fs.access(target)).rejects.toBeDefined();
    await expect(fs.access(join(sandbox, ".fail-write.spec.md.tmp"))).rejects.toBeDefined();
  });

  it("leaves .tmp on disk when rename fails after successful writeFile (D-30)", async () => {
    const target = join(sandbox, "fail-rename.spec.md");
    vi.spyOn(fs, "rename").mockRejectedValueOnce(
      Object.assign(new Error("EXDEV"), { code: "EXDEV" }),
    );
    const result = await atomicWrite(target, "partial");
    expect(result.written).toBe(false);
    expect(result.tmpOrphan).toBe(join(sandbox, ".fail-rename.spec.md.tmp"));
    // Tmp exists with full content.
    if (result.tmpOrphan === null) throw new Error("tmpOrphan should be non-null");
    expect(await fs.readFile(result.tmpOrphan, "utf8")).toBe("partial");
    // Original target untouched (never existed here).
    await expect(fs.access(target)).rejects.toBeDefined();
  });

  it("preserves existing target bytes on rename failure (D-32 invariant)", async () => {
    const target = join(sandbox, "existing.spec.md");
    await fs.writeFile(target, "OLD CONTENT", "utf8");
    vi.spyOn(fs, "rename").mockRejectedValueOnce(
      Object.assign(new Error("EACCES"), { code: "EACCES" }),
    );
    const result = await atomicWrite(target, "NEW CONTENT");
    expect(result.written).toBe(false);
    // Original target bytes unchanged — D-32 simulated-crash invariant.
    expect(await fs.readFile(target, "utf8")).toBe("OLD CONTENT");
    // Orphan tmp carries the attempted new content.
    if (result.tmpOrphan === null) throw new Error("tmpOrphan should be non-null");
    expect(await fs.readFile(result.tmpOrphan, "utf8")).toBe("NEW CONTENT");
  });
});

describe("atomic.ts — detectOrphanTmp", () => {
  it("returns path when .{basename}.tmp exists", async () => {
    const target = join(sandbox, "habit.spec.md");
    const tmpPath = join(sandbox, ".habit.spec.md.tmp");
    await fs.writeFile(tmpPath, "orphan", "utf8");
    expect(await detectOrphanTmp(target)).toBe(tmpPath);
  });

  it("returns null when .{basename}.tmp absent", async () => {
    const target = join(sandbox, "habit.spec.md");
    expect(await detectOrphanTmp(target)).toBeNull();
  });
});
