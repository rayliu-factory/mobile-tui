// src/editor/commands/rename-field.ts
// rename-field command per D-54 + D-56.
//
// APPLY:
//   - Find entity by name; find field by from name; update field name to 'to'
//   - AST-level (D-62): setScalarPreserving for the scalar name field
//   - inverseArgs: { entityName, fieldIndex, prevName }
//
// INVERT:
//   - Rename back from 'to' to 'from'
//
// THREAT T-04-ArgInjection: EntityNameSchema + z.string() for field name.
// THREAT T-04-ASTDrift: setScalarPreserving mirrors the spec mutation.
import { z } from "zod";
import type { Entity } from "../../model/data.ts";
import { EntityNameSchema } from "../../primitives/ids.ts";
import { setScalarPreserving } from "../../serialize/write.ts";
import type { Command } from "../types.ts";

export const renameFieldArgs = z.object({
  entity: EntityNameSchema,
  from: z.string().min(1),
  to: z.string().min(1),
});

type RenameFieldArgs = z.infer<typeof renameFieldArgs>;

interface RenameFieldInverse {
  entityName: string;
  fieldIndex: number;
  prevName: string;
}

export const renameField: Command<typeof renameFieldArgs> = {
  name: "rename-field",
  argsSchema: renameFieldArgs,

  apply(spec, astHandle, args: RenameFieldArgs) {
    const entityIndex = spec.data.entities.findIndex((e) => e.name === args.entity);
    if (entityIndex === -1) {
      return {
        spec,
        inverseArgs: { entityName: args.entity, fieldIndex: -1, prevName: args.from },
      };
    }

    const entity = spec.data.entities[entityIndex] as Entity;
    const fieldIndex = entity.fields.findIndex((f) => f.name === args.from);
    if (fieldIndex === -1) {
      return {
        spec,
        inverseArgs: { entityName: args.entity, fieldIndex: -1, prevName: args.from },
      };
    }

    // AST-level scalar edit
    setScalarPreserving(
      astHandle.doc,
      ["data", "entities", entityIndex, "fields", fieldIndex, "name"],
      args.to,
    );

    const updatedFields = entity.fields.map((f, i) =>
      i === fieldIndex ? { ...f, name: args.to } : f,
    );
    const updatedEntity: Entity = { ...entity, fields: updatedFields };
    const newEntities = spec.data.entities.map((e, i) => (i === entityIndex ? updatedEntity : e));

    const inverseArgs: RenameFieldInverse = {
      entityName: args.entity,
      fieldIndex,
      prevName: args.from,
    };
    return { spec: { ...spec, data: { ...spec.data, entities: newEntities } }, inverseArgs };
  },

  invert(spec, astHandle, inverseArgs) {
    const { entityName, fieldIndex, prevName } = inverseArgs as RenameFieldInverse;
    if (fieldIndex === -1) return { spec };

    const entityIndex = spec.data.entities.findIndex((e) => e.name === entityName);
    if (entityIndex === -1) return { spec };

    const entity = spec.data.entities[entityIndex] as Entity;

    // Get the current name (the 'to' value that was set during apply)
    const currentField = entity.fields[fieldIndex];
    if (!currentField) return { spec };

    // AST-level: restore prevName
    setScalarPreserving(
      astHandle.doc,
      ["data", "entities", entityIndex, "fields", fieldIndex, "name"],
      prevName,
    );

    const updatedFields = entity.fields.map((f, i) =>
      i === fieldIndex ? { ...f, name: prevName } : f,
    );
    const updatedEntity: Entity = { ...entity, fields: updatedFields };
    const newEntities = spec.data.entities.map((e, i) => (i === entityIndex ? updatedEntity : e));

    return { spec: { ...spec, data: { ...spec.data, entities: newEntities } } };
  },
};
