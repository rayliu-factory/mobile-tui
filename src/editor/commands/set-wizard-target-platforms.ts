// src/editor/commands/set-wizard-target-platforms.ts
// set-wizard-target-platforms command (Phase-6, Plan 01).
//
// APPLY:
//   - Spec-level: set spec.target_platforms = value (string[] of "ios"|"android")
//   - AST-level: astHandle.doc.set("target_platforms", value) for array replacement
//   - inverseArgs: { prevValue: spec.target_platforms | undefined }
//
// INVERT:
//   - If prevValue was undefined: delete key from spec and AST
//   - Otherwise: restore prevValue
//
// THREAT T-06-ArgInjection: z.array(z.enum([...])).min(1) validates closed platform set.
// THREAT T-06-ASTDrift: invert fully reverses both spec + AST doc changes.
import { z } from "zod";
import type { Command } from "../types.ts";

export const setWizardTargetPlatformsArgs = z.object({
  value: z.array(z.enum(["ios", "android"])).min(1, "at least one platform required"),
});

type SetWizardTargetPlatformsArgs = z.infer<typeof setWizardTargetPlatformsArgs>;

type Platform = "ios" | "android";

interface SetWizardTargetPlatformsInverse {
  prevValue: Platform[] | undefined;
}

export const setWizardTargetPlatforms: Command<typeof setWizardTargetPlatformsArgs> = {
  name: "set-wizard-target-platforms",
  argsSchema: setWizardTargetPlatformsArgs,

  apply(spec, astHandle, args: SetWizardTargetPlatformsArgs) {
    const prevValue = spec.target_platforms as Platform[] | undefined;

    // Array replacement — use doc.set for the whole key
    astHandle.doc.set("target_platforms", args.value);

    const inverseArgs: SetWizardTargetPlatformsInverse = { prevValue };
    return {
      spec: { ...spec, target_platforms: args.value as Platform[] },
      inverseArgs,
    };
  },

  invert(spec, astHandle, inverseArgs) {
    const { prevValue } = inverseArgs as SetWizardTargetPlatformsInverse;

    if (prevValue === undefined) {
      const { target_platforms: _, ...rest } = spec;
      astHandle.doc.delete("target_platforms");
      return { spec: rest as typeof spec };
    }

    astHandle.doc.set("target_platforms", prevValue);
    return { spec: { ...spec, target_platforms: prevValue } };
  },
};
