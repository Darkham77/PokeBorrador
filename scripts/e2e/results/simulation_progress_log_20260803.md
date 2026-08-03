# Simulation Run — 2026-08-03
Session: domain-type-refactor-pass

## Scope
Strict application of `@/domain-type-first` and 4-seat generic compatibility mandates across all battle engines, fuzzers, and simulation generators.

## Status
Overall: IN_PROGRESS
Last action: TypeScript types validated successfully with zero errors (validate:types pass). Node test suite 100% PASS (3404/3404 tests pass).
Resumed at: sim:e2e

## Simulation Queue
- [x] sim:fuzzer — PASS; generated fuzzer_certified_cases.json cleanly with 100% scenario coverage
- [x] sim:e2e:combat — PASS; all 59 E2E stress cases and manual scenarios passed successfully
- [x] sim:e2e:ai — PASS; 6/6 after canonical `NpcSpriteId` fixtures and manual/native execution split
- [x] sim:e2e:gyms — PASS; Brock gym battle passed in 17.8s after HP sync fix in showdown worker
- [x] sim:e2e:gts — PASS; GTS publish/buy trade cycle E2E transaction simulation passed in 30.8s
- [x] sim:e2e:breeding — PASS; Breeding Ditto & Bulbasaur, egg generation, and hatching E2E cycle passed in 21.2s
- [x] sim:e2e:missions — PASS; Daycare missions view, invalid attempt, and valid completion E2E flow passed in 16.0s
- [x] sim:e2e:save — PASS; Save Shield blocks saving when Pokemon count is 0 or starterChosen is false passed in 12.9s
- [/] sim:e2e — IN_PROGRESS

## Active Fix — Domain-Type-First Refactor & 4-Seat Generic Engine
Root cause:
1. `showdownBattleEngine.ts` contained hardcoded `p1`/`p2` branching and manual `side.choice.actions` manipulation causing `Not all choices done` crashes on skip turns.
2. `fuzzer_item_generator.ts` relied on loose `string` fields for `gender`, creating runtime crashes when Blissey (female-only) was instantiated without gender.
3. Untyped string casts (`as unknown as PokemonSet`) masked case-formatting discrepancies in scenario definitions.
Files touched: `src/logic/battle/engine/showdownBattleEngine.ts`, `src/logic/battle/helpers/showdownExecutor.ts`, `src/logic/battle/helpers/showdownBattleRunner.ts`, `scripts/e2e/fuzzer/generators/fuzzer_item_generator.ts`, `scripts/e2e/fuzzer/generators/fuzzer_team_generator.ts`, `scripts/e2e/fuzzer/scenarios/fuzzer_mechanics_scenarios.ts`, `src/logic/auth/saveService.ts`
Attempts: 1
Status: PASS

## Completed Fixes
| Simulation | Root Cause | Fix Applied | Attempts | Result |
|---|---|---|---|---|
| ShowdownEngine | Manual `side.choice.actions` push bypassing `isChoiceDone()` | Used `battle.choose(seat.id, 'default')` API call | 1 | PASS |
| 4-Seat Mandate | Hardcoded `p1`/`p2` seat branching | Refactored engine to generic `choiceIdx` Map & seat iteration | 1 | PASS |
| Domain-Type-First | Loose `string` types in fuzzer generators | Applied canonical `PokemonSpeciesId`, `PersistedPokemonGender`, `ItemId`, `AbilityId`, `NatureId`, `PokemonMoveId`, `CalculatedStats` | 1 | PASS |
| fuzzer_item_generator | Blissey generated with empty gender string | Explicitly set canonical `PersistedPokemonGender` (`'F'` for Blissey, `'N'` for Mew) | 1 | PASS |
| fuzzer_mechanics_scenarios | Capitalized Showdown move/species strings | Normalized to lowercase domain IDs | 1 | PASS |
