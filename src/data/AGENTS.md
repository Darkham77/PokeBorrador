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

## Child DOX Index

- [breeding/](./breeding/): Static daycare match rates and egg groups mapping.
- [weather/](./weather/): Environmental spawn rates and cycles configuration.
