# Purpose

Modular UI subcomponents for the debug weather tables view.

## Ownership

Frontend Developers / UI Components Team.

## Local Contracts

- **Decomposed Card Hierarchy**: `DebugWeatherSeasonCard.vue` and `DebugWeatherProbTag.vue` break down deep `v-for` loops into flat, isolated reactive components. `DebugWeatherProbTag.vue` further delegates elemental type modifiers to `DebugWeatherModifiers.vue` and encounter mini-sprites to `DebugWeatherSpawns.vue`.
- **Style Linkage**: Components link to `@/styles/components/_debug-weather-tables.scss` to maintain 1:1 visual parity.
- **Domain Typing**: Use canonical domain types from `debugWeatherTypes.ts`.

## Key Files

- [`DebugWeatherModifiers.vue`](./DebugWeatherModifiers.vue): Module implementation.
- [`DebugWeatherProbTag.vue`](./DebugWeatherProbTag.vue): Module implementation.
- [`DebugWeatherSeasonCard.vue`](./DebugWeatherSeasonCard.vue): Module implementation.
- [`DebugWeatherSpawns.vue`](./DebugWeatherSpawns.vue): Module implementation.

## Work Guidance

- Keep components focused and strictly typed.

## Verification

- `npm run lint`
- `npm run auditor:component-styles`
- `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
