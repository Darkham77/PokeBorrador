# Purpose

Manage the logic and assets of items.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **itemEffectHandlers.ts**: Pure stateless handlers for consumable items (potions, revives, status cures, PP restorers, evolution stones, EV vitamins, feathers, EV-reducing berries).
- **itemEffectsHelpers.ts**: Pure stateless helpers for dynamic TM learning and item effect compatibility.
- **itemEffects.ts**: Main registry mapping item IDs to dynamic effects or handlers and validating targeting with `isValidTarget`.
- **11 Mechanical Item Families & Consumption Lifecycle**: Items are strictly taxonomized across 11 functional families (Direct Healing, EVs & Mochis, Global Timed Buffs, TM Learning, Move Relearner, Trait Customization, Evolutionary Items, Held Items, Pokéballs, Fossils, Crafting & Economy). Direct usable items consume immediately upon use; deferred items (`moverelearner`, `naturepatch`, `abilitypill`, `ppup`, `ppmax`, `tm` with 4 moves) return `{ deferred: true }` and delegate consumption to the secondary selection confirmation callback, guaranteeing atomic rollback (0 items consumed) if cancelled.
- **Canonical Alphanumeric Item Identifiers**: All item IDs referenced in handlers, effects, and modals must strictly match the canonical Showdown alphanumeric identifier format declared in `itemIds.ts` and `items.json` (e.g. `'moverelearner'`, never snake_case `'move_relearner'`).
- **Showdown Healthy Status Representation**: An unafflicted Pokémon's status is represented strictly as an empty string `''`, never `null`. Target validators and item math helpers MUST evaluate status presence using `Boolean(pokemon.status)`, strictly avoiding `status !== null` checks which incorrectly evaluate healthy Pokémon as afflicted.
- **Held Items Pre-Validation in `isValidTarget`**: Party Pokémon are always valid targets for equippable held items (`cat === 'combat_held'` or `breeding_held`). `isValidTarget` must reflect this to allow smooth equipment flows.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.

## Verification

- Run standard validation scripts (`npm test`).

## Child DOX Index

- [helpers](helpers/AGENTS.md) — Pure stateless helpers for item effects and TM learning compatibility.
