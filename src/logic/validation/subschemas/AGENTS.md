# Purpose

Modular Valibot schema definitions for authentication, battle state, Pokémon entities, and social features.

## Ownership

Security and Architecture Developers.

## Local Contracts

- All sub-schemas MUST follow Domain-Type-First governance with strict inferred DTO types.
- Exports MUST remain zero-fallback and tree-shakable.
- When validating `claimQueue` items (`claimItemSchema`), ensure optional fields (`user_id?: string`, `type?: string`) match the database table schema `claim_queue`. The asset type is canonicalized inside `asset_data.type` (`'pokemon' | 'item' | 'money' | 'currency'`).

## Key Files

- `authSchemas.ts`: Module implementation.
- `battleSchemas.ts`: Module implementation.
- `pokemonSchemas.ts`: Module implementation.
- `socialSchemas.ts`: Module implementation.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
