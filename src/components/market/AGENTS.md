# Purpose

Manage the logic and assets of market.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.
- **Publish Wizard Layout & Action Hierarchy**: In 2-step publish/selection views (such as `MarketPublish.vue`), secondary action buttons (e.g. "CAMBIAR SELECCIÓN") must be positioned below the primary submission action ("PUBLICAR OFERTA") and use `.btn-vicio-neutral` to establish clear visual hierarchy. Decomposes the left-hand item/Pokémon selection container and pagination controls into `MarketPublishSelector.vue`.
- **Market Filters Decomposition (`MarketFilters.vue`, `MarketPokemonFiltersGroup.vue`)**: Decomposes tier tag and type tooltip filters into `MarketPokemonFiltersGroup.vue` to maintain minimal template complexity.
- **Preview Entity Component Reuse**: Selected entities must render canonical visual cards (e.g. `<BoxPokemonCard>`) with click-to-inspect handlers opening details. Empty selection prompts must use flex centering with `margin: auto;`.

## Verification

- Run standard validation scripts.

## Key Files

- `MarketExplorer.vue`: Module implementation.
- `MarketExplorerListingCard.vue`: Module implementation.
- `MarketHistoryRowItem.vue`: Module implementation.
- `MarketItemCard.vue`: Module implementation.
- `MarketItemFilters.vue`: Module implementation.
- `MarketMyItems.styles.scss`: Module implementation.
- `MarketMyItems.vue`: Module implementation.
- `MarketMyListingCard.vue`: Module implementation.
- `MarketPublish.styles.scss`: Module implementation.
- `MarketPublishForm.vue`: Module implementation.
- `TradeView.vue`: Module implementation.
- `marketExplorerHelper.ts`: Module implementation.
- `marketMyItemsHelper.ts`: Module implementation.
- `useMarketPublishActions.ts`: Module implementation.
- `useMarketPublishInventory.ts`: Module implementation.
- `useMarketPublishPokemon.ts`: Module implementation.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
