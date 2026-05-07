---
name: pokemon-ability-validator
description: Ability validator. Delegates business rules to the `@/project-standards/references/validation_manual.md` manual.
---

# Skill: Ability Validator

> [!IMPORTANT]
> Before adding abilities, consult the [Validation Manual](../project-standards/references/validation_manual.md) for description and logic standards.

## Validator Usage

Run the script to verify the integrity of `ABILITY_DATA` and its implementation in the battle engine:

```bash
npx tsx .agents/skills/pokemon-ability-validator/scripts/validator.ts
```

### What it checks

- Existence of descriptions in Spanish.
- Parity with PokeAPI.
- Implementation of logic in `battleAbilities.ts`.
