// src/model/navigation.ts
// Navigation graph — SPEC-03 shape coverage.
//
// A NavigationGraph declares:
//   root:  the starting screen (cross-ref in Plan 06 ensures it exists in screens[])
//   edges: directed links between screens. Each edge fires when an ActionId
//          trigger runs (typically a Button.action inside the `from` screen's
//          tree) and moves the user to `to` with an optional visual transition.
//
// DESIGN NOTE (D-12 / CONTEXT.md): back_behavior lives on Screen, NOT NavEdge,
// because back-behavior describes how the user leaves a screen REGARDLESS of
// which edge brought them there. Encoding it per-edge would duplicate the rule
// on every inbound edge and invite inconsistency.
//
// Closed transition vocabulary (5 values, per D-13): push / modal / sheet /
// replace / none. "modal" and "sheet" pair with overlay-kind screens; cross-ref
// (Plan 06) will eventually refuse `transition: modal` → a non-overlay target.
// Structural shape is here; cross-ref is Plan 06.
//
// Phase 1 .strict() on both NavEdge and NavigationGraph — unknown keys fail
// at parse time (T-01-03 defence-in-depth).
import { z } from "zod";
import { ActionIdSchema, ScreenIdSchema } from "../primitives/ids.ts";

export const TRANSITIONS = ["push", "modal", "sheet", "replace", "none"] as const;
export type NavTransition = (typeof TRANSITIONS)[number];

export const NavEdgeSchema = z
  .object({
    from: ScreenIdSchema,
    to: ScreenIdSchema,
    // trigger names an ActionId in the registry. Cross-ref (Plan 06) resolves it.
    trigger: ActionIdSchema,
    transition: z.enum(TRANSITIONS).optional(),
  })
  .strict();
export type NavEdge = z.infer<typeof NavEdgeSchema>;

export const NavigationGraphSchema = z
  .object({
    root: ScreenIdSchema,
    edges: z.array(NavEdgeSchema),
  })
  .strict();
export type NavigationGraph = z.infer<typeof NavigationGraphSchema>;
