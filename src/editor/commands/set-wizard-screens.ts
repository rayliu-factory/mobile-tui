// src/editor/commands/set-wizard-screens.ts
// set-wizard-screens command (Phase-6, Plan 01).
// Wizard step 4: bulk-replace spec.screens[] from user-provided screen names.
//
// APPLY:
//   - Convert names to Screen objects (slug id, content variant, no actions)
//   - Replace spec.screens entirely
//   - Update navigation.root to first screen's id
//   - AST-level: doc.set("screens", newScreensValue) + doc.setIn(["navigation","root"], newRoot)
//   - inverseArgs: { prevScreens, prevNavRoot }
//
// INVERT:
//   - Restore prevScreens and prevNavRoot
//
// THREAT T-06-ArgInjection: z.string().min(1) per name; z.array().min(1) overall.
// THREAT T-06-02: kebab slug strips non-alnum chars from screen name → id.
// THREAT T-06-ASTDrift: invert fully reverses both spec + AST doc changes.
import { z } from "zod";
import type { Screen } from "../../model/index.ts";
import type { ScreenId } from "../../primitives/ids.ts";
import { setScalarPreserving } from "../../serialize/write.ts";
import type { Command } from "../types.ts";

export const setWizardScreensArgs = z.object({
  names: z
    .array(z.string().min(1, "screen name must be non-empty"))
    .min(1, "at least one screen required"),
});

type SetWizardScreensArgs = z.infer<typeof setWizardScreensArgs>;

interface SetWizardScreensInverse {
  prevScreens: Screen[];
  prevNavRoot: ScreenId;
}

/**
 * Convert a screen name string to a kebab-case id.
 * T-06-02: strips non-alnum chars to prevent injection into YAML ids.
 */
function nameToId(name: string): ScreenId {
  const slug = name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+|-+$/g, ""); // trim leading/trailing dashes

  // Fall back to a hash-based id if slug is empty (e.g. all-symbol input "!!!") (WR-04)
  if (slug.length === 0) {
    return `screen-${Math.abs(name.split("").reduce((a, c) => a * 31 + c.charCodeAt(0), 0)) % 9999}` as ScreenId;
  }
  return slug as ScreenId;
}

/**
 * Build a minimal Screen object from a wizard-provided name.
 * first=true → no back_behavior (root screen has none).
 * first=false → back_behavior: "stack" (default for non-root screens).
 */
function buildScreen(name: string, first: boolean): Screen {
  return {
    id: nameToId(name),
    title: name,
    kind: "regular",
    // Root screen has no back_behavior (enforced by cross-ref in Plan 06).
    // Non-root screens default to "pop" — the standard stack navigation behavior.
    // DEVIATION: plan said "stack" but valid BackBehavior is "pop" | "dismiss" |
    // "reset-to-root" | { kind: "replace", screen }. "pop" is the correct choice.
    ...(first ? {} : { back_behavior: "pop" as const }),
    variants: {
      content: { kind: "content" as const, tree: [] },
      empty: null,
      loading: null,
      error: null,
    },
  };
}

export const setWizardScreens: Command<typeof setWizardScreensArgs> = {
  name: "set-wizard-screens",
  argsSchema: setWizardScreensArgs,

  apply(spec, astHandle, args: SetWizardScreensArgs) {
    const prevScreens = spec.screens;
    const prevNavRoot = spec.navigation.root;

    const newScreens = args.names.map((name, i) => buildScreen(name, i === 0));
    const newRoot = newScreens[0]?.id ?? prevNavRoot;

    // AST-level: replace the whole screens array + update nav root
    astHandle.doc.set("screens", newScreens);
    setScalarPreserving(astHandle.doc, ["navigation", "root"], newRoot);

    const inverseArgs: SetWizardScreensInverse = { prevScreens, prevNavRoot };
    return {
      spec: {
        ...spec,
        screens: newScreens,
        navigation: { ...spec.navigation, root: newRoot },
      },
      inverseArgs,
    };
  },

  invert(spec, astHandle, inverseArgs) {
    const { prevScreens, prevNavRoot } = inverseArgs as SetWizardScreensInverse;

    astHandle.doc.set("screens", prevScreens);
    setScalarPreserving(astHandle.doc, ["navigation", "root"], prevNavRoot);

    return {
      spec: {
        ...spec,
        screens: prevScreens,
        navigation: { ...spec.navigation, root: prevNavRoot },
      },
    };
  },
};
