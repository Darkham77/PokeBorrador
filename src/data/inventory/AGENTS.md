# Purpose

Static inventory item database.

## Child DOX Index

- [items.ts](./items.ts): List of shop items, balls, evolutionary items, potions, and buffs.

## Item Display Name Resolution

When displaying an item's name in the UI, ALWAYS resolve it dynamically using
`getItemName(id)` from `@/data/inventory/items`. NEVER hardcode the Spanish
name as an ID or pass it to logic functions.

- **Correct**: `getItemName('waterstone')` → returns "Piedra Agua" for display
- **Wrong**: `handleStone(p, 'Piedra Agua')` — Spanish name used as logic ID

For shop-like components that define a list of items with a `givesId` field,
the `name` and `desc` fields MUST be omitted from the static definition and
resolved at render time via `getItemName(givesId)` and `getItemById(givesId).desc`.
Items not present in `items.json` may keep a fallback `name`/`desc` field.
