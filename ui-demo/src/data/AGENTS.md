# Purpose

Mock datasets and test fixtures used by the UI-Demo showcase.

## Ownership

Frontend / UI Engineers.

## Local Contracts

- `mockPokemon.ts` provides strictly typed Pokémon instances for party team and storage box views.
- Adheres 100% to project domain types (`Pokemon`, `ItemId`, `PokemonSpeciesId`, `AbilityId`).
- Zero runtime fallbacks or loose types.

## Key Files

- `mockDetailPokemon.ts`: Module implementation.
- `mockSelectionPokemon.ts`: Module implementation.
- [`mockPokemon.ts`](./mockPokemon.ts): Module implementation.

## Work Guidance

- Keep data structures immutable and typed with `as const` or explicit domain models.

## Verification

- `npm run lint`
- `npm run audit`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
