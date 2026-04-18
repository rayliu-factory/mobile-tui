// src/editor/commands/set-wizard-app-idea.ts
// set-wizard-app-idea command (Phase-6, Plan 01).
//
// APPLY:
//   - Spec-level: set spec.app_idea = value
//   - AST-level: setScalarPreserving(doc, ["app_idea"], value)
//   - inverseArgs: { prevValue: spec.app_idea | undefined }
//
// INVERT:
//   - If prevValue was undefined: delete key from spec (set to undefined)
//   - Otherwise: restore prevValue via setScalarPreserving
//
// THREAT T-06-ArgInjection: z.string().min(1) validates non-empty app idea.
// THREAT T-06-ASTDrift: invert fully reverses both spec + AST doc changes.
import { z } from "zod";
import { setScalarPreserving } from "../../serialize/write.ts";
import type { Command } from "../types.ts";

export const setWizardAppIdeaArgs = z.object({
  value: z.string().min(1, "app idea must be non-empty"),
});

type SetWizardAppIdeaArgs = z.infer<typeof setWizardAppIdeaArgs>;

interface SetWizardAppIdeaInverse {
  prevValue: string | undefined;
}

export const setWizardAppIdea: Command<typeof setWizardAppIdeaArgs> = {
  name: "set-wizard-app-idea",
  argsSchema: setWizardAppIdeaArgs,

  apply(spec, astHandle, args: SetWizardAppIdeaArgs) {
    const prevValue = spec.app_idea;

    setScalarPreserving(astHandle.doc, ["app_idea"], args.value);

    const inverseArgs: SetWizardAppIdeaInverse = { prevValue };
    return { spec: { ...spec, app_idea: args.value }, inverseArgs };
  },

  invert(spec, astHandle, inverseArgs) {
    const { prevValue } = inverseArgs as SetWizardAppIdeaInverse;

    if (prevValue === undefined) {
      // Key did not exist before — remove it from spec and AST
      const { app_idea: _, ...rest } = spec;
      astHandle.doc.delete("app_idea");
      return { spec: rest as typeof spec };
    }

    setScalarPreserving(astHandle.doc, ["app_idea"], prevValue);
    return { spec: { ...spec, app_idea: prevValue } };
  },
};
