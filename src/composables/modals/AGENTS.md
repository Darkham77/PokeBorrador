# Purpose

Manage the logic and assets of modals.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **Event-Driven Spawn Resolution Governance**:
  - Composables that compute route spawns (`useRouteSpawnsWild`, `useRouteSpawnsFishing`) MUST safely handle dynamic events by using `safeParse`, resolving weekly rotations (`resolveWeeklyRotation`), ignoring wildcard `'*'` open events, and validating species tokens with `isPokemonSpeciesId()` before invoking domain-type assertions or generating tooltips.

## Key Files

- `routeSpawnsCalculationHelper.ts`: Module implementation.
- `useRoutePerks.ts`: Module implementation.
- `useRouteSpawnsCalculation.ts`: Module implementation.
- `useRouteSpawnsFishing.ts`: Module implementation.
- `useRouteSpawnsWild.ts`: Module implementation.
- [`routeSpawnsArchaeologyHelpers.ts`](./routeSpawnsArchaeologyHelpers.ts): Module implementation.
- [`useRouteSpawnsArchaeology.ts`](./useRouteSpawnsArchaeology.ts): Module implementation.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.
- `routeSpawnsArchaeologyHelpers.ts`: Helper module for `useRouteSpawnsArchaeology.ts`, isolating fossil and static category reward construction and detailed tooltip calculation.

## Verification

- Run standard validation scripts.

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
