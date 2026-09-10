# Purpose

Static Pokémon data, species database, EV yield databases, sprites mappings, evolution triggers, and footprints database.

## Local Contracts

- **Compact Tuple Database Serialization**: Massive relational datasets (such as `pokemonDB.json`) must store repetitive sub-records (e.g. learnsets) as compact arrays `[level, moveId, pp]` instead of verbose repetitive JSON objects.
- **Memoized Lazy Proxy Inflation**: Domain wrappers like `pokemonDB.ts` must expose datasets via memoized `Proxy` objects, inflating entities on demand to eliminate multi-megabyte upfront memory allocation while preserving 100% strict TypeScript domain contracts (`PokemonBaseData`, `LearnsetMove[]`).
- **Build-Time Dex Precomputation**: Heavy engine queries (`@pkmn/sim` Dex) must be precomputed strictly at build time via `scripts/data/generate_pokemon_db.ts`. Never run Showdown Dex lookups on the client main thread.
- **Node.js 26+ Native Execution Compatibility**: Static data files and database wrappers intended to be consumed by Node.js CLI validation scripts (e.g. `pokemonDB.ts`) MUST use relative path imports (`../battle/moves.ts`) rather than `@/` runtime aliases, ensuring error-free native execution under `--permission --experimental-strip-types`.
- **Shiny Footprint Deduplication & Parity Fallback Mandate**: Sprite and footprint coordinate databases (`pokemonFeetDatabase.json`) MUST deduplicate shiny entries whose physical geometries match their base forms. Unique shiny geometries MUST be preserved. Runtime resolvers (`pokemonFeetDatabase.ts`) MUST query the specific path first and automatically fallback to the base form path in $O(1)$ when omitted. All footprint deduplications MUST be certified by an isolated regression test suite verifying 100.000% exact parity against historical entries.

## Key Files

- `evYields.json`: Canonical database of Effort Value yields for all species, generated from PokémonDB and Bulbapedia.
- `evYields.ts`: Domain-Type-First wrapper exporting `EvYield`, `EV_YIELDS`, and `getEvYieldForSpecies`.
- `pokemonDB.json`: Precomputed compact species database with base stats and learnset tuples.
- `pokemonDB.ts`: Domain-Type-First lazy proxy providing strongly typed access to `POKEMON_DB`.
- `pokemonFeetDatabase.json`: Compact coordinate catalog for Pokémon, NPC, and trainer footprints with shiny deduplication.
- `pokemonFeetDatabase.ts`: Runtime accessor providing O(1) coordinate lookup with automatic shiny-to-base fallback.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
