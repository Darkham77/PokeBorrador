# Purpose

Manage the logic and assets of pokemon, stats calculation, level progression, breeding, and effort values math.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **evMath.ts**: Pure stateless math functions for Effort Values (EVs), limit clamps (510 total, 252 stat), items bonuses (Macho Brace, Power items, Vitamins, Feathers, Berries).
- **statsMath.ts**: Gen 3+ canonical stat formulas, exp curve calculations, and nature multipliers.
- **pokemonFactory.ts**: Canonical creation, validation, and stat recalculation of Pokémon instances.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.

## Verification

- Run standard validation scripts (`npm test`).

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
