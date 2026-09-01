# Purpose

Trainer settings, custom player classes, cosmetics config, and trainer dialogue databases.

## Local Contracts

- **Dynamic Thematic Trainer Pools (trainerTypes.ts)**: Trainer archetypes define declarative thematic criteria (`types`, `matchMode: 'any_type' | 'pure_type' | 'primary_type'`, `extraPool`, `excludedSpecies`). Archetype species pools are precalculated once at module load (`computeTrainerTypes`) against `ENABLED_POKEMON_IDS` (excluding legendaries by default), providing an immutable $O(1)$ dictionary `TRAINER_TYPES` and `getArchetypePool(archetype)`.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
