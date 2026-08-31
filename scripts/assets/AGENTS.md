# Purpose

Automation scripts for assets downloads, multi-core WebP sprite conversion, crafting tier organization, and item asset collision auditing.

## Architectural Mandates & Tier Structure

- **Crafting Tier Hierarchy**: All inventory and shop item sprites in `public/assets/sprites/` MUST strictly follow the 4-tier domain hierarchy mapped from `item.craftingTier`:
  - `crafting/tier0/`: Raw materials, stones, and primary crafting inputs (`item.craftingTier === 0`).
  - `crafting/tier1/`: Refined materials and intermediate crafting items (`item.craftingTier === 1`).
  - `crafting/tier2/`: Advanced components and complex parts (`item.craftingTier === 2`).
  - `crafting/tier3/`: Finished products, consumables, TMs, Mochis, Pokéballs, and held battle items (`item.craftingTier === 3`).
- **Prohibition on Flat Directories**: Creating flat asset directories (like `items/`) or altering `items.json` paths away from `crafting/tierX/<id>` is strictly forbidden.
- **Zero Hardcoded Dates on Event Banners Mandate**: When generating, editing, or importing event banner illustrations into `_raw-assets/public/assets/ui/events/`, images MUST NEVER contain burned-in calendar dates, specific years (e.g. 2024), timeslots, fixed venue names, or aspect ratio watermarks (`16:9`). Event banners must remain timeless and reusable; event dates and scheduling are managed exclusively by the database and UI engine.

## Key Files & Canonical Commands

- `convert_assets.ts`: Zero-config, multi-core WebP conversion pipeline reading `_raw-assets` and generating asset databases (`npm run assets:convert`).
- `organize_item_sprites_by_tier.ts`: Re-tiering script that moves item sprites into `crafting/tier[0-3]/` based on `item.craftingTier` and synchronizes `items.json`.
- `download_assets.ts`: Downloads missing official sprites from CDN/Bulbapedia/Serebii (`npm run assets:download:items`).
- `audit_item_assets.ts`: Compares database items against physical images in `public/assets/sprites/` to ensure zero missing assets.
- `audit_item_sprite_collisions.ts`: Scans `items.json` to detect duplicate sprite usages across items and emits structured warnings.
- `optimize_sprites.ts`: Sprite optimization and compression.

## Child DOX Index

- [helpers/](./helpers/AGENTS.md): Domain module documentation for asset helper utilities.
