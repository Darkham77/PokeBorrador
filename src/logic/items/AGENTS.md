# Purpose

Manage the logic and assets of items.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **itemEffectHandlers.ts**: Pure stateless handlers for consumable items (potions, revives, status cures, PP restorers, evolution stones, EV vitamins, feathers, EV-reducing berries).
- **itemEffectsHelpers.ts**: Pure stateless helpers for dynamic TM learning and item effect compatibility.
- **itemEffects.ts**: Main registry mapping item IDs to dynamic effects or handlers and validating targeting with `isValidTarget`.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.

## Verification

- Run standard validation scripts (`npm test`).

## Child DOX Index

- [helpers](helpers/AGENTS.md) — Pure stateless helpers for item effects and TM learning compatibility.
