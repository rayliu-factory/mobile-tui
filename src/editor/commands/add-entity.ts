// src/editor/commands/add-entity.ts
// add-entity command per D-54 (exhaustive catalog) + D-56 (one-file-per-command).
// MVP D-55: minimum viable add-entity.
//
// APPLY:
//   - Spec-level: append Entity to spec.data.entities
//   - AST-level (D-62): doc.addIn(["data", "entities"], doc.createNode(entity))
//   - inverseArgs: { insertedIndex: spec.data.entities.length }
//
// INVERT:
//   - Spec-level: slice off the appended entity
//   - AST-level: doc.deleteIn(["data", "entities", insertedIndex])
//
// THREAT T-04-ArgInjection: argsSchema uses EntityNameSchema (PascalCase) + FieldSchema.
// THREAT T-04-ASTDrift: invert must fully reverse both spec + AST.
import { z } from "zod";
import type { Entity } from "../../model/data.ts";
import { FieldSchema } from "../../model/data.ts";
import { EntityNameSchema } from "../../primitives/ids.ts";
import type { Command } from "../types.ts";

export const addEntityArgs = z.object({
  name: EntityNameSchema,
  fields: z.array(FieldSchema).min(1, "entity must declare at least one field"),
});

type AddEntityArgs = z.infer<typeof addEntityArgs>;

interface AddEntityInverse {
  insertedIndex: number;
}

export const addEntity: Command<typeof addEntityArgs> = {
  name: "add-entity",
  argsSchema: addEntityArgs,

  apply(spec, astHandle, args: AddEntityArgs) {
    const insertedIndex = spec.data.entities.length;

    const newEntity: Entity = {
      name: args.name,
      fields: args.fields,
    };

    const newSpec = {
      ...spec,
      data: {
        ...spec.data,
        entities: [...spec.data.entities, newEntity],
      },
    };

    // AST-level (D-62): addIn appends to the YAML sequence
    astHandle.doc.addIn(["data", "entities"], astHandle.doc.createNode(newEntity));

    const inverseArgs: AddEntityInverse = { insertedIndex };
    return { spec: newSpec, inverseArgs };
  },

  invert(spec, astHandle, inverseArgs) {
    const { insertedIndex } = inverseArgs as AddEntityInverse;

    const restoredSpec = {
      ...spec,
      data: {
        ...spec.data,
        entities: spec.data.entities.slice(0, insertedIndex),
      },
    };

    // AST-level: remove the node that was added at insertedIndex
    astHandle.doc.deleteIn(["data", "entities", insertedIndex]);

    return { spec: restoredSpec };
  },
};
