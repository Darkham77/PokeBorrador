# Purpose

Manage the logic and assets of items.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **itemEffectHandlers.ts**: Pure stateless handlers for consumable items (potions, revives, status cures, PP restorers, evolution stones).
- **itemEffects.ts**: Main registry mapping item IDs to dynamic effects or handlers.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.

## Verification

- Run standard validation scripts (`npm test`).

## Child DOX Index

- [itemEffects.ts](./itemEffects.ts): Main registry mapping item IDs to consumable handlers.
- [itemEffectHandlers.ts](./itemEffectHandlers.ts): Stateless helper functions for healing, status clearance, and evolution stone triggers.
