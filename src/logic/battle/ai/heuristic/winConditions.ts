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
const COVERAGE_2HKO_SCORE_INCREMENT = 0.3;
const UNREVEALED_MOVE_LIKELIHOOD_THRESHOLD = 0.4;
const LOW_OPPONENT_DAMAGE_THRESHOLD_PCT = 40;
const DEFENSIVE_SAFE_SCORE_INCREMENT = 0.2;
const MAX_DEFENSIVE_SCORE_CAP = 0.2;
const MAX_THREATS_REMAINING_COUNT = 3;

import { toID } from '@/logic/utils/strings.ts';
import type { HeuristicBattleSnapshot, WinCondition } from './types.ts';
import type { HeuristicDamageCalculator } from './damageCalculator.ts';
import type { InferenceEngine } from './inferenceEngine.ts';
import type { SideID } from '@pkmn/sim';

import { SETUP_MOVES, PRIORITY_MOVES } from '@/logic/constants/encounters';

interface OpponentMatchupEvaluation {
  hasSpeedAdvantage: boolean;
  canKO: boolean;
  coverageBonus: number;
  threats: WinCondition['threatsRemaining'];
  isDefensivelySafe: boolean;
}

function evaluateOpponentMatchup(
  pokemon: HeuristicBattleSnapshot['mySide']['pokemon'][number],
  opp: HeuristicBattleSnapshot['opponentSide']['pokemon'][number],
  mySpeed: number,
  oppSide: SideID,
  snapshot: HeuristicBattleSnapshot,
  calc: HeuristicDamageCalculator,
  inference: InferenceEngine
): OpponentMatchupEvaluation {
  const oppSpeed = calc.getEffectiveSpeed(opp, snapshot.field, oppSide);
  const hasSpeedAdvantage = mySpeed > oppSpeed;

  let canKO = false;
  let coverageBonus = 0;
  for (const move of pokemon.moves) {
    try {
      const dmg = calc.calcDamage(pokemon, opp, move.id, snapshot.field);
      if (dmg.isOHKO) { canKO = true; break; }
      if (dmg.is2HKO) coverageBonus += COVERAGE_2HKO_SCORE_INCREMENT;
    } catch { /* catch-ok: Hypothetical move exploration probe skip */ }
  }

  const oppMoves = [...(opp.knownMoves || [])];
  for (const { move } of inference.getLikelyUnrevealed(opp.species, UNREVEALED_MOVE_LIKELIHOOD_THRESHOLD)) {
    oppMoves.push(move);
  }
  const threats: WinCondition['threatsRemaining'] = [];
  for (const mv of oppMoves) {
    try {
      const dmg = calc.calcDamage(opp, pokemon, mv, snapshot.field);
      if (dmg.isOHKO) threats.push(`${opp.name}: ${mv}`);
    } catch { /* catch-ok: Hypothetical move exploration probe skip */ }
  }

  const bestOppDmg = oppMoves.reduce((mx, m) => {
    try { return Math.max(mx, calc.calcDamage(opp, pokemon, m, snapshot.field).maxPercent); } catch { return mx; }
  }, 0);

  const isDefensivelySafe = bestOppDmg < LOW_OPPONENT_DAMAGE_THRESHOLD_PCT;

  return { hasSpeedAdvantage, canKO, coverageBonus, threats, isDefensivelySafe };
}

interface AggregatedMatchups {
  speedAdvantageCount: number;
  canKOCount: number;
  coverageScore: number;
  defensiveScore: number;
  threats: WinCondition['threatsRemaining'];
}

function aggregatePokemonMatchups(
  pokemon: HeuristicBattleSnapshot['mySide']['pokemon'][number],
  oppAlive: Readonly<HeuristicBattleSnapshot['opponentSide']['pokemon']>,
  mySpeed: number,
  oppSide: SideID,
  snapshot: HeuristicBattleSnapshot,
  calc: HeuristicDamageCalculator,
  inference: InferenceEngine
): AggregatedMatchups {
  let speedAdvantageCount = 0;
  let canKOCount = 0;
  let coverageScore = 0;
  let defensiveScore = 0;
  const threats: WinCondition['threatsRemaining'] = [];

  for (const opp of oppAlive) {
    const matchup = evaluateOpponentMatchup(pokemon, opp, mySpeed, oppSide, snapshot, calc, inference);
    if (matchup.hasSpeedAdvantage) speedAdvantageCount++;
    if (matchup.canKO) canKOCount++;
    coverageScore += matchup.coverageBonus;
    threats.push(...matchup.threats);
    if (matchup.isDefensivelySafe) defensiveScore += DEFENSIVE_SAFE_SCORE_INCREMENT;
  }

  return { speedAdvantageCount, canKOCount, coverageScore, defensiveScore, threats };
}

function computeWinScore(
  pokemon: HeuristicBattleSnapshot['mySide']['pokemon'][number],
  m: AggregatedMatchups,
  oppCount: number,
  hasSetup: boolean,
  hasPriority: boolean
): number {
  const n = Math.max(oppCount, 1);
  return Math.min(1.0,
    (m.speedAdvantageCount / n * WIN_COND_SPEED_ADVANTAGE_WEIGHT) +
    (m.canKOCount / n * WIN_COND_KO_COUNT_WEIGHT) +
    (m.coverageScore / n * WIN_COND_COVERAGE_WEIGHT) +
    (hasSetup ? WIN_COND_SETUP_WEIGHT : 0) +
    (hasPriority ? WIN_COND_PRIORITY_WEIGHT : 0) +
    ((pokemon.hpPercent ?? 100) / 100 * WIN_COND_HP_WEIGHT) +
    Math.min(m.defensiveScore, MAX_DEFENSIVE_SCORE_CAP),
  );
}

function evaluateSingleWinCondition(
  pokemon: HeuristicBattleSnapshot['mySide']['pokemon'][number],
  oppAlive: Readonly<HeuristicBattleSnapshot['opponentSide']['pokemon']>,
  snapshot: HeuristicBattleSnapshot,
  calc: HeuristicDamageCalculator,
  inference: InferenceEngine,
  oppSide: SideID
): WinCondition {
  const hasSetup = pokemon.moves.some(m => SETUP_MOVES.has(toID(typeof m === 'string' ? m : m.id)));
  const hasPriority = pokemon.moves.some(m => PRIORITY_MOVES.has(toID(typeof m === 'string' ? m : m.id)));
  const mySpeed = calc.getEffectiveSpeed(pokemon, snapshot.field, snapshot.myPlayer);

  const matchups = aggregatePokemonMatchups(pokemon, oppAlive, mySpeed, oppSide, snapshot, calc, inference);
  const score = computeWinScore(pokemon, matchups, oppAlive.length, hasSetup, hasPriority);

  return {
    pokemon: pokemon.name,
    score,
    requiresSetup: hasSetup && pokemon.boosts.atk <= 0 && pokemon.boosts.spa <= 0,
    threatsRemaining: matchups.threats.slice(0, MAX_THREATS_REMAINING_COUNT),
  };
}

export function evaluateWinConditions(
  snapshot: HeuristicBattleSnapshot,
  calc: HeuristicDamageCalculator,
  inference: InferenceEngine,
): WinCondition[] {
  const myAlive = snapshot.mySide.pokemon.filter(p => !p.fainted);
  const oppAlive = snapshot.opponentSide.pokemon.filter(p => !p.fainted);
  if (myAlive.length === 0 || oppAlive.length === 0) return [];

  const oppSide = snapshot.myPlayer === 'p1' ? 'p2' as const : 'p1' as const;
  const conditions = myAlive.map(pokemon =>
    evaluateSingleWinCondition(pokemon, oppAlive, snapshot, calc, inference, oppSide)
  );

  return conditions.sort((a, b) => b.score - a.score);
}
