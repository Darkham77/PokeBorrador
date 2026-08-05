# Purpose

Store static game datasets, configuration structures, translations, formulas mapping, and sprite databases.

## Ownership

Game Designers / Data Maintainers.

## Local Contracts

- **500/1000-Line Exemption**: Massive static databases (e.g. `pokemonFeetDatabase.ts`, `pokemonDB.ts`, `items.ts`) are completely exempt from the code modularity warning system to ensure integrity and simple copy-paste updates.
- **Immersion Integrity**: All data attributes representing logical entity identifiers (moves, items, abilities) must be registered in English.
- **Trainer Archetype Single Source of Truth**: All trainer type definitions must live strictly in `src/data/trainerTypes.ts`. No duplicate mappings are allowed.

## Work Guidance

- Avoid adding any logic or runtime calculations inside these datasets. All operations must be pure declarations.
- Large JSON-like files inside this folder should be mapped using TS type constraints (e.g., `satisfies` or typed constant assertions) to prevent schema drift.
- **Precomputed Database Mapping**: When designing dictionaries that map entities to multiple traits, pre-flatten and precompute these combined pools at module load time (storing them in a direct key-value hash map) instead of dynamic flattening on queries to ensure O(1) lookup speed.
- **Strict English ID Mandate**: Never create or use logical identifiers (`id`) in Spanish for items, Pokémon, abilities, natures, moves, or stats. All internal databases, files, and saves must use English Showdown IDs (processed with `toID`).
- **Static Database Duplication Exemption**: Massive static databases containing duplicate literal lists (like identical learnsets for evolutions) are exempt from refactoring. Do not unify them dynamically. Add them to `ignorePatterns` in `.fallowrc.json` to bypass clone detection.

## Child DOX Index

- [ai/](./ai/AGENTS.md): Domain module documentation for ai.
- [battle/](./battle/AGENTS.md): Domain module documentation for battle.
- [breeding/](./breeding/AGENTS.md): Domain module documentation for breeding.
- [inventory/](./inventory/AGENTS.md): Domain module documentation for inventory.
- [player/](./player/AGENTS.md): Domain module documentation for player.
- [pokemon/](./pokemon/AGENTS.md): Domain module documentation for pokemon.
- [system/](./system/AGENTS.md): Domain module documentation for system.
- [weather/](./weather/AGENTS.md): Domain module documentation for weather.
- [world/](./world/AGENTS.md): Domain module documentation for world.
