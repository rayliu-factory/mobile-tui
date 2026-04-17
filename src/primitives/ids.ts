// Branded ID types for the Spec model.
// Case conventions per CONTEXT.md Claude's Discretion "ID case conventions":
//   - screen / action / testID ids: snake_case (/^[a-z][a-z0-9_]*$/)
//   - entity names: PascalCase (/^[A-Z][A-Za-z0-9]*$/) — entities are types.
//
// Threat T-01-01 mitigation: all patterns are anchored (^...$) and
// non-backtracking (no alternation × quantifier combinations). Safe against
// ReDoS on adversarial 100kB inputs (covered by ids.test.ts).
import { z } from "zod";

// Exported for downstream reuse — keeps the one definition of truth for
// what "snake_case" / "PascalCase" means across the spec model.
export const SNAKE_CASE = /^[a-z][a-z0-9_]*$/;
export const PASCAL_CASE = /^[A-Z][A-Za-z0-9]*$/;

export type ScreenId = string & { readonly __brand: "ScreenId" };
export const ScreenIdSchema = z
  .string()
  .regex(SNAKE_CASE, "screen id must match /^[a-z][a-z0-9_]*$/ (snake_case)")
  .transform((s) => s as ScreenId);

export type ActionId = string & { readonly __brand: "ActionId" };
export const ActionIdSchema = z
  .string()
  .regex(SNAKE_CASE, "action id must match /^[a-z][a-z0-9_]*$/ (snake_case)")
  .transform((s) => s as ActionId);

export type TestID = string & { readonly __brand: "TestID" };
export const TestIDSchema = z
  .string()
  .regex(SNAKE_CASE, "testID must match /^[a-z][a-z0-9_]*$/ (snake_case)")
  .transform((s) => s as TestID);

export type EntityName = string & { readonly __brand: "EntityName" };
export const EntityNameSchema = z
  .string()
  .regex(PASCAL_CASE, "entity name must match /^[A-Z][A-Za-z0-9]*$/ (PascalCase)")
  .transform((s) => s as EntityName);
