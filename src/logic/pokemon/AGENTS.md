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
- **Canonical Out-of-Battle Field Abilities Engine**: All 33 canonical Pokémon out-of-battle field abilities MUST be centralized and resolved through `pokemonFieldAbilities.ts`. Mechanics must strictly adapt according to `ACTIVE_GENERATION` (e.g. 100% Synchronize rate with alive leader in Gen 8+ vs 50% with fainted leader allowed in Gen 3-7; modern elemental attraction vs legacy mechanics). Hatching speed passives (*Flame Body*, *Magma Armor*, *Steam Engine*) do not stack (fixed 2x max), while *Pickup* and *Honey Gather* roll independently per team member carrying the ability according to their canonical level bracket. UI badge descriptors (`getFieldPassiveBadges`) MUST derive the name (`label`), complete structured description (`desc`), and emoji (`icon`) directly from `abilities.json` without ad-hoc text truncation, synthesis, or separate hardcoded emoji dictionaries.
- **Zero Constant Aliasing**: Constant aliasing (`const A = B;`) is strictly forbidden across domain modules. All modules must directly import and use the single canonical source of truth from `@/logic/constants/` per the Domain-Type-First governance mandate.
- **Debug Mode Whitelist Bypass**: In debug mode (`window.__VITE_DEBUG__`), `validatePokemon` and `checkPokemonLegality` MUST allow unreleased Pokémon species without throwing illegal species errors, while still enforcing valid structure and base stats.
- **Resilient Move Legality & Evolutionary Lineage Mandate (`pokemonLearnset.ts`)**: Move legality validation (`canLearnMove` and `getLegalSpeciesMoves`) MUST evaluate canonical `POKEMON_DB` and evolutionary lineage (`getSpeciesHistory`) so that evolved species inherit legal moves from pre-evolutions (e.g. Charizard recognizing Charmander's Scratch). Furthermore, moves learned via TM, Tutor, Egg, Special, Dream World, Virtual Console, or legacy past-generation transfers (`compatMoves`) MUST be treated as legal at any level.
- **Canonical Friendship & Walking Step Engine (`friendshipLogic.ts`)**:
  - **Bounds & Seal Tiers**: Friendship is clamped to `[0, 255]`, partitioned into 5 canonical tiers (`distrust`: 0-49, `sprout`: 50-99, `comrade`: 100-159, `radiant_prism`: 160-219, `best_friends`: 220-255).
  - **Evolution & Perks**: Modern Gen 9 evolution threshold is 160 (`radiant_prism`), while combat affection perks activate at 220+ (`best_friends`).
  - **Diminishing Returns & Return/Frustration**: Level up gains scale by tier (+5 for 0-99, +3 for 100-199, +2 for 200-255). Faint penalty is -1. Return scales as `floor(friendship / 2.5)` (1-102), Frustration as `floor((255 - friendship) / 2.5)` (1-102).
  - **128-Step Walking Cycle**: 128 steps trigger a 50% roll (`WALK_ROLL_CHANCE = 0.5`) for +1 friendship (+2 with *Soothe Bell*). Steps accumulate on an independent per-Pokémon counter (`pokemon.friendshipSteps?: number`) targeting the first conscious (`hp > 0`), non-egg, non-maxed (`friendship < 255`) party member (`resolveWalkingFriendshipRecipient`).

## Key Files

- `pokemonLearnset.ts`: Canonical move legality engine and legal move generator powered by precomputed databases and evolutionary lineage traversal.
- `friendshipLogic.ts`: Canonical formulas for friendship gain/loss, seal metadata tiers, combat perk activation, and 128-step walking accumulation.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.

## Verification

- Run standard test suites (`npm run test:node` or `npm run test`).

## Child DOX Index

- *This domain module does not contain nested sub-directories with independent AGENTS.md files.*
