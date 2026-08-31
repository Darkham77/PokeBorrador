# Content Creation Manual (Poké Vicio)

> **Scope & Authority**: This manual defines the standard authoring procedures and integrity rules for adding new Pokémon, moves, abilities, items, dialogues, missions, and assets to the Poké Vicio engine.
> **Sources of Truth**:
> - Domain Types: `@/domain-type-first` (`.agents/skills/domain-type-first/SKILL.md`)
> - Item System: [`../systems/item_system_manual.md`](../systems/item_system_manual.md)
> - Asset Pipeline: [`../technical/asset_service_manual.md`](../technical/asset_service_manual.md)
> - Validation Scripts: [`../qa/validation_manual.md`](../qa/validation_manual.md)

---

## 1. 🚨 Core Data Integrity & Authoring Rules

1. **Object Names**: Always use full official English identifiers for keys (e.g. `'pp_up'`, NOT `'pp-up'` or `'PPUP'`).
2. **Deduplication**: Never add an element (move, ability, item) that already exists. Always execute validators before committing.
3. **PP Synchronization**: When initializing a move for a Pokémon, `maxPP` must equal its initial base `pp`.
4. **Image Formats**: All external sprite downloads and UI icons must be converted to **PNG** / **WebP** via the asset pipeline.
5. **Dynamic Tier Calculation**: Tier ratings (S+, S, A, etc.) are computed dynamically in the UI via `src/logic/constants/tiers.ts`. Do not hardcode tiers into static databases.
6. **SASS Directives**: In component styles, `@use` directives must be the first lines of the `<style>` block.
7. **CLI-First Verification**: Upon completing content implementation, verify the content via `window.__VITE_DEBUG__` commands.
8. **Prop Unification**: Always use `isShiny` (Boolean) for asset resolution and logic. The legacy `shiny` property is deprecated.
9. **Item Parity Mandate**: Absolute synchronization between `SHOP_ITEMS` (`src/data/items.ts`), `HEALING_ITEMS`, and logic effects is mandatory. Every consumable item MUST be registered in both constants to avoid `[PHANTOM]` item warnings in `validate:items`.
10. **External Asset Download (Bulbapedia)**: Requests to `archives.bulbagarden.net` require a `Referer: https://bulbapedia.bulbagarden.net/` header and realistic `User-Agent`.
11. **Fail-Fast Asset Policy**: Do not mask missing item images or visual assets with fallback emojis or generic icons in development. If an asset is missing, fail visibly to ensure prompt resolution.
12. **Segmented Shop Audits**: Item asset validation and diagnostic tools must categorize and audit database collections independently (e.g., Poké Market vs BC Shop) based on their specific runtime filters (`market !== false` and `trainerShop === true`).
13. **Weather Token Consistency**: Always use the token **`snow`** for ice-based weather in metadata and encounter configs. The token `ice` is reserved for mechanical type references.
14. **Canonical Ability Data Normalization**: Ability identifiers in datasets must match canonical English Showdown IDs (e.g. `'runaway'`, `'shedskin'`, `'static'`).
15. **Thematic and Unique Mission Descriptions**: Class deployment descriptions (basic, advanced, expert) MUST be unique and specific per duration (6h, 12h, 24h) and player class.
16. **Strict English ID Policy**: All database keys and entity IDs (`karate_chop`, `super_potion`, `quest_daily_01`) MUST strictly be written in English. Localized languages (Spanish, etc.) must only be used in display names, labels, and text descriptions for the UI.
17. **Zero-Fallback Dialogue Policy**: Dialog/phrase resolution functions (e.g., `getRandomQuoteForTrainer`) MUST NOT fall back to generic placeholder strings when an archetype or trainer type is queried. If required keys are missing from the registry, the system must throw an explicit error (`throw new Error`) immediately.
18. **Dialogue Exception Test Coverage**: Test suites must verify that phrase/quote resolution functions execute cleanly without throwing errors for all registered database keys, and assert that they throw when queried with an invalid key.
19. **Item Sprite Crafting Tier Hierarchy**: All inventory and shop item sprites in `public/assets/sprites/` MUST strictly follow the 4-tier domain hierarchy (`crafting/tier0/`, `crafting/tier1/`, `crafting/tier2/`, `crafting/tier3/`) derived from `item.craftingTier`.
20. **Zero Hardcoded Dates on Event Artwork**: When authoring or generating event graphics and promotional banners, images MUST NOT include burned-in dates, years, start/end hours, or watermarks. All date information is dynamic and rendered via UI overlays.

---

## 2. 🐲 Adding a New Pokémon Species

### Step 1: POKEMON_DB (`src/data/pokemon/pokemonDB.ts`)
Ensure that the species entry includes base stats, height, weight, catch rate, and learnsets containing only moves that exist in `MOVE_DATA`.

### Step 2: Types and Abilities
- **Types**: Register primary and secondary types in `src/data/types.ts`.
- **Abilities**: Register in `src/data/abilities.ts` -> `POKEMON_ABILITIES`. If the ability is new, implement its mechanical behavior in Showdown / `src/logic/battle/battleAbilities.ts`.

### Step 3: Evolutions (`src/data/evolutionData.ts`)
Register species evolution triggers in `EVOLUTION_TABLE`, `STONE_EVOLUTIONS`, or `TRADE_EVOLUTIONS`.

### Step 4: Pokédex (`src/logic/pokedexConstants.ts`)
- Register the National Dex ID in `POKEMON_SPRITE_IDS`.
- Insert in the `PDEX_ORDER` array.
- Add TM compatibility in `TM_COMPAT` (aligned with Gen 9 standards).

---

## 3. 💾 Bulk Data Injection & Mass Updates

When performing mass updates on a database file (e.g. adding properties to 200+ Pokémon):

1. **Automation Required**: Use TypeScript/Node maintenance scripts in `scripts/` to parse and modify the database. Manual editing for mass changes is strictly forbidden.
2. **Deterministic Formatting**: Ensure the output maintains clean indentation, trailing commas, and sorted keys.
3. **Verification Sample**: Run `npm run validate:pokemon` and verify that the database compiles and passes type checks.

---

## 4. ✅ Pre-Commit Content Checklist

- [ ] Entry in `POKEMON_DB` with valid base stats and Gen 9 learnset.
- [ ] Secondary types and abilities registered in canonical databases.
- [ ] Evolution mappings registered in `src/data/evolutionData.ts`.
- [ ] Pokédex ID and TM compatibility configured.
- [ ] Sprites converted and verified via `npm run validate:sprites`.
- [ ] Run `npm run audit:family:domain` with 0 errors.
