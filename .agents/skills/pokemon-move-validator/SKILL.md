---
name: pokemon-move-validator
description: Move validator. Delegates business rules and schemas to the `@/project-standards/references/validation_manual.md` manual.
---

# Skill: Move Validator

> [!IMPORTANT]
> Any change in `MOVE_DATA` or combat logic MUST be validated following the protocols in the [Validation Manual](../project-standards/references/validation_manual.md).

## Validation Scripts

Run these scripts after modifying any move:

1. **Structure**: `npx tsx .agents/skills/pokemon-move-validator/scripts/validator.ts`
2. **PokeAPI Sync**: `npx tsx .agents/skills/pokemon-move-validator/scripts/pokeapi_sync.ts`
3. **Battle Integrity**: `npx tsx .agents/skills/pokemon-move-validator/scripts/check_battle_integrity.ts`

For the detailed `MOVE_DATA` schema and damage rules, consult the standards manual.
