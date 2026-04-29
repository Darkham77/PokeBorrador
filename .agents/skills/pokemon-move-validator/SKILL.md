---
name: pokemon-move-validator
description: Move validator. Delegates business rules and schemas to the `@/project-standards/references/validation_manual.md` manual.
---

# Skill: Move Validator

> [!IMPORTANT]
> Any change in `MOVE_DATA` or combat logic MUST be validated following the protocols in the [Validation Manual](../project-standards/references/validation_manual.md).

## Validation Scripts

Run these scripts after modifying any move:

1. **Structure**: `node .agents/skills/pokemon-move-validator/scripts/validator.js`
2. **PokeAPI Sync**: `node .agents/skills/pokemon-move-validator/scripts/pokeapi_sync.js`
3. **Battle Integrity**: `node .agents/skills/pokemon-move-validator/scripts/check_battle_integrity.js`

For the detailed `MOVE_DATA` schema and damage rules, consult the standards manual.
