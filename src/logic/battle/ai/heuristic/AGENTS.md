# Purpose

9-layer heuristic battle engine. Provides accurate damage calculation via `@smogon/calc`,
probabilistic opponent set inference, and strategic board evaluation (win conditions,
threats, position score, sack order). Adapted from `external/pokemon-showdown-ai`.

## Ownership

Battle Engine Developers.

## Architecture

```text
HeuristicAI (heuristicAI.ts)
  └─ buildSnapshot()          ← BattleContext → HeuristicBattleSnapshot
  └─ InferenceEngine          ← tracks opponent's hidden moves/items per battle
  └─ HeuristicDamageCalculator  ← @smogon/calc wrapper with LRU cache (2048 entries)
  └─ evaluateStrategicState() ← aggregates all strategy modules
       ├─ evaluateWinConditions()
       ├─ evaluateThreats()
       ├─ evaluatePosition()
       └─ calculateSackOrder()
  └─ heuristicDecision()      ← 9-layer rule engine (null = no confident match)
```

## Heuristic Layers

1. **Force switch** — picks best switch-in on forced replacement
2. **Speed check** — derived for layers 3-4
3. **Priority KO** — priority move that OHKOs before opponent can react
4. **Guaranteed OHKO** — OHKO move we can use safely given speed
5. **About to be KO'd** — preserve win condition or use priority
6. **Hazards** — removal when threatening win condition; placement when safe
7. **Setup** — boost when opponent can't respond
8. **Pivot / Best move** — U-turn escape or highest-damage option
9. **Bad matchup switch** — switch out when drastically outmatched

## Key Constraints

- `heldItem` is ALWAYS mapped to `p.item` via `snapshotBuilder` — never read deprecated fields.
- `itemConsumed` flag is tracked to avoid treating consumed items as active.
- All array accesses on `winConditions[n]` use optional chaining (`?.`) due to `noUncheckedIndexedAccess`.
- Cache key for damage calc includes item + status + boosts to maximize hit rate.
- `snapshotBuilder.ts` throws explicitly if `playerRequest`/`enemyRequest` are null (Zero-Fallback Mandate).

## Module Map

| File | Role |
| --- | --- |
| `types.ts` | All heuristic-domain types + `AIConfig` + `AI_CONFIG_PRESETS` |
| `damageCalculator.ts` | `@smogon/calc` wrapper — accurate damage % with item awareness |
| `snapshotBuilder.ts` | `BattleContext` → `HeuristicBattleSnapshot` adapter |
| `setsDatabase.ts` | Loads `random-sets.json` for inference (lazy singleton) |
| `pokemonTracker.ts` | Per-Pokémon probabilistic set distribution tracker |
| `inferenceEngine.ts` | Coordinates all trackers; provides move/item probabilities |
| `winConditions.ts` | Scores each of our Pokémon's win condition potential |
| `threats.ts` | Scores each opponent Pokémon's threat level |
| `position.ts` | Board position score: −1.0 (losing) → +1.0 (winning) |
| `sackOrder.ts` | Ranks our Pokémon by preservation priority |
| `strategyEvaluator.ts` | Aggregates all four strategy modules → `StrategicState` |
| `heuristicEngine.ts` | 9-layer heuristic decision function |

## Tests

- `tests/unit/battle/heuristicEngine.spec.ts` — layer regression coverage (vitest)

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
