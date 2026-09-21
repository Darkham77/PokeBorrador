# Purpose

Manage modular row components for route spawns, NPC encounters, and archaeology tables.

## Ownership

Frontend Developers / UI Components Team.

## Local Contracts

- **Table Mode Modularization**: Header, row, and panel rendering components (`RouteSpawnsTableHeader.vue`, `RouteSpawnsPokemonRows.vue`, `RouteSpawnsPokemonRow.vue`, `RouteSpawnsProbabilityBar.vue`, `RouteSpawnsNpcRows.vue`, `RouteSpawnsNpcRow.vue`, `RouteSpawnsItemRows.vue`, `RouteSpawnsItemRow.vue`, `RouteSpawnsWeatherEffectsCard.vue`, `RouteSpawnsWeatherCombatEffects.vue`, `RouteSpawnsWeatherDescLine.vue`, `RouteSpawnsWeatherModifiers.vue`, `RouteSpawnsTerrainFeatures.vue`) encapsulate mode-specific layout, column headers, weather combat modifiers, terrain details, tooltip bindings, and interactive emissions for `../RouteSpawnsTable.vue` and `../RouteSpawnsModal.vue`.
- **Style Linkage & Encapsulation**: All sub-components link to `@/styles/components/_route-spawns-tables.scss` to maintain visual parity with pixel art tokens and shared table styling.
- **Zero Duplication**: Ensure type narrowing and tooltips follow domain contracts without inline duplicate logic.

## Work Guidance

- Ensure strict TypeScript props and event definitions.

## Verification

- `npm run lint`
- `npm run validate:component-styles`
- `npm run test`
