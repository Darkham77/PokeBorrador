// ============================================================
// Threat Assessor
// Adapted from external/pokemon-showdown-ai/src/strategy/threats.ts
// ============================================================

import type { HeuristicBattleSnapshot, ThreatAssessment } from './types.ts';
import type { HeuristicDamageCalculator } from './damageCalculator.ts';
import type { InferenceEngine } from './inferenceEngine.ts';

const SETUP_MOVES = [
  'swordsdance', 'nastyplot', 'dragondance', 'calmmind', 'quiverdance',
  'shellsmash', 'bulkup', 'bellydrum', 'coil', 'shiftgear',
] as const satisfies readonly string[]; // no-domain

const PRIORITY_MOVES = [
  'extremespeed', 'aquajet', 'bulletpunch', 'iceshard', 'machpunch',
  'quickattack', 'shadowsneak', 'suckerpunch', 'grassyglide', 'jetpunch',
] as const satisfies readonly string[]; // no-domain

const THREAT_WEIGHTS = {
  speedThreat: 0.25,
  damageThreat: 0.35,
  setupPotential: 0.25,
  defensiveWallValue: 0.15,
} as const;

export function evaluateThreats(
  snapshot: HeuristicBattleSnapshot,
  calc: HeuristicDamageCalculator,
  inference: InferenceEngine,
): ThreatAssessment[] {
  const oppAlive = snapshot.opponentSide.pokemon.filter(p => !p.fainted);
  const myAlive = snapshot.mySide.pokemon.filter(p => !p.fainted);
  if (oppAlive.length === 0 || myAlive.length === 0) return [];

  const oppSide = snapshot.myPlayer === 'p1' ? 'p2' as const : 'p1' as const;
  const lateGame = myAlive.length <= 3;
  const threats: ThreatAssessment[] = [];

  for (const opp of oppAlive) {
    const allMoves = new Set(opp.knownMoves);
    for (const { move } of inference.getLikelyUnrevealed(opp.species, 0.3)) allMoves.add(move);
    const moveList = [...allMoves];

    // Speed threat
    const oppSpeed = calc.getEffectiveSpeed(opp, snapshot.field, oppSide);
    let outspeeds = 0;
    for (const my of myAlive) {
      if (oppSpeed > calc.getEffectiveSpeed(my, snapshot.field, snapshot.myPlayer)) outspeeds++;
    }
    const speedThreat = outspeeds / Math.max(myAlive.length, 1);

    // Damage threat
    let totalKOs = 0, totalDmg = 0;
    for (const my of myAlive) {
      let best = 0;
      for (const mv of moveList) {
        try {
          const d = calc.calcDamage(opp, my, mv, snapshot.field);
          best = Math.max(best, d.maxPercent);
          if (d.isOHKO) totalKOs++;
        } catch { /* skip */ }
      }
      totalDmg += best;
    }
    const avgDmg = totalDmg / Math.max(myAlive.length, 1);
    const damageThreat = Math.min(1.0, (avgDmg / 100) * 0.7 + (totalKOs / Math.max(myAlive.length, 1)) * 0.3);

    // Setup potential
    const hasSetup = moveList.some(m => SETUP_MOVES.includes(m));
    const hasPriority = moveList.some(m => PRIORITY_MOVES.includes(m));
    const alreadyBoosted = opp.boosts.atk > 0 || opp.boosts.spa > 0 || opp.boosts.spe > 0;
    const setupPotential = Math.min(1.0,
      (hasSetup ? 0.5 : 0) + (alreadyBoosted ? 0.4 : 0) + (hasPriority ? 0.1 : 0),
    );

    // Defensive wall value
    let wallScore = 0;
    for (const my of myAlive) {
      let bestMyDmg = 0;
      for (const mv of my.moves) {
        try { bestMyDmg = Math.max(bestMyDmg, calc.calcDamage(my, opp, mv, snapshot.field).maxPercent); } catch { /* skip */ }
      }
      if (bestMyDmg < 34) wallScore += 0.3;
    }
    const defensiveWallValue = Math.min(1.0, wallScore);

    const setupW = lateGame ? Math.min(THREAT_WEIGHTS.setupPotential + 0.10, 0.40) : THREAT_WEIGHTS.setupPotential;
    const dmgW = lateGame ? Math.max(THREAT_WEIGHTS.damageThreat - 0.05, 0.20) : THREAT_WEIGHTS.damageThreat;

    threats.push({
      pokemon: opp.name,
      score: Math.min(1.0,
        speedThreat * THREAT_WEIGHTS.speedThreat +
        damageThreat * dmgW +
        setupPotential * setupW +
        defensiveWallValue * THREAT_WEIGHTS.defensiveWallValue,
      ),
      speedThreat,
      damageThreat,
      setupPotential,
      defensiveWallValue,
    });
  }

  return threats.sort((a, b) => b.score - a.score);
}
