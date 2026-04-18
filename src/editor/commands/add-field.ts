// src/editor/commands/add-field.ts
// add-field command per D-54 + D-56. MVP D-55.
//
// APPLY:
//   - Find entity by name; append field to fields array
//   - AST-level (D-62): doc.addIn([..entityPath.., "fields"], doc.createNode(field))
//   - inverseArgs: { entity, insertedFieldIndex }
//
// INVERT:
//   - Remove field at insertedFieldIndex via full fields rebuild
//
// THREAT T-04-ArgInjection: EntityNameSchema + FieldSchema validation.
// THREAT T-04-ASTDrift: invert must restore both spec + AST.
import { z } from "zod";
import type { Entity } from "../../model/data.ts";
import { FieldSchema } from "../../model/data.ts";
import { EntityNameSchema } from "../../primitives/ids.ts";
import type { Command } from "../types.ts";

export const addFieldArgs = z.object({
  entity: EntityNameSchema,
  field: FieldSchema,
});

type AddFieldArgs = z.infer<typeof addFieldArgs>;

interface AddFieldInverse {
  entityName: string;
  insertedFieldIndex: number;
}

export const addField: Command<typeof addFieldArgs> = {
  name: "add-field",
  argsSchema: addFieldArgs,

  apply(spec, astHandle, args: AddFieldArgs) {
    const entityIndex = spec.data.entities.findIndex((e) => e.name === args.entity);
    if (entityIndex === -1) {
      return { spec, inverseArgs: { entityName: args.entity, insertedFieldIndex: -1 } };
    }

    const entity = spec.data.entities[entityIndex] as Entity;
    const insertedFieldIndex = entity.fields.length;

    const updatedEntity: Entity = {
      ...entity,
      fields: [...entity.fields, args.field],
    };

    const newEntities = spec.data.entities.map((e, i) => (i === entityIndex ? updatedEntity : e));

    // AST-level: addIn appends to the fields sequence
    astHandle.doc.addIn(
      ["data", "entities", entityIndex, "fields"],
      astHandle.doc.createNode(args.field),
    );

    const inverseArgs: AddFieldInverse = { entityName: args.entity, insertedFieldIndex };
    return { spec: { ...spec, data: { ...spec.data, entities: newEntities } }, inverseArgs };
  },

  invert(spec, astHandle, inverseArgs) {
    const { entityName, insertedFieldIndex } = inverseArgs as AddFieldInverse;

    if (insertedFieldIndex === -1) return { spec };

    const entityIndex = spec.data.entities.findIndex((e) => e.name === entityName);
    if (entityIndex === -1) return { spec };

    const entity = spec.data.entities[entityIndex] as Entity;
    const restoredFields = entity.fields.filter((_, i) => i !== insertedFieldIndex);

    const updatedEntity: Entity = { ...entity, fields: restoredFields };
    const newEntities = spec.data.entities.map((e, i) => (i === entityIndex ? updatedEntity : e));

    // AST-level: remove the appended field
    astHandle.doc.deleteIn(["data", "entities", entityIndex, "fields", insertedFieldIndex]);

    return { spec: { ...spec, data: { ...spec.data, entities: newEntities } } };
  },
};
