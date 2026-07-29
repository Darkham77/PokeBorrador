// ============================================================
// Win Conditions Evaluator
// Adapted from external/pokemon-showdown-ai/src/strategy/win-conditions.ts
// ============================================================

import { toID } from '@pkmn/sim';
import type { HeuristicBattleSnapshot, WinCondition } from './types.ts';
import type { HeuristicDamageCalculator } from './damageCalculator.ts';
import type { InferenceEngine } from './inferenceEngine.ts';

const SETUP_MOVES = [
  'swordsdance', 'nastyplot', 'dragondance', 'calmmind', 'quiverdance',
  'shellsmash', 'bulkup', 'irondefense', 'bellydrum', 'coil',
  'shiftgear', 'workup', 'agility', 'autotomize', 'tailglow',
] as const;

const PRIORITY_MOVES = [
  'extremespeed', 'aquajet', 'bulletpunch', 'iceshard', 'machpunch',
  'quickattack', 'shadowsneak', 'suckerpunch', 'grassyglide', 'jetpunch',
  'fakeout', 'firstimpression', 'accelerock',
] as const;

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
    const hasSetup = pokemon.moves.some(m => (SETUP_MOVES as readonly string[]).includes(toID(m)));
    const hasPriority = pokemon.moves.some(m => (PRIORITY_MOVES as readonly string[]).includes(toID(m)));
    let speedAdvantageCount = 0, canKOCount = 0, coverageScore = 0, defensiveScore = 0;
    const threats: WinCondition['threatsRemaining'] = [];
    const mySpeed = calc.getEffectiveSpeed(pokemon, snapshot.field, snapshot.myPlayer);

    for (const opp of oppAlive) {
      const oppSpeed = calc.getEffectiveSpeed(opp, snapshot.field, oppSide);
      if (mySpeed > oppSpeed) speedAdvantageCount++;

      let canKO = false;
      for (const move of pokemon.moves) {
        try {
          const dmg = calc.calcDamage(pokemon, opp, move, snapshot.field);
          if (dmg.isOHKO) { canKO = true; break; }
          if (dmg.is2HKO) coverageScore += 0.3;
        } catch { /* skip */ }
      }
      if (canKO) canKOCount++;

      const oppMoves = [...opp.knownMoves];
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
      if (bestOppDmg < 40) defensiveScore += 0.2;
    }

    const n = Math.max(oppAlive.length, 1);
    const score = Math.min(1.0,
      (speedAdvantageCount / n * 0.20) +
      (canKOCount / n * 0.30) +
      (coverageScore / n * 0.10) +
      (hasSetup ? 0.15 : 0) +
      (hasPriority ? 0.10 : 0) +
      (pokemon.hpPercent / 100 * 0.15) +
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
