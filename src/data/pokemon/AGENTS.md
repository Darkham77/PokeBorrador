# Purpose

Static Pokémon data, species database, EV yield databases, sprites mappings, evolution triggers, and footprints database.

## Local Contracts

- **Compact Tuple Database Serialization**: Massive relational datasets (such as `pokemonDB.json`) must store repetitive sub-records (e.g. learnsets) as compact arrays `[level, moveId, pp]` instead of verbose repetitive JSON objects.
- **Memoized Lazy Proxy Inflation**: Domain wrappers like `pokemonDB.ts` must expose datasets via memoized `Proxy` objects, inflating entities on demand to eliminate multi-megabyte upfront memory allocation while preserving 100% strict TypeScript domain contracts (`PokemonBaseData`, `LearnsetMove[]`).
- **Build-Time Dex Precomputation**: Heavy engine queries (`@pkmn/sim` Dex) must be precomputed strictly at build time via `scripts/data/generate_pokemon_db.ts`. Never run Showdown Dex lookups on the client main thread.

## Key Files

- `evYields.json`: Canonical database of Effort Value yields for all species, generated from PokémonDB and Bulbapedia.
- `evYields.ts`: Domain-Type-First wrapper exporting `EvYield`, `EV_YIELDS`, and `getEvYieldForSpecies`.
- `pokemonDB.json`: Precomputed compact species database with base stats and learnset tuples.
- `pokemonDB.ts`: Domain-Type-First lazy proxy providing strongly typed access to `POKEMON_DB`.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
