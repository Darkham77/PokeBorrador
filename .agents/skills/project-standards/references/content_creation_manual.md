# Content Creation Manual (Poké Vicio)

This manual details the protocols for adding new Pokémon, moves, abilities, and other game elements, ensuring data integrity and consistency with the Poké Vicio engine.

## 🚨 GOLDEN RULE: DATA INTEGRITY AND STANDARDS

1. **Object Names**: Always use full official names. Example: **"PP Up"** (NOT "PP Up").
2. **Deduplication**: Never add an element (move, ability, item) that already exists. Use the validators before proceeding.
3. **PP Synchronization**: When initializing a move for a Pokémon, `maxPP` must be equal to its initial base `pp`.
4. **Image Format**: All external images from PokeAPI **MUST** be **PNG**.
5. **Tier Calculation**: Classification (S+, S, A, etc.) is **DYNAMIC**. Do not add it to the DB; it is calculated in the UI using `src/logic/constants/tiers.js`.
6. **SASS Style**: If you create styles for new content, `@use` directives must be the **first lines** of the file. Use capitalization for filters (e.g., `Filter: Blur(2px)`).
7. **CLI-First Verification**: Upon finishing the implementation, you **MUST** use `window.__VITE_DEBUG__` commands to verify the content.

---

## 🐲 Adding a New Pokémon

### Step 0: Get data from PokeAPI

Run the fetch script (located in `.agents/skills/add-pokemon/scripts/fetch_pokemon.js`) passing the name in English:

```bash
node .agents/skills/add-pokemon/scripts/fetch_pokemon.js <name>
```

This generates a `_output/<pokemon>_code.txt` file with blocks ready to copy.

### Step 1: POKEMON_DB (`src/data/pokemonDB.js`)

Ensure that the learnset includes only moves that exist in `MOVE_DATA`.

### Step 2: Types and Abilities

- **Types**: Add secondary types in `src/data/types.js` -> `SECONDARY_TYPES`.
- **Abilities**: Add in `src/data/abilities.js` -> `POKEMON_ABILITIES`. If the ability is new, implement it in `src/logic/battle/battleAbilities.js`.

### Step 3: Evolutions (`src/data/evolutionData.js`)

Register in `EVOLUTION_TABLE`, `STONE_EVOLUTIONS`, or `TRADE_EVOLUTIONS`.

### Step 4: Pokédex (`src/logic/pokedexConstants.js`)

- Register the **National ID** in `POKEMON_SPRITE_IDS`.
- Insert in the `PDEX_ORDER` array.
- Add TM compatibility in `TM_COMPAT` (according to Gen 3).

---

## 🥚 Egg and Hatching System

Hatching follows an interactive 3-phase lifecycle managed by `HatchAnimationModal.vue`:

1. **Egg Phase**: Requires **manual click** to progress.
2. **Break Phase**: Vibration and particles.
3. **Reveal Phase**: `evolution_complete` sound and a `-85px` lift for the sprite.

### Test Commands

```js
// Silent protocol
window.__VITE_DEBUG__.createPokemon({ id: 'houndour', protocol: 'hatch' });
// Interactive animation protocol
window.__VITE_DEBUG__.createPokemon({ id: 'houndour', protocol: 'hatch_anim' });
```

---

## ✅ Final Verification Checklist

- [ ] Entry in `POKEMON_DB` with stats and Gen 3 learnset.
- [ ] Secondary type and Abilities registered.
- [ ] Evolution and Pokédex IDs configured.
- [ ] TM compatibility verified.
- [ ] **Validators Passed**: Run the move and ability validation scripts.
- [ ] **Persistence**: Verified that the Pokémon survives an `F5`.
