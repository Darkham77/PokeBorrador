# Purpose

Manage the logic and assets of pokemon, stats calculation, level progression, breeding, and effort values math.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **evMath.ts**: Pure stateless math functions for Effort Values (EVs), limit clamps (510 total, 252 stat), items bonuses (Macho Brace, Power items, Vitamins, Feathers, Berries), and EV-to-IV bonus calculations (`calculateEvBonusIvs`, `EVS_PER_STAT_POINT = 4`).
- **pokemonUtils.ts (calculateTotalPower SSoT)**: Single source of truth for Pokémon Total Power (`TOT` / `TOTAL`), calculating $\text{BST} + \sum \text{IVs} + \sum \lfloor \text{ev}_i / 4 \rfloor$. All sorting, filtering, and UI display modules MUST consume `calculateTotalPower` directly without ad-hoc summations.
- **statsMath.ts**: Gen 3+ canonical stat formulas, exp curve calculations, and nature multipliers.
- **physicalDimensionsMath.ts**: Pure stateless math functions for deterministic Gaussian physical dimension generation (height and weight) via Irwin-Hall ($n=4$) distribution over 32-bit FNV-1a seeded Mulberry32 PRNG. Classifies instances into 7 physical tiers (`XXS` to `XXL`) with explicit `cssClass` mappings, structured multi-line tooltips with bounds and delta indicators, and sorting helpers.
- **pokemonFactory.ts**: Canonical creation, validation, and stat recalculation of Pokémon instances.
- **Zero Constant Aliasing**: Constant aliasing (`const A = B;`) is strictly forbidden across domain modules. All modules must directly import and use the single canonical source of truth from `@/logic/constants/` per the Domain-Type-First governance mandate.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.

## Verification

- Run standard validation scripts (`npm test`).

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
