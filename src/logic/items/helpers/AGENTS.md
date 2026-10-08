# Purpose

Provide pure stateless helper functions for item effects and TM learning compatibility.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **itemEffectsHelpers.ts**: Pure stateless helpers for resolving TM learning availability and dynamic item effects. Zero Pinia or UI dependencies.

## Key Files

- `itemEffectsHelpers.ts`: Module implementation.
- `itemEvEffects.ts`: Module implementation.
- `itemEvolutionEffects.ts`: Module implementation.
- `itemGlobalBuffs.ts`: Module implementation.
- `itemHealingEffects.ts`: Module implementation.
- `itemSpecialBuffEffects.ts`: Module implementation.
- `itemTargetValidator.ts`: Module implementation.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.

## Verification

- Run standard test suites (`npm run test:node` or `npm run test`).

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
