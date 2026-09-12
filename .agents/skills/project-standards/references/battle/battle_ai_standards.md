# Battle AI & Heuristic Standards (Poké Vicio)

This manual documents the opponent AI architecture, difficulty tiers, heuristic decision pipeline, anti-switch-loop protocols, and PvP passive defense integration across Poké Vicio.

---

## 🏛️ Architecture: AI Subsystem Overview

Opponent AI in Poké Vicio is decoupled behind the `CombatAI` contract (`src/logic/battle/ai/combatAI.ts`) and accessed through the unified facade `src/logic/battle/ai/battleAI.ts`.

```text
Combat Encounter
  └─ battleAI.decideEnemyMove() / shouldEnemySwitch() / findBestSwitchIndex()
       ├─ ScriptedAI  (E2E Replay only — mocks choices from window.__VITE_DEBUG__)
       └─ HeuristicAI (Canonical 9-Layer Engine)
            ├─ resolveConfig()          ← Maps BattleState & trainerArchetype to AIConfig
            ├─ buildSnapshot()          ← BattleContext → HeuristicBattleSnapshot
            ├─ InferenceEngine          ← Probabilistic opponent set/item tracker
            ├─ HeuristicDamageCalculator← Smogon calc wrapper with LRU cache
            ├─ hasViableSwitchCounter() ← Anti-Switch-Loop Gate (< 45% damage, >= 35% threat)
            ├─ pickBestSwitch(..., mode)← 'counter' (preservation) vs 'faint_replacement'
            └─ heuristicDecision()      ← 9-layer rule engine (null = pickBestMoveByPower)
```

---

## 🎖️ 5-Tier Archetype Difficulty Architecture

AI difficulty is fully parametrized through `AIConfig` presets declared in `src/logic/battle/ai/heuristic/types.ts` and mapped from trainer archetypes (`TrainerType`) defined in `src/data/player/trainerTypes.ts`.

### 1. Difficulty Presets Table

| Preset | errorRate | switchAggressiveness | switchCooldownTurns | useInference | useStrategicEval | Target Trainers / Modes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `wild` | 50% | 0% | 2 | false | false | Wild Pokémon encounters |
| `novice` | 20% | 15% | 2 | false | false | Youngster, Bug Catcher, Lass, Fisher |
| `intermediate` | 10% | 30% | 2 | true | true | Hiker, Sailor, Camper, Picnicker |
| `tactical` | 5% | 55% | 2 | true | true | Bird Keeper, Juggler, Psychic, Scientist, Gambler, Super Nerd, Engineer, Tamer |
| `elite` | 2% | 75% | 2 | true | true | Black Belt, Cooltrainer, Cue Ball, Biker |
| `gym` | 0% | 70% | 1 | true | true | Gym Leaders & Gym Trainers |
| `rival` | **0%** | **85%** | **1** | true | true | Rival (Blue), Champion, & PvP Passive Defense |

### 2. The Apex Rival Invariant

The Rival is lore-compliant and structurally designed to be the apex competitive AI in the game:
- **Zero Error Rate (`errorRate: 0.0`)**: Never makes random blunders; always executes the optimal move identified by the 9-layer engine or Smogon damage calculations.
- **Maximum Tactical Flexibility (`switchAggressiveness: 0.85`)**: Aggressively pivots into favorable type and stat matchups when a viable counter exists on the bench.
- **Minimal Cooldown (`switchCooldownTurns: 1`)**: Fast tactical repositioning window of 1 turn, allowing fluid responses to player actions.
- **Guaranteed Ace Priority**: Paired with `RivalTeamGenerator` which scales +5 levels over the player's party average and guarantees Ace placement in slot 0.

### 3. Archetype Mapping SSoT

All 19 trainer archetypes declare their canonical AI preset in `TRAINER_TYPE_DEFINITIONS`:
- **Novice**: `'youngster'`, `'bug_catcher'`, `'lass'`, `'fisher'`
- **Intermediate**: `'hiker'`, `'sailor'`, `'camper'`, `'picnicker'`
- **Tactical**: `'bird_keeper'`, `'juggler'`, `'psychic'`, `'scientist'`, `'gambler'`, `'super_nerd'`, `'engineer'`, `'tamer'`
- **Elite**: `'black_belt'`, `'cooltrainer'`, `'cue_ball'`, `'biker'`
- **Apex**: `'rival'`

The canonical selector is `getTrainerAIPreset(archetype: TrainerType | undefined): AIPresetKey`.

---

## 🛡️ PvP Passive Defense AI Integration

In asynchronous and ranked PvP matches where a player challenges an offline user's passive defense team (`isPvP && (isAsynchronous || isRanked)`):
1. **Apex Rival Brain Assignment**: The defending AI is unconditionally assigned `AI_CONFIG_PRESETS.rival`. Offline players' teams fight at the highest possible tactical level.
2. **Explicit Redundancy in Fallback Handler**: `livePvPPassiveFallbackHandler.ts` explicitly injects `trainerArchetype: 'rival'` in `battleStore.startBattle()` options to guarantee parity even if ambient context flags are partially initialized.
3. **Full Move & Bench Parity**: Passive teams retain full access to their recorded movesets, abilities, held items, and the 9-layer heuristic inference engine.

---

## 🔄 Anti-Switch-Loop & Viable Counter Protocol

### 1. Root Cause of the Infinite Switch Loop

In legacy implementations, the AI exhibited a degenerate loop where it repeatedly withdrew its active Pokémon when facing a threat, sent out weaker Pokémon to faint, and immediately brought back the original Pokémon, cycling until only one remained.

Investigation revealed three structural flaws:
1. **Blind Panic**: `shouldSwitch()` evaluated only the active Pokémon's vulnerability (`bestOppDmg > threshold && bestMyDmg < 30%`), without checking if any bench Pokémon could survive or counter the threat.
2. **Sacrificial Pawn Bias**: `pickBestSwitch()` scored candidates with `(1 - preservationScore) * 0.15`, actively preferring to send low-value pawns into incoming attacks.
3. **Zero Cooldown Ping-Pong**: After the sacrificial pawn fainted, post-faint selection picked the high-stat Ace. On turn 1 of its re-entry, `shouldSwitch()` evaluated the bad matchup again with 0 cooldown, immediately repeating the withdrawal.

### 2. Viable Counter Gate (`hasViableSwitchCounter`)

Mid-combat tactical switches are strictly forbidden unless the bench possesses at least one genuine counter:

```ts
export function hasViableSwitchCounter(
  candidates: Pokemon[],
  opponent: Pokemon,
  calc: HeuristicDamageCalculator
): boolean
```

A bench Pokémon qualifies as a viable counter **ONLY** if:
1. **Survivability**: It takes `< 45%` max damage from the opponent's strongest move (`oppMaxDmgPercent < 0.45`).
2. **Threat Potential**: It deals `>= 35%` damage to the opponent (`candidateMaxDmgPercent >= 0.35`), OR it outspeeds the opponent (`candidateSpeed > oppSpeed`) and deals `>= 25%` damage (`candidateMaxDmgPercent >= 0.25`).

> [!IMPORTANT]
> If NO bench Pokémon satisfies these criteria, the AI **MUST STAND AND FIGHT**. It is strictly prohibited to switch out when all bench alternatives are worse than the active combatant.

### 3. Dynamic Anti-Ping-Pong Cooldown

`HeuristicAI` tracks turns elapsed since the last switch via `turnsSinceLastSwitch`:
- **Cooldown Limits**:
  - Apex tiers (`rival`, `gym`): `switchCooldownTurns = 1` turn of combat before another voluntary switch is permitted.
  - All other tiers (`elite`, `tactical`, `intermediate`, `novice`, `wild`): `switchCooldownTurns = 2` turns of mandatory combat between switches.
- **Turn Advancement**: The combat engine informs the AI of completed turns via `notifyTurnAdvanced()`, incrementing the counter deterministically.

### 4. Dual Evaluation Modes (`pickBestSwitch`)

`pickBestSwitch` supports two distinct semantic evaluation modes:
- **`'counter'` (Voluntary Tactical Switch)**: Evaluates candidates during live combat. Preserves valuable Pokémon by rewarding high `preservationScore` and strictly penalizing vulnerable entrants. Zero sacrificial bias.
- **`'faint_replacement'` (Post-Faint Mandatory Replacement)**: Evaluates candidates after a combatant has fainted. Focuses on offensive threat response, revenge killing potential, and safe board entry without needing to survive an in-flight attack.

---

## ⚡ Zero-Fallback & Integrity Constraints

1. **Zero ID Fallbacks**: Never use `.id ?? m.name` or `.id || p.name` in AI logic. If a `Move` or `Pokemon` lacks an `id`, throw immediately:
   ```ts
   if (!m.id) throw new Error(`[HeuristicAI] Move missing id: ${JSON.stringify(m)}`);
   ```
2. **Deterministic Fallback on Missing Snapshot**: If `buildSnapshot()` cannot build a state (e.g. Turn 1 forced switch pre-request), `HeuristicAI.decideMove()` MUST use `pickBestMoveByPower(enemy)`. It filters disabled or PP-depleted moves and uses `.reduce()` to select the highest base power move, never returning move 0 blindly.

---

## 🎒 Opponent Item Usage Standards (aiItemEvaluator.ts)

1. **Active Combatant Validity**: The AI item evaluator MUST strictly verify that the target combatant is alive (`e.hp > 0 && !e.fainted`) before evaluating any potion or status cure. A dead combatant (`hp <= 0`) must never trigger healing evaluation.
2. **Team State Synchronization**: Whenever the AI consumes an item on an active field Pokémon (such as a Potion or Full Restore), the modified `hp` and `status` MUST be synchronized immediately to the matching Pokémon instance in `battleState.enemyTeam` to ensure Showdown and UI consistency.
3. **Inventory Consumption**: Consumed items in `battleState.enemyInventory` are decremented and deleted when reaching 0, ensuring exact item count parity across turns and F5 restorations.
