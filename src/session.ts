// src/session.ts
// Per-project session persistence for the pi extension.
// Stores transient state under .planning/.mobile-tui/session.json (D-304).
//
// SECURITY:
//   - specPath is resolved via path.resolve(cwd, state.specPath) and verified
//     to start with cwd before use (ASVS V5 — path traversal defense).
//   - Parsed JSON shape is validated before returning (prototype pollution defense).
//   - detectOrphanTmp is called on the resolved specPath to clean up any
//     abandoned .{base}.tmp files left by a previous crash (RESEARCH.md security domain).
//
// FAILURE MODES:
//   - Missing, unparseable, or path-traversal session.json → returns null (D-305 silent fallback).
//   - detectOrphanTmp failure → logged, not thrown (startup must not fail on orphan cleanup errors).
//
// Analog: src/editor/autosave.ts (named exports, dep-injection pattern).
import { appendFile, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { detectOrphanTmp } from "./serialize/atomic.ts";

const SESSION_DIR = ".planning/.mobile-tui";
const SESSION_FILE = "session.json";

/**
 * Shape of the per-project session state (D-304).
 * All fields required; none optional — callers use defaults if null returned from readSession.
 */
export interface SessionState {
  /** Relative path to spec file from cwd. E.g. "./SPEC.md". NEVER absolute. */
  specPath: string;
  mode: "wizard" | "canvas";
  /** Only meaningful in wizard mode. */
  wizardStep: number;
  /** Only meaningful in canvas mode. */
  focusedScreenIndex: number;
  /** Only meaningful in canvas mode. */
  focusedPane: "screens" | "inspector" | "preview";
}

/**
 * Read and validate the session state from .planning/.mobile-tui/session.json.
 *
 * Returns null if:
 *   - File is missing or unreadable (D-305 silent fallback).
 *   - JSON is malformed (corrupt session.json).
 *   - Parsed shape is invalid (prototype pollution defense).
 *   - specPath resolves outside cwd (path traversal defense, ASVS V5).
 *
 * Side effect: calls detectOrphanTmp on the resolved specPath to clean up abandoned .tmp files.
 *
 * @param cwd - Absolute path to the project root (ctx.cwd from the pi command handler).
 */
export async function readSession(cwd: string): Promise<SessionState | null> {
  try {
    const raw = await readFile(join(cwd, SESSION_DIR, SESSION_FILE), "utf8");
    const parsed: unknown = JSON.parse(raw);

    // Prototype pollution defense: validate shape before use.
    if (!isValidSessionState(parsed)) {
      return null;
    }

    const state = parsed as SessionState;

    // Path traversal defense (ASVS V5): resolve + assert within cwd.
    // realpath normalises symlinks (e.g. /var → /private/var on macOS) so
    // the startsWith comparison is correct on all platforms.
    const realCwd = await realpath(cwd);
    const absSpecPath = resolve(realCwd, state.specPath);
    if (!absSpecPath.startsWith(realCwd + "/") && absSpecPath !== realCwd) {
      return null;
    }

    // Orphan .tmp cleanup: call detectOrphanTmp but do not fail on error.
    try {
      await detectOrphanTmp(absSpecPath);
    } catch {
      // Non-fatal: log and continue (do not block startup).
    }

    return state;
  } catch {
    // Missing file, unreadable, or corrupt JSON — D-305 silent fallback.
    return null;
  }
}

/**
 * Write session state to .planning/.mobile-tui/session.json.
 * Creates the directory if it does not exist.
 *
 * @param cwd   - Absolute path to the project root.
 * @param state - Session state to persist.
 */
export async function writeSession(cwd: string, state: SessionState): Promise<void> {
  const dir = join(cwd, SESSION_DIR);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, SESSION_FILE), JSON.stringify(state, null, 2), "utf8");
}

/**
 * Ensure .planning/.mobile-tui/ is listed in the project's .gitignore.
 * Creates .gitignore if it does not exist. Idempotent. (D-306)
 *
 * @param cwd - Absolute path to the project root.
 */
export async function ensureGitignore(cwd: string): Promise<void> {
  const gitignorePath = join(cwd, ".gitignore");
  const entry = ".planning/.mobile-tui/";
  try {
    const contents = await readFile(gitignorePath, "utf8");
    if (!contents.includes(entry)) {
      await appendFile(gitignorePath, `\n# mobile-tui transient state\n${entry}\n`);
    }
  } catch {
    // .gitignore does not exist — create it.
    await appendFile(gitignorePath, `# mobile-tui transient state\n${entry}\n`);
  }
}

// ── Internal ────────────────────────────────────────────────────────────────

/**
 * Runtime shape validation for parsed session JSON.
 * Rejects objects with prototype-pollution keys (__proto__, constructor, prototype).
 * Also guards against unexpected shapes from corrupt/malicious session.json.
 */
function isValidSessionState(value: unknown): value is SessionState {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  // Prototype pollution defense: reject objects with own dangerous prototype-override keys.
  // Using hasOwnProperty avoids false positives from inherited Object.prototype.constructor.
  const obj = value as Record<string, unknown>;
  const hasOwn = Object.prototype.hasOwnProperty.bind(obj);
  if (hasOwn("__proto__") || hasOwn("constructor") || hasOwn("prototype")) {
    return false;
  }

  // Shape validation: required fields with correct types.
  if (typeof obj["specPath"] !== "string") return false;
  if (obj["mode"] !== "wizard" && obj["mode"] !== "canvas") return false;
  if (typeof obj["wizardStep"] !== "number") return false;
  if (typeof obj["focusedScreenIndex"] !== "number") return false;
  if (
    obj["focusedPane"] !== "screens" &&
    obj["focusedPane"] !== "inspector" &&
    obj["focusedPane"] !== "preview"
  ) {
    return false;
  }

  return true;
}
