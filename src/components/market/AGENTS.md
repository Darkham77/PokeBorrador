# Purpose

Manage the logic and assets of market.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.
- **Publish Wizard Layout & Action Hierarchy**: In 2-step publish/selection views (such as `MarketPublish.vue`), secondary action buttons (e.g. "CAMBIAR SELECCIÓN") must be positioned below the primary submission action ("PUBLICAR OFERTA") and use `.btn-vicio-neutral` to establish clear visual hierarchy.
- **Preview Entity Component Reuse**: Selected entities must render canonical visual cards (e.g. `<BoxPokemonCard>`) with click-to-inspect handlers opening details. Empty selection prompts must use flex centering with `margin: auto;`.

## Verification

- Run standard validation scripts.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
