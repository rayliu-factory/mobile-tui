// src/editor/commands/delete-entity.ts
// delete-entity command per D-54 + D-56.
//
// APPLY:
//   - Capture entity JSON (plain JS, T-04-14 pattern)
//   - Remove from spec.data.entities
//   - Remove relationships where from===name OR to===name from ALL entities
//   - AST-level: doc.deleteIn(["data", "entities", entityIndex])
//   - Emit EDITOR_REF_CASCADE_INCOMPLETE info for any orphan refs (handled upstream)
//   - inverseArgs: { entityJSON, entityIndex, removedRelationships }
//
// INVERT:
//   - Restore entity at entityIndex via doc.setIn (full rebuild)
//   - Restore removed relationships
//
// THREAT T-04-ArgInjection: EntityNameSchema enforces PascalCase.
// THREAT T-04-18: EDITOR_REF_CASCADE_INCOMPLETE emitted for orphan Field.of + Action.submit refs.
import { z } from "zod";
import type { Entity, Relationship } from "../../model/data.ts";
import type { Spec } from "../../model/index.ts";
import type { Diagnostic } from "../../primitives/diagnostic.ts";
import { info } from "../../primitives/diagnostic.ts";
import type { JsonPointer } from "../../primitives/path.ts";
import { EntityNameSchema } from "../../primitives/ids.ts";
import { EDITOR_CODES } from "../diagnostics.ts";
import type { Command } from "../types.ts";

export const deleteEntityArgs = z.object({
  name: EntityNameSchema,
});

type DeleteEntityArgs = z.infer<typeof deleteEntityArgs>;

interface RemovedRelationship {
  entityIndex: number;
  relIndex: number;
  rel: Relationship;
}

interface DeleteEntityInverse {
  entityJSON: Entity;
  entityIndex: number;
  removedRelationships: RemovedRelationship[];
}

function collectOrphanEntityRefs(spec: Spec, deletedName: string): Diagnostic[] {
  const diags: Diagnostic[] = [];
  for (const entity of spec.data.entities) {
    for (const field of entity.fields) {
      if (field.type === "reference" && field.of === deletedName) {
        diags.push(
          info(
            EDITOR_CODES.EDITOR_REF_CASCADE_INCOMPLETE,
            `/data/entities/${entity.name}/fields/${field.name}` as JsonPointer,
            `Field "${entity.name}.${field.name}" references deleted entity "${deletedName}"`,
          ),
        );
      }
    }
  }
  for (const [actionId, action] of Object.entries(spec.actions)) {
    if (action.kind === "submit" && action.entity === deletedName) {
      diags.push(
        info(
          EDITOR_CODES.EDITOR_REF_CASCADE_INCOMPLETE,
          `/actions/${actionId}` as JsonPointer,
          `Action "${actionId}" submits to deleted entity "${deletedName}"`,
        ),
      );
    }
  }
  return diags;
}

export const deleteEntity: Command<typeof deleteEntityArgs> = {
  name: "delete-entity",
  argsSchema: deleteEntityArgs,

  apply(spec, astHandle, args: DeleteEntityArgs) {
    const entityIndex = spec.data.entities.findIndex((e) => e.name === args.name);
    if (entityIndex === -1) {
      // No-op if entity not found
      return { spec, inverseArgs: { entityJSON: null, entityIndex: -1, removedRelationships: [] } };
    }

    const entityJSON = { ...spec.data.entities[entityIndex] } as Entity;

    // Collect removed relationships before mutating
    const removedRelationships: RemovedRelationship[] = [];
    for (let i = 0; i < spec.data.entities.length; i++) {
      if (i === entityIndex) continue;
      const entity = spec.data.entities[i];
      if (!entity?.relationships) continue;
      for (let r = 0; r < entity.relationships.length; r++) {
        const rel = entity.relationships[r];
        if (rel && (rel.from === args.name || rel.to === args.name)) {
          removedRelationships.push({ entityIndex: i, relIndex: r, rel });
        }
      }
    }

    // Remove entity from spec
    const newEntities = spec.data.entities.filter((_, i) => i !== entityIndex);

    // Remove cross-entity relationships involving the deleted entity
    const cleanedEntities = newEntities.map((entity) => {
      if (!entity.relationships) return entity;
      const filteredRels = entity.relationships.filter(
        (rel) => rel.from !== args.name && rel.to !== args.name,
      );
      if (filteredRels.length === entity.relationships.length) return entity;
      return { ...entity, relationships: filteredRels };
    });

    // AST-level: rebuild entities sequence (simplest correct approach)
    astHandle.doc.setIn(["data", "entities"], astHandle.doc.createNode(cleanedEntities));

    const newSpec = {
      ...spec,
      data: { ...spec.data, entities: cleanedEntities },
    };

    const inverseArgs: DeleteEntityInverse = { entityJSON, entityIndex, removedRelationships };
    const diagnostics = collectOrphanEntityRefs(newSpec, args.name);
    return { spec: newSpec, inverseArgs, diagnostics };
  },

  invert(spec, astHandle, inverseArgs) {
    const { entityJSON, entityIndex, removedRelationships } = inverseArgs as DeleteEntityInverse;

    if (entityIndex === -1 || !entityJSON) {
      return { spec };
    }

    // Restore entity at entityIndex
    const newEntities = [
      ...spec.data.entities.slice(0, entityIndex),
      entityJSON,
      ...spec.data.entities.slice(entityIndex),
    ];

    // Restore removed relationships to their original positions
    const restoredEntities = [...newEntities];
    // Sort by entity index and rel index descending so insertions don't shift indices
    const sorted = [...removedRelationships].sort((a, b) =>
      a.entityIndex !== b.entityIndex ? a.entityIndex - b.entityIndex : a.relIndex - b.relIndex,
    );
    for (const { entityIndex: eIdx, relIndex, rel } of sorted) {
      const entity = restoredEntities[eIdx];
      if (!entity) continue;
      const rels = [...(entity.relationships ?? [])];
      rels.splice(relIndex, 0, rel);
      restoredEntities[eIdx] = { ...entity, relationships: rels };
    }

    // AST-level: full rebuild
    astHandle.doc.setIn(["data", "entities"], astHandle.doc.createNode(restoredEntities));

    return {
      spec: {
        ...spec,
        data: { ...spec.data, entities: restoredEntities },
      },
    };
  },
};
