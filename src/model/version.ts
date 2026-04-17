// Schema version constant — SERDE-08 anchor. Migrations bridge versions (Plan 07).
// Source: CONTEXT.md Claude's Discretion "Migration runner scaffold"
export const SCHEMA_VERSION = "mobile-tui/1" as const;
export type SchemaVersion = typeof SCHEMA_VERSION;
