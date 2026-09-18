// ============================================================
// Board Position Evaluator (-1.0 losing → +1.0 winning)
// Adapted from external/pokemon-showdown-ai/src/strategy/position.ts
// Note: BattleState.isTrapped() removed — use snapshot data only
// ============================================================

import type { HeuristicBattleSnapshot, PositionEvaluation, WinCondition, HeuristicPokemonState } from './types.ts';
import type { HeuristicDamageCalculator } from './damageCalculator.ts';
import type { BattleConditionKey } from '@/types/battle/battle';
import type { SideID } from '@pkmn/sim';

const POSITION_WEIGHTS = {
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

function computePokemonAdvantage(myAliveCount: number, oppAliveCount: number): number {
  const total = myAliveCount + oppAliveCount;
  return total > 0
    ? (myAliveCount - oppAliveCount) / total
    : POSITION_WEIGHTS.POSITION_MIN_DEFAULT_SCORE;
}

function computeHpAdvantage(
  myAlive: readonly HeuristicPokemonState[],
  oppAlive: readonly HeuristicPokemonState[]
): number {
  const myAvgHp = myAlive.length > 0 ? myAlive.reduce((s, p) => s + p.hpPercent, 0) / myAlive.length : 0;
  const oppAvgHp = oppAlive.length > 0 ? oppAlive.reduce((s, p) => s + p.hpPercent, 0) / oppAlive.length : 0;
  return (myAvgHp - oppAvgHp) / POSITION_WEIGHTS.PERCENTAGE_FULL_SCALE;
}

function computeHazardAdvantage(
  oppSideConditions: Map<BattleConditionKey, number>,
  mySideConditions: Map<BattleConditionKey, number>
): number {
  const w = POSITION_WEIGHTS;
  return Math.max(
    w.POSITION_BOUND_MIN,
    Math.min(
      w.POSITION_BOUND_MAX,
      (countHazardLayers(oppSideConditions) - countHazardLayers(mySideConditions)) / w.MAX_HAZARD_LAYERS_NORMALIZER
    )
  );
}

function computeSpeedAdvantage(
  myAlive: readonly HeuristicPokemonState[],
  oppAlive: readonly HeuristicPokemonState[],
  snapshot: HeuristicBattleSnapshot,
  calc: HeuristicDamageCalculator,
  oppSide: SideID
): number {
  let speedWins = POSITION_WEIGHTS.POSITION_MIN_DEFAULT_SCORE;
  let speedTotal = POSITION_WEIGHTS.POSITION_MIN_DEFAULT_SCORE;
  for (const my of myAlive) {
    for (const opp of oppAlive) {
      speedTotal++;
      if (calc.getEffectiveSpeed(my, snapshot.field, snapshot.myPlayer) >
          calc.getEffectiveSpeed(opp, snapshot.field, oppSide)) {
        speedWins++;
      }
    }
  }
  return speedTotal > 0
    ? (speedWins / speedTotal - POSITION_WEIGHTS.MIDPOINT_OFFSET_HALF) * POSITION_WEIGHTS.RANGE_EXPANDER_DOUBLE
    : POSITION_WEIGHTS.POSITION_MIN_DEFAULT_SCORE;
}

function computeTypeMatchupAdvantage(
  snapshot: HeuristicBattleSnapshot,
  calc: HeuristicDamageCalculator
): number {
  const myActive = snapshot.mySide.activePokemon;
  const oppActive = snapshot.opponentSide.activePokemon;
  if (!myActive || !oppActive) return POSITION_WEIGHTS.POSITION_MIN_DEFAULT_SCORE;

  const w = POSITION_WEIGHTS;
  let ourBest = w.POSITION_MIN_DEFAULT_SCORE;
  let theirBest = w.POSITION_MIN_DEFAULT_SCORE;
  for (const mv of myActive.moves) {
    try {
      ourBest = Math.max(ourBest, calc.calcDamage(myActive, oppActive, mv.id, snapshot.field).maxPercent);
    } catch { /* catch-ok: Hypothetical move exploration probe skip */ }
  }
  for (const mv of oppActive.knownMoves) {
    try {
      theirBest = Math.max(theirBest, calc.calcDamage(oppActive, myActive, mv, snapshot.field).maxPercent);
    } catch { /* catch-ok: Hypothetical move exploration probe skip */ }
  }
  return Math.max(
    w.POSITION_BOUND_MIN,
    Math.min(w.POSITION_BOUND_MAX, (ourBest - theirBest) / w.PERCENTAGE_FULL_SCALE)
  );
}

function computeStatusAdvantage(
  myAlive: readonly HeuristicPokemonState[],
  oppAlive: readonly HeuristicPokemonState[]
): number {
  const w = POSITION_WEIGHTS;
  const myStatused = myAlive.filter(p => p.status !== null).length;
  const oppStatused = oppAlive.filter(p => p.status !== null).length;
  return Math.max(
    w.POSITION_BOUND_MIN,
    Math.min(w.POSITION_BOUND_MAX, (oppStatused - myStatused) / w.MAX_STATUS_PENALTY_COUNT)
  );
}

function computeWinConditionViability(winConditions: WinCondition[]): number {
  const bestWC = winConditions.length > 0
    ? (winConditions[0]?.score ?? POSITION_WEIGHTS.POSITION_MIN_DEFAULT_SCORE)
    : POSITION_WEIGHTS.POSITION_MIN_DEFAULT_SCORE;
  return (bestWC - POSITION_WEIGHTS.MIDPOINT_OFFSET_HALF) * POSITION_WEIGHTS.RANGE_EXPANDER_DOUBLE;
}

export function evaluatePosition(
  snapshot: HeuristicBattleSnapshot,
  calc: HeuristicDamageCalculator,
  winConditions: WinCondition[],
): PositionEvaluation {
  const w = POSITION_WEIGHTS;
  const myAlive = snapshot.mySide.pokemon.filter(p => !p.fainted);
  const oppAlive = snapshot.opponentSide.pokemon.filter(p => !p.fainted);
  const oppSide: SideID = snapshot.myPlayer === 'p1' ? 'p2' : 'p1';

  const pokemonAdvantage = computePokemonAdvantage(myAlive.length, oppAlive.length);
  const hpAdvantage = computeHpAdvantage(myAlive, oppAlive);
  const hazardAdvantage = computeHazardAdvantage(snapshot.opponentSide.sideConditions, snapshot.mySide.sideConditions);
  const speedAdvantage = computeSpeedAdvantage(myAlive, oppAlive, snapshot, calc, oppSide);
  const typeMatchupAdvantage = computeTypeMatchupAdvantage(snapshot, calc);
  const statusAdvantage = computeStatusAdvantage(myAlive, oppAlive);
  const winConditionViability = computeWinConditionViability(winConditions);

  const score = Math.max(w.POSITION_BOUND_MIN, Math.min(w.POSITION_BOUND_MAX,
    pokemonAdvantage * w.pokemonAdvantage +
    hpAdvantage * w.hpAdvantage +
    hazardAdvantage * w.hazardAdvantage +
    speedAdvantage * w.speedAdvantage +
    typeMatchupAdvantage * w.typeMatchupAdvantage +
    statusAdvantage * w.statusAdvantage +
    winConditionViability * w.winConditionViability,
  ));

  return {
    score,
    factors: {
      pokemonAdvantage,
      hpAdvantage,
      hazardAdvantage,
      speedAdvantage,
      typeMatchupAdvantage,
      statusAdvantage,
      winConditionViability,
    },
  };
}
