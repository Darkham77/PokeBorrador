# Purpose

Data schema definitions, input validators, and sanity checkers.

## Ownership

Security and Systems Developers.

## Local Contracts

- Must validate all payloads crossing trust boundaries (like network inputs or local saves).
- Keep `schemas.ts` strictly as an export aggregator and composite schema validator (<200 SLOC). All domain-specific subschemas MUST reside under `subschemas/` (`authSchemas.ts`, `battleSchemas.ts`, `pokemonSchemas.ts`, `socialSchemas.ts`, `systemSchemas.ts`).
- **Valibot Optional Property Parity Mandate**: When defining Valibot schemas for domain entities, properties marked optional in their TypeScript interfaces (`prop?: Type`) MUST be wrapped in `optional(...)` within the schema. Enforcing required fields on optional domain properties causes `safeParse` validation failures during save deserialization and breaks backward compatibility.

## Child DOX Index

- [subschemas/AGENTS.md](./subschemas/AGENTS.md): Sub-schema definitions for auth, battle, pokemon, and social domains.
