# Purpose

Core logic, simulation loops, battle agent decisions, and Pinia battle store mocks for the Gen 9 combat fuzzer.

## Ownership

QA / Core Engine Team.

## Local Contracts

- Modules must remain decoupled from Vitest.
- Must only use reactive Vue store mocks to execute the battle state.
- **ShowdownBattleAgent Inheritance Mandate**: All battle agents (`BattleAgent`, `HeuristicAgent`, etc.) MUST extend `ShowdownBattleAgent` from `src/logic/battle/helpers/showdownBattleAgent.ts`. Subclasses MUST override `decideSingleSlot()` for move policy, NOT `decide()`. Re-implementing protocol logic (forceSwitch iteration, trapped detection, multi-slot assembly) in subclasses is strictly forbidden.
- **choose() Return Check**: Every `simBattle.choose(side, choice)` call MUST check the boolean return. If `false`, the caller MUST apply a valid fallback (e.g. `'move 1'`) before continuing. Ignoring the return value is forbidden and causes stall loops.
- **stallGuard Threshold**: The stallGuard safety net MUST use a threshold of **50 cycles** minimum. Lower thresholds mask the choose() rejection bug instead of the guard acting as a genuine last-resort.
- **Certified Cases Validation**: After any change to `BattleAgent.decide()` or `ShowdownBattleAgent`, the `validate_certified_cases.ts` script MUST be run to verify 100% parity with stored choices.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
