# Purpose

Pokemon factory structures, trophy history, physical dimensions, and species specifications.

## Ownership

Pokemon Mechanics Team / System Architects.

## Local Contracts

- **Physical Dimensions**: Continuous dimensions (`height?: number` in meters, `weight?: number` in kilograms) are stored as numbers on the `Pokemon` instance. Physical tier classifications (XXS to XXL) MUST be calculated in real-time via `calculateInstancePhysicalData` without storing static tier strings or legacy `size` properties.
- **Trophy History Integrity**: Each Pokémon stores historical event podiums in `trophies?: PokemonCompetitionTrophy[]`.
- **Transfer & Persistence Parity**: All trades, GTS listings, and Escrow / Claim Queue transfers validate against `pokemonSchema`, preserving trophies, physical dimensions, IVs, EVs, and metadata without dropping fields.
- **Capture Timestamp & Method Invariant (`obtainedAt` & `obtainedMethod`)**: Every Pokémon instance created, received, hatched, traded, or claimed across Poké Vicio MUST possess a valid numeric epoch milliseconds timestamp in `obtainedAt` and a valid canonical method in `obtainedMethod` (`'wild' | 'trade' | 'egg' | 'starter' | 'gift' | 'fishing' | 'archaeology' | 'gift_starter' | 'reward' | 'event'`). Ingestion boundaries (`addPokemon`, `emulateClaimAsset`, `eventPrizeGrantor`) and entity factories (`makePokemon`, debug generators) MUST guarantee these fields so detail cards never display unformatted or `'SIN FECHA'` states.
- **Canonical Gender Domain Contract (`@pkmn/types`)**: Pokémon gender contracts MUST strictly and exclusively use `GenderName = 'M' | 'F' | 'N'` imported directly from `@pkmn/types` (and numeric ratio values where supported for database schemas). Inventing custom lowercase conventions (`'m' | 'f' | null`) or in-memory translation adapters is strictly forbidden. Database persistence and entity contracts must align directly with Showdown conventions.
- **Friendship & Step Counter Persistence (`friendship` & `friendshipSteps`)**:
  - `friendship?: number` stores the 0–255 value (default 70 for wild/gift, 120 for hatched eggs).
  - `friendshipSteps?: number` stores the individual step accumulator (0–127) towards the canonical 128-step friendship cycle. It MUST be preserved across party swaps, PC box storage, and database persistence roundtrips.
- **PokemonEgg Species Identifier Single Source of Truth**: The species identifier for `PokemonEgg` is strictly and exclusively `egg.id` (`PokemonSpeciesId`), matching `Pokemon.id`. It is STRICTLY FORBIDDEN to use fallback chains like `egg.pokemonId || egg.id`. All hatching, rendering, and validation logic must read `egg.id` directly and fail loudly with descriptive errors if absent.

## Key Files

- `encounters.ts`: Module implementation.
- `friendship.ts`: Module implementation.
- `pokemon.ts`: Module implementation.
- `spriteShadows.ts`: Module implementation.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run `npm run lint` and `npm run auditor:domain-types`.

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
