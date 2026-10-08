# Purpose

This directory contains domain data consistency validators for Poké Vicio comparing local databases against the official `@pkmn/sim` Pokémon Showdown engine. Generic domain suites (`validate_domain_types.ts`, `validate_o1_data_structures.ts`) reside in `node_modules/@francogp/auditor/src/suites/domain_data/`.

## Ownership

Poké Vicio Development Team.

## Local Contracts

### Local Governance & Rules

- Dex lookups must use `Dex.forGen(ACTIVE_GENERATION)` canonical authority.
- All auditors in this family extend `BaseAuditor` or `FileScanAuditor` from `@francogp/auditor` and adhere to the `StandardAuditResult` contract.
- Registered in `audit.config.ts` under `extensions`.

## Key Files

- [validate_abilities.ts](./validate_abilities.ts): Validates ability metadata, translations, and triggers against `@pkmn/sim`.
- [validate_items.ts](./validate_items.ts): Validates shop and crafting item IDs, effects, and sprite references.
- [validate_moves.ts](./validate_moves.ts): Validates move mechanics, accuracies, categories, and Spanish translations.
- [validate_pokemon.ts](./validate_pokemon.ts): Validates Pokémon stats, typings, and learnsets against Showdown Dex.
- [validate_spanish_ids.ts](./validate_spanish_ids.ts): Scans engine logic for untranslated Spanish string identifiers.
- [validate_spawns_whitelist.ts](./validate_spawns_whitelist.ts): Validates wild spawn tables and encounter pools against the enabled Pokémon species whitelist.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
