// src/editor/commands/set-wizard-offline-sync.ts
// set-wizard-offline-sync command (Phase-6, Plan 01).
//
// APPLY:
//   - Spec-level: set spec.offline_sync = value (enum)
//   - AST-level: setScalarPreserving(doc, ["offline_sync"], value)
//   - inverseArgs: { prevValue: spec.offline_sync | undefined }
//
// INVERT:
//   - If prevValue was undefined: delete key from spec and AST
//   - Otherwise: restore prevValue via setScalarPreserving
//
// THREAT T-06-ArgInjection: z.enum validates against closed set of sync modes.
// THREAT T-06-ASTDrift: invert fully reverses both spec + AST doc changes.
import { z } from "zod";
import { setScalarPreserving } from "../../serialize/write.ts";
import type { Command } from "../types.ts";

export const setWizardOfflineSyncArgs = z.object({
  value: z.enum(["none", "read_only", "full"]),
});

type SetWizardOfflineSyncArgs = z.infer<typeof setWizardOfflineSyncArgs>;

type OfflineSyncMode = SetWizardOfflineSyncArgs["value"];

interface SetWizardOfflineSyncInverse {
  prevValue: OfflineSyncMode | undefined;
}

export const setWizardOfflineSync: Command<typeof setWizardOfflineSyncArgs> = {
  name: "set-wizard-offline-sync",
  argsSchema: setWizardOfflineSyncArgs,

  apply(spec, astHandle, args: SetWizardOfflineSyncArgs) {
    const prevValue = spec.offline_sync;

    setScalarPreserving(astHandle.doc, ["offline_sync"], args.value);

    const inverseArgs: SetWizardOfflineSyncInverse = { prevValue };
    return { spec: { ...spec, offline_sync: args.value }, inverseArgs };
  },

  invert(spec, astHandle, inverseArgs) {
    const { prevValue } = inverseArgs as SetWizardOfflineSyncInverse;

    if (prevValue === undefined) {
      const { offline_sync: _, ...rest } = spec;
      astHandle.doc.delete("offline_sync");
      return { spec: rest as typeof spec };
    }

    setScalarPreserving(astHandle.doc, ["offline_sync"], prevValue);
    return { spec: { ...spec, offline_sync: prevValue } };
  },
};
