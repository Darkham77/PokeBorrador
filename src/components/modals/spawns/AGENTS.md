# Purpose

Manage modular row components for route spawns, NPC encounters, and archaeology tables.

## Ownership

Frontend Developers / UI Components Team.

## Local Contracts

- **Table Mode Modularization**: Row rendering components (`RouteSpawnsPokemonRows.vue`, `RouteSpawnsNpcRows.vue`, `RouteSpawnsItemRows.vue`) encapsulate mode-specific layout, tooltip bindings, and interactive emissions for `RouteSpawnsTable.vue`.
- **Style Linkage & Encapsulation**: All sub-components link to `@/styles/components/_route-spawns-tables.scss` to maintain visual parity with pixel art tokens and shared table styling.
- **Zero Duplication**: Ensure type narrowing and tooltips follow domain contracts without inline duplicate logic.

## Work Guidance

- Ensure strict TypeScript props and event definitions.

## Verification

- `npm run lint`
- `npm run validate:component-styles`
- `npm run test`
