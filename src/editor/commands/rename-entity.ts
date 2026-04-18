// src/editor/commands/rename-entity.ts
// rename-entity command per D-54 + D-56 + cascade semantics.
//
// APPLY cascade:
//   1. entities[i].name: update to 'to'
//   2. Every Field.of that === from: update to 'to'
//   3. Every Action kind==="submit" where action.entity===from: update to 'to'
//   4. Every Relationship.from/to === from: update to 'to'
//
// INVERT:
//   - Re-apply with from/to swapped (same cascade)
//
// THREAT T-04-ArgInjection: EntityNameSchema enforces PascalCase.
// THREAT T-04-ASTDrift: setScalarPreserving for each cascade site.
import { z } from "zod";
import type { Action } from "../../model/action.ts";
import type { Entity } from "../../model/data.ts";
import type { Spec } from "../../model/spec.ts";
import type { EntityName } from "../../primitives/ids.ts";
import { EntityNameSchema } from "../../primitives/ids.ts";
import type { AstHandle } from "../../serialize/ast-handle.ts";
import { setScalarPreserving } from "../../serialize/write.ts";
import type { Command } from "../types.ts";

export const renameEntityArgs = z.object({
  from: EntityNameSchema,
  to: EntityNameSchema,
});

type RenameEntityArgs = z.infer<typeof renameEntityArgs>;

interface RenameEntityInverse {
  prevName: EntityName;
  newName: EntityName;
}

function renameEntityInSpec(
  spec: Spec,
  astHandle: AstHandle,
  from: EntityName,
  to: EntityName,
): Spec {
  // 1. Rename entity itself
  const newEntities: Entity[] = spec.data.entities.map((entity, entityIndex) => {
    let updatedEntity = entity;

    if (entity.name === from) {
      // Update entity name in AST
      setScalarPreserving(astHandle.doc, ["data", "entities", entityIndex, "name"], to);
      updatedEntity = { ...updatedEntity, name: to };
    }

    // 2. Cascade Field.of references within ALL entities
    const updatedFields = updatedEntity.fields.map((field, fieldIndex) => {
      if (field.type === "reference" && field.of === from) {
        setScalarPreserving(
          astHandle.doc,
          ["data", "entities", entityIndex, "fields", fieldIndex, "of"],
          to,
        );
        return { ...field, of: to };
      }
      return field;
    });

    // 4. Cascade Relationship.from/to
    const updatedRelationships = (updatedEntity.relationships ?? []).map((rel, relIndex) => {
      let updatedRel = rel;
      if (rel.from === from) {
        setScalarPreserving(
          astHandle.doc,
          ["data", "entities", entityIndex, "relationships", relIndex, "from"],
          to,
        );
        updatedRel = { ...updatedRel, from: to };
      }
      if (rel.to === from) {
        setScalarPreserving(
          astHandle.doc,
          ["data", "entities", entityIndex, "relationships", relIndex, "to"],
          to,
        );
        updatedRel = { ...updatedRel, to: to };
      }
      return updatedRel;
    });

    return {
      ...updatedEntity,
      fields: updatedFields,
      ...(updatedEntity.relationships !== undefined ? { relationships: updatedRelationships } : {}),
    };
  });

  // 3. Cascade Action.submit.entity
  const newActions: Record<string, Action> = {};
  for (const [actionId, action] of Object.entries(spec.actions)) {
    if (!action) continue;
    if (action.kind === "submit" && action.entity === from) {
      setScalarPreserving(astHandle.doc, ["actions", actionId, "entity"], to);
      newActions[actionId] = { ...action, entity: to };
    } else {
      newActions[actionId] = action;
    }
  }

  return {
    ...spec,
    data: { ...spec.data, entities: newEntities },
    actions: newActions,
  };
}

export const renameEntity: Command<typeof renameEntityArgs> = {
  name: "rename-entity",
  argsSchema: renameEntityArgs,

  apply(spec, astHandle, args: RenameEntityArgs) {
    const newSpec = renameEntityInSpec(spec, astHandle, args.from, args.to);
    const inverseArgs: RenameEntityInverse = { prevName: args.from, newName: args.to };
    return { spec: newSpec, inverseArgs };
  },

  invert(spec, astHandle, inverseArgs) {
    const { prevName, newName } = inverseArgs as RenameEntityInverse;
    const restoredSpec = renameEntityInSpec(spec, astHandle, newName, prevName);
    return { spec: restoredSpec };
  },
};
