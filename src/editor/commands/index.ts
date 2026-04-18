// src/editor/commands/index.ts — Phase-4 command registry barrel.
// Aggregates every mutable-spec command into a single COMMANDS Record
// for cli-edit dispatch and Phase-5 canvas command-palette enumeration.
//
// D-54: catalog is exhaustive over mutable Spec surface (~25-35 commands).
// D-56: per-command kebab-case names match filename AND CLI invocation.
// D-60: required args frozen post-ship; additions must be optional with defaults.
//
// Consumers:
//   - scripts/cli-edit.ts (argv dispatch via COMMANDS[commandName])
//   - src/editor/store.ts (apply pipeline lookup)
//   - Phase-5 canvas command palette (enumeration via COMMAND_NAMES)
//
// DO NOT use `export *` — adding a public name is a deliberate edit here.
import { addAction } from "./add-action.ts";
import { addComponent } from "./add-component.ts";
import { addEntity } from "./add-entity.ts";
import { addField } from "./add-field.ts";
import { addNavEdge } from "./add-nav-edge.ts";
import { addRelationship } from "./add-relationship.ts";
import { addScreen } from "./add-screen.ts";
import { deleteAction } from "./delete-action.ts";
import { deleteEntity } from "./delete-entity.ts";
import { deleteField } from "./delete-field.ts";
import { deleteNavEdge } from "./delete-nav-edge.ts";
import { deleteRelationship } from "./delete-relationship.ts";
import { deleteScreen } from "./delete-screen.ts";
import { moveComponent } from "./move-component.ts";
import { removeComponent } from "./remove-component.ts";
import { renameAction } from "./rename-action.ts";
import { renameEntity } from "./rename-entity.ts";
import { renameField } from "./rename-field.ts";
import { renameScreen } from "./rename-screen.ts";
import { reorderComponent } from "./reorder-component.ts";
import { setAcceptanceProse } from "./set-acceptance-prose.ts";
import { setActionEffect } from "./set-action-effect.ts";
import { setBackBehavior } from "./set-back-behavior.ts";
import { setComponentAction } from "./set-component-action.ts";
import { setComponentProp } from "./set-component-prop.ts";
import { setFieldType } from "./set-field-type.ts";
import { setNavRoot } from "./set-nav-root.ts";
import { setScreenKind } from "./set-screen-kind.ts";
import { setScreenTitle } from "./set-screen-title.ts";
import { setTabbarItems } from "./set-tabbar-items.ts";
import { setVariantNull } from "./set-variant-null.ts";
import { setVariantTree } from "./set-variant-tree.ts";
import { setVariantWhen } from "./set-variant-when.ts";
import { setWizardAppIdea } from "./set-wizard-app-idea.ts";
import { setWizardAuth } from "./set-wizard-auth.ts";
import { setWizardNavPattern } from "./set-wizard-nav-pattern.ts";
import { setWizardOfflineSync } from "./set-wizard-offline-sync.ts";
import { setWizardPrimaryUser } from "./set-wizard-primary-user.ts";
import { setWizardScreens } from "./set-wizard-screens.ts";
import { setWizardTargetPlatforms } from "./set-wizard-target-platforms.ts";
import { updateNavEdge } from "./update-nav-edge.ts";

export const COMMANDS = {
  "add-action": addAction,
  "add-component": addComponent,
  "add-entity": addEntity,
  "add-field": addField,
  "add-nav-edge": addNavEdge,
  "add-relationship": addRelationship,
  "add-screen": addScreen,
  "delete-action": deleteAction,
  "delete-entity": deleteEntity,
  "delete-field": deleteField,
  "delete-nav-edge": deleteNavEdge,
  "delete-relationship": deleteRelationship,
  "delete-screen": deleteScreen,
  "move-component": moveComponent,
  "remove-component": removeComponent,
  "rename-action": renameAction,
  "rename-entity": renameEntity,
  "rename-field": renameField,
  "rename-screen": renameScreen,
  "reorder-component": reorderComponent,
  "set-acceptance-prose": setAcceptanceProse,
  "set-action-effect": setActionEffect,
  "set-back-behavior": setBackBehavior,
  "set-component-action": setComponentAction,
  "set-component-prop": setComponentProp,
  "set-field-type": setFieldType,
  "set-nav-root": setNavRoot,
  "set-screen-kind": setScreenKind,
  "set-screen-title": setScreenTitle,
  "set-tabbar-items": setTabbarItems,
  "set-wizard-app-idea": setWizardAppIdea,
  "set-wizard-auth": setWizardAuth,
  "set-wizard-nav-pattern": setWizardNavPattern,
  "set-wizard-offline-sync": setWizardOfflineSync,
  "set-wizard-primary-user": setWizardPrimaryUser,
  "set-wizard-screens": setWizardScreens,
  "set-wizard-target-platforms": setWizardTargetPlatforms,
  "set-variant-null": setVariantNull,
  "set-variant-tree": setVariantTree,
  "set-variant-when": setVariantWhen,
  "update-nav-edge": updateNavEdge,
} as const;

export const COMMAND_NAMES = Object.keys(COMMANDS) as Array<keyof typeof COMMANDS>;
export type CommandName = keyof typeof COMMANDS;
