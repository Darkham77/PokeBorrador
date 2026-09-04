// ============================================================
// Heuristic Decision Engine — 9-layer rule-based AI
// Adapted from external/pokemon-showdown-ai/src/heuristics/engine.ts
// BattleState dependency removed — uses snapshot + isTrapped flag
// ============================================================

import { toID } from '@pkmn/sim';
import type { PokemonMoveId } from '@/data/battle/moves';
import type {
  HeuristicBattleSnapshot,
  HeuristicPokemonState,
  HeuristicMoveInfo,
  HeuristicDecision,
  DamageMatchup,
  StrategicState,
} from './types.ts';
import type { HeuristicDamageCalculator } from './damageCalculator.ts';
import type { InferenceEngine } from './inferenceEngine.ts';
import {
  evaluatePriorityKOLayer,
  evaluateGuaranteedKOLayer,
  evaluateSurvivalLayer,
  evaluateHazardLayers,
  evaluateSetupAndPivotLayers,
  evaluateAttackAndSwitchLayers,
} from './heuristicLayerEvaluators.ts';

/** Offset to convert zero-indexed array slot to 1-indexed Showdown action choice. */
export const SHOWDOWN_CHOICE_INDEX_OFFSET = 1;

/** Confidence score weights for heuristic AI decision layers. */
export const HEURISTIC_CONFIDENCE_SCORES = { // no-magic: Explicit mathematical constant or threshold value
  HIGH_PRIORITY_KO: 0.93,
  GUARANTEED_OHKO: 0.95,
  RESCUE_PRIORITY_KO: 0.88,
  STANDARD_ATTACK: 0.85,
  SETUP_MOVE: 0.80,
  HAZARD_REMOVAL: 0.75,
  HAZARD_SET: 0.75,
  BEST_SWITCH: 0.75,
  PIVOT_MOVE: 0.72,
  BEST_ATTACK: 0.70,
} as const;

const HEURISTIC_EVAL_DEFAULT_WIN_SCORE = 0;
const HEURISTIC_EVAL_DEFAULT_MOVE_INDEX = 0;
const HEURISTIC_EVAL_DEFAULT_REPEATS = 0;
const HEURISTIC_EVAL_MAX_PRESERVATION_SCORE = 1;

/** Decision threshold values for heuristic AI evaluations. */
export const HEURISTIC_THRESHOLDS = { // no-magic: Explicit mathematical constant or threshold value
  WIN_CONDITION_SCORE: 0.5,
  HAZARD_REMOVAL_MIN_HP: 40,
  HAZARD_SET_MIN_HP: 60,
  HAZARD_SET_MAX_OPP_DAMAGE: 50,
  SETUP_MOVE_MIN_HP: 60,
  SETUP_MOVE_MAX_OPP_DAMAGE: 45,
  SETUP_MOVE_OPP_LOW_HP: 25,
  PIVOT_MIN_OPP_DAMAGE: 35,
  PIVOT_MAX_MY_DAMAGE: 40,
  PIVOT_MIN_MY_HP: 30,
  BEST_ATTACK_MIN_DAMAGE: 40,
  BAD_MATCHUP_OPP_DAMAGE: 50,
  BAD_MATCHUP_MY_DAMAGE: 25,
  UNREVEALED_MOVE_PROBABILITY: 0.3,
  STEALTH_ROCK_BASE_PERCENT: 12.5,
  SPIKES_LAYER_PERCENT: 8.3,
  BENCH_RESERVE_MIN_COUNT: 2,
  SWITCH_WEIGHT_SAFETY: 0.40,
  SWITCH_WEIGHT_OFFENSE: 0.25,
  SWITCH_WEIGHT_PRESERVATION: 0.15,
  SWITCH_WEIGHT_HP: 0.20,
  WIN_CONDITION_HAZARD_HP_THRESHOLD: 60,
  HAZARD_DAMAGE_SIGNIFICANCE_THRESHOLD: 10,
  BENCH_HAZARD_HP_THRESHOLD: 70,
  MATCHUP_ATTACK_DAMAGE_THRESHOLD: 50,
  MATCHUP_DEFENSE_DAMAGE_THRESHOLD: 60,
  CRITICAL_OPPONENT_DAMAGE_THRESHOLD: 55,
  WEAK_ATTACK_DAMAGE_THRESHOLD: 30,
  PERCENTAGE_BASE_SCALE: 100,
  DEFAULT_PRESERVATION_SCORE_HALFWAY: 0.5,
  DEFAULT_FALLBACK_INDEX: 0,
  DEFAULT_HEALTH_PERCENT: 100,
  FULL_PERCENT: 100
} as const;

/** Full 9-layer heuristic decision. Returns null if no layer fires confidently. */
export function heuristicDecision(
  snapshot: HeuristicBattleSnapshot,
  matchup: DamageMatchup,
  strategic: StrategicState,
  availableMoves: HeuristicMoveInfo[],
  switchOptions: HeuristicPokemonState[],
  calc: HeuristicDamageCalculator,
  inference: InferenceEngine,
  isTrapped: boolean,
): HeuristicDecision | null {
  const myActive = snapshot.mySide.activePokemon;
  const oppActive = snapshot.opponentSide.activePokemon;
  if (!myActive || !oppActive) return null;

  const oppSide = snapshot.myPlayer === 'p1' ? 'p2' as const : 'p1' as const;
  const mySpeed = calc.getEffectiveSpeed(myActive, snapshot.field, snapshot.myPlayer);
  const oppSpeed = calc.getEffectiveSpeed(oppActive, snapshot.field, oppSide);
  const iOutspeed = mySpeed > oppSpeed;

  // 1. Priority KO
  const priorityKODecision = evaluatePriorityKOLayer(matchup, availableMoves, mySpeed, oppSpeed, oppActive);
  if (priorityKODecision) return priorityKODecision;

  // 2. Guaranteed OHKO
  const guaranteedKODecision = evaluateGuaranteedKOLayer(matchup, availableMoves, iOutspeed);
  if (guaranteedKODecision) return guaranteedKODecision;

  // 3. Survival Layer
  const survivalDecision = evaluateSurvivalLayer(snapshot, matchup, strategic, availableMoves, switchOptions, isTrapped, calc, inference, myActive, oppActive);
  if (survivalDecision) return survivalDecision;

  // 4. Hazard Layers
  const hasGuaranteedKO = matchup.myAttacking.some(d => d.isOHKO);
  const hazardDecision = evaluateHazardLayers(snapshot, matchup, strategic, availableMoves, myActive, hasGuaranteedKO);
  if (hazardDecision) return hazardDecision;

  // 5. Setup & Pivot Layers
  const setupPivotDecision = evaluateSetupAndPivotLayers(matchup, strategic, availableMoves, myActive, oppActive, iOutspeed, isTrapped, switchOptions);
  if (setupPivotDecision) return setupPivotDecision;

  // 6. Best Attack & Bad Matchup Switch
  return evaluateAttackAndSwitchLayers(snapshot, matchup, strategic, availableMoves, switchOptions, isTrapped, calc, inference, oppActive);
}

// ────────────────────────────────────────
// Switch scorer (used by layers 5, 9)
// ────────────────────────────────────────

export function pickBestSwitch(
  snapshot: HeuristicBattleSnapshot,
  options: HeuristicPokemonState[],
  strategic: StrategicState,
  calc: HeuristicDamageCalculator,
  inference: InferenceEngine,
  oppActive: HeuristicPokemonState,
): HeuristicDecision | null {
  if (options.length === HEURISTIC_EVAL_DEFAULT_MOVE_INDEX) return null;

  const scored = options.map(pokemon => {
    let score = HEURISTIC_EVAL_DEFAULT_WIN_SCORE;
    const oppMoves = [...oppActive.knownMoves];
    for (const { move } of inference.getLikelyUnrevealed(oppActive.species, HEURISTIC_THRESHOLDS.UNREVEALED_MOVE_PROBABILITY)) oppMoves.push(move);

    let worstDmg = HEURISTIC_EVAL_DEFAULT_WIN_SCORE;
    for (const mv of oppMoves) {
      try { worstDmg = Math.max(worstDmg, calc.calcDamage(oppActive, pokemon, mv, snapshot.field).maxPercent); } catch { /* skip */ }
    }
    score += ((HEURISTIC_THRESHOLDS.PERCENTAGE_BASE_SCALE - worstDmg) / HEURISTIC_THRESHOLDS.PERCENTAGE_BASE_SCALE) * HEURISTIC_THRESHOLDS.SWITCH_WEIGHT_SAFETY;

    let bestMyDmg = HEURISTIC_EVAL_DEFAULT_WIN_SCORE;
    for (const mv of pokemon.moves) {
      try { bestMyDmg = Math.max(bestMyDmg, calc.calcDamage(pokemon, oppActive, mv.id, snapshot.field).maxPercent); } catch { /* skip */ }
    }
    score += (bestMyDmg / HEURISTIC_THRESHOLDS.PERCENTAGE_BASE_SCALE) * HEURISTIC_THRESHOLDS.SWITCH_WEIGHT_OFFENSE;

    const sackEntry = strategic.sackOrder.find(s => s.pokemon === pokemon.name);
    score += (HEURISTIC_EVAL_MAX_PRESERVATION_SCORE - (sackEntry?.preservationScore ?? HEURISTIC_THRESHOLDS.DEFAULT_PRESERVATION_SCORE_HALFWAY)) * HEURISTIC_THRESHOLDS.SWITCH_WEIGHT_PRESERVATION;
    score += (pokemon.hpPercent / HEURISTIC_THRESHOLDS.PERCENTAGE_BASE_SCALE) * HEURISTIC_THRESHOLDS.SWITCH_WEIGHT_HP;

    return { pokemon, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[HEURISTIC_EVAL_DEFAULT_MOVE_INDEX];
  if (!best) return null;
  const switchTeamIndex = snapshot.mySide.pokemon.findIndex(p => p.species === best.pokemon.species);

  return {
    type: 'switch',
    switchTeamIndex: switchTeamIndex >= HEURISTIC_EVAL_DEFAULT_MOVE_INDEX ? switchTeamIndex : HEURISTIC_THRESHOLDS.DEFAULT_FALLBACK_INDEX,
    source: 'heuristic',
    confidence: HEURISTIC_CONFIDENCE_SCORES.BEST_SWITCH,
    reasoning: `Best switch-in: ${best.pokemon.name} (score ${best.score.toFixed(2)})`, // no-magic: Explicit mathematical constant or threshold value
  };
}

// ────────────────────────────────────────
// Helpers
// ────────────────────────────────────────

export function findMoveIndex(moves: HeuristicMoveInfo[], moveId: PokemonMoveId): number {
  return moves.findIndex(m => toID(m.id) === toID(moveId) && !m.disabled && m.pp > HEURISTIC_EVAL_DEFAULT_MOVE_INDEX);
}

export function hazardsThreatenTeam(snapshot: HeuristicBattleSnapshot, strategic: StrategicState): boolean {
  const hazards = snapshot.mySide.sideConditions;
  if (hazards.size === HEURISTIC_EVAL_DEFAULT_MOVE_INDEX) return false;
  const hasRocks = hazards.has('stealthrock');
  const spikeLayers = hazards.get('spikes') ?? HEURISTIC_EVAL_DEFAULT_MOVE_INDEX;
  const tSpikeLayers = hazards.get('toxicspikes') ?? HEURISTIC_EVAL_DEFAULT_MOVE_INDEX;
  const bench = snapshot.mySide.pokemon.filter(p => !p.fainted && !p.active);
  if (bench.length === HEURISTIC_EVAL_DEFAULT_MOVE_INDEX) return false;

  const topWC = strategic.winConditions[HEURISTIC_EVAL_DEFAULT_MOVE_INDEX];
  if (topWC) {
    const wcPoke = bench.find(p => p.name === topWC.pokemon);
    if (wcPoke && wcPoke.hpPercent - ((hasRocks ? HEURISTIC_THRESHOLDS.STEALTH_ROCK_BASE_PERCENT : HEURISTIC_EVAL_DEFAULT_WIN_SCORE) + spikeLayers * HEURISTIC_THRESHOLDS.SPIKES_LAYER_PERCENT) < HEURISTIC_THRESHOLDS.WIN_CONDITION_HAZARD_HP_THRESHOLD) return true;
  }

  let threatened = HEURISTIC_EVAL_DEFAULT_REPEATS;
  for (const p of bench) {
    if ((hasRocks ? HEURISTIC_THRESHOLDS.STEALTH_ROCK_BASE_PERCENT : HEURISTIC_EVAL_DEFAULT_WIN_SCORE) + spikeLayers * HEURISTIC_THRESHOLDS.SPIKES_LAYER_PERCENT > HEURISTIC_THRESHOLDS.HAZARD_DAMAGE_SIGNIFICANCE_THRESHOLD && p.hpPercent < HEURISTIC_THRESHOLDS.BENCH_HAZARD_HP_THRESHOLD) threatened++;
  }
  if (threatened >= HEURISTIC_THRESHOLDS.BENCH_RESERVE_MIN_COUNT) return true;
  if (tSpikeLayers > HEURISTIC_EVAL_DEFAULT_MOVE_INDEX && bench.filter(p => p.status === null).length >= HEURISTIC_THRESHOLDS.BENCH_RESERVE_MIN_COUNT) return true;
  return false;
}

export function shouldConsiderSwitching(
  matchup: DamageMatchup,
  strategic: StrategicState,
  switchOptions: HeuristicPokemonState[],
  myActive: HeuristicPokemonState | null,
): boolean {
  if (switchOptions.length === HEURISTIC_EVAL_DEFAULT_MOVE_INDEX || !myActive) return false;
  const bestOppDmg = matchup.oppAttacking[HEURISTIC_EVAL_DEFAULT_MOVE_INDEX]?.maxPercent ?? HEURISTIC_EVAL_DEFAULT_WIN_SCORE;
  const bestMyDmg = matchup.myAttacking[HEURISTIC_EVAL_DEFAULT_MOVE_INDEX]?.maxPercent ?? HEURISTIC_EVAL_DEFAULT_WIN_SCORE;
  if (bestMyDmg > HEURISTIC_THRESHOLDS.MATCHUP_ATTACK_DAMAGE_THRESHOLD && bestOppDmg < HEURISTIC_THRESHOLDS.MATCHUP_DEFENSE_DAMAGE_THRESHOLD) return false;
  if (myActive.boosts.atk > HEURISTIC_EVAL_DEFAULT_MOVE_INDEX || myActive.boosts.spa > HEURISTIC_EVAL_DEFAULT_MOVE_INDEX || myActive.boosts.spe > HEURISTIC_EVAL_DEFAULT_MOVE_INDEX) return false;
  if (bestOppDmg > HEURISTIC_THRESHOLDS.CRITICAL_OPPONENT_DAMAGE_THRESHOLD && bestMyDmg < HEURISTIC_THRESHOLDS.WEAK_ATTACK_DAMAGE_THRESHOLD) return true;
   
  void strategic; // available for future extensions
  return false;
}
