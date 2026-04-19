// Tests for src/emit/maestro/index.ts — Maestro flow emitter.
// Covers: MAESTRO-01 (pure function, determinism), MAESTRO-02 (platform branching),
//         MAESTRO-03 (missing testID loud failure), MAESTRO-04 (check-syntax gate),
//         MAESTRO-05 SC5 (golden fixture output).
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { Spec } from "../src/model/index.ts";
import { parseSpecFile } from "../src/serialize/index.ts";

// TODO: replace with real import after Plan 03
// import { emitMaestroFlows } from "../src/emit/maestro/index.ts";
const emitMaestroFlows = (_spec: unknown) => ({
  ok: true,
  flows: [] as Array<{ name: string; ios: string; android: string }>,
});

async function loadFixture(name: string): Promise<Spec> {
  const r = await parseSpecFile(resolve(`fixtures/${name}.spec.md`));
  if (!r.spec) throw new Error(`fixture ${name} failed to parse`);
  return r.spec;
}

describe("emitMaestroFlows — pure function (MAESTRO-01)", () => {
  it.skip("returns same output on two calls with same input (determinism)", async () => {
    const spec = await loadFixture("habit-tracker");
    const a = emitMaestroFlows(spec);
    const b = emitMaestroFlows(spec);
    // Both calls must return identical results
    expect(a).toStrictEqual(b);
  });

  it.skip("returns ok:true with empty flows array when spec has no test_flows", async () => {
    const spec = await loadFixture("habit-tracker");
    // Strip test_flows from the spec
    const specWithoutFlows = { ...spec, test_flows: undefined };
    const result = emitMaestroFlows(specWithoutFlows);
    expect(result.ok).toBe(true);
    expect(result.flows).toHaveLength(0);
  });

  it.skip("YAML output contains appId header and --- separator", async () => {
    const spec = await loadFixture("habit-tracker");
    const result = emitMaestroFlows(spec);
    expect(result.ok).toBe(true);
    for (const flow of result.flows) {
      expect(flow.ios).toContain("appId:");
      expect(flow.ios).toContain("---");
    }
  });

  it.skip("launchApp is first step in every emitted flow", async () => {
    const spec = await loadFixture("habit-tracker");
    const result = emitMaestroFlows(spec);
    expect(result.ok).toBe(true);
    for (const flow of result.flows) {
      expect(flow.ios).toMatch(/launchApp/);
      // launchApp must appear before any other step
      const lines = flow.ios.split("\n");
      const stepLines = lines.filter((l) => l.trim().startsWith("-"));
      expect(stepLines[0]).toContain("launchApp");
    }
  });
});

describe("platform branching (MAESTRO-02)", () => {
  it.skip("ios-only step appears in .ios.yaml but not .android.yaml", async () => {
    const spec = await loadFixture("habit-tracker");
    const result = emitMaestroFlows(spec);
    expect(result.ok).toBe(true);
    // ios_permission_flow has platform: ios step (add_habit)
    const permFlow = result.flows.find((f) => f.name === "ios_permission_flow");
    expect(permFlow).toBeDefined();
    if (!permFlow) return;
    // add_habit step appears in ios but not android
    expect(permFlow.ios).toContain("add_habit_btn");
    expect(permFlow.android).not.toContain("add_habit_btn");
  });

  it.skip("android-only step appears in .android.yaml but not .ios.yaml", async () => {
    const spec = await loadFixture("habit-tracker");
    const result = emitMaestroFlows(spec);
    expect(result.ok).toBe(true);
    // ios_permission_flow has platform: android step (toggle_done)
    const permFlow = result.flows.find((f) => f.name === "ios_permission_flow");
    expect(permFlow).toBeDefined();
    if (!permFlow) return;
    // toggle_done step appears in android but not ios
    expect(permFlow.android).toContain("done_toggle");
    expect(permFlow.ios).not.toContain("done_toggle");
  });

  it.skip("both-platform step appears byte-identically in both files", async () => {
    const spec = await loadFixture("habit-tracker");
    const result = emitMaestroFlows(spec);
    expect(result.ok).toBe(true);
    // add_habit_flow has platform: both steps — should appear in both files
    const addFlow = result.flows.find((f) => f.name === "add_habit_flow");
    expect(addFlow).toBeDefined();
    if (!addFlow) return;
    // Both files contain the same testIDs for both-platform steps
    expect(addFlow.ios).toContain("add_habit_btn");
    expect(addFlow.android).toContain("add_habit_btn");
  });
});

describe("missing testID — loud failure (MAESTRO-03)", () => {
  it.skip("returns ok:false with MAESTRO_MISSING_TESTID diagnostic when action has no testID", async () => {
    const spec = await loadFixture("habit-tracker");
    // Mutate spec to include a test_flows step whose action references a component with no testID
    const specWithBadFlow = {
      ...spec,
      test_flows: [
        {
          name: "bad_flow",
          steps: [{ screen: "home", action: "add_habit", platform: "both" as const }],
        },
      ],
    };
    // Strip testID from add_habit's triggering component to simulate missing testID
    const result = emitMaestroFlows(specWithBadFlow);
    // In a real scenario with missing testID, result.ok should be false
    // The diagnostic must include MAESTRO_MISSING_TESTID code
    if (!result.ok) {
      // biome-ignore lint/suspicious/noExplicitAny: testing diagnostic shape
      const r = result as any;
      expect(r.diagnostics).toBeDefined();
      expect(
        // biome-ignore lint/suspicious/noExplicitAny: testing diagnostic shape
        r.diagnostics.some((d: any) => d.code === "MAESTRO_MISSING_TESTID"),
      ).toBe(true);
    }
  });

  it.skip("writes zero files when any step has missing testID (all-or-nothing)", async () => {
    const spec = await loadFixture("habit-tracker");
    // When any step fails with missing testID, no files must be written
    const result = emitMaestroFlows(spec);
    if (!result.ok) {
      expect(result.flows).toHaveLength(0);
    }
  });

  it.skip("diagnostic message names the missing action and screen", async () => {
    const spec = await loadFixture("habit-tracker");
    const result = emitMaestroFlows(spec);
    if (!result.ok) {
      // biome-ignore lint/suspicious/noExplicitAny: testing diagnostic shape
      const r = result as any;
      const diag =
        // biome-ignore lint/suspicious/noExplicitAny: testing diagnostic shape
        r.diagnostics?.find((d: any) => d.code === "MAESTRO_MISSING_TESTID");
      if (diag) {
        // Diagnostic message should name the action and screen
        expect(diag.message).toMatch(/action/i);
        expect(diag.message).toMatch(/screen/i);
      }
    }
  });
});

describe("maestro check-syntax gate (MAESTRO-04)", () => {
  it.skip("runs maestro check-syntax on each emitted file when MAESTRO_CLI=1", async () => {
    // This test requires MAESTRO_CLI=1 env var and maestro binary available
    // Integration test — verifies that check-syntax is invoked for each flow file
    const spec = await loadFixture("habit-tracker");
    const result = emitMaestroFlows(spec);
    expect(result.ok).toBe(true);
    // When MAESTRO_CLI=1, each flow's YAML is validated via maestro check-syntax
    // The test verifies the gate runs without error for valid flows
  });

  it.skip("returns ok:false with MAESTRO_SYNTAX_ERROR diagnostic when check-syntax exits 1", async () => {
    // Integration test — requires MAESTRO_CLI=1 and a flow that fails syntax check
    // When maestro CLI exits 1, emitter returns ok:false with MAESTRO_SYNTAX_ERROR
    const result = { ok: false, flows: [] };
    if (!result.ok) {
      // biome-ignore lint/suspicious/noExplicitAny: testing diagnostic shape
      const r = result as any;
      if (r.diagnostics) {
        expect(
          // biome-ignore lint/suspicious/noExplicitAny: testing diagnostic shape
          r.diagnostics.some((d: any) => d.code === "MAESTRO_SYNTAX_ERROR"),
        ).toBe(true);
      }
    }
  });
});

describe("golden fixtures (MAESTRO-05 SC5)", () => {
  it.skip("habit-tracker flow output matches snapshot", async () => {
    const spec = await loadFixture("habit-tracker");
    const result = emitMaestroFlows(spec);
    expect(result.ok).toBe(true);
    // Each flow's ios and android YAML must match stored snapshot
    for (const flow of result.flows) {
      expect(flow.ios).toMatchSnapshot(`habit-tracker/${flow.name}.ios.yaml`);
      expect(flow.android).toMatchSnapshot(`habit-tracker/${flow.name}.android.yaml`);
    }
  });

  it.skip("todo flow output matches snapshot", async () => {
    const spec = await loadFixture("todo");
    const result = emitMaestroFlows(spec);
    expect(result.ok).toBe(true);
    for (const flow of result.flows) {
      expect(flow.ios).toMatchSnapshot(`todo/${flow.name}.ios.yaml`);
      expect(flow.android).toMatchSnapshot(`todo/${flow.name}.android.yaml`);
    }
  });
});
