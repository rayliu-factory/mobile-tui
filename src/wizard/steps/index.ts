// src/wizard/steps/index.ts
// STEP_DEFINITIONS array (ordered 8 entries) + firstUnansweredStep pure function.
// StepAction discriminated union for FormPane/step handler communication (Pitfall 5).
import type { Spec } from "../../model/index.ts";

export type StepAction =
  | { kind: "consumed" }
  | { kind: "advance"; args: unknown }
  | { kind: "passthrough" };

export interface StepDefinition {
  name: string; // D-91 step names
  question: string; // UI-SPEC copywriting
  specField: string; // wizard meta field key for display
  isAnswered: (spec: Spec) => boolean; // drives firstUnansweredStep
  getPrePopulate: (spec: Spec) => string; // D-97 pre-populate for single-input steps
  commandName: string; // store.apply call on advance
}

export const STEP_DEFINITIONS: StepDefinition[] = [
  {
    name: "App Idea",
    question: "What is your app idea? Describe it briefly.",
    specField: "app_idea",
    isAnswered: (spec) =>
      typeof (spec as Record<string, unknown>).app_idea === "string" &&
      ((spec as Record<string, unknown>).app_idea as string).trim().length > 0,
    getPrePopulate: (spec) =>
      ((spec as Record<string, unknown>).app_idea as string | undefined) ?? "",
    commandName: "set-wizard-app-idea",
  },
  {
    name: "Primary User",
    question: "Who is the primary user of this app?",
    specField: "primary_user",
    isAnswered: (spec) =>
      typeof (spec as Record<string, unknown>).primary_user === "string" &&
      ((spec as Record<string, unknown>).primary_user as string).trim().length > 0,
    getPrePopulate: (spec) =>
      ((spec as Record<string, unknown>).primary_user as string | undefined) ?? "",
    commandName: "set-wizard-primary-user",
  },
  {
    name: "Navigation Pattern",
    question: "What navigation pattern fits best? [tab_bar / side_drawer / stack / modal_first]",
    specField: "nav_pattern",
    isAnswered: (spec) => (spec as Record<string, unknown>).nav_pattern !== undefined,
    getPrePopulate: (spec) =>
      ((spec as Record<string, unknown>).nav_pattern as string | undefined) ?? "",
    commandName: "set-wizard-nav-pattern",
  },
  {
    name: "Screens",
    question: "Add screens one by one. Enter a screen name and press Enter. Tab when done.",
    specField: "screens",
    isAnswered: (spec) => spec.screens.length > 0 && spec.screens[0]?.id !== "placeholder",
    getPrePopulate: (_spec) => "", // Screens step manages list state internally
    commandName: "set-wizard-screens",
  },
  {
    name: "Auth",
    question:
      "What authentication method will this app use? [none / email_password / oauth / biometric / magic_link]",
    specField: "auth",
    isAnswered: (spec) => (spec as Record<string, unknown>).auth !== undefined,
    getPrePopulate: (spec) => ((spec as Record<string, unknown>).auth as string | undefined) ?? "",
    commandName: "set-wizard-auth",
  },
  {
    name: "Data",
    question: "Add data entities one by one. Enter an entity name and press Enter. Tab when done.",
    specField: "data",
    // Data step answered = entities exist, OR the next step (offline_sync) has been set
    isAnswered: (spec) =>
      spec.data.entities.length > 0 || (spec as Record<string, unknown>).offline_sync !== undefined,
    getPrePopulate: (_spec) => "", // Data step manages list state internally
    commandName: "add-entity",
  },
  {
    name: "Offline/Sync",
    question: "What offline/sync behavior does the app need? [none / read_only / full]",
    specField: "offline_sync",
    isAnswered: (spec) => (spec as Record<string, unknown>).offline_sync !== undefined,
    getPrePopulate: (spec) =>
      ((spec as Record<string, unknown>).offline_sync as string | undefined) ?? "",
    commandName: "set-wizard-offline-sync",
  },
  {
    name: "Target Platforms",
    question: "Which platforms will this app target? [ios / android / both]",
    specField: "target_platforms",
    isAnswered: (spec) => {
      const tp = (spec as Record<string, unknown>).target_platforms as string[] | undefined;
      return tp !== undefined && tp.length > 0;
    },
    getPrePopulate: (spec) => {
      const tp = (spec as Record<string, unknown>).target_platforms as string[] | undefined;
      return tp ? tp.join(", ") : "";
    },
    commandName: "set-wizard-target-platforms",
  },
];

/**
 * Pure function: scan STEP_DEFINITIONS for first unanswered step (D-96).
 * Returns index of first step where isAnswered() returns false.
 * If all 8 answered, returns 7 (last step index).
 */
export function firstUnansweredStep(spec: Spec): number {
  for (let i = 0; i < STEP_DEFINITIONS.length; i++) {
    const def = STEP_DEFINITIONS[i];
    if (def !== undefined && !def.isAnswered(spec)) return i;
  }
  return STEP_DEFINITIONS.length - 1;
}
