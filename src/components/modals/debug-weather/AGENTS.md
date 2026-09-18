# Purpose

Modular UI subcomponents for the debug weather tables view.

## Ownership

Frontend Developers / UI Components Team.

## Local Contracts

- **Decomposed Card Hierarchy**: `DebugWeatherSeasonCard.vue` and `DebugWeatherProbTag.vue` break down deep `v-for` loops into flat, isolated reactive components. `DebugWeatherProbTag.vue` further delegates elemental type modifiers to `DebugWeatherModifiers.vue` and encounter mini-sprites to `DebugWeatherSpawns.vue`.
- **Style Linkage**: Components link to `@/styles/components/_debug-weather-tables.scss` to maintain 1:1 visual parity.
- **Domain Typing**: Use canonical domain types from `debugWeatherTypes.ts`.

## Work Guidance

- Keep components focused and strictly typed.

## Verification

- `npm run lint`
- `npm run validate:component-styles`
- `npm run test`
