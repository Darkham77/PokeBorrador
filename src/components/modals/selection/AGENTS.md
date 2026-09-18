# Purpose

Manage modular subcomponents for the PokemonSelectionModal and PokemonSelectionItem views.

## Ownership

Frontend Developers / UI Components Team.

## Local Contracts

- **Selection Item Decomposition**: Subcomponents (`PokemonSelectionItemBattleHp.vue`, `PokemonSelectionItemDaycare.vue`, `PokemonSelectionItemCompetition.vue`, `PokemonSelectionItemPreview.vue`, `PokemonSelectionItemHeaderActions.vue`) encapsulate mode-specific badges, HP bars, breeding compatibility information, sprite previews, header action badges, and tournament competition metrics.
- **Style Linkage & Encapsulation**: All sub-components link to `../PokemonSelectionItem.styles.scss` to maintain visual styling and design system parity.
- **Zero Inline Duplication**: Keep template branches encapsulated and strongly typed against canonical domain schemas.

## Work Guidance

- Ensure strict TypeScript props without loose `any` casts.
- Interactive elements must declare explicit `id` attributes.

## Verification

- `npm run lint`
- `npm run validate:component-styles`
- `npm run test`
