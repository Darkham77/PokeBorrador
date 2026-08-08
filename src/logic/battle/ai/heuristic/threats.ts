// ============================================================
// Threat Assessor
// Adapted from external/pokemon-showdown-ai/src/strategy/threats.ts
// ============================================================

import type { HeuristicBattleSnapshot, ThreatAssessment } from './types.ts';
import type { HeuristicDamageCalculator } from './damageCalculator.ts';
import type { InferenceEngine } from './inferenceEngine.ts';

import { SETUP_MOVES, PRIORITY_MOVES, THREAT_WEIGHT_SPEED, THREAT_WEIGHT_DAMAGE, THREAT_WEIGHT_SETUP, THREAT_WEIGHT_DEFENSIVE_WALL, PERCENTAGE_MULTIPLIER_FACTOR } from '@/logic/constants/encounters'

const THREAT_WEIGHTS = {
  speedThreat: THREAT_WEIGHT_SPEED,
  damageThreat: THREAT_WEIGHT_DAMAGE,
  setupPotential: THREAT_WEIGHT_SETUP,
  defensiveWallValue: THREAT_WEIGHT_DEFENSIVE_WALL,
} as const;

const LATE_GAME_BENCH_THRESHOLD = 3;
const THREAT_UNREVEALED_PROBABILITY = 0.3;
const DAMAGE_THREAT_AVG_WEIGHT = 0.7;
const DAMAGE_THREAT_KO_WEIGHT = 0.3;
const SETUP_HAS_MOVE_WEIGHT = 0.5;
const SETUP_BOOSTED_WEIGHT = 0.4;
const SETUP_PRIORITY_WEIGHT = 0.1;
const DEFENSIVE_WALL_MAX_DAMAGE_THRESHOLD = 34;
const DEFENSIVE_WALL_SCORE_STEP = 0.3;

export function evaluateThreats(
  snapshot: HeuristicBattleSnapshot,
  calc: HeuristicDamageCalculator,
  inference: InferenceEngine,
): ThreatAssessment[] {
  const oppAlive = snapshot.opponentSide.pokemon.filter(p => !p.fainted);
  const myAlive = snapshot.mySide.pokemon.filter(p => !p.fainted);
  if (oppAlive.length === 0 || myAlive.length === 0) return [];

  const oppSide = snapshot.myPlayer === 'p1' ? 'p2' as const : 'p1' as const;
  const lateGame = myAlive.length <= LATE_GAME_BENCH_THRESHOLD;
  const threats: ThreatAssessment[] = [];

  for (const opp of oppAlive) {
    const allMoves = new Set(opp.knownMoves);
    for (const { move } of inference.getLikelyUnrevealed(opp.species, THREAT_UNREVEALED_PROBABILITY)) allMoves.add(move);
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
    const damageThreat = Math.min(1.0, (avgDmg / PERCENTAGE_MULTIPLIER_FACTOR) * DAMAGE_THREAT_AVG_WEIGHT + (totalKOs / Math.max(myAlive.length, 1)) * DAMAGE_THREAT_KO_WEIGHT);

    // Setup potential
    const hasSetup = moveList.some(m => SETUP_MOVES.includes(m));
    const hasPriority = moveList.some(m => PRIORITY_MOVES.includes(m));
    const alreadyBoosted = opp.boosts.atk > 0 || opp.boosts.spa > 0 || opp.boosts.spe > 0;
    const setupPotential = Math.min(1.0,
      (hasSetup ? SETUP_HAS_MOVE_WEIGHT : 0) + (alreadyBoosted ? SETUP_BOOSTED_WEIGHT : 0) + (hasPriority ? SETUP_PRIORITY_WEIGHT : 0),
    );

    // Defensive wall value
    let wallScore = 0;
    for (const my of myAlive) {
      let bestMyDmg = 0;
      for (const mv of my.moves) {
        try { bestMyDmg = Math.max(bestMyDmg, calc.calcDamage(my, opp, mv, snapshot.field).maxPercent); } catch { /* skip */ }
      }
      if (bestMyDmg < DEFENSIVE_WALL_MAX_DAMAGE_THRESHOLD) wallScore += DEFENSIVE_WALL_SCORE_STEP;
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
