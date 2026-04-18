// tests/wizard-save-advance.test.ts — WIZARD-02 save-on-advance
// Skipped until FormPane + store integration implemented in plans 06-04/06-05.
import { describe, it } from "vitest";

describe("wizard save-on-advance (WIZARD-02)", () => {
  it.skip("Tab on step 1 calls store.apply('set-wizard-app-idea', { value })", () => {});
  it.skip("Esc on step 2 does NOT call store.apply (D-95: save only on advance)", () => {});
  it.skip("store.undo() after advance reverts spec.app_idea (Pitfall 2 mitigation)", () => {});
  it.skip("Ctrl+Q calls store.flush() then onQuit callback", () => {});
  it.skip("Quitting mid-wizard leaves parseable spec file on disk", () => {});
});
