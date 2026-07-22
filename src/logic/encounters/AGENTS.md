# Purpose

Generate wild Pokémon encounters, fishing pools, and archaeology spawns based on zone metadata.

## Ownership

Game Designers / Encounter Logic Developers.

## Local Contracts

- Keep encounter calculations decoupled from views.
- **fishingEncounterHelper.ts**: Isolates fishing rod budgets, weather visitors, and exclusive water pools from the primary encounter generator (`generateEncounter`).
- Ensure spawn pool probabilities sum to 100% or follow standard spawn rates mapping.

## Child DOX Index

- [encounters.ts](./encounters.ts): Main entry point for ground, fishing, and archaeology encounter rolls.
- [fishingEncounterHelper.ts](./fishingEncounterHelper.ts): Fishing pool, rod budget, and weather visitor calculations.
- [encounterHelpers.ts](./encounterHelpers.ts): Base rate calculations, atmospheric status, and pool selection utilities.
