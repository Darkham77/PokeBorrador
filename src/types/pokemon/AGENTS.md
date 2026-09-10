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

## Verification

- Run `npm run lint` and `npm run validate:domain-types`.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
