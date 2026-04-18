// tests/wizard-chrome.test.ts — Chrome hygiene for WizardRoot (mirrors canvas-chrome.test.ts)
// All tests skipped until WizardRoot is implemented in plan 06-06.
import { describe, it } from "vitest";

/** Enter alternate screen buffer */
const ALT_BUFFER_ENTER = new RegExp("\x1b\\[\\?1049h");
/** Clear screen (full) */
const CLEAR_SCREEN = new RegExp("\x1b\\[2J");
/** Any alternate screen / private mode sequence */
const ALT_SCREEN = new RegExp("\x1b\\[\\?");

describe("wizard chrome hygiene", () => {
  it.skip("WizardRoot.render() produces no alt-buffer escape sequences", () => {
    // Will import WizardRoot from ../src/wizard/root.ts
    // Build stub store + mockTheme, render(80), check no forbidden sequences
    // const store = makeStubStore();
    // const root = new WizardRoot(store, { theme: mockTheme });
    // const output = root.render(80).join("\n");
    // expect(output).not.toMatch(ALT_BUFFER_ENTER);
  });
  it.skip("WizardRoot.render() produces no clear-screen sequences", () => {
    // const output = root.render(80).join("\n");
    // expect(output).not.toMatch(CLEAR_SCREEN);
  });
  it.skip("graduation leaves no orphan escape sequences", () => {
    // After mode flip to canvas, no orphan wizard escape sequences remain
    // expect(output).not.toMatch(ALT_SCREEN);
  });
});
