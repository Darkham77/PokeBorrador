# Purpose

Unit tests for environmental climate cycles, overworld navigation, wild pokemon spawn rates, gyms, and overworld assets.

## Ownership

Poké Vicio Development Team.

## Local Contracts

### Consolidated Test Suites

- [`world_assets_and_map_card_suite.spec.ts`](./world_assets_and_map_card_suite.spec.ts): Assets routing (Pokemon, map, item, trainer), map card helpers, discovery logic, fossils, and decoupled weather flow.
- [`world_gyms_and_guardians_suite.spec.ts`](./world_gyms_and_guardians_suite.spec.ts): Gym engine victories, Showdown gym leader battle simulation, Kanto Gen 1 restriction, and guardian lockout system integrity.
- [`world_spawns_and_maps_suite.spec.ts`](./world_spawns_and_maps_suite.spec.ts): Map wild spawns, spawn integrity, route spawn tables, and encounters.
- [`world_weather_and_atmosphere_suite.spec.ts`](./world_weather_and_atmosphere_suite.spec.ts): Weather tables, weather utilities, reactive climate system, and AtmosphereLayer animations.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
