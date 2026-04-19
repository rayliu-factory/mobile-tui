// src/emit/maestro/platform-filter.ts
// Pure filter over TestFlowStep[] by target platform.
//
// GUARANTEES:
//   - Returns deterministically.
//   - No Date, no process.env, no fs, no Math.random.
import type { TestFlowStep } from "../../model/spec.ts";

export function filterStepsByPlatform(
  steps: TestFlowStep[],
  platform: "ios" | "android",
): TestFlowStep[] {
  return steps.filter((s) => s.platform === platform || s.platform === "both");
}
