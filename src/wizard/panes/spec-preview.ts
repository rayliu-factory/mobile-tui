// src/wizard/panes/spec-preview.ts
// Read-only YAML preview pane — renders yaml.stringify(snapshot.spec) (D-90).
//
// Implementation for plan 06-05.
//
// D-88: Right side of wizard 2-pane layout (50% width).
// D-89: Collapses when terminal width < 80 (handled by calcWizardPaneWidths).
// D-90: Displays raw YAML frontmatter skeleton; read-only — NOT editable inline.
//
// Note: @mariozechner/pi-tui is a peer dependency (not installed in devDependencies).
// Component interface is declared locally (Inline-Interface Pattern from 06-PATTERNS.md).
//
// T-06-12: YAML.stringify output is display-only; not written to file; no sensitive data
//          beyond what the user entered.
// T-06-13: handleInput is a no-op — read-only pane cannot be edited via keyboard.

import YAML from "yaml";
import { truncateToWidth } from "../../canvas/tui-utils.ts";
import type { Snapshot } from "../../editor/types.ts";

/**
 * Minimal Component interface (mirrors @mariozechner/pi-tui).
 * Used as a local type alias so stubs compile without importing pi-tui.
 */
interface Component {
  render(width: number): string[];
  handleInput?(data: string): void;
  invalidate(): void;
}

/**
 * Right pane of the wizard 2-pane layout: read-only YAML preview of the spec.
 *
 * Calls YAML.stringify(snapshot.spec) on every update() call, caches the result,
 * and returns cached lines from render(). Cache is cleared on update() or invalidate().
 *
 * Per D-90: display-only; no gray-matter round-trip; just yaml.stringify.
 * Per plan 06-05: lines are truncated to width-2 (accounting for pane border).
 */
export class SpecPreviewPane implements Component {
  private snapshot: Snapshot | null = null;
  private lineCache: string[] | null = null;

  /**
   * Push new snapshot from store subscription.
   * Clears line cache so render() recomputes on next tick (Pitfall 4 prevention).
   */
  update(snapshot: Snapshot): void {
    this.snapshot = snapshot;
    this.lineCache = null; // invalidate on every update (mirrors WireframePreviewPane)
  }

  /**
   * Render the YAML preview for the current spec.
   *
   * If no snapshot has been pushed via update(), returns a loading placeholder.
   * Otherwise stringifies snapshot.spec to YAML, splits on newlines, and
   * truncates each line to width-2 (border padding).
   *
   * Result is cached until update() or invalidate() is called.
   */
  render(width: number): string[] {
    if (!this.snapshot) {
      return [truncateToWidth("(loading...)", width, "", true)];
    }

    if (!this.lineCache) {
      // D-90: display-only; no gray-matter round-trip needed; yaml.stringify is one line
      const yamlText = YAML.stringify(this.snapshot.spec);
      this.lineCache = yamlText.split("\n").map(
        (line) => truncateToWidth(line, width - 2), // -2 for pane border
      );
    }

    return this.lineCache;
  }

  /**
   * No-op — read-only pane (D-90 / T-06-13).
   * All writes go through FormPane → store.apply; this pane is display-only.
   */
  handleInput(_data: string): void {}

  /**
   * Invalidate the line cache.
   * Called by WizardRoot after any store snapshot update.
   */
  invalidate(): void {
    this.lineCache = null;
  }
}
