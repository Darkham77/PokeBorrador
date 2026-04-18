---
name: pokemon-ability-validator
description: MANDATORY skill for validating Pokémon ability implementations and descriptions against PokeAPI standards.
---

# Pokémon Ability Validator

> Ensures game abilities match official PokeAPI mechanical and descriptive standards.

## Usage

Run the validator to compare local ability data with official PokeAPI entries:

```bash
node .agents/skills/pokemon-ability-validator/scripts/validator.js
```

### What it checks:
1. **Presence**: Verifies that abilities assigned to Pokémon in `src/data/pokemonDB.js` exist in `src/data/abilities.js`.
2. **Descriptions**: Compares local descriptions in `ABILITY_DATA` against official Spanish flavor text from PokeAPI.
3. **Mechanics**: Surfaces technical effect descriptions (in English) to help developers ensure battle logic in `src/logic/battle/battleAbilities.js` is correct.

### Assets
The skill uses a local cache to avoid hitting the API rate limits:
- `assets/pokeapi_ability_cache.json`: Cached ability data from PokeAPI.

### Troubleshooting
If a new ability is added to PokeAPI and not found in the cache, delete the cache file and re-run the script:
```bash
rm .agents/skills/pokemon-ability-validator/assets/pokeapi_ability_cache.json
```
