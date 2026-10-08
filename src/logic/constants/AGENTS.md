# Purpose

Manage the logic and assets of constants.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **Pokémon Sort Definitions Single Source of Truth (`pokemonSortConstants.ts`)**: All Pokémon sorting criteria, 3-character labels, emoji icons, and tooltip descriptions MUST be declared in `src/logic/constants/pokemonSortConstants.ts` (`POKEMON_SORT_OPTIONS`). Ad-hoc sort definitions in views or components are strictly forbidden.
- **Sort Key Alias Interoperability**: Sort engines (`filterAndSortPokemon`, `useBoxFilters`) and UI components MUST resolve sort keys via `isSortOptionActive` to ensure 100% backward compatibility across legacy keys and aliases (`tot`/`bst`/`TOT`, `ivs`/`tier`, `pokedex`/`pdex`, `hatched`/`egg`).

## Key Files

- `animations.ts`: Module implementation.
- `audio.ts`: Module implementation.
- `encounters.ts`: Module implementation.
- `gameplay.ts`: Module implementation.
- `items.ts`: Module implementation.
- `pokedexConstants.ts`: Module implementation.
- `tags.ts`: Module implementation.
- `visuals.ts`: Module implementation.
- [`pokemonSortConstants.ts`](./pokemonSortConstants.ts): Module implementation.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.

## Verification

- Run standard validation scripts.

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
