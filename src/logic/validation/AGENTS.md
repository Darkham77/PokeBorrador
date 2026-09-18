# Purpose

Data schema definitions, input validators, and sanity checkers.

## Ownership

Security and Systems Developers.

## Local Contracts

- Must validate all payloads crossing trust boundaries (like network inputs or local saves).
- Keep `schemas.ts` strictly as an export aggregator and composite schema validator (<200 SLOC). All domain-specific subschemas MUST reside under `subschemas/` (`authSchemas.ts`, `battleSchemas.ts`, `pokemonSchemas.ts`, `socialSchemas.ts`, `systemSchemas.ts`).
- **Valibot Optional Property Parity Mandate**: When defining Valibot schemas for domain entities, properties marked optional in their TypeScript interfaces (`prop?: Type`) MUST be wrapped in `optional(...)` within the schema. Enforcing required fields on optional domain properties causes `safeParse` validation failures during save deserialization and breaks backward compatibility.
- **Canonical SSoT Domain Imports Mandate (`picklist`)**: Valibot schemas MUST NEVER re-declare domain string literals, finite status arrays, or union types inline within schema definition files. Schemas MUST import the canonical `as const` tuple directly from its domain module (e.g. `MARKET_LISTING_STATUSES` from `@/logic/economy/market.ts`) and wrap it with `picklist(TUPLE)` to guarantee compile-time alignment and $O(1)$ membership checking.
- **Discriminated Union Performance Mandate (`variant`)**: Discriminated unions of object schemas sharing a common discriminator key (e.g. `listing_type: literal('pokemon')` vs `listing_type: literal('item')`) MUST use Valibot's `variant(discriminatorKey, [...])` rather than generic `union([...])` to ensure single-pass $O(1)$ dispatching without redundant validation traversals.

## Child DOX Index

- [subschemas/AGENTS.md](./subschemas/AGENTS.md): Sub-schema definitions for auth, battle, pokemon, and social domains.
