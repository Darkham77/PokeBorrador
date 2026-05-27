---
name: add-pokemon
description: Orchestrator for adding new Pokémon to the system. Uses fetch scripts and delegates all integrity and formatting rules to the `@/project-standards/references/content_creation_manual.md` manual.
---

# Skill: Add Pokémon (Orchestrator)

> [!IMPORTANT]
> This skill is a step orchestrator. Before making any changes to data files, you **MUST** read and strictly follow the [Content Creation Manual](../project-standards/references/content_creation_manual.md).

## Standard Workflow

### 1. Automatic Data Fetching

Use the fetch script to generate base code blocks:

```bash
node --experimental-strip-types .agents/skills/add-pokemon/scripts/fetch_pokemon.ts <english_name>
```

### 2. Code Integration

Follow the integration order defined in the standards manual:

1. `POKEMON_DB` (`pokemonDB.ts`)
2. Secondary Types (`types.ts`)
3. Abilities (`abilities.ts`)
4. Evolutions (`evolutionData.ts`)
5. Pokédex and TMs (`pokedexConstants.ts`)

### 3. Validation and Verification

1. **Validators**: Run the move and ability validators detailed in the [Validation Manual](../project-standards/references/validation_manual.md).
2. **CLI-First**: Verify the new Pokémon in the browser using the `window.__VITE_DEBUG__` commands specified in the [Testing Manual](../project-standards/references/browser_testing_manual.md).

---

## Implementation References

- **PokeAPI**: `https://pokeapi.co/`
- **Project Standards**: [project-standards](../project-standards/SKILL.md)
