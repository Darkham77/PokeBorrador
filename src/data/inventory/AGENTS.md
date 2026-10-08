# Purpose

Static inventory item database, prices, shop configurations, crafting tiers, vitamins, mochis, and consumable items.

## Ownership

Poké Vicio Development Team.

## Local Contracts

- **Centralized Asset Resolution**: Item sprites MUST be resolved strictly via `getAssetUrl(ASSET_TYPES.ITEM, item.id)`. Direct manipulation or hardcoding of asset paths in application code is strictly forbidden.
- **Canonical Item Queries**: Access to items MUST always query by canonical Showdown `ItemId` through typed domain helpers (`getItemById`, `requireItemId`, `SHOP_ITEMS`) exported from `items.ts`. Querying items by localized name (e.g. `getItemByName` or `id || name`) is strictly prohibited.
- **Mandatory Spanish Localization**: All items in `items.json` must have their `name` and `desc` localized into Spanish. Raw English description strings imported from Pokémon Showdown or untranslated category suffixes (e.g. `Berry`, `Sweet`, `Orb`, `Plate`) are strictly forbidden.

## Key Files

- `itemIds.ts`: Module implementation.
- [`items.ts`](./items.ts): Module implementation.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
