// ============================================================
// Board Position Evaluator (-1.0 losing → +1.0 winning)
// Adapted from external/pokemon-showdown-ai/src/strategy/position.ts
// Note: BattleState.isTrapped() removed — use snapshot data only
// ============================================================

import type { HeuristicBattleSnapshot, PositionEvaluation, WinCondition } from './types.ts';
import type { HeuristicDamageCalculator } from './damageCalculator.ts';
import type { BattleConditionKey } from '@/types/battle/battle';

const POSITION_WEIGHTS = { // no-magic: Explicit mathematical constant or threshold value
  pokemonAdvantage: 0.20,
  hpAdvantage: 0.15,
  hazardAdvantage: 0.10,
  speedAdvantage: 0.15,
  typeMatchupAdvantage: 0.15,
  statusAdvantage: 0.10,
  winConditionViability: 0.15,
  MAX_HAZARD_LAYERS_NORMALIZER: 5,
  MIDPOINT_OFFSET_HALF: 0.5,
  RANGE_EXPANDER_DOUBLE: 2,
  MAX_STATUS_PENALTY_COUNT: 3,
  PERCENTAGE_FULL_SCALE: 100,
  POSITION_BOUND_MIN: -1.0,
  POSITION_BOUND_MAX: 1.0,
  POSITION_MIN_DEFAULT_SCORE: 0 as number
} as const;

const HAZARD_DEFAULT_LAYER_COUNT = 0;

function countHazardLayers(conditions: Map<BattleConditionKey, number>): number {
  return (conditions.get('stealthrock') ?? HAZARD_DEFAULT_LAYER_COUNT) +
    (conditions.get('spikes') ?? HAZARD_DEFAULT_LAYER_COUNT) +
    (conditions.get('toxicspikes') ?? HAZARD_DEFAULT_LAYER_COUNT) +
    (conditions.get('stickyweb') ?? HAZARD_DEFAULT_LAYER_COUNT);
}

export function evaluatePosition(
  snapshot: HeuristicBattleSnapshot,
  calc: HeuristicDamageCalculator,
  winConditions: WinCondition[],
): PositionEvaluation {
  const w = POSITION_WEIGHTS;
  const myAlive = snapshot.mySide.pokemon.filter(p => !p.fainted);
  const oppAlive = snapshot.opponentSide.pokemon.filter(p => !p.fainted);
  const oppSide = snapshot.myPlayer === 'p1' ? 'p2' as const : 'p1' as const;

  // 1. Pokémon count advantage
  const total = myAlive.length + oppAlive.length;
  const pokemonAdvantage = total > 0 ? (myAlive.length - oppAlive.length) / total : POSITION_WEIGHTS.POSITION_MIN_DEFAULT_SCORE;

  // 2. HP advantage
  const myAvgHp = myAlive.length > 0 ? myAlive.reduce((s, p) => s + p.hpPercent, 0) / myAlive.length : 0;
  const oppAvgHp = oppAlive.length > 0 ? oppAlive.reduce((s, p) => s + p.hpPercent, 0) / oppAlive.length : 0;
  const hpAdvantage = (myAvgHp - oppAvgHp) / POSITION_WEIGHTS.PERCENTAGE_FULL_SCALE;

  // 3. Hazard advantage
  const hazardAdvantage = Math.max(w.POSITION_BOUND_MIN, Math.min(w.POSITION_BOUND_MAX,
    (countHazardLayers(snapshot.opponentSide.sideConditions) -
     countHazardLayers(snapshot.mySide.sideConditions)) / POSITION_WEIGHTS.MAX_HAZARD_LAYERS_NORMALIZER,
  ));

  // 4. Speed advantage
  let speedWins = POSITION_WEIGHTS.POSITION_MIN_DEFAULT_SCORE, speedTotal = POSITION_WEIGHTS.POSITION_MIN_DEFAULT_SCORE;
  for (const my of myAlive) {
    for (const opp of oppAlive) {
      speedTotal++;
      if (calc.getEffectiveSpeed(my, snapshot.field, snapshot.myPlayer) >
          calc.getEffectiveSpeed(opp, snapshot.field, oppSide)) speedWins++;
    }
  }
  const speedAdvantage = speedTotal > 0 ? (speedWins / speedTotal - POSITION_WEIGHTS.MIDPOINT_OFFSET_HALF) * POSITION_WEIGHTS.RANGE_EXPANDER_DOUBLE : POSITION_WEIGHTS.POSITION_MIN_DEFAULT_SCORE;

  // 5. Type matchup advantage (active vs active)
  let typeMatchupAdvantage = POSITION_WEIGHTS.POSITION_MIN_DEFAULT_SCORE;
  const myActive = snapshot.mySide.activePokemon;
  const oppActive = snapshot.opponentSide.activePokemon;
  if (myActive && oppActive) {
    let ourBest = POSITION_WEIGHTS.POSITION_MIN_DEFAULT_SCORE, theirBest = POSITION_WEIGHTS.POSITION_MIN_DEFAULT_SCORE;
    for (const mv of myActive.moves) {
      try { ourBest = Math.max(ourBest, calc.calcDamage(myActive, oppActive, mv.id, snapshot.field).maxPercent); } catch { /* skip */ }
    }
    for (const mv of oppActive.knownMoves) {
      try { theirBest = Math.max(theirBest, calc.calcDamage(oppActive, myActive, mv, snapshot.field).maxPercent); } catch { /* skip */ }
    }
    typeMatchupAdvantage = Math.max(w.POSITION_BOUND_MIN, Math.min(w.POSITION_BOUND_MAX, (ourBest - theirBest) / POSITION_WEIGHTS.PERCENTAGE_FULL_SCALE));
  }

  // 6. Status advantage
  const myStatused = myAlive.filter(p => p.status !== null).length;
  const oppStatused = oppAlive.filter(p => p.status !== null).length;
  const statusAdvantage = Math.max(w.POSITION_BOUND_MIN, Math.min(w.POSITION_BOUND_MAX, (oppStatused - myStatused) / POSITION_WEIGHTS.MAX_STATUS_PENALTY_COUNT));

  // 7. Win condition viability
  const bestWC = winConditions.length > 0 ? (winConditions[0]?.score ?? POSITION_WEIGHTS.POSITION_MIN_DEFAULT_SCORE) : POSITION_WEIGHTS.POSITION_MIN_DEFAULT_SCORE;
  const winConditionViability = (bestWC - POSITION_WEIGHTS.MIDPOINT_OFFSET_HALF) * POSITION_WEIGHTS.RANGE_EXPANDER_DOUBLE;

  const score = Math.max(w.POSITION_BOUND_MIN, Math.min(w.POSITION_BOUND_MAX,
    pokemonAdvantage * w.pokemonAdvantage +
    hpAdvantage * w.hpAdvantage +
    hazardAdvantage * w.hazardAdvantage +
    speedAdvantage * w.speedAdvantage +
    typeMatchupAdvantage * w.typeMatchupAdvantage +
    statusAdvantage * w.statusAdvantage +
    winConditionViability * w.winConditionViability,
  ));

  return { score, factors: { pokemonAdvantage, hpAdvantage, hazardAdvantage, speedAdvantage, typeMatchupAdvantage, statusAdvantage, winConditionViability } };
}
