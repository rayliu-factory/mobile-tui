// src/emit/maestro/emitter.ts
// Top-level `emitMaestroFlows(spec): EmitResult` composition.
//
// GUARANTEES:
//   - Returns deterministically from the same Spec input.
//   - No Date, no process.env, no fs, no Math.random (MAESTRO-01 pure-function).
//   - All-or-nothing: if ANY flow fails, ok:false with zero flows.
//   - launchApp is always the first step in every flow (idiomatic Maestro pattern).
//
// YAML output format (verified via maestro check-syntax 2.4.0):
//   # Replace com.example.app with your bundle identifier
//   appId: com.example.app
//   ---
//   - launchApp
//   - tapOn:
//       id: <testID>
//
// Two-document construction (RESEARCH Pitfall 3): construct plain JS objects,
// NEVER pass Zod-typed objects to YAML.stringify (T-7-03-03 mitigation).
import * as YAML from "yaml";
import type { Spec } from "../../model/index.ts";
import type { TestFlow } from "../../model/spec.ts";
import type { Diagnostic } from "../../primitives/diagnostic.ts";
import { filterStepsByPlatform } from "./platform-filter.ts";
import { mapStep } from "./step-mapper.ts";

export type EmitResult =
  | { ok: true; flows: Array<{ name: string; ios: string; android: string }> }
  | { ok: false; diagnostics: Diagnostic[] };

type FlowResult =
  | { ok: true; ios: string; android: string }
  | { ok: false; diagnostics: Diagnostic[] };

/**
 * Convert a single object to a YAML list item string.
 * YAML.stringify({ tapOn: { id: "my_btn" } }) produces:
 *   tapOn:
 *     id: my_btn
 * We need to prefix the first line with "- " and indent subsequent lines with "  ".
 */
function yamlListItem(obj: object): string {
  const lines = YAML.stringify(obj).trimEnd().split("\n");
  const first = lines[0] ?? "";
  return [`- ${first}`, ...lines.slice(1).map((l) => `  ${l}`)].join("\n");
}

/**
 * Assemble the final Maestro YAML string from a steps lines array.
 * Format (verified via maestro check-syntax 2.4.0):
 *   # Replace com.example.app with your bundle identifier
 *   appId: com.example.app
 *   ---
 *   - launchApp
 *   - tapOn:
 *       id: <testID>
 */
function assembleYaml(stepLines: string[]): string {
  const headerComment = "# Replace com.example.app with your bundle identifier";
  const header = YAML.stringify({ appId: "com.example.app" }).trimEnd();
  const steps = stepLines.join("\n");
  return `${headerComment}\n${header}\n---\n${steps}\n`;
}

/**
 * Emit a single flow for one platform, returning the raw YAML string lines.
 */
function buildPlatformLines(
  flow: TestFlow,
  spec: Spec,
  flowIndex: number,
  platform: "ios" | "android",
): { lines: string[]; diagnostics: Diagnostic[] } {
  const filteredSteps = filterStepsByPlatform(flow.steps, platform);
  const lines: string[] = ["- launchApp"];
  const diagnostics: Diagnostic[] = [];

  for (let si = 0; si < filteredSteps.length; si++) {
    const step = filteredSteps[si];
    if (!step) continue;
    const result = mapStep(step, spec, flowIndex, si);
    if (!result.ok) {
      diagnostics.push(result.diagnostic);
      continue;
    }
    // Custom action: emit a comment line before the tapOn step
    if (result.customActionName !== undefined) {
      lines.push(`# custom action: ${result.customActionName}`);
    }
    lines.push(yamlListItem({ tapOn: { id: result.tapOnId } }));
  }

  return { lines, diagnostics };
}

function emitMaestroFlow(flow: TestFlow, spec: Spec, flowIndex: number): FlowResult {
  const { lines: iosLines, diagnostics: iosDiags } = buildPlatformLines(
    flow,
    spec,
    flowIndex,
    "ios",
  );
  const { lines: androidLines, diagnostics: androidDiags } = buildPlatformLines(
    flow,
    spec,
    flowIndex,
    "android",
  );

  const allDiags = [...iosDiags, ...androidDiags];
  if (allDiags.length > 0) {
    return { ok: false, diagnostics: allDiags };
  }

  return {
    ok: true,
    ios: assembleYaml(iosLines),
    android: assembleYaml(androidLines),
  };
}

/**
 * Convert all test_flows in a spec to Maestro YAML strings.
 *
 * Returns { ok: true, flows } when all flows succeed, or
 * { ok: false, diagnostics } when any flow has a missing testID or
 * unresolved screen. Zero flows are returned on failure (all-or-nothing).
 */
export function emitMaestroFlows(spec: Spec): EmitResult {
  if (!spec.test_flows || spec.test_flows.length === 0) {
    return { ok: true, flows: [] };
  }

  const flows: Array<{ name: string; ios: string; android: string }> = [];
  const diagnostics: Diagnostic[] = [];

  for (let fi = 0; fi < spec.test_flows.length; fi++) {
    const flow = spec.test_flows[fi];
    if (!flow) continue;
    const result = emitMaestroFlow(flow, spec, fi);
    if (!result.ok) {
      diagnostics.push(...result.diagnostics);
    } else {
      flows.push({ name: flow.name, ios: result.ios, android: result.android });
    }
  }

  if (diagnostics.length > 0) return { ok: false, diagnostics };
  return { ok: true, flows };
}
