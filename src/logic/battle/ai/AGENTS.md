# Purpose

Opponent AI battle logic. Selects moves, evaluates switches, and manages NPC item usage
during combat. Decoupled into modules behind the `CombatAI` interface.

## Ownership

Battle Engine Developers.

## Local Contracts

- `getCombatAI()` (private to `battleAI.ts`) returns `ScriptedAI` when
  `window.__VITE_DEBUG__.mockEnemyChoices` is set, otherwise `HeuristicAI`.
  Never instantiate AI classes directly outside this module.
- `HeuristicAI` runs the 9-layer heuristic engine with `@smogon/calc` for accurate
  damage percentages. One instance per battle — holds `InferenceEngine` state.
- Difficulty is fully parametrized via `AIConfig` presets resolved from `BattleState`
  context (`wild`, `npc`, `gym`, `rival`). `rival` = champion tier = 0% error rate.
- `ScriptedAI` is E2E replay only — zero game logic.

## Difficulty Tiers

| Preset | errorRate | switchAggressiveness | useInference | useStrategicEval |
| --- | --- | --- | --- | --- |
| `wild` | 50% | 0% | false | false |
| `npc` | **5%** | 40% | true | true |
| `gym` | **0%** | 70% | true | true |
| `rival` (= champion) | **0%** | 90% | true | true |

## Module Map

| File | Role |
| --- | --- |
| `combatAI.ts` | `CombatAI` interface (contract) |
| `heuristicAI.ts` | Main AI — implements `CombatAI`, delegates to the heuristic sub-engine |
| `scriptedAI.ts` | E2E mock AI that replays choices from `window.__VITE_DEBUG__` |
| `battleAI.ts` | Public facade — re-exports `decideEnemyMove`, `shouldEnemySwitch`, etc. |
| `heuristic/` | 9-layer heuristic engine (see child AGENTS.md) |

## Child DOX Index

- [./heuristic/AGENTS.md](./heuristic/AGENTS.md)
