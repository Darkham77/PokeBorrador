# Purpose

Coordinate and aggregate game rules, field modifiers, passive abilities, item buffs, player class effects, and environmental conditions outside of active battle.

## Ownership

Game Designers / Systems Engineers.

## Local Contracts

- **Unified Out-of-Battle Rule Coordinator SSoT**: `fieldRulesCoordinator.ts` is the single source of truth for aggregating and resolving all out-of-battle (field) gameplay modifiers without ad-hoc hardcoding across low-level modules:
  1. **Pokémon Team Passives**: Evaluated via `pokemonFieldAbilities.ts` (Leader ability for encounters/fishing; party-wide for Daycare hatching, Pickup loot, and Natural Cure).
  2. **Inventory Items & Tools**: Repels, Incenses, Power Items, Everstone, Destiny Knot, Charms, Fishing Rods, Pickaxes, Brushes, and Held Items.
  3. **Environment & Weather**: Route weather multipliers, Day/Night cycles, and biome multipliers.
  4. **Player Class & Dominance**: Cazabichos catch streaks, Criador IV bonuses, Rocket criminality, and War Dominance map bonuses.
  5. **Active Dynamic Events**: Event shiny multipliers, exp/money boosts, and rate multipliers.
- **Domain-Type-First**: All inputs and outputs must be strictly typed using canonical domain contracts (`AbilityId`, `ItemId`, `PokemonSpeciesId`, `NatureId`, `WeatherId`).
- **Zero Magic Numbers & Zero Hardcoding**: Probability thresholds, level brackets, and multipliers are derived from central constants or canonical formulas.
- **Pure Stateless Orchestration**: All coordinator functions (`resolveFieldEncounterModifiers`, `resolveFieldBreedingModifiers`, `resolveFieldBattleRewards`) MUST remain pure and stateless.

## Work Guidance

- Use `resolveFieldEncounterModifiers` in all route, fishing, and wild encounter generators.
- Use `resolveFieldBreedingModifiers` in daycare and egg generation routines.
- Use `resolveFieldBattleRewards` during post-battle rewards processing.

## Verification

- Run `npx vitest run tests/node/pokemon/field_rules_coordinator.test.ts`.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
