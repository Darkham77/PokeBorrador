# Purpose

Pokemon factory structures, trophy history, physical dimensions, and species specifications.

## Ownership

Pokemon Mechanics Team / System Architects.

## Local Contracts

- **Physical Dimensions**: Continuous dimensions (`height?: number` in meters, `weight?: number` in kilograms) are stored as numbers on the `Pokemon` instance. Physical tier classifications (XXS to XXL) MUST be calculated in real-time via `calculateInstancePhysicalData` without storing static tier strings or legacy `size` properties.
- **Trophy History Integrity**: Each Pokémon stores historical event podiums in `trophies?: PokemonCompetitionTrophy[]`.
- **Transfer & Persistence Parity**: All trades, GTS listings, and Escrow / Claim Queue transfers validate against `pokemonSchema`, preserving trophies, physical dimensions, IVs, EVs, and metadata without dropping fields.

## Verification

- Run `npm run lint` and `npm run validate:domain-types`.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
