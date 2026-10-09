# Purpose

TypeScript type definitions and domain contracts for the Poké Vicio map engine, world exploration, and map lenses.

## Ownership

Frontend Engineers / Map Systems Architects.

## Local Contracts

- Strict adherence to Domain-Type-First governance.
- Union types derived from canonical arrays (`as const`).
- Provide type guards (`isMapLens`) and fail-loud assertions (`requireMapLens`).
- Zero-any, zero-unknown casts, and zero runtime fallbacks.

### Reference Manuals

- [src/types/AGENTS.md](../AGENTS.md): TypeScript contracts, domain governance, and zero-any mandates.

## Key Files

- [`adventureWorldTypes.ts`](./adventureWorldTypes.ts): Module implementation.
- [`autotileStudioTypes.ts`](./autotileStudioTypes.ts): Module implementation.
- [`continentTypes.ts`](./continentTypes.ts): Module implementation.
- [`mapLenses.ts`](./mapLenses.ts): Module implementation.
- [`poiTypes.ts`](./poiTypes.ts): Module implementation.
- [`pokemonGraphTypes.ts`](./pokemonGraphTypes.ts): Module implementation.

## Work Guidance

- Define domain contracts for map layers, perspective lenses (`adventure`, `war`, `pokedex`), waypoint nodes, and routing states.

## Verification

- `npm run validate:types` must pass with 0 errors.

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
