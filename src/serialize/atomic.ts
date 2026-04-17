// src/serialize/atomic.ts
// POSIX atomic write primitive (D-29, D-30, D-32).
//
// SCOPE:
//   - atomicWrite(targetPath, contents): fs.writeFile(.tmp) + fs.rename
//   - detectOrphanTmp(targetPath): returns .{basename}.tmp if present
//
// CONTRACT: write is atomic on POSIX same-device systems. The target
// path either contains the OLD bytes (pre-write) or the FULL NEW bytes
// (post-rename). Never truncated, never partial.
//
// TEMP-FILE NAMING (D-30): `.{basename}.tmp` fixed suffix.
// e.g. `/path/habit-tracker.spec.md` → `/path/.habit-tracker.spec.md.tmp`.
//
// FAILURE MODES:
//   - writeFile throws (ENOSPC / EACCES / EIO): best-effort clean up any
//     partial tmp file, re-throw. Caller treats as unrecoverable IO.
//   - rename throws AFTER successful writeFile (EXDEV / EACCES on target):
//     LEAVE the tmp file on disk per D-30 (user content exists; orphan
//     detection on next parse surfaces SPEC_ORPHAN_TEMP_FILE info).
//
// THREAT T-02-PartialWrite (data integrity): fs.rename on POSIX same-device
// is atomic — no intermediate state visible to a concurrent reader. Cross-
// device (EXDEV) ends up in the "rename failed" branch and orphan-tmp is
// surfaced. Phase 9 wraps this in withFileMutationQueue to coordinate with
// pi's own file-mutation tools.
//
// DEBOUNCE IS NOT HERE (D-29): Phase 4 wraps this primitive in a 500ms
// debounce. Phase 2 ships single-shot only.
//
// RELATED: write.ts (caller), parse.ts (detectOrphanTmp consumer).
import { promises as fs } from "node:fs";
import { basename, dirname, join } from "node:path";

export interface AtomicWriteResult {
  written: boolean;
  /** Path of orphan .tmp if writeFile succeeded but rename failed; else null. */
  tmpOrphan: string | null;
}

function tmpPathFor(targetPath: string): string {
  const dir = dirname(targetPath);
  const base = basename(targetPath);
  return join(dir, `.${base}.tmp`);
}

export async function atomicWrite(
  targetPath: string,
  contents: string,
): Promise<AtomicWriteResult> {
  const tmpPath = tmpPathFor(targetPath);

  try {
    await fs.writeFile(tmpPath, contents, { encoding: "utf8" });
  } catch (err) {
    // Best-effort cleanup of partial tmp; swallow cleanup error.
    await fs.unlink(tmpPath).catch(() => undefined);
    throw err;
  }

  try {
    await fs.rename(tmpPath, targetPath);
    return { written: true, tmpOrphan: null };
  } catch {
    // Rename failed AFTER writeFile succeeded. Leave tmp on disk per D-30;
    // orphan detection on next parse surfaces SPEC_ORPHAN_TEMP_FILE.
    return { written: false, tmpOrphan: tmpPath };
  }
}

export async function detectOrphanTmp(targetPath: string): Promise<string | null> {
  const tmpPath = tmpPathFor(targetPath);
  try {
    await fs.access(tmpPath);
    return tmpPath;
  } catch {
    return null;
  }
}
