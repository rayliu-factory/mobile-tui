---
phase: 07-maestro-emitter
plan: 05
subsystem: testing
tags: [maestro, yaml, golden-files, vitest, snapshot]

requires:
  - phase: 07-04
    provides: emit-maestro command wired to canvas, golden flow files generated

provides:
  - Committed golden Maestro flow files (flows/*.ios.yaml, flows/*.android.yaml) for habit-tracker fixture
  - Golden snapshot tests in tests/maestro-emitter.test.ts comparing emitter output byte-for-byte to committed flows/
  - VALIDATION.md finalized: nyquist_compliant: true, status: final, all tasks green
  - Phase 7 Maestro emitter complete — all 5 MAESTRO requirements covered

affects:
  - 07-maestro-emitter (closes phase)
  - any future phase that extends emitter or adds new fixtures

tech-stack:
  added: []
  patterns:
    - "Golden file CI pattern: commit authoritative YAML outputs to flows/, test reads and compares byte-for-byte"
    - "Platform-divergence assertion: permissionFlow.ios !== permissionFlow.android"

key-files:
  created:
    - flows/add_habit_flow.ios.yaml
    - flows/add_habit_flow.android.yaml
    - flows/ios_permission_flow.ios.yaml
    - flows/ios_permission_flow.android.yaml
    - flows/toggle_done_flow.ios.yaml
    - flows/toggle_done_flow.android.yaml
  modified:
    - tests/maestro-emitter.test.ts
    - .planning/phases/07-maestro-emitter/07-VALIDATION.md

key-decisions:
  - "Golden-file comparison (readFile + toBe) chosen over vitest .toMatchSnapshot() because flows/ are committed source artifacts, not vitest snapshot files — makes CI diff intent explicit"
  - "MAESTRO_CLI=1 integration test kept skipped (JVM startup too slow for default unit runs); validated manually via check-syntax in Plan 04 human-verify checkpoint"

patterns-established:
  - "golden-file-ci: emitter outputs committed to flows/, tests read and compare byte-for-byte — any emitter change causes CI diff, not silent snapshot update"

requirements-completed:
  - MAESTRO-01
  - MAESTRO-02
  - MAESTRO-03
  - MAESTRO-04
  - MAESTRO-05

duration: ~4min
completed: 2026-04-19
---

# Phase 7 Plan 05: Maestro Emitter — Golden Fixtures & Validation Summary

**Committed 6 golden Maestro flow files (3 flows × iOS+Android) from habit-tracker fixture and wired byte-for-byte golden comparison tests, closing all 5 MAESTRO requirements**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-04-19T22:50:00Z
- **Completed:** 2026-04-19T22:53:00Z
- **Tasks:** 2 (Task 1 committed in prior checkpoint wave; Task 3 executed here)
- **Files modified:** 8 (6 golden YAML files + 1 test file + 1 VALIDATION.md)

## Accomplishments

- 6 golden flow files committed to `flows/` — authoritative CI baseline for emitter output drift detection
- Golden describe block in `tests/maestro-emitter.test.ts` unskipped: 2 real `it()` tests using `readFile` + `toBe` byte-for-byte comparison against committed files
- Platform-divergence assertion verifies `ios_permission_flow.ios` and `.android` differ (MAESTRO-02 SC3)
- VALIDATION.md updated to `nyquist_compliant: true`, `status: final`, all 7 task rows marked green, sign-off checklist fully checked
- Full suite: 968 pass / 1 skip (MAESTRO_CLI integration test, intentionally skipped) / 0 fail across 117 test files

## Task Commits

1. **Task 1: Generate and commit golden flow files** — `415a87c` (feat)
2. **[checkpoint:human-verify]** — approved by author confirming YAML human-readable
3. **Task 3: Unskip golden snapshot tests + update VALIDATION.md** — `3b6a2db` (feat)

**Plan metadata:** (docs commit follows this summary)

## Files Created/Modified

- `flows/add_habit_flow.ios.yaml` — golden iOS Maestro flow for add_habit test flow (habit-tracker fixture)
- `flows/add_habit_flow.android.yaml` — golden Android Maestro flow (byte-identical to iOS — all steps are platform:both)
- `flows/ios_permission_flow.ios.yaml` — golden iOS-specific flow (contains add_habit_btn; excludes done_toggle)
- `flows/ios_permission_flow.android.yaml` — golden Android-specific flow (contains done_toggle; excludes add_habit_btn)
- `flows/toggle_done_flow.ios.yaml` — golden iOS flow for toggle_done
- `flows/toggle_done_flow.android.yaml` — golden Android flow for toggle_done
- `tests/maestro-emitter.test.ts` — golden fixtures describe block replaced: it.skip → real readFile+toBe tests; readFile added to imports (sorted)
- `.planning/phases/07-maestro-emitter/07-VALIDATION.md` — finalized: nyquist_compliant: true, status: final, wave_0_complete: true, all task rows green, sign-off complete

## Decisions Made

- Golden-file comparison via `readFile` + `toBe` rather than vitest `.toMatchSnapshot()` — the YAML files are committed source artifacts (not generated snapshot fixtures), so the CI diff model is: emitter output must be byte-for-byte identical to committed golden files; any change requires an intentional `git add flows/`
- `MAESTRO_CLI=1` integration test kept as `it.skip` — JVM startup cost (~3-5s) makes it unsuitable for default unit runs; validated manually in Plan 04 checkpoint via `maestro check-syntax` on all 6 files (exit 0)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Biome format] Import order fix in test file**
- **Found during:** Task 3 (after editing maestro-emitter.test.ts)
- **Issue:** Adding `readFile` to existing `{ mkdtemp, readdir, rm }` import put it out of alphabetical order; biome `organizeImports` reported error
- **Fix:** Reordered to `{ mkdtemp, readdir, readFile, rm }` (alphabetical)
- **Files modified:** `tests/maestro-emitter.test.ts`
- **Verification:** `npx biome check tests/maestro-emitter.test.ts` exits 0
- **Committed in:** `3b6a2db` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 biome format)
**Impact on plan:** Trivial import sort — no logic change, no scope creep.

## Issues Encountered

None — plan executed as specified. Pre-existing biome warnings in `src/canvas/palette/index.ts` and `src/editor/commands/set-component-action.ts` are unrelated to this plan and logged to `deferred-items.md`.

## Known Stubs

None — all golden flow files contain real emitter output derived from the habit-tracker fixture; no placeholder text.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes introduced. The golden file CI pattern (T-7-05-01 Tampering) is fully mitigated: tests read committed golden files and compare byte-for-byte to fresh emitter output.

## Next Phase Readiness

- Phase 7 (Maestro Emitter) is complete — all 5 MAESTRO requirements covered across plans 01-05
- `flows/*.yaml` are committed golden baseline; any future emitter change will cause test failures, ensuring CI catches drift
- Phase 8 or next planned phase can proceed

---
*Phase: 07-maestro-emitter*
*Completed: 2026-04-19*
