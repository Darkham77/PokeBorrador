# Purpose

Manage the logic and assets of map.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **Decomposed Card Animation Helpers (`mapCardAnimationHelpers.ts`)**:
  - Complex timeline builders for map card tags, factions, fishing bobbing, archaeology swings, and rare/atmospheric spawn auras are isolated into pure animation helper functions to maintain minimal cognitive complexity in `useMapCardAnimations.ts`.

## Key Files

- `useMapCardObservers.ts`: Module implementation.
- `useMapCardSprites.ts`: Module implementation.
- `usePokemonCenterCooldown.ts`: Module implementation.
- [`mapCardAnimationHelpers.ts`](./mapCardAnimationHelpers.ts): Module implementation.
- [`useMapCardAnimations.ts`](./useMapCardAnimations.ts): Module implementation.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.

## Verification

- Run standard validation scripts.

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
