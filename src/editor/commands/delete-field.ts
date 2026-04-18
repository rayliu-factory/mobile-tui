// src/editor/commands/delete-field.ts
// delete-field command per D-54 + D-56.
//
// APPLY:
//   - Find entity by name; find field by name; capture fieldJSON; remove
//   - AST-level (D-62): doc.deleteIn([..entityPath.., "fields", fieldIndex])
//   - inverseArgs: { entityName, fieldJSON, fieldIndex }
//
// INVERT:
//   - Restore field at fieldIndex
//
// THREAT T-04-ArgInjection: EntityNameSchema for entity; z.string() for field name.
// THREAT T-04-ASTDrift: invert rebuilds fields sequence via setIn.
import { z } from "zod";
import type { Entity, Field } from "../../model/data.ts";
import { EntityNameSchema } from "../../primitives/ids.ts";
import type { Command } from "../types.ts";

export const deleteFieldArgs = z.object({
  entity: EntityNameSchema,
  name: z.string().min(1),
});

type DeleteFieldArgs = z.infer<typeof deleteFieldArgs>;

interface DeleteFieldInverse {
  entityName: string;
  fieldJSON: Field;
  fieldIndex: number;
}

export const deleteField: Command<typeof deleteFieldArgs> = {
  name: "delete-field",
  argsSchema: deleteFieldArgs,

  apply(spec, astHandle, args: DeleteFieldArgs) {
    const entityIndex = spec.data.entities.findIndex((e) => e.name === args.entity);
    if (entityIndex === -1) {
      return {
        spec,
        inverseArgs: { entityName: args.entity, fieldJSON: null as unknown as Field, fieldIndex: -1 },
      };
    }

    const entity = spec.data.entities[entityIndex] as Entity;
    const fieldIndex = entity.fields.findIndex((f) => f.name === args.name);
    if (fieldIndex === -1) {
      return {
        spec,
        inverseArgs: { entityName: args.entity, fieldJSON: null as unknown as Field, fieldIndex: -1 },
      };
    }

    // T-04-14: plain JS copy, never a live YAML node
    const fieldJSON = { ...entity.fields[fieldIndex] } as Field;

    const updatedFields = entity.fields.filter((_, i) => i !== fieldIndex);
    const updatedEntity: Entity = { ...entity, fields: updatedFields };
    const newEntities = spec.data.entities.map((e, i) => (i === entityIndex ? updatedEntity : e));

    // AST-level: remove from sequence
    astHandle.doc.deleteIn(["data", "entities", entityIndex, "fields", fieldIndex]);

    const inverseArgs: DeleteFieldInverse = { entityName: args.entity, fieldJSON, fieldIndex };
    return { spec: { ...spec, data: { ...spec.data, entities: newEntities } }, inverseArgs };
  },

  invert(spec, astHandle, inverseArgs) {
    const { entityName, fieldJSON, fieldIndex } = inverseArgs as DeleteFieldInverse;
    if (fieldIndex === -1 || !fieldJSON) return { spec };

    const entityIndex = spec.data.entities.findIndex((e) => e.name === entityName);
    if (entityIndex === -1) return { spec };

    const entity = spec.data.entities[entityIndex] as Entity;
    const restoredFields = [
      ...entity.fields.slice(0, fieldIndex),
      fieldJSON,
      ...entity.fields.slice(fieldIndex),
    ];
    const updatedEntity: Entity = { ...entity, fields: restoredFields };
    const newEntities = spec.data.entities.map((e, i) => (i === entityIndex ? updatedEntity : e));

    // AST-level: rebuild fields sequence
    astHandle.doc.setIn(
      ["data", "entities", entityIndex, "fields"],
      astHandle.doc.createNode(restoredFields),
    );

    return { spec: { ...spec, data: { ...spec.data, entities: newEntities } } };
  },
};
