// src/editor/commands/set-wizard-primary-user.ts
// set-wizard-primary-user command (Phase-6, Plan 01).
//
// APPLY:
//   - Spec-level: set spec.primary_user = value
//   - AST-level: setScalarPreserving(doc, ["primary_user"], value)
//   - inverseArgs: { prevValue: spec.primary_user | undefined }
//
// INVERT:
//   - If prevValue was undefined: delete key from spec and AST
//   - Otherwise: restore prevValue via setScalarPreserving
//
// THREAT T-06-ArgInjection: z.string().min(1) validates non-empty primary user.
// THREAT T-06-ASTDrift: invert fully reverses both spec + AST doc changes.
import { z } from "zod";
import { setScalarPreserving } from "../../serialize/write.ts";
import type { Command } from "../types.ts";

export const setWizardPrimaryUserArgs = z.object({
  value: z.string().min(1, "primary user must be non-empty"),
});

type SetWizardPrimaryUserArgs = z.infer<typeof setWizardPrimaryUserArgs>;

interface SetWizardPrimaryUserInverse {
  prevValue: string | undefined;
}

export const setWizardPrimaryUser: Command<typeof setWizardPrimaryUserArgs> = {
  name: "set-wizard-primary-user",
  argsSchema: setWizardPrimaryUserArgs,

  apply(spec, astHandle, args: SetWizardPrimaryUserArgs) {
    const prevValue = spec.primary_user;

    setScalarPreserving(astHandle.doc, ["primary_user"], args.value);

    const inverseArgs: SetWizardPrimaryUserInverse = { prevValue };
    return { spec: { ...spec, primary_user: args.value }, inverseArgs };
  },

  invert(spec, astHandle, inverseArgs) {
    const { prevValue } = inverseArgs as SetWizardPrimaryUserInverse;

    if (prevValue === undefined) {
      const { primary_user: _, ...rest } = spec;
      astHandle.doc.delete("primary_user");
      return { spec: rest as typeof spec };
    }

    setScalarPreserving(astHandle.doc, ["primary_user"], prevValue);
    return { spec: { ...spec, primary_user: prevValue } };
  },
};
