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
  context and `trainerArchetype` (`wild`, `novice`, `intermediate`, `tactical`, `elite`, `gym`, `rival`).
  `rival` = champion/apex tier = 0% error rate, 85% switch aggressiveness, 1-turn switch cooldown.
- Asynchronous PvP passive defense battles (`isPvP && (isAsynchronous || isRanked)`) strictly use the `rival` apex preset.
- Anti-ping-pong switch cooldown prevents switch loops. Gated dynamically: 1 turn for `rival` and `gym`, 2 turns for other tiers.
- Mid-combat tactical switches are strictly gated behind `hasViableSwitchCounter()` ensuring the candidate takes `< 45%` max damage and deals `>= 35%` damage (or outspeeds with `>= 25%`).
- `pickBestSwitch` supports explicit modes: `'counter'` (preserves high-value Pokémon without sacrificial pawn bias) and `'faint_replacement'` (faint resolution).
- `ScriptedAI` is E2E replay only — zero game logic.
- **Strict Prohibition on Healing Fainted Pokémon (`aiItemEvaluator.ts`)**: Opponent AI item evaluation MUST strictly verify `e.hp > 0 && !e.fainted` before considering healing items (potions) or status cures. A fainted Pokémon (`hp <= 0`) must never satisfy healing thresholds (`hp < 0.25 * maxHp`), preventing potions from being used on dead combatants. When items are consumed, updated `hp` and `status` must immediately synchronize with `battleState.enemyTeam`.

## Difficulty Tiers

| Preset | errorRate | switchAggressiveness | switchCooldownTurns | useInference | useStrategicEval |
| --- | --- | --- | --- | --- | --- |
| `wild` | 50% | 0% | 2 | false | false |
| `novice` | 20% | 15% | 2 | false | false |
| `intermediate` | 10% | 30% | 2 | true | true |
| `tactical` | 5% | 55% | 2 | true | true |
| `elite` | 2% | 75% | 2 | true | true |
| `gym` | 0% | 70% | 1 | true | true |
| `rival` (apex / PvP passive) | 0% | 85% | 1 | true | true |

## Module Map

| File | Role |
| --- | --- |
| `combatAI.ts` | `CombatAI` interface (contract) |
| `heuristicAI.ts` | Main AI — implements `CombatAI`, delegates to the heuristic sub-engine |
| `scriptedAI.ts` | E2E mock AI that replays choices from `window.__VITE_DEBUG__` |
| `battleAI.ts` | Public facade — re-exports `decideEnemyMove`, `shouldEnemySwitch`, etc. |
| `heuristic/` | 9-layer heuristic engine (see child AGENTS.md) |
| `heuristic/aiItemEvaluator.ts` | Evaluator for NPC trainer item usage during battle (revives, status cures, potions) |

## HeuristicAI — No-Store Fallback

When `buildSnapshot()` throws (playerRequest/enemyRequest null) or there is no store,
`HeuristicAI.decideMove()` MUST use `pickBestMoveByPower(enemy)` as its fallback.
This function:

- Filters moves with pp = 0 or disabled via `enemy.disabledMove`
- Returns the highest `power` move via `.reduce()`
- NEVER returns the first move blindly

This is correct because: in production, the snapshot always exists on normal turns.
The fallback only applies during initialization edge cases (turn 1, forced switch pre-request).

## Zero-Fallback on ID Lookups

Never use `.id ?? m.name` or `.id || p.name` anywhere in `src/logic/`.
If a Move or Pokemon is missing `.id`, throw immediately:
  `if (!m.id) throw new Error(\`[HeuristicAI] Move missing id: ${JSON.stringify(m)}\`);`

The project auditor detects these patterns and blocks the commit gate.
Moves and Pokemon always have a canonical `.id` in this codebase — a missing id
is a data integrity bug that must surface loudly, not be silenced with a name fallback.

## Child DOX Index

- [heuristic/](./heuristic/AGENTS.md): Domain module documentation for heuristic.
