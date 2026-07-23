// ============================================================
// Board Position Evaluator (-1.0 losing → +1.0 winning)
// Adapted from external/pokemon-showdown-ai/src/strategy/position.ts
// Note: BattleState.isTrapped() removed — use snapshot data only
// ============================================================

import type { HeuristicBattleSnapshot, PositionEvaluation, WinCondition } from './types.ts';
import type { HeuristicDamageCalculator } from './damageCalculator.ts';

const POSITION_WEIGHTS = {
  pokemonAdvantage: 0.20,
  hpAdvantage: 0.15,
  hazardAdvantage: 0.10,
  speedAdvantage: 0.15,
  typeMatchupAdvantage: 0.15,
  statusAdvantage: 0.10,
  winConditionViability: 0.15,
} as const;

function countHazardLayers(conditions: Map<string, number>): number {
  return (conditions.get('stealthrock') ?? 0) +
    (conditions.get('spikes') ?? 0) +
    (conditions.get('toxicspikes') ?? 0) +
    (conditions.get('stickyweb') ?? 0);
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
  const pokemonAdvantage = total > 0 ? (myAlive.length - oppAlive.length) / total : 0;

  // 2. HP advantage
  const myAvgHp = myAlive.length > 0 ? myAlive.reduce((s, p) => s + p.hpPercent, 0) / myAlive.length : 0;
  const oppAvgHp = oppAlive.length > 0 ? oppAlive.reduce((s, p) => s + p.hpPercent, 0) / oppAlive.length : 0;
  const hpAdvantage = (myAvgHp - oppAvgHp) / 100;

  // 3. Hazard advantage
  const hazardAdvantage = Math.max(-1, Math.min(1,
    (countHazardLayers(snapshot.opponentSide.sideConditions) -
     countHazardLayers(snapshot.mySide.sideConditions)) / 5,
  ));

  // 4. Speed advantage
  let speedWins = 0, speedTotal = 0;
  for (const my of myAlive) {
    for (const opp of oppAlive) {
      speedTotal++;
      if (calc.getEffectiveSpeed(my, snapshot.field, snapshot.myPlayer) >
          calc.getEffectiveSpeed(opp, snapshot.field, oppSide)) speedWins++;
    }
  }
  const speedAdvantage = speedTotal > 0 ? (speedWins / speedTotal - 0.5) * 2 : 0;

  // 5. Type matchup advantage (active vs active)
  let typeMatchupAdvantage = 0;
  const myActive = snapshot.mySide.activePokemon;
  const oppActive = snapshot.opponentSide.activePokemon;
  if (myActive && oppActive) {
    let ourBest = 0, theirBest = 0;
    for (const mv of myActive.moves) {
      try { ourBest = Math.max(ourBest, calc.calcDamage(myActive, oppActive, mv, snapshot.field).maxPercent); } catch { /* skip */ }
    }
    for (const mv of oppActive.knownMoves) {
      try { theirBest = Math.max(theirBest, calc.calcDamage(oppActive, myActive, mv, snapshot.field).maxPercent); } catch { /* skip */ }
    }
    typeMatchupAdvantage = Math.max(-1, Math.min(1, (ourBest - theirBest) / 100));
  }

  // 6. Status advantage
  const myStatused = myAlive.filter(p => p.status !== null).length;
  const oppStatused = oppAlive.filter(p => p.status !== null).length;
  const statusAdvantage = Math.max(-1, Math.min(1, (oppStatused - myStatused) / 3));

  // 7. Win condition viability
  const bestWC = winConditions.length > 0 ? (winConditions[0]?.score ?? 0) : 0;
  const winConditionViability = (bestWC - 0.5) * 2;

  const score = Math.max(-1.0, Math.min(1.0,
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
