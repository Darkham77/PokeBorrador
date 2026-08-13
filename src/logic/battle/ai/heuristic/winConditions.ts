// ============================================================
// Win Conditions Evaluator
// Adapted from external/pokemon-showdown-ai/src/strategy/win-conditions.ts
// ============================================================
const WIN_COND_SPEED_ADVANTAGE_WEIGHT = 0.20
const WIN_COND_KO_COUNT_WEIGHT = 0.30
const WIN_COND_COVERAGE_WEIGHT = 0.10
const WIN_COND_SETUP_WEIGHT = 0.15
const WIN_COND_PRIORITY_WEIGHT = 0.10
const WIN_COND_HP_WEIGHT = 0.15

import { toID } from '@pkmn/sim';
import type { HeuristicBattleSnapshot, WinCondition } from './types.ts';
import type { HeuristicDamageCalculator } from './damageCalculator.ts';
import type { InferenceEngine } from './inferenceEngine.ts';

import { SETUP_MOVES, PRIORITY_MOVES } from '@/logic/constants/encounters';

export function evaluateWinConditions(
  snapshot: HeuristicBattleSnapshot,
  calc: HeuristicDamageCalculator,
  inference: InferenceEngine,
): WinCondition[] {
  const myAlive = snapshot.mySide.pokemon.filter(p => !p.fainted);
  const oppAlive = snapshot.opponentSide.pokemon.filter(p => !p.fainted);
  if (myAlive.length === 0 || oppAlive.length === 0) return [];

  const oppSide = snapshot.myPlayer === 'p1' ? 'p2' as const : 'p1' as const;
  const conditions: WinCondition[] = [];

  for (const pokemon of myAlive) {
    const hasSetup = pokemon.moves.some(m => SETUP_MOVES.includes(toID(m)));
    const hasPriority = pokemon.moves.some(m => PRIORITY_MOVES.includes(toID(m)));
    let speedAdvantageCount = 0, canKOCount = 0, coverageScore = 0, defensiveScore = 0;
    const threats: WinCondition['threatsRemaining'] = [];
    const mySpeed = calc.getEffectiveSpeed(pokemon, snapshot.field, snapshot.myPlayer);

    for (const opp of oppAlive) {
      const oppSpeed = calc.getEffectiveSpeed(opp, snapshot.field, oppSide);
      if (mySpeed > oppSpeed) speedAdvantageCount++;

      let canKO = false;
      for (const move of pokemon.moves) {
        try {
          const dmg = calc.calcDamage(pokemon, opp, move.id, snapshot.field);
          if (dmg.isOHKO) { canKO = true; break; }
          if (dmg.is2HKO) coverageScore += 0.3;
        } catch { /* skip */ }
      }
      if (canKO) canKOCount++;

      const oppMoves = [...(opp.knownMoves || [])];
      for (const { move } of inference.getLikelyUnrevealed(opp.species, 0.4)) oppMoves.push(move);
      for (const mv of oppMoves) {
        try {
          const dmg = calc.calcDamage(opp, pokemon, mv, snapshot.field);
          if (dmg.isOHKO) threats.push(`${opp.name}: ${mv}`);
        } catch { /* skip */ }
      }

      const bestOppDmg = oppMoves.reduce((mx, m) => {
        try { return Math.max(mx, calc.calcDamage(opp, pokemon, m, snapshot.field).maxPercent); } catch { return mx; }
      }, 0);
const LOW_OPPONENT_DAMAGE_THRESHOLD_PCT = 40

      if (bestOppDmg < LOW_OPPONENT_DAMAGE_THRESHOLD_PCT) defensiveScore += 0.2;
    }

    const n = Math.max(oppAlive.length, 1);
    const score = Math.min(1.0,
      (speedAdvantageCount / n * WIN_COND_SPEED_ADVANTAGE_WEIGHT) +
      (canKOCount / n * WIN_COND_KO_COUNT_WEIGHT) +
      (coverageScore / n * WIN_COND_COVERAGE_WEIGHT) +
      (hasSetup ? WIN_COND_SETUP_WEIGHT : 0) +
      (hasPriority ? WIN_COND_PRIORITY_WEIGHT : 0) +
      ((pokemon.hpPercent ?? 100) / 100 * WIN_COND_HP_WEIGHT) +
      Math.min(defensiveScore, 0.2),
    );

    conditions.push({
      pokemon: pokemon.name,
      score,
      requiresSetup: hasSetup && pokemon.boosts.atk <= 0 && pokemon.boosts.spa <= 0,
      threatsRemaining: threats.slice(0, 3),
    });
  }

  return conditions.sort((a, b) => b.score - a.score);
}
