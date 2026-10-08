# Purpose

Breeding store helpers, daycare slot restoration, egg generation pipelines, and compatibility calculations.

## Ownership

State Architects / Gameplay Engineers.

## Local Contracts

- `breedingStoreHelpers.ts`: Modular domain functions for daycare deposit validation, timer resolution, egg generation, and scanner verification.

## Key Files

- [`breedingStoreHelpers.ts`](./breedingStoreHelpers.ts): Module implementation.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run `npm run test` and `npm run audit`.

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
