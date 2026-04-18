// src/editor/commands/add-relationship.ts
// add-relationship command per D-54 + D-56.
//
// APPLY:
//   - Find entity by name; push Relationship
//   - AST-level (D-62): doc.addIn([..entityPath.., "relationships"], doc.createNode({from, to, kind}))
//   - inverseArgs: { entityName, insertedRelIndex }
//
// INVERT:
//   - Remove by index via doc.deleteIn
//
// THREAT T-04-ArgInjection: EntityNameSchema + z.enum for relationship kind.
// THREAT T-04-ASTDrift: invert must reverse both spec + AST.
import { z } from "zod";
import type { Entity, Relationship, RelationshipKind } from "../../model/data.ts";
import { EntityNameSchema } from "../../primitives/ids.ts";
import type { Command } from "../types.ts";

const RELATIONSHIP_KINDS = ["has_one", "has_many", "belongs_to"] as const;

export const addRelationshipArgs = z.object({
  entity: EntityNameSchema,
  from: EntityNameSchema,
  to: EntityNameSchema,
  kind: z.enum(RELATIONSHIP_KINDS),
});

type AddRelationshipArgs = z.infer<typeof addRelationshipArgs>;

interface AddRelationshipInverse {
  entityName: string;
  insertedRelIndex: number;
}

export const addRelationship: Command<typeof addRelationshipArgs> = {
  name: "add-relationship",
  argsSchema: addRelationshipArgs,

  apply(spec, astHandle, args: AddRelationshipArgs) {
    const entityIndex = spec.data.entities.findIndex((e) => e.name === args.entity);
    if (entityIndex === -1) {
      return {
        spec,
        inverseArgs: { entityName: args.entity, insertedRelIndex: -1 },
      };
    }

    const entity = spec.data.entities[entityIndex] as Entity;
    const existingRels = entity.relationships ?? [];
    const insertedRelIndex = existingRels.length;

    const newRel: Relationship = { from: args.from, to: args.to, kind: args.kind as RelationshipKind };
    const updatedRels = [...existingRels, newRel];
    const updatedEntity: Entity = { ...entity, relationships: updatedRels };
    const newEntities = spec.data.entities.map((e, i) => (i === entityIndex ? updatedEntity : e));

    // AST-level: ensure relationships key exists then addIn
    if (!astHandle.doc.hasIn(["data", "entities", entityIndex, "relationships"])) {
      astHandle.doc.setIn(
        ["data", "entities", entityIndex, "relationships"],
        astHandle.doc.createNode([]),
      );
    }
    astHandle.doc.addIn(
      ["data", "entities", entityIndex, "relationships"],
      astHandle.doc.createNode(newRel),
    );

    const inverseArgs: AddRelationshipInverse = { entityName: args.entity, insertedRelIndex };
    return { spec: { ...spec, data: { ...spec.data, entities: newEntities } }, inverseArgs };
  },

  invert(spec, astHandle, inverseArgs) {
    const { entityName, insertedRelIndex } = inverseArgs as AddRelationshipInverse;
    if (insertedRelIndex === -1) return { spec };

    const entityIndex = spec.data.entities.findIndex((e) => e.name === entityName);
    if (entityIndex === -1) return { spec };

    const entity = spec.data.entities[entityIndex] as Entity;
    const existingRels = entity.relationships ?? [];
    const updatedRels = existingRels.filter((_, i) => i !== insertedRelIndex);
    const updatedEntity: Entity = { ...entity, relationships: updatedRels };
    const newEntities = spec.data.entities.map((e, i) => (i === entityIndex ? updatedEntity : e));

    // AST-level: remove from sequence
    astHandle.doc.deleteIn([
      "data",
      "entities",
      entityIndex,
      "relationships",
      insertedRelIndex,
    ]);

    return { spec: { ...spec, data: { ...spec.data, entities: newEntities } } };
  },
};
