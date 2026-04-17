import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    // Phase 1 Wave 0 has no tests yet — downstream plans author the first suites.
    // Without this flag, vitest@^4 exits 1 on "no tests found", blocking the
    // toolchain-bootstrap verification this plan is required to satisfy.
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/index.ts"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
});
