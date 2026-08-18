# Purpose

Static inventory item database, prices, shop configurations, crafting tiers, vitamins, mochis, and consumable items.

## Local Contracts

- **Crafting Tier Sprite Paths**: Every item in `items.json` and `items.ts` must have a numeric `craftingTier` (0 to 3) and its `sprite` property MUST follow the exact format `crafting/tier${craftingTier}/${id}`.
- **Prohibition on Flat Sprite Paths**: Never set `sprite` to flat paths like `items/<id>` or plain `<id>`.
- **Domain Wrapping**: Access to `items.json` MUST always go through typed domain helpers (`getItemById`, `getItemByName`, `SHOP_ITEMS`) exported from `items.ts`.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
