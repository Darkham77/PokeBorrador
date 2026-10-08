# Purpose

Manage modular subcomponents for the PokemonSelectionModal and PokemonSelectionItem views.

## Ownership

Frontend Developers / UI Components Team.

## Local Contracts

- **Selection Item Decomposition**: Subcomponents (`PokemonSelectionItemBattleHp.vue`, `PokemonSelectionItemDaycare.vue`, `PokemonSelectionItemCompetition.vue`, `PokemonSelectionItemPreview.vue`, `PokemonSelectionItemHeaderActions.vue`) encapsulate mode-specific badges, HP bars, breeding compatibility information, sprite previews, header action badges, and tournament competition metrics.
- **Style Linkage & Encapsulation**: All sub-components link to `../PokemonSelectionItem.styles.scss` to maintain visual styling and design system parity.
- **Zero Inline Duplication**: Keep template branches encapsulated and strongly typed against canonical domain schemas.

## Key Files

- [`PokemonSelectionItemBattleHp.vue`](./PokemonSelectionItemBattleHp.vue): Module implementation.
- [`PokemonSelectionItemCompetition.vue`](./PokemonSelectionItemCompetition.vue): Module implementation.
- [`PokemonSelectionItemDaycare.vue`](./PokemonSelectionItemDaycare.vue): Module implementation.
- [`PokemonSelectionItemHeaderActions.vue`](./PokemonSelectionItemHeaderActions.vue): Module implementation.
- [`PokemonSelectionItemPreview.vue`](./PokemonSelectionItemPreview.vue): Module implementation.

## Work Guidance

- Ensure strict TypeScript props without loose `any` casts.
- Interactive elements must declare explicit `id` attributes.

## Verification

- `npm run lint`
- `npm run audit suites=validate_component_styles`
- `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
