// src/editor/commands/set-wizard-auth.ts
// set-wizard-auth command (Phase-6, Plan 01).
//
// APPLY:
//   - Spec-level: set spec.auth = value (enum)
//   - AST-level: setScalarPreserving(doc, ["auth"], value)
//   - inverseArgs: { prevValue: spec.auth | undefined }
//
// INVERT:
//   - If prevValue was undefined: delete key from spec and AST
//   - Otherwise: restore prevValue via setScalarPreserving
//
// THREAT T-06-ArgInjection: z.enum validates against closed set of auth types.
// THREAT T-06-ASTDrift: invert fully reverses both spec + AST doc changes.
import { z } from "zod";
import { setScalarPreserving } from "../../serialize/write.ts";
import type { Command } from "../types.ts";

export const setWizardAuthArgs = z.object({
  value: z.enum(["none", "email_password", "oauth", "biometric", "magic_link"]),
});

type SetWizardAuthArgs = z.infer<typeof setWizardAuthArgs>;

type AuthKind = SetWizardAuthArgs["value"];

interface SetWizardAuthInverse {
  prevValue: AuthKind | undefined;
}

export const setWizardAuth: Command<typeof setWizardAuthArgs> = {
  name: "set-wizard-auth",
  argsSchema: setWizardAuthArgs,

  apply(spec, astHandle, args: SetWizardAuthArgs) {
    const prevValue = spec.auth;

    setScalarPreserving(astHandle.doc, ["auth"], args.value);

    const inverseArgs: SetWizardAuthInverse = { prevValue };
    return { spec: { ...spec, auth: args.value }, inverseArgs };
  },

  invert(spec, astHandle, inverseArgs) {
    const { prevValue } = inverseArgs as SetWizardAuthInverse;

    if (prevValue === undefined) {
      const { auth: _, ...rest } = spec;
      astHandle.doc.delete("auth");
      return { spec: rest as typeof spec };
    }

    setScalarPreserving(astHandle.doc, ["auth"], prevValue);
    return { spec: { ...spec, auth: prevValue } };
  },
};
