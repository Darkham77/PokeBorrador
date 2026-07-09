// ============================================================
// Win Conditions Evaluator
// Adapted from external/pokemon-showdown-ai/src/strategy/win-conditions.ts
// ============================================================

import type { HeuristicBattleSnapshot, WinCondition } from './types';
import type { HeuristicDamageCalculator } from './damageCalculator';
import type { InferenceEngine } from './inferenceEngine';

function toId(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const SETUP_MOVES = new Set([
  'swordsdance', 'nastyplot', 'dragondance', 'calmmind', 'quiverdance',
  'shellsmash', 'bulkup', 'irondefense', 'bellydrum', 'coil',
  'shiftgear', 'workup', 'agility', 'autotomize', 'tailglow',
]);

const PRIORITY_MOVES = new Set([
  'extremespeed', 'aquajet', 'bulletpunch', 'iceshard', 'machpunch',
  'quickattack', 'shadowsneak', 'suckerpunch', 'grassyglide', 'jetpunch',
  'fakeout', 'firstimpression', 'accelerock',
]);

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
    const hasSetup = pokemon.moves.some(m => SETUP_MOVES.has(toId(m)));
    const hasPriority = pokemon.moves.some(m => PRIORITY_MOVES.has(toId(m)));
    let speedAdvantageCount = 0, canKOCount = 0, coverageScore = 0, defensiveScore = 0;
    const threats: string[] = [];
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
