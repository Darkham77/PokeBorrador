# Content Creation Manual (Poké Vicio)

This manual details the protocols for adding new Pokémon, moves, abilities, and other game elements, ensuring data integrity and consistency with the Poké Vicio engine.

## 🚨 GOLDEN RULE: DATA INTEGRITY AND STANDARDS

1. **Object Names**: Always use full official names. Example: **"PP Up"** (NOT "pp-up", "PP_Up", or abbreviations like "PPUP").
2. **Deduplication**: Never add an element (move, ability, item) that already exists. Use the validators before proceeding.
3. **PP Synchronization**: When initializing a move for a Pokémon, `maxPP` must be equal to its initial base `pp`.
4. **Image Format**: All external images from PokeAPI **MUST** be **PNG**.
5. **Tier Calculation**: Classification (S+, S, A, etc.) is **DYNAMIC**. Do not add it to the DB; it is calculated in the UI using `src/logic/constants/tiers.ts`.
6. **SASS Style**: If you create styles for new content, `@use` directives must be the **first lines** of the file. Note that standard CSS filter/transform capitalization is handled automatically by the Vite plugin (`vite-plugin-sass-traps.ts`), so writing standard lowercase filters is fully supported.
7. **CLI-First Verification**: Upon finishing the implementation, you **MUST** use `window.__VITE_DEBUG__` commands to verify the content.
8. **Prop Unification**: Always use `isShiny` (Boolean) for asset resolution and logic. The legacy `shiny` property is deprecated and must be avoided to ensure parity across the asset service and UI components.
9. **Item Parity Mandate**: Absolute synchronization between `SHOP_ITEMS` (data/items.ts), `HEALING_ITEMS` (data/items.ts), and logic effects is mandatory. Every consumable item MUST be registered in both constants to avoid `[PHANTOM]` item warnings in the `validate:items` audit.
10. **External Asset Download (Bulbapedia)**: Requests to `archives.bulbagarden.net` require a `Referer: https://bulbapedia.bulbagarden.net/` header and a realistic `User-Agent`. Direct downloads without these headers will return `403 Forbidden`.
11. **Fail-Fast Asset Policy**: Do not mask missing item images or visual assets with fallback emojis or generic icons in development. If an asset is missing, let the component fail visibly (e.g., hiding the image or showing a standard browser broken-link box) to allow developers to immediately notice and resolve the missing file.
12. **Segmented Shop Audits**: Item asset validation and diagnostic tools must categorize and audit database collections independently (e.g., Poké Market vs BC Shop) based on their specific runtime filters (`market !== false` and `trainerShop === true`) to ensure 100% visual asset coverage across each shopping context.
13. **Weather Token Consistency**: Always use the token **`snow`** for ice-based weather in metadata and encounter configs. The token `ice` is reserved for mechanical type references and must NOT be used as a weather ID to avoid registry mismatches.
14. **Self-Healing Ability Mapping**: To prevent strict data validations from failing due to external datasets or local databases having non-standard or translated names (e.g., Spanish translations like `Escape`, `Metamorfosis`, or `Electricidad estática`), the data loading/recalculation pipeline MUST automatically normalize these values to standard strings (e.g., 'Fuga', 'Mudar', 'Electricidad estática') before strict schemas are validated.
15. **Thematic and Unique Mission Descriptions**: Class deployment descriptions (e.g., basic, advanced, expert) MUST be unique and specific per duration (6h, 12h, 24h) and player class to ensure an immersive RPG experience and avoid repetitive placeholder text.
16. **Strict English ID Policy**: All database keys and entity IDs (such as move IDs like `karate_chop`, item IDs, etc.) MUST strictly be written in English. Never mix languages within database keys or identifiers. Localized languages (Spanish, etc.) must only be used in display names, labels, or text descriptions for the UI.
17. **Zero-Fallback Dialogue Policy**: Dialog/phrase resolution functions (e.g., `getRandomQuoteForTrainer`) MUST NOT fall back to generic placeholder strings when an archetype or trainer type is queried. If the required keys, personalities, or phrase arrays are missing from the registry, the system must throw an explicit error (`throw new Error`) immediately.
18. **Dialogue Exception Test Coverage**: The companion test suites must verify that phrase/quote resolution functions execute cleanly without throwing errors for all registered database keys, and explicitly assert that they throw the correct exception when queried with an invalid or unregistered key.

---

## 🐲 Adding a New Pokémon

### Step 0: Get data from PokeAPI

Run the fetch script (located in `.agents/skills/add-pokemon/scripts/fetch_pokemon.ts`) passing the name in English:

```bash
node .agents/skills/add-pokemon/scripts/fetch_pokemon.ts <name>
```

This generates a `_output/<pokemon>_code.txt` file with blocks ready to copy.

### Step 1: POKEMON_DB (`src/data/pokemonDB.ts`)

Ensure that the learnset includes only moves that exist in `MOVE_DATA`.

### Step 2: Types and Abilities

- **Types**: Add secondary types in `src/data/types.ts` -> `SECONDARY_TYPES`.
- **Abilities**: Add in `src/data/abilities.ts` -> `POKEMON_ABILITIES`. If the ability is new, implement it in `src/logic/battle/battleAbilities.ts`.

### Step 3: Evolutions (`src/data/evolutionData.ts`)

Register in `EVOLUTION_TABLE`, `STONE_EVOLUTIONS`, or `TRADE_EVOLUTIONS`.

### Step 4: Pokédex (`src/logic/pokedexConstants.ts`)

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

## ⚓ Visual Anchors and Shadows

To maintain absolute stability in the high-fidelity combat arena, all entity rendering must follow the **Anchored Pipeline**:

1. **Feet Cache Persistence**: The system uses a `feetCache` to store the ground-anchor coordinates (`feetY`) of every detected sprite. This prevents "coordinate jumping" when a Pokémon is seen for the first time or re-appears.
2. **Synchronous Anchoring**: When a Pokémon returns to the field, its shadow and ground position must be retrieved synchronously from the cache if available.
3. **Shadow Identity (UID)**: Every shadow is identified by the Pokémon's `uid`. This ensures that in multi-combatant scenarios (Double/Triple battles), cada instance maintains its own stable identity.
4. **Preloading Gate**: Combat views MUST use a `preloadPokemonSprite` helper during transitions. This ensures that the enemy or player sprite is ready in the browser cache before the "Silhouette Reveal" or "Intro Animation" finishes, preventing white-square artifacts.

---

## ✅ Final Verification Checklist

- [ ] Entry in `POKEMON_DB` with stats and Gen 3 learnset.
- [ ] Secondary type and Abilities registered.
- [ ] Evolution and Pokédex IDs configured.
- [ ] TM compatibility verified.
- [ ] **Validators Passed**: Run the move and ability validation scripts.
- [ ] **Persistence**: Verified that the Pokémon survives an `F5`.

---

## 💾 Bulk Data Injection (Massive Updates)

When performing massive updates on a database file (e.g., adding `catchRate` to 200+ Pokémon):

1. **Automation Required**: Use Python or JS scripts to parse and modify the file. Manual editing for mass changes is forbidden.
2. **Regex Precision**: Use robust regular expressions that account for variable whitespace and indentation to avoid breaking file formatting.
3. **Format Integrity**: Always verify that the resulting file maintains standard project indentation (one entry per line for large objects).
4. **Verification Sample**: Manually check the first, middle, and last entries of the modified file to ensure the injection was successful and consistent.
