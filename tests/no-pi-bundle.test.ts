// tests/no-pi-bundle.test.ts
// PI-02: @mariozechner/pi-* packages MUST NOT appear bundled in dist/extension.js.
// Mirrors tests/no-js-yaml.test.ts pattern: read the output artifact, assert negative space.
// Run AFTER `npm run build` (dist/ must exist). Skipped in default vitest run by default;
// the Phase 9 manual cert gate (PI-07) runs `npm run build && npx vitest run tests/no-pi-bundle.test.ts`.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("PI-02: pi-* packages not bundled in dist/extension.js", () => {
  it("dist/extension.js exists (npm run build was run)", () => {
    expect(() => readFileSync(resolve("dist/extension.js"), "utf8")).not.toThrow();
  });

  it("dist/extension.js does not bundle @mariozechner/pi-tui source", () => {
    const bundle = readFileSync(resolve("dist/extension.js"), "utf8");
    if (!bundle) {
      console.error("dist/extension.js is empty — run `npm run build` first");
    }
    expect(bundle).not.toMatch(/"@mariozechner\/pi-tui"/);
  });

  it("dist/extension.js does not bundle @mariozechner/pi-coding-agent source", () => {
    const bundle = readFileSync(resolve("dist/extension.js"), "utf8");
    expect(bundle).toMatch(/from "@mariozechner\/pi-coding-agent"/);
    expect(bundle).not.toMatch(/dist\/core\/tools\/index\.js/);
    expect(bundle).not.toMatch(/agent-session/);
  });
});
