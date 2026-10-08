# Purpose

Manage the logic and assets of pokemon-detail.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **Dynamic Competition Trophy Thematic Name Resolution (`PokemonTrophiesTab.vue`, `@/components/modals/UnifiedPokemonDetailModal.vue`)**:
  - Competition trophy listings in Pokémon summaries and detail tabs MUST resolve event titles dynamically via `resolveTrophyDisplayName(trophy, eventStore.allEvents, speciesId)` rather than statically printing raw `trophy.eventName`, guaranteeing 1:1 visual parity with active event rotation titles and past event podium cards.
  - The `:species-id` prop must be forwarded across modal tab containers to ensure intra-species and rotation-specific titles resolve accurately regardless of modal context.
- **Decomposed Modal Subcomponents (`PokemonDetailHeader.vue`, `PokemonDetailTabContent.vue`, `PokemonSummaryPhysicalGrid.vue`, `PokemonSummaryTrophiesSection.vue`)**:
  - Modal top identity presentation, tab switching body, physical stats grid, and competition trophy history are decoupled into dedicated subcomponents to ensure single-responsibility modularity and low cognitive complexity for `@/components/modals/UnifiedPokemonDetailModal.vue` and `PokemonSummaryTab.vue`.

## Key Files

- `PokemonActionFooter.vue`: Module implementation.
- `PokemonEvolutionsTab.vue`: Module implementation.
- `PokemonMovesTab.vue`: Module implementation.
- `PokemonStatBar.vue`: Module implementation.
- `PokemonStatsTab.vue`: Module implementation.
- `PokemonStatusSection.vue`: Module implementation.
- `PokemonTmsTab.vue`: Module implementation.
- `pokemonSummaryHelper.ts`: Module implementation.
- `pokemonSummaryTypes.ts`: Module implementation.
- [`PokemonDetailHeader.vue`](./PokemonDetailHeader.vue): Module implementation.
- [`PokemonDetailTabContent.vue`](./PokemonDetailTabContent.vue): Module implementation.
- [`PokemonSummaryPhysicalGrid.vue`](./PokemonSummaryPhysicalGrid.vue): Module implementation.
- [`PokemonSummaryTab.vue`](./PokemonSummaryTab.vue): Module implementation.
- [`PokemonSummaryTrophiesSection.vue`](./PokemonSummaryTrophiesSection.vue): Module implementation.
- [`PokemonTrophiesTab.vue`](./PokemonTrophiesTab.vue): Module implementation.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.

## Verification

- Run standard validation scripts.

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
