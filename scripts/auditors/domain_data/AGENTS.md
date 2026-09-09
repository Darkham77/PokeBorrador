# scripts/auditors/domain_data/AGENTS.md

## Purpose & Scope

This directory contains domain data consistency validators comparing local databases against the official `@pkmn/sim` Pokémon Showdown engine.

## Directory Structure & Files

- [validate_abilities.ts](./validate_abilities.ts): Validates ability metadata, translations, and triggers against `@pkmn/sim`.
- [validate_abilities.ts](./validate_abilities.ts): Validates ability metadata, translations, and triggers against `@pkmn/sim`.
- [validate_domain_types.ts](./validate_domain_types.ts): Audits TypeScript domain types, branded types, and prevents primitive leaks. Dynamically harvests canonical domain collections via AST with zero hardcoding, detecting exact duplicates ($A = D$) and redundant subcollections ($A \subset D$). Strictly prohibits passthrough type/value aliases (`export type Foo = Bar;`, `export const FOO = BAR;`) with zero escape hatch bypasses (`// alias-ok` permanently eradicated).
- [validate_items.ts](./validate_items.ts): Validates shop and crafting item IDs, effects, and sprite references.
- [validate_moves.ts](./validate_moves.ts): Validates move mechanics, accuracies, categories, and Spanish translations.
- [validate_o1_data_structures.ts](./validate_o1_data_structures.ts): Audits linear searches and enforces constant-time O(1) data structure optimizations.
- [validate_pokemon.ts](./validate_pokemon.ts): Validates Pokémon stats, typings, and learnsets against Showdown Dex.
- [validate_spanish_ids.ts](./validate_spanish_ids.ts): Scans engine logic for untranslated Spanish string identifiers.

## Local Governance & Rules

- Dex lookups must use `Dex.forGen(ACTIVE_GENERATION)` canonical authority.
- All auditors in this family must adhere to the `StandardAuditResult` contract.
- **Zero-Hardcoding Dynamic AST Auditing**: Domain collection duplication audits must discover canonical collections dynamically through source AST analysis, never hardcoding domain literals or entity lists in auditor scripts.
- **Zero Passthrough Aliases Mandate**: 1:1 passthrough aliases are strictly forbidden across `src/` and `scripts/`. No bypass directive (`// alias-ok`) is permitted.
