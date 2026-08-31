# Purpose

Manage the logic and assets of pokemon-detail.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **Dynamic Competition Trophy Thematic Name Resolution (`PokemonTrophiesTab.vue`, `UnifiedPokemonDetailModal.vue`)**:
  - Competition trophy listings in Pokémon summaries and detail tabs MUST resolve event titles dynamically via `resolveTrophyDisplayName(trophy, eventStore.allEvents, speciesId)` rather than statically printing raw `trophy.eventName`, guaranteeing 1:1 visual parity with active event rotation titles and past event podium cards.
  - The `:species-id` prop must be forwarded across modal tab containers to ensure intra-species and rotation-specific titles resolve accurately regardless of modal context.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.

## Verification

- Run standard validation scripts.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
