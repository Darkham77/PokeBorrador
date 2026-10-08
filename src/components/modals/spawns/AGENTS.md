# Purpose

Manage modular row components for route spawns, NPC encounters, and archaeology tables.

## Ownership

Frontend Developers / UI Components Team.

## Local Contracts

- **Table Mode Modularization**: Header, row, and panel rendering components (`RouteSpawnsTableHeader.vue`, `RouteSpawnsPokemonRows.vue`, `RouteSpawnsPokemonRow.vue`, `RouteSpawnsProbabilityBar.vue`, `RouteSpawnsNpcRows.vue`, `RouteSpawnsNpcRow.vue`, `RouteSpawnsItemRows.vue`, `RouteSpawnsItemRow.vue`, `RouteSpawnsWeatherEffectsCard.vue`, `RouteSpawnsWeatherCombatEffects.vue`, `RouteSpawnsWeatherDescLine.vue`, `RouteSpawnsWeatherModifiers.vue`, `RouteSpawnsTerrainFeatures.vue`) encapsulate mode-specific layout, column headers, weather combat modifiers, terrain details, tooltip bindings, and interactive emissions for `../RouteSpawnsTable.vue` and `../RouteSpawnsModal.vue`.
- **Style Linkage & Encapsulation**: All sub-components link to `@/styles/components/_route-spawns-tables.scss` to maintain visual parity with pixel art tokens and shared table styling.
- **Zero Duplication**: Ensure type narrowing and tooltips follow domain contracts without inline duplicate logic.

## Key Files

- `routeSpawnsTerrainHelper.ts`: Module implementation.
- [`RouteSpawnsItemRow.vue`](./RouteSpawnsItemRow.vue): Module implementation.
- [`RouteSpawnsItemRows.vue`](./RouteSpawnsItemRows.vue): Module implementation.
- [`RouteSpawnsNpcRow.vue`](./RouteSpawnsNpcRow.vue): Module implementation.
- [`RouteSpawnsNpcRows.vue`](./RouteSpawnsNpcRows.vue): Module implementation.
- [`RouteSpawnsPokemonRow.vue`](./RouteSpawnsPokemonRow.vue): Module implementation.
- [`RouteSpawnsPokemonRows.vue`](./RouteSpawnsPokemonRows.vue): Module implementation.
- [`RouteSpawnsProbabilityBar.vue`](./RouteSpawnsProbabilityBar.vue): Module implementation.
- [`RouteSpawnsTableHeader.vue`](./RouteSpawnsTableHeader.vue): Module implementation.
- [`RouteSpawnsTerrainFeatures.vue`](./RouteSpawnsTerrainFeatures.vue): Module implementation.
- [`RouteSpawnsWeatherCombatEffects.vue`](./RouteSpawnsWeatherCombatEffects.vue): Module implementation.
- [`RouteSpawnsWeatherDescLine.vue`](./RouteSpawnsWeatherDescLine.vue): Module implementation.
- [`RouteSpawnsWeatherEffectsCard.vue`](./RouteSpawnsWeatherEffectsCard.vue): Module implementation.
- [`RouteSpawnsWeatherModifiers.vue`](./RouteSpawnsWeatherModifiers.vue): Module implementation.

## Work Guidance

- Ensure strict TypeScript props and event definitions.

## Verification

- `npm run lint`
- `npm run audit suites=validate_component_styles`
- `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
