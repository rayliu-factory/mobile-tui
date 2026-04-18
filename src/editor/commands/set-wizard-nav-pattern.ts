// src/editor/commands/set-wizard-nav-pattern.ts
// set-wizard-nav-pattern command (Phase-6, Plan 01).
//
// APPLY:
//   - Spec-level: set spec.nav_pattern = value (enum)
//   - AST-level: setScalarPreserving(doc, ["nav_pattern"], value)
//   - inverseArgs: { prevValue: spec.nav_pattern | undefined }
//
// INVERT:
//   - If prevValue was undefined: delete key from spec and AST
//   - Otherwise: restore prevValue via setScalarPreserving
//
// THREAT T-06-ArgInjection: z.enum validates against closed set of nav patterns.
// THREAT T-06-ASTDrift: invert fully reverses both spec + AST doc changes.
import { z } from "zod";
import { setScalarPreserving } from "../../serialize/write.ts";
import type { Command } from "../types.ts";

export const setWizardNavPatternArgs = z.object({
  value: z.enum(["tab_bar", "side_drawer", "stack", "modal_first"]),
});

type SetWizardNavPatternArgs = z.infer<typeof setWizardNavPatternArgs>;

type NavPattern = SetWizardNavPatternArgs["value"];

interface SetWizardNavPatternInverse {
  prevValue: NavPattern | undefined;
}

export const setWizardNavPattern: Command<typeof setWizardNavPatternArgs> = {
  name: "set-wizard-nav-pattern",
  argsSchema: setWizardNavPatternArgs,

  apply(spec, astHandle, args: SetWizardNavPatternArgs) {
    const prevValue = spec.nav_pattern;

    setScalarPreserving(astHandle.doc, ["nav_pattern"], args.value);

    const inverseArgs: SetWizardNavPatternInverse = { prevValue };
    return { spec: { ...spec, nav_pattern: args.value }, inverseArgs };
  },

  invert(spec, astHandle, inverseArgs) {
    const { prevValue } = inverseArgs as SetWizardNavPatternInverse;

    if (prevValue === undefined) {
      const { nav_pattern: _, ...rest } = spec;
      astHandle.doc.delete("nav_pattern");
      return { spec: rest as typeof spec };
    }

    setScalarPreserving(astHandle.doc, ["nav_pattern"], prevValue);
    return { spec: { ...spec, nav_pattern: prevValue } };
  },
};
