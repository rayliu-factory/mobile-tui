// src/editor/commands/delete-relationship.ts
// delete-relationship command per D-54 + D-56.
//
// APPLY:
//   - Find entity; capture relationship JSON at index; remove
//   - AST-level (D-62): doc.deleteIn([..entityPath.., "relationships", index])
//   - inverseArgs: { entityName, index, relJSON }
//
// INVERT:
//   - Restore relationship at index via setIn rebuild
//
// THREAT T-04-ArgInjection: EntityNameSchema + z.coerce.number.
// THREAT T-04-ASTDrift: invert rebuilds relationships sequence.
import { z } from "zod";
import type { Entity, Relationship } from "../../model/data.ts";
import { EntityNameSchema } from "../../primitives/ids.ts";
import type { Command } from "../types.ts";

export const deleteRelationshipArgs = z.object({
  entity: EntityNameSchema,
  index: z.coerce.number().int().min(0),
});

type DeleteRelationshipArgs = z.infer<typeof deleteRelationshipArgs>;

interface DeleteRelationshipInverse {
  entityName: string;
  index: number;
  relJSON: Relationship;
}

export const deleteRelationship: Command<typeof deleteRelationshipArgs> = {
  name: "delete-relationship",
  argsSchema: deleteRelationshipArgs,

  apply(spec, astHandle, args: DeleteRelationshipArgs) {
    const entityIndex = spec.data.entities.findIndex((e) => e.name === args.entity);
    if (entityIndex === -1) {
      return {
        spec,
        inverseArgs: {
          entityName: args.entity,
          index: args.index,
          relJSON: null as unknown as Relationship,
        },
      };
    }

    const entity = spec.data.entities[entityIndex] as Entity;
    const existingRels = entity.relationships ?? [];
    if (args.index >= existingRels.length) {
      return {
        spec,
        inverseArgs: {
          entityName: args.entity,
          index: args.index,
          relJSON: null as unknown as Relationship,
        },
      };
    }

    // T-04-14: plain JS copy, never a live YAML node
    const relJSON = { ...existingRels[args.index] } as Relationship;
    const updatedRels = existingRels.filter((_, i) => i !== args.index);
    const updatedEntity: Entity = { ...entity, relationships: updatedRels };
    const newEntities = spec.data.entities.map((e, i) => (i === entityIndex ? updatedEntity : e));

    // AST-level: remove from sequence
    astHandle.doc.deleteIn([
      "data",
      "entities",
      entityIndex,
      "relationships",
      args.index,
    ]);

    const inverseArgs: DeleteRelationshipInverse = {
      entityName: args.entity,
      index: args.index,
      relJSON,
    };
    return { spec: { ...spec, data: { ...spec.data, entities: newEntities } }, inverseArgs };
  },

  invert(spec, astHandle, inverseArgs) {
    const { entityName, index, relJSON } = inverseArgs as DeleteRelationshipInverse;
    if (!relJSON) return { spec };

    const entityIndex = spec.data.entities.findIndex((e) => e.name === entityName);
    if (entityIndex === -1) return { spec };

    const entity = spec.data.entities[entityIndex] as Entity;
    const existingRels = entity.relationships ?? [];
    const restoredRels = [
      ...existingRels.slice(0, index),
      relJSON,
      ...existingRels.slice(index),
    ];
    const updatedEntity: Entity = { ...entity, relationships: restoredRels };
    const newEntities = spec.data.entities.map((e, i) => (i === entityIndex ? updatedEntity : e));

    // AST-level: rebuild relationships sequence
    astHandle.doc.setIn(
      ["data", "entities", entityIndex, "relationships"],
      astHandle.doc.createNode(restoredRels),
    );

    return { spec: { ...spec, data: { ...spec.data, entities: newEntities } } };
  },
};
