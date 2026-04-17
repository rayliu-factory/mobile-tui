// Back-behavior vocabulary per CONTEXT.md Claude's Discretion.
// Required on every non-root screen (cross-ref validation in Plan 06).
import { z } from "zod";
import { ScreenIdSchema } from "../primitives/ids.ts";

export const BackBehaviorSchema = z.union([
  z.literal("pop"),
  z.literal("dismiss"),
  z.literal("reset-to-root"),
  z
    .object({
      kind: z.literal("replace"),
      screen: ScreenIdSchema,
    })
    .strict(),
]);

export type BackBehavior = z.infer<typeof BackBehaviorSchema>;
