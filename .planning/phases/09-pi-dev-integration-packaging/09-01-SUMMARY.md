---
phase: 09-pi-dev-integration-packaging
plan: "01"
subsystem: build
tags: [tsup, build, peer-dependencies, pi-integration, PI-02]
dependency_graph:
  requires: []
  provides:
    - tsup.config.ts (two-entry ESM+dts build config)
    - package.json peerDependencies shape
    - tests/no-pi-bundle.test.ts (PI-02 invariant)
  affects:
    - dist/ output (produced by npm run build)
    - All Phase 9 plans that depend on a working build substrate
tech_stack:
  added:
    - tsup@^8.5.1 (devDependency — build bundler)
    - "@mariozechner/pi-coding-agent@^0.67.68 (devDependency + peerDependency)"
    - "@mariozechner/pi-tui@^0.67.68 (devDependency + peerDependency)"
  patterns:
    - Two-entry tsup ESM build: src/extension.ts + src/index.ts → dist/
    - External list pattern: @mariozechner/* excluded from bundle (PI-02)
    - peerDependencies with "*" range (pi-mono convention)
    - Negative-space bundle test: readFileSync + not.toMatch pattern
key_files:
  created:
    - tsup.config.ts
    - tests/no-pi-bundle.test.ts
  modified:
    - package.json (exports, pi.extensions, scripts, peerDependencies, devDependencies)
    - package-lock.json (414 packages added)
decisions:
  - "Used @mariozechner/pi-coding-agent@^0.67.68 (latest available) matching pi-mono version convention"
  - "peerDependencies range set to '*' per pi-mono convention — prevents version pin lock-out"
  - "exports updated to dist/index.js; pi.extensions kept as src/extension.ts for jiti dev mode (D-302)"
  - "no-pi-bundle tests expected to fail until Plan 03 delivers src/extension.ts — this is a planned RED state"
metrics:
  duration: "~5 minutes"
  completed: "2026-04-20"
  tasks_completed: 2
  files_created: 2
  files_modified: 2
---

# Phase 9 Plan 01: Build Substrate (tsup + pi-* devDeps + PI-02 test) Summary

**One-liner:** tsup two-entry ESM build config with @mariozechner/* external, peerDependencies shape, and PI-02 bundle-invariant test scaffold.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install dev deps + create tsup.config.ts | 20d4452 | tsup.config.ts, package.json, package-lock.json |
| 2 | Create tests/no-pi-bundle.test.ts (PI-02 invariant) | 9cd56c2 | tests/no-pi-bundle.test.ts |

## What Was Built

**Task 1: tsup.config.ts + package.json shape**

Created `tsup.config.ts` at the repo root with:
- Entry: `["src/extension.ts", "src/index.ts"]`
- Format: `["esm"]`
- `dts: true` for TypeScript declarations
- External: all three `@mariozechner/*` packages
- `outDir: "dist"`, `clean: true`

Updated `package.json`:
- `exports` → `./dist/index.js` (published artifact, D-302)
- `pi.extensions` → `./src/extension.ts` (jiti dev mode, D-302)
- Added `"build": "tsup"` script
- Added `peerDependencies` block with `"*"` range (pi-mono convention)
- Added `tsup`, `@mariozechner/pi-coding-agent`, `@mariozechner/pi-tui` to devDependencies

**Task 2: tests/no-pi-bundle.test.ts**

Created the PI-02 architectural invariant test. Three `it()` blocks:
1. `dist/extension.js exists` — asserts the build ran
2. `@mariozechner/pi-tui not bundled` — negative regex match on bundle content
3. `@mariozechner/pi-coding-agent not bundled` — negative regex match on bundle content

Mirrors `tests/no-js-yaml.test.ts` structural pattern. Tests currently fail with ENOENT because `dist/extension.js` does not yet exist (requires `src/extension.ts` from Plan 03 + `npm run build`). This is the planned RED state per TDD — GREEN will be achieved at the Plan 04 cert gate.

## Deviations from Plan

None — plan executed exactly as written. The 3 failing tests in `no-pi-bundle.test.ts` are the expected RED state explicitly called out in the plan ("test CANNOT be run via `npx vitest run` in isolation until Plan 03 delivers `src/extension.ts`"). All 122 existing test files (1050 tests) continue to pass.

## Known Stubs

None. This plan is pure configuration and test scaffold — no data-rendering code.

## Threat Flags

No new network endpoints, auth paths, file access patterns, or schema changes introduced.

## Self-Check

- [x] `tsup.config.ts` exists: FOUND
- [x] `tests/no-pi-bundle.test.ts` exists: FOUND
- [x] package.json `"build": "tsup"`: FOUND
- [x] package.json peerDependencies `"@mariozechner/pi-coding-agent": "*"`: FOUND
- [x] package.json peerDependencies `"@mariozechner/pi-tui": "*"`: FOUND
- [x] package.json exports `"./dist/index.js"`: FOUND
- [x] package.json pi.extensions `"./src/extension.ts"`: FOUND
- [x] Commit 20d4452 exists: FOUND
- [x] Commit 9cd56c2 exists: FOUND

## Self-Check: PASSED
