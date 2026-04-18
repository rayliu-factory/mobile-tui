// scripts/cli-edit.ts
// CLI: npx tsx scripts/cli-edit.ts <spec-path> <command-name> --arg value ...
//
// Exit codes (D-68):
//   0 — apply succeeded, save succeeded, zero severity:error diagnostics.
//       Uses `process.exitCode = 0` (NOT process.exit) so beforeExit fires.
//   1 — CLI-layer failure: unknown command, arg-parse failure, missing file,
//       YAML parse error. Diagnostics to stderr. Uses process.exit(1).
//   2 — Save gated by validateSpec severity:error diagnostics. writeSpecFile
//       returned { written: false }. Uses `process.exitCode = 2`.
//
// Diagnostic stderr format (D-68): `<severity> <path>: <message>` per line.
// Success stdout: "applied <command> → wrote <path>" (one line).
//
// Security notes (T-04-22 / T-04-23 / T-04-24):
//   T-04-22: specPath from argv is passed verbatim to parseSpecFile / writeSpecFile.
//            User-level path-traversal risk accepted; Phase-9 pi sandbox restricts fs.
//   T-04-23: parseFlagsAgainstSchema builds the raw object via Object.create(null) to
//            prevent prototype pollution via crafted --__proto__ argv tokens.
//   T-04-24: main().catch writes only err.message (NOT stack) to prevent info disclosure.
import type { z } from "zod";
import {
  COMMAND_NAMES,
  COMMANDS,
  EDITOR_CODES,
  type CommandName,
  createStore,
} from "../src/editor/index.ts";
import { parseSpecFile } from "../src/serialize/index.ts";

// biome-ignore lint/suspicious/noExplicitAny: Generic helper requires any for ZodObject type parameter
function parseFlagsAgainstSchema<T extends z.ZodObject<any>>(
  schema: T,
  argv: string[],
): { ok: true; value: z.infer<T> } | { ok: false; issues: z.ZodIssue[] } {
  // Object.create(null) — no prototype chain; prevents T-04-23 prototype pollution
  // via crafted --__proto__ argv tokens. Same pattern as src/serialize/unknown.ts.
  const raw: Record<string, string | boolean> = Object.create(null);
  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i];
    if (!tok?.startsWith("--")) continue;
    const key = tok.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      raw[key] = next;
      i++;
    } else {
      // Bare --flag = boolean true
      raw[key] = true;
    }
  }
  const result = schema.safeParse(raw);
  return result.success ? { ok: true, value: result.data } : { ok: false, issues: result.error.issues };
}

async function main(): Promise<void> {
  const [specPath, commandName, ...flagArgs] = process.argv.slice(2);

  // Usage check — exit 2 mirrors render-wireframe convention for usage errors.
  // NOTE: per plan interface note, usage errors use process.exit(2) not exitCode.
  if (!specPath || !commandName) {
    process.stderr.write(
      `usage: cli-edit <spec-path> <command-name> --arg value ...\n` +
        `available commands: ${COMMAND_NAMES.join(", ")}\n`,
    );
    process.exit(2);
  }

  // Parse the spec file
  const parseResult = await parseSpecFile(specPath);
  if (!parseResult.spec) {
    for (const d of parseResult.diagnostics) {
      process.stderr.write(`${d.severity} ${d.path}: ${d.message}\n`);
    }
    process.exit(1);
  }

  // Look up the command
  const command = COMMANDS[commandName as CommandName];
  if (!command) {
    process.stderr.write(
      `${EDITOR_CODES.EDITOR_COMMAND_NOT_FOUND} command: unknown command "${commandName}"\n`,
    );
    process.exit(1);
  }

  // Parse argv flags against the command's argsSchema
  const argsParsed = parseFlagsAgainstSchema(command.argsSchema, flagArgs);
  if (!argsParsed.ok) {
    for (const issue of argsParsed.issues) {
      process.stderr.write(
        `${EDITOR_CODES.EDITOR_COMMAND_ARG_INVALID} ${issue.path.join(".") || commandName}: ${issue.message}\n`,
      );
    }
    process.exit(1);
  }

  // Construct the store
  const store = createStore({
    spec: parseResult.spec,
    astHandle: parseResult.astHandle!,
    filePath: specPath,
  });

  // Apply the command
  const applyResult = await store.apply(commandName, argsParsed.value);

  // Print all diagnostics to stderr (all severities)
  for (const d of applyResult.diagnostics) {
    process.stderr.write(`${d.severity} ${d.path}: ${d.message}\n`);
  }

  // If apply failed, print error and exit 1
  if (!applyResult.ok) {
    process.exit(1);
  }

  // Explicit flush before natural return (D-66 primary guarantee)
  const writeResult = await store.flush();

  // Print any write diagnostics to stderr
  for (const d of writeResult.diagnostics) {
    process.stderr.write(`${d.severity} ${d.path}: ${d.message}\n`);
  }

  // Save-gated: validateSpec severity:error blocked write
  if (!writeResult.written) {
    process.exitCode = 2;
    return;
  }

  // Success
  process.stdout.write(`applied ${commandName} → wrote ${specPath}\n`);
  // Use exitCode (NOT process.exit) so beforeExit fires as second safety net (D-66)
  process.exitCode = 0;
}

main().catch((err) => {
  // T-04-24: write only message (not stack) to prevent information disclosure
  process.stderr.write(`error: ${(err as Error).message}\n`);
  process.exitCode = 1;
});
