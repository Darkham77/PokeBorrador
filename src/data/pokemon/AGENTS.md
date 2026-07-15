# Purpose

Static Pokémon data, species database, sprites mappings, evolution triggers, and footprints database.

## Child DOX Index

- [animatedSpriteDatabase.ts](./animatedSpriteDatabase.ts): Sprite animations metadata and frame sizes.
- [evolutionData.ts](./evolutionData.ts): Evolution conditions, methods, and levels.
- [npcSpriteCatalog.ts](./npcSpriteCatalog.ts): NPC trainer sprites mappings.
- [pokedex.ts](./pokedex.ts): Regional Pokedex layouts and generations sorting.
- [pokemonDB.ts](./pokemonDB.ts): Core statistics, base moves, and properties for every Pokémon species.
- [pokemonFeetDatabase.ts](./pokemonFeetDatabase.ts): Overworld footprint offsets.
- [speciesMetadata.ts](./speciesMetadata.ts): Custom tiers, grades, catch difficulty, and attributes.
- [spriteMapping.ts](./spriteMapping.ts): Legacy sprite filename routes translation mapping.

## STONE_EVOLUTIONS Format Contract

The `stone` field in every `STONE_EVOLUTIONS` entry MUST be a valid Showdown
item ID (e.g. `"thunderstone"`, `"waterstone"`, `"firestone"`).
Spanish display names are STRICTLY FORBIDDEN as values in this field.

Evolution logic in `evolutionLogic.ts` compares `usedItemId === entry.stone`
directly — no translation layer is allowed. Display resolution is handled
by `getItemName(entry.stone)` at the UI layer (e.g. `usePokemonDetail.ts`).
