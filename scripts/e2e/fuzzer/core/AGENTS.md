# Purpose

Core logic, simulation loops, battle agent decisions, and Pinia battle store mocks for the Gen 9 combat fuzzer.

## Ownership

QA / Core Engine Team.

## Local Contracts

- Modules must remain decoupled from Vitest.
- Must only use reactive Vue store mocks to execute the battle state.
- **ShowdownBattleAgent Inheritance Mandate**: All battle agents (`BattleAgent`, `HeuristicAgent`, etc.) MUST extend `ShowdownBattleAgent` from `src/logic/battle/helpers/showdownBattleAgent.ts`. Subclasses MUST override `decideSingleSlot()` for move policy, NOT `decide()`. Re-implementing protocol logic (forceSwitch iteration, trapped detection, multi-slot assembly) in subclasses is strictly forbidden.
- **choose() Return Check**: Every `simBattle.choose(side, choice)` call MUST check the boolean return. If `false`, the caller MUST apply a valid fallback (e.g. `'move 1'`) before continuing. Ignoring the return value is forbidden and causes stall loops.
- **Certified Cases Validation**: After any change to `BattleAgent.decide()` or `ShowdownBattleAgent`, the `npm run sim:fuzzer:validate` script MUST be run to verify 100% parity with stored choices.

## Key Files

- `certifiedBattleCase.ts`: Module implementation.
- `certifiedBattleInventory.ts`: Module implementation.
- `fuzzerMemoryStore.ts`: Module implementation.
- `fuzzer_agent.ts`: Module implementation.
- `fuzzer_ai_engine.ts`: Module implementation.
- `fuzzer_batch_worker.ts`: Module implementation.
- `fuzzer_engine.ts`: Module implementation.
- `fuzzer_medicine_cases.ts`: Module implementation.
- `fuzzer_mock_battle_store.ts`: Module implementation.
- `fuzzer_runner.ts`: Module implementation.
- `fuzzer_worker.ts`: Module implementation.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
