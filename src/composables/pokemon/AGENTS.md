# Purpose

Pokedex search filters and details view logic.

## Ownership

Pokemon UI Team / Frontend Developers.

## Local Contracts

- **Storage Index vs UID Parity in Detail Views**: Detail composables (`usePokemonDetail`) must validate that `directPokemon.uid` strictly matches the Pokémon at the given storage index in `team` or `box`. If a mismatch occurs (e.g. index passed from a filtered list or stale cache), the composable must resolve the true slot by `uid` or fall back safely to `directPokemon` to guarantee that the UI never displays an unrelated Pokémon instance.
- **Box Filters & Sorting Modularity**: `useBoxFilters.ts` delegates individual attribute match evaluations to `boxFilterPredicates.ts` and box item comparator dispatch to `boxSortComparators.ts`.

## Key Files

- `usePokedex.ts`: Module implementation.
- `usePokemonDetail.ts`: Module implementation.
- [`boxFilterPredicates.ts`](./boxFilterPredicates.ts): Module implementation.
- [`boxSortComparators.ts`](./boxSortComparators.ts): Module implementation.
- [`useBoxFilters.ts`](./useBoxFilters.ts): Module implementation.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run standard type checks.

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
