# Purpose

Trainer settings, custom player classes, cosmetics config, and trainer dialogue databases.

## Child DOX Index

- [cosmeticsData.ts](./cosmeticsData.ts): Custom avatar icons, border, and title cosmetics.
- [playerClasses.ts](./playerClasses.ts): Available classes, starters, and special bonuses.
- [trainer.ts](./trainer.ts): Default player settings database.
- [trainerPhrases.ts](./trainerPhrases.ts): Custom trainer battle and interaction phrases.
- [trainerTypes.ts](./trainerTypes.ts): NPC trainer sprite and team composition archetypes.

## Reputation Shop Items — Single Source of Truth

The canonical definition of reputation shop entries lives in
`ReputationShopModal.vue` (local `REPUTATION_SHOP_ITEMS` array).
Do NOT duplicate this list in `playerClasses.ts` or any other data file.

Each entry MUST contain only structural fields (`id`, `repCost`, `sprite`,
`givesId`, `givesQty`, `tier`, `cat`). The `name` and `desc` fields are
resolved dynamically from `items.json` via `getItemName`/`getItemById`.
