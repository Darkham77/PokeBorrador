# Purpose

Data schema definitions, input validators, and sanity checkers.

## Ownership

Security and Systems Developers.

## Local Contracts

- Must validate all payloads crossing trust boundaries (like network inputs or local saves).
- Keep `schemas.ts` strictly as an export aggregator and composite schema validator (<200 SLOC). All domain-specific subschemas MUST reside under `subschemas/` (`authSchemas.ts`, `battleSchemas.ts`, `pokemonSchemas.ts`, `socialSchemas.ts`, `systemSchemas.ts`).

## Child DOX Index

- [subschemas/AGENTS.md](./subschemas/AGENTS.md): Sub-schema definitions for auth, battle, pokemon, and social domains.
