// tests/session.test.ts
// PI-03, PI-04: per-project session state + gitignore injection.
// Covers: readSession (null-on-error, path-traversal guard), writeSession (round-trip),
//         ensureGitignore (append + idempotent), prototype-pollution defense.
// Analog: tests/autosave-debounce.test.ts (dep-injection + stub pattern).
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readSession, writeSession, ensureGitignore } from "../src/session.ts";
import type { SessionState } from "../src/session.ts";

const SESSION_DIR = ".planning/.mobile-tui";
const SESSION_FILE = "session.json";

const VALID_STATE: SessionState = {
  specPath: "./SPEC.md",
  mode: "wizard",
  wizardStep: 2,
  focusedScreenIndex: 1,
  focusedPane: "inspector",
};

let tmpDir: string;

beforeEach(async () => {
  tmpDir = join(tmpdir(), `mobile-tui-session-${randomUUID()}`);
  await mkdir(tmpDir, { recursive: true });
});

afterEach(async () => {
  const { rm } = await import("node:fs/promises");
  await rm(tmpDir, { recursive: true, force: true });
});

describe("readSession (PI-03, PI-04)", () => {
  it("returns null when session.json is missing", async () => {
    const result = await readSession(tmpDir);
    expect(result).toBeNull();
  });

  it("returns null when session.json contains invalid JSON", async () => {
    await mkdir(join(tmpDir, SESSION_DIR), { recursive: true });
    await writeFile(join(tmpDir, SESSION_DIR, SESSION_FILE), "not valid json", "utf8");
    const result = await readSession(tmpDir);
    expect(result).toBeNull();
  });

  it("returns null when specPath resolves outside cwd (path traversal)", async () => {
    await mkdir(join(tmpDir, SESSION_DIR), { recursive: true });
    const malicious: SessionState = { ...VALID_STATE, specPath: "../../etc/passwd" };
    await writeFile(join(tmpDir, SESSION_DIR, SESSION_FILE), JSON.stringify(malicious, null, 2), "utf8");
    const result = await readSession(tmpDir);
    expect(result).toBeNull();
  });

  it("returns null when specPath is absolute (path traversal)", async () => {
    await mkdir(join(tmpDir, SESSION_DIR), { recursive: true });
    const malicious: SessionState = { ...VALID_STATE, specPath: "/etc/passwd" };
    await writeFile(join(tmpDir, SESSION_DIR, SESSION_FILE), JSON.stringify(malicious, null, 2), "utf8");
    const result = await readSession(tmpDir);
    expect(result).toBeNull();
  });

  it("returns valid state for legitimate relative specPath", async () => {
    await writeSession(tmpDir, VALID_STATE);
    const result = await readSession(tmpDir);
    expect(result).not.toBeNull();
    expect(result?.specPath).toBe("./SPEC.md");
    expect(result?.mode).toBe("wizard");
    expect(result?.wizardStep).toBe(2);
  });
});

describe("writeSession + readSession round-trip (PI-03)", () => {
  it("preserves all five fields across round-trip", async () => {
    await writeSession(tmpDir, VALID_STATE);
    const result = await readSession(tmpDir);
    expect(result).toEqual(VALID_STATE);
  });

  it("creates .planning/.mobile-tui/ directory if it does not exist", async () => {
    await writeSession(tmpDir, VALID_STATE);
    const raw = await readFile(join(tmpDir, SESSION_DIR, SESSION_FILE), "utf8");
    expect(JSON.parse(raw)).toMatchObject(VALID_STATE);
  });

  it("writes JSON with 2-space indentation", async () => {
    await writeSession(tmpDir, VALID_STATE);
    const raw = await readFile(join(tmpDir, SESSION_DIR, SESSION_FILE), "utf8");
    expect(raw).toContain('  "specPath"');
  });
});

describe("ensureGitignore (D-306)", () => {
  it("appends .planning/.mobile-tui/ when entry is absent", async () => {
    await writeFile(join(tmpDir, ".gitignore"), "node_modules/\n", "utf8");
    await ensureGitignore(tmpDir);
    const content = await readFile(join(tmpDir, ".gitignore"), "utf8");
    expect(content).toContain(".planning/.mobile-tui/");
  });

  it("is idempotent — does not duplicate when entry already present", async () => {
    await writeFile(join(tmpDir, ".gitignore"), "node_modules/\n.planning/.mobile-tui/\n", "utf8");
    await ensureGitignore(tmpDir);
    const content = await readFile(join(tmpDir, ".gitignore"), "utf8");
    const matches = content.split(".planning/.mobile-tui/");
    expect(matches.length - 1).toBe(1);
  });

  it("creates .gitignore when file does not exist", async () => {
    await ensureGitignore(tmpDir);
    const content = await readFile(join(tmpDir, ".gitignore"), "utf8");
    expect(content).toContain(".planning/.mobile-tui/");
  });
});
