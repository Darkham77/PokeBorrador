# Purpose

Layout systems, visual cards, and selectors for the Faction War store.

## Ownership

Frontend Developers.

## Local Contracts

### Directory Structure

- `WarShopModal.vue`: Modal interface for the Faction War shop with category filters, sorting controls, and item grid.
- `WarShopItemCard.vue`: Product card for individual war shop items displaying war token prices and purchase triggers.
- `warShopHelpers.ts`: Modular sorting comparator and catalog algorithms for war shop items (by price, rarity tier, level unlock, and coin affordability).

- Handles purchase flows and verification rules using war token items as currency.

## Key Files

- [`WarShopItemCard.vue`](./WarShopItemCard.vue): Module implementation.
- [`WarShopModal.vue`](./WarShopModal.vue): Module implementation.
- [`warShopHelpers.ts`](./warShopHelpers.ts): Module implementation.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
