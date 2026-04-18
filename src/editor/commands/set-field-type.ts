// src/editor/commands/set-field-type.ts
// set-field-type command per D-54 + D-56.
//
// APPLY:
//   - Find entity + field; update type (and optional 'of' for reference type)
//   - AST-level (D-62): setScalarPreserving for type; setIn/deleteIn for 'of'
//   - inverseArgs: { entityName, fieldIndex, prevType, prevOf }
//
// INVERT:
//   - Restore prevType + prevOf
//
// THREAT T-04-ArgInjection: z.enum for field type.
// THREAT T-04-ASTDrift: both scalar type and optional 'of' must be reversed.
import { z } from "zod";
import type { Entity, FieldType } from "../../model/data.ts";
import { FIELD_TYPES } from "../../model/data.ts";
import type { EntityName } from "../../primitives/ids.ts";
import { EntityNameSchema } from "../../primitives/ids.ts";
import { setScalarPreserving } from "../../serialize/write.ts";
import type { Command } from "../types.ts";

export const setFieldTypeArgs = z.object({
  entity: EntityNameSchema,
  fieldName: z.string().min(1),
  type: z.enum(FIELD_TYPES),
  of: EntityNameSchema.optional(),
});

type SetFieldTypeArgs = z.infer<typeof setFieldTypeArgs>;

interface SetFieldTypeInverse {
  entityName: string;
  fieldIndex: number;
  prevType: FieldType;
  prevOf: EntityName | undefined;
}

export const setFieldType: Command<typeof setFieldTypeArgs> = {
  name: "set-field-type",
  argsSchema: setFieldTypeArgs,

  apply(spec, astHandle, args: SetFieldTypeArgs) {
    const entityIndex = spec.data.entities.findIndex((e) => e.name === args.entity);
    if (entityIndex === -1) {
      return {
        spec,
        inverseArgs: {
          entityName: args.entity,
          fieldIndex: -1,
          prevType: "string" as FieldType,
          prevOf: undefined,
        },
      };
    }

    const entity = spec.data.entities[entityIndex] as Entity;
    const fieldIndex = entity.fields.findIndex((f) => f.name === args.fieldName);
    if (fieldIndex === -1) {
      return {
        spec,
        inverseArgs: {
          entityName: args.entity,
          fieldIndex: -1,
          prevType: "string" as FieldType,
          prevOf: undefined,
        },
      };
    }

    const field = entity.fields[fieldIndex]!;
    const prevType = field.type;
    const prevOf = field.of;

    // AST scalar edit for type
    setScalarPreserving(
      astHandle.doc,
      ["data", "entities", entityIndex, "fields", fieldIndex, "type"],
      args.type,
    );

    // Handle 'of' field
    if (args.type === "reference" && args.of !== undefined) {
      setScalarPreserving(
        astHandle.doc,
        ["data", "entities", entityIndex, "fields", fieldIndex, "of"],
        args.of,
      );
    } else if (args.type !== "reference" && field.of !== undefined) {
      // Remove 'of' if switching away from reference type
      if (astHandle.doc.hasIn(["data", "entities", entityIndex, "fields", fieldIndex, "of"])) {
        astHandle.doc.deleteIn(["data", "entities", entityIndex, "fields", fieldIndex, "of"]);
      }
    }

    const updatedField = {
      ...field,
      type: args.type,
      ...(args.type === "reference" && args.of !== undefined ? { of: args.of } : { of: undefined }),
    };
    // Remove undefined 'of' from the object
    if (updatedField.of === undefined) {
      const { of: _removed, ...rest } = updatedField;
      const updatedFields = entity.fields.map((f, i) => (i === fieldIndex ? rest : f));
      const updatedEntity: Entity = { ...entity, fields: updatedFields };
      const newEntities = spec.data.entities.map((e, i) => (i === entityIndex ? updatedEntity : e));
      return {
        spec: { ...spec, data: { ...spec.data, entities: newEntities } },
        inverseArgs: {
          entityName: args.entity,
          fieldIndex,
          prevType,
          prevOf,
        } satisfies SetFieldTypeInverse,
      };
    }

    const updatedFields = entity.fields.map((f, i) => (i === fieldIndex ? updatedField : f));
    const updatedEntity: Entity = { ...entity, fields: updatedFields };
    const newEntities = spec.data.entities.map((e, i) => (i === entityIndex ? updatedEntity : e));

    const inverseArgs: SetFieldTypeInverse = {
      entityName: args.entity,
      fieldIndex,
      prevType,
      prevOf,
    };
    return { spec: { ...spec, data: { ...spec.data, entities: newEntities } }, inverseArgs };
  },

  invert(spec, astHandle, inverseArgs) {
    const { entityName, fieldIndex, prevType, prevOf } = inverseArgs as SetFieldTypeInverse;
    if (fieldIndex === -1) return { spec };

    const entityIndex = spec.data.entities.findIndex((e) => e.name === entityName);
    if (entityIndex === -1) return { spec };

    const entity = spec.data.entities[entityIndex] as Entity;
    const field = entity.fields[fieldIndex];
    if (!field) return { spec };

    // Restore type
    setScalarPreserving(
      astHandle.doc,
      ["data", "entities", entityIndex, "fields", fieldIndex, "type"],
      prevType,
    );

    // Restore 'of'
    if (prevOf !== undefined) {
      setScalarPreserving(
        astHandle.doc,
        ["data", "entities", entityIndex, "fields", fieldIndex, "of"],
        prevOf,
      );
    } else if (field.of !== undefined) {
      if (astHandle.doc.hasIn(["data", "entities", entityIndex, "fields", fieldIndex, "of"])) {
        astHandle.doc.deleteIn(["data", "entities", entityIndex, "fields", fieldIndex, "of"]);
      }
    }

    const restoredField = {
      ...field,
      type: prevType,
      ...(prevOf !== undefined ? { of: prevOf } : {}),
    };
    if (prevOf === undefined) {
      const { of: _removed, ...rest } = restoredField;
      const updatedFields = entity.fields.map((f, i) => (i === fieldIndex ? rest : f));
      const updatedEntity: Entity = { ...entity, fields: updatedFields };
      const newEntities = spec.data.entities.map((e, i) => (i === entityIndex ? updatedEntity : e));
      return { spec: { ...spec, data: { ...spec.data, entities: newEntities } } };
    }

    const updatedFields = entity.fields.map((f, i) => (i === fieldIndex ? restoredField : f));
    const updatedEntity: Entity = { ...entity, fields: updatedFields };
    const newEntities = spec.data.entities.map((e, i) => (i === entityIndex ? updatedEntity : e));

    return { spec: { ...spec, data: { ...spec.data, entities: newEntities } } };
  },
};
