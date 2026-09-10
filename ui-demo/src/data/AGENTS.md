# Purpose

Mock datasets and test fixtures used by the UI-Demo showcase.

## Ownership

Frontend / UI Engineers.

## Local Contracts

- `mockPokemon.ts` provides strictly typed Pokémon instances for party team and storage box views.
- Adheres 100% to project domain types (`Pokemon`, `ItemId`, `PokemonSpeciesId`, `AbilityId`).
- Zero runtime fallbacks or loose types.

## Work Guidance

- Keep data structures immutable and typed with `as const` or explicit domain models.

## Verification

- `npm run validate:domain-types`
- `npm run validate:types`
