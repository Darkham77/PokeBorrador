# Purpose

Trainer settings, custom player classes, cosmetics config, and trainer dialogue databases.

## Ownership

Poké Vicio Development Team.

## Local Contracts

- **Dynamic Thematic Trainer Pools (trainerTypes.ts)**: Trainer archetypes define declarative thematic criteria (`types`, `matchMode: 'any_type' | 'pure_type' | 'primary_type'`, `extraPool`, `excludedSpecies`). Archetype species pools are precalculated once at module load (`computeTrainerTypes`) against `ENABLED_POKEMON_IDS` (excluding legendaries by default), providing an immutable $O(1)$ dictionary `TRAINER_TYPES` and `getArchetypePool(archetype)`.

## Key Files

- `cosmeticsData.ts`: Module implementation.
- `playerClasses.ts`: Module implementation.
- `trainer.ts`: Module implementation.
- `trainerPhrases.ts`: Module implementation.
- [`trainerTypes.ts`](./trainerTypes.ts): Module implementation.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
