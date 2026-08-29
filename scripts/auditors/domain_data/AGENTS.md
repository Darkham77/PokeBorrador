# scripts/auditors/domain_data/AGENTS.md

## Purpose & Scope

This directory contains domain data consistency validators comparing local databases against the official `@pkmn/sim` Pokémon Showdown engine.

## Directory Structure & Files

- [validate_abilities.ts](./validate_abilities.ts): Validates ability metadata, translations, and triggers against `@pkmn/sim`.
- [validate_domain_types.ts](./validate_domain_types.ts): Audits TypeScript domain types, branded types, and prevents primitive leaks.
- [validate_items.ts](./validate_items.ts): Validates shop and crafting item IDs, effects, and sprite references.
- [validate_moves.ts](./validate_moves.ts): Validates move mechanics, accuracies, categories, and Spanish translations.
- [validate_o1_data_structures.ts](./validate_o1_data_structures.ts): Audits linear searches and enforces constant-time O(1) data structure optimizations.
- [validate_pokemon.ts](./validate_pokemon.ts): Validates Pokémon stats, typings, and learnsets against Showdown Dex.
- [validate_spanish_ids.ts](./validate_spanish_ids.ts): Scans engine logic for untranslated Spanish string identifiers.

## Local Governance & Rules

- Dex lookups must use `Dex.forGen(ACTIVE_GENERATION)` canonical authority.
- All auditors in this family must adhere to the `StandardAuditResult` contract.
