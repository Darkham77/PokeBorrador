# Purpose

Automation scripts for assets downloads, multi-core WebP sprite conversion, crafting tier organization, and item asset collision auditing.

## Ownership

Poké Vicio Development Team.

## Local Contracts

### Architectural Mandates & Tier Structure

- **Crafting Tier Hierarchy**: All inventory and shop item sprites in `public/assets/sprites/` MUST strictly follow the 4-tier domain hierarchy mapped from `item.craftingTier`:
  - `crafting/tier0/`: Raw materials, stones, and primary crafting inputs (`item.craftingTier === 0`).
  - `crafting/tier1/`: Refined materials and intermediate crafting items (`item.craftingTier === 1`).
  - `crafting/tier2/`: Advanced components and complex parts (`item.craftingTier === 2`).
  - `crafting/tier3/`: Finished products, consumables, TMs, Mochis, Pokéballs, and held battle items (`item.craftingTier === 3`).
- **Prohibition on Flat Directories**: Creating flat asset directories (like `items/`) or altering `items.json` paths away from `crafting/tierX/<id>` is strictly forbidden.
- **Unified Event Banners Mandate (Spanish Typography, Timeless Design & Species Whitelist)**: When generating, editing, or importing event banner illustrations into `_raw-assets/public/assets/ui/events/`:
  1. **Mandatory Spanish Typography**: If an image contains any typography, logos, titles, or stadium signage, it MUST be strictly and exclusively in Spanish (e.g. `"TORNEO FRONTERA JOHTO-KANTO"`). English text burned into graphic pixels is strictly forbidden.
  2. **Zero Hardcoded Dates**: Images MUST NEVER contain burned-in calendar dates, specific years (e.g. 2024, 2026), timeslots, fixed venue names, or aspect ratio watermarks (`16:9`). Event banners must remain timeless and reusable; event dates and scheduling are managed exclusively by the database and UI engine.
  3. **Enabled Pokémon Whitelist**: Any artwork, event banners, tournament illustrations, or rewards generated or registered for the game MUST strictly and exclusively depict Pokémon from the official enabled species whitelist (`ENABLED_POKEMON_IDS` in `src/data/system/constants.ts`). Using unreleased, non-whitelisted, or custom unapproved species (such as Lucario, Garchomp, Greninja, Metagross, Tyranitar, Darkrai, Blaziken, or custom forms like Mewtwo Armored) in illustration prompts or reward tables is STRICTLY FORBIDDEN. Detailed standards are governed in [Event System Manual](../../.agents/skills/project-standards/references/systems/event_system_manual.md).
- **Generated Feet Database**: `regenerateFeetDatabase()` (`helpers/catalogGenerators.ts`) rewrites `src/data/pokemon/pokemonFeetDatabase.ts` during `assets_pipeline_suite.test.ts`. Its template MUST stay identical to the committed file and domain-type-first (no `Record<string, ...>` casts); otherwise running the tests dirties `src/` and breaks `auditor`.

## Key Files

- [`audit_item_assets.ts`](./audit_item_assets.ts): Compares database items against physical images in `public/assets/sprites/` to ensure zero missing assets (`npm run assets:audit:items`).
- [`audit_item_sprite_collisions.ts`](./audit_item_sprite_collisions.ts): Scans `items.json` to detect duplicate sprite usages across items and emits structured warnings.
- [`convert_and_sync_item_sprites.ts`](./convert_and_sync_item_sprites.ts): Item sprite conversion and JSON path synchronization (`npm run assets:convert:items`).
- [`convert_assets.ts`](./convert_assets.ts): Zero-config, multi-core WebP conversion pipeline reading `_raw-assets` and generating asset databases (`npm run assets:convert`).
- [`download_assets.ts`](./download_assets.ts): Downloads missing official sprites from CDN/Bulbapedia/Serebii (`npm run assets:download [items | pokemon | all]`).
- [`download_badges.ts`](./download_badges.ts): Downloads gym badge illustrations and maps them into raw assets directory.
- [`download_ranked_medals.ts`](./download_ranked_medals.ts): Downloads the 6 official rank medals from Bulbapedia Archives into `_raw-assets/public/assets/sprites/ranked_medals/` (`npm run assets:download:medals`).
- [`fetch_sprites.ts`](./fetch_sprites.ts): Batch sprite downloader fetching animated and static Pokemon battle sprites.
- [`init_shadow_overrides.ts`](./init_shadow_overrides.ts): Initializes baseline shadow override configurations for sprite rendering.
- [`optimize_sprites.ts`](./optimize_sprites.ts): Sprite optimization and multi-core WebP compression (`npm run assets:optimize`).
- [`organize_item_sprites_by_tier.ts`](./organize_item_sprites_by_tier.ts): Re-tiering script that moves item sprites into `crafting/tier[0-3]/` based on `item.craftingTier` and synchronizes `items.json`.
- [`recompile_feet_database.ts`](./recompile_feet_database.ts): Recompiles feet coordinates and shadow offsets database from manual overrides (`npm run database:recompile-feet`).
- [`variantImageAnalyzer.ts`](./variantImageAnalyzer.ts): Image analysis utility inspecting alpha channels and visual boundaries for sprite alignment.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- [helpers/](./helpers/AGENTS.md): Domain module documentation for asset helper utilities.
