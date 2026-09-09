# Purpose

Static inventory item database, prices, shop configurations, crafting tiers, vitamins, mochis, and consumable items.

## Local Contracts

- **Centralized Asset Resolution**: Item sprites MUST be resolved strictly via `getAssetUrl(ASSET_TYPES.ITEM, item.id)`. Direct manipulation or hardcoding of asset paths in application code is strictly forbidden.
- **Canonical Item Queries**: Access to items MUST always query by canonical Showdown `ItemId` through typed domain helpers (`getItemById`, `requireItemId`, `SHOP_ITEMS`) exported from `items.ts`. Querying items by localized name (e.g. `getItemByName` or `id || name`) is strictly prohibited.
- **Mandatory Spanish Localization**: All items in `items.json` must have their `name` and `desc` localized into Spanish. Raw English description strings imported from Pokémon Showdown or untranslated category suffixes (e.g. `Berry`, `Sweet`, `Orb`, `Plate`) are strictly forbidden.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
