// Barrel contract test — ensure public API is exactly what downstream
// consumers (scripts/render-wireframe.ts, Phase 4 store, Phase 5 canvas,
// Phase 8 yank handler) expect.
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseSpecFile } from "../../serialize/index.ts";
import { PHONE_WIDTH, render, renderAllVariants } from "./index.ts";
import { render as renderDirect } from "./variants.ts";

describe("src/emit/wireframe/index.ts barrel", () => {
  it("exports PHONE_WIDTH, render, renderAllVariants", () => {
    expect(PHONE_WIDTH).toBe(60);
    expect(typeof render).toBe("function");
    expect(typeof renderAllVariants).toBe("function");
  });

  it("barrel render produces the same output as direct variants.ts render", async () => {
    const r = await parseSpecFile(resolve("fixtures/habit-tracker.spec.md"));
    if (!r.spec) throw new Error("parse failed");
    const firstScreen = r.spec.screens[0];
    if (!firstScreen) throw new Error("no screens");
    const barrelOut = render(r.spec, firstScreen.id);
    const directOut = renderDirect(r.spec, firstScreen.id);
    expect(barrelOut).toBe(directOut);
  });

  it("renderAllVariants is alias for render (v1)", async () => {
    const r = await parseSpecFile(resolve("fixtures/habit-tracker.spec.md"));
    if (!r.spec) throw new Error("parse failed");
    const firstScreen = r.spec.screens[0];
    if (!firstScreen) throw new Error("no screens");
    expect(renderAllVariants(r.spec, firstScreen.id)).toBe(render(r.spec, firstScreen.id));
  });
});
