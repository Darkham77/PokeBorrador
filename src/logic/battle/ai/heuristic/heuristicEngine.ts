// ============================================================
// Heuristic Decision Engine — 9-layer rule-based AI
// Adapted from external/pokemon-showdown-ai/src/heuristics/engine.ts
// BattleState dependency removed — uses snapshot + isTrapped flag
// ============================================================

import { toID } from '@pkmn/sim';
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
import { HAZARD_REMOVAL_MOVES } from './sackOrder.ts';

const INVALID_MOVE_INDEX = -1;

import { SETUP_MOVES } from '@/logic/constants/encounters.ts';

const HAZARD_MOVES: readonly string[] = ['stealthrock', 'spikes', 'toxicspikes', 'stickyweb']; // no-domain

const PIVOT_MOVES: readonly string[] = ['uturn', 'voltswitch', 'flipturn', 'partingshot', 'teleport']; // no-domain

/** Offset to convert zero-indexed array slot to 1-indexed Showdown action choice. */
export const SHOWDOWN_CHOICE_INDEX_OFFSET = 1;

/** Confidence score weights for heuristic AI decision layers. */
export const HEURISTIC_CONFIDENCE_SCORES = { // no-magic
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
export const HEURISTIC_THRESHOLDS = { // no-magic
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

  // ═══════════════════════════════════════
  // 3. Priority KO (always first — bypasses speed)
  // ═══════════════════════════════════════
  const priorityKO = matchup.myAttacking.find(d => d.isOHKO && d.priority > HEURISTIC_EVAL_DEFAULT_MOVE_INDEX);
  if (priorityKO) {
    const oppPriorityKO = matchup.oppAttacking.find(d => d.isOHKO && d.priority > HEURISTIC_EVAL_DEFAULT_MOVE_INDEX);
    const oppOutprioritizes = oppPriorityKO !== undefined && (
      oppPriorityKO.priority > priorityKO.priority ||
      (oppPriorityKO.priority === priorityKO.priority && oppSpeed > mySpeed)
    );
    if (!oppOutprioritizes) {
      const moveIdx = findMoveIndex(availableMoves, priorityKO.move);
      if (moveIdx !== INVALID_MOVE_INDEX) {
        return {
          type: 'move', moveId: priorityKO.move, moveIndex: moveIdx + SHOWDOWN_CHOICE_INDEX_OFFSET,
          source: 'heuristic', confidence: HEURISTIC_CONFIDENCE_SCORES.HIGH_PRIORITY_KO,
          reasoning: `Priority KO on ${oppActive.name} at ${oppActive.hpPercent.toFixed(0)}%`, // no-magic
        };
      }
    }
  }

  // ═══════════════════════════════════════
  // 4. Guaranteed OHKO (with speed awareness)
  // ═══════════════════════════════════════
  const guaranteedKO = matchup.myAttacking.find(d => d.isOHKO);
  if (guaranteedKO) {
    const theyCanKOFirst = !iOutspeed && matchup.oppAttacking.some(d => d.isOHKO);
    if (!theyCanKOFirst) {
      const moveIdx = findMoveIndex(availableMoves, guaranteedKO.move);
      if (moveIdx !== INVALID_MOVE_INDEX) {
        return {
          type: 'move', moveId: guaranteedKO.move, moveIndex: moveIdx + SHOWDOWN_CHOICE_INDEX_OFFSET,
          source: 'heuristic', confidence: HEURISTIC_CONFIDENCE_SCORES.GUARANTEED_OHKO,
          reasoning: `Guaranteed OHKO with ${guaranteedKO.move} (${guaranteedKO.minPercent.toFixed(0)}-${guaranteedKO.maxPercent.toFixed(0)}%)`, // no-magic
        };
      }
    } else if (priorityKO) {
      const moveIdx = findMoveIndex(availableMoves, priorityKO.move);
      if (moveIdx !== INVALID_MOVE_INDEX) {
        return {
          type: 'move', moveId: priorityKO.move, moveIndex: moveIdx + SHOWDOWN_CHOICE_INDEX_OFFSET,
          source: 'heuristic', confidence: HEURISTIC_CONFIDENCE_SCORES.RESCUE_PRIORITY_KO,
          reasoning: 'Priority KO — opponent outspeeds and threatens KO',
        };
      }
    }
  }

  // ═══════════════════════════════════════
  // 5. About to be KO'd — priority or switch
  // ═══════════════════════════════════════
  const theyCanKO = matchup.oppAttacking.find(d => d.isOHKO);
  if (theyCanKO) {
    const ourPriorityKO = matchup.myAttacking.find(d => d.isOHKO && d.priority > HEURISTIC_EVAL_DEFAULT_MOVE_INDEX);
    if (ourPriorityKO !== undefined) {
      const moveIdx = findMoveIndex(availableMoves, ourPriorityKO.move);
      if (moveIdx !== INVALID_MOVE_INDEX) {
        return {
          type: 'move', moveId: ourPriorityKO.move, moveIndex: moveIdx + SHOWDOWN_CHOICE_INDEX_OFFSET,
          source: 'heuristic', confidence: HEURISTIC_CONFIDENCE_SCORES.RESCUE_PRIORITY_KO,
          reasoning: 'Priority KO before we go down',
        };
      }
    }
    const isWinCondition = strategic.winConditions.length > HEURISTIC_EVAL_DEFAULT_MOVE_INDEX &&
      strategic.winConditions[HEURISTIC_EVAL_DEFAULT_MOVE_INDEX]?.pokemon === myActive.name &&
      (strategic.winConditions[HEURISTIC_EVAL_DEFAULT_MOVE_INDEX]?.score ?? HEURISTIC_EVAL_DEFAULT_WIN_SCORE) > HEURISTIC_THRESHOLDS.WIN_CONDITION_SCORE;
    if (isWinCondition && switchOptions.length > HEURISTIC_EVAL_DEFAULT_MOVE_INDEX && !isTrapped) {
      return pickBestSwitch(snapshot, switchOptions, strategic, calc, inference, oppActive);
    }
  }

  // ═══════════════════════════════════════
  // 6a. Hazard removal — only when hazards threaten win conditions
  // ═══════════════════════════════════════
  if (snapshot.mySide.sideConditions.size > 0) {
    const removalMove = availableMoves.find(m => HAZARD_REMOVAL_MOVES.includes(toID(m.id)));
    if (removalMove && myActive.hpPercent > HEURISTIC_THRESHOLDS.HAZARD_REMOVAL_MIN_HP && !guaranteedKO) {
      if (hazardsThreatenTeam(snapshot, strategic)) {
        const moveIdx = findMoveIndex(availableMoves, removalMove.id);
        if (moveIdx !== INVALID_MOVE_INDEX) {
          return {
            type: 'move', moveId: removalMove.id, moveIndex: moveIdx + SHOWDOWN_CHOICE_INDEX_OFFSET,
            source: 'heuristic', confidence: HEURISTIC_CONFIDENCE_SCORES.HAZARD_REMOVAL,
            reasoning: 'Remove hazards threatening win condition',
          };
        }
      }
    }
  }

  // ═══════════════════════════════════════
  // 6b. Set up hazards when safe
  // ═══════════════════════════════════════
  if (!snapshot.opponentSide.sideConditions.has('stealthrock') && myActive.hpPercent > HEURISTIC_THRESHOLDS.HAZARD_SET_MIN_HP) {
    const hazardMove = availableMoves.find(m => HAZARD_MOVES.includes(toID(m.id)));
    if (hazardMove) {
      const worstOppDmg = matchup.oppAttacking[HEURISTIC_EVAL_DEFAULT_MOVE_INDEX]?.maxPercent ?? HEURISTIC_EVAL_DEFAULT_WIN_SCORE;
      if (worstOppDmg < HEURISTIC_THRESHOLDS.HAZARD_SET_MAX_OPP_DAMAGE) {
        const moveIdx = findMoveIndex(availableMoves, hazardMove.id);
        if (moveIdx !== INVALID_MOVE_INDEX) {
          return {
            type: 'move', moveId: hazardMove.id, moveIndex: moveIdx + SHOWDOWN_CHOICE_INDEX_OFFSET,
            source: 'heuristic', confidence: HEURISTIC_CONFIDENCE_SCORES.HAZARD_SET,
            reasoning: 'Set up hazards',
          };
        }
      }
    }
  }

  // ═══════════════════════════════════════
  // 7. Setup opportunity
  // ═══════════════════════════════════════
  const setupMove = availableMoves.find(m => SETUP_MOVES.includes(toID(m.id)));
  if (setupMove && myActive.hpPercent > HEURISTIC_THRESHOLDS.SETUP_MOVE_MIN_HP) {
    const worstOppDmg = matchup.oppAttacking[HEURISTIC_EVAL_DEFAULT_MOVE_INDEX]?.maxPercent ?? HEURISTIC_EVAL_DEFAULT_WIN_SCORE;
    const isWinCond = strategic.winConditions.length > HEURISTIC_EVAL_DEFAULT_MOVE_INDEX &&
      strategic.winConditions[HEURISTIC_EVAL_DEFAULT_MOVE_INDEX]?.pokemon === myActive.name;
    const oppLocked = oppActive.volatiles.has('choicelock') || oppActive.volatiles.has('mustrecharge');
    const oppCantThreaten = worstOppDmg < HEURISTIC_THRESHOLDS.SETUP_MOVE_MAX_OPP_DAMAGE;
    const oppLowHp = oppActive.hpPercent < HEURISTIC_THRESHOLDS.SETUP_MOVE_OPP_LOW_HP;
    const isSafe = oppCantThreaten || oppLocked || (iOutspeed && oppLowHp);
    if (isSafe && isWinCond) {
      const moveIdx = findMoveIndex(availableMoves, setupMove.id);
      if (moveIdx !== INVALID_MOVE_INDEX) {
        const reason = oppLocked ? 'opponent locked' : oppLowHp ? 'opponent likely switching' : 'opponent can\'t threaten';
        return {
          type: 'move', moveId: setupMove.id, moveIndex: moveIdx + SHOWDOWN_CHOICE_INDEX_OFFSET,
          source: 'heuristic', confidence: HEURISTIC_CONFIDENCE_SCORES.SETUP_MOVE,
          reasoning: `Safe setup: ${reason}`,
        };
      }
    }
  }

  // ═══════════════════════════════════════
  // 8a. Pivot — U-turn / Volt Switch when matchup is unfavorable
  // ═══════════════════════════════════════
  if (!isTrapped && switchOptions.length > HEURISTIC_EVAL_DEFAULT_MOVE_INDEX) {
    const pivotMove = availableMoves.find(m => PIVOT_MOVES.includes(toID(m.id)));
    if (pivotMove) {
      const bestOppDmg = matchup.oppAttacking[HEURISTIC_EVAL_DEFAULT_MOVE_INDEX]?.maxPercent ?? HEURISTIC_EVAL_DEFAULT_WIN_SCORE;
      const bestMyDmg = matchup.myAttacking[HEURISTIC_EVAL_DEFAULT_MOVE_INDEX]?.maxPercent ?? HEURISTIC_EVAL_DEFAULT_WIN_SCORE;
      if (bestOppDmg > HEURISTIC_THRESHOLDS.PIVOT_MIN_OPP_DAMAGE && bestMyDmg < HEURISTIC_THRESHOLDS.PIVOT_MAX_MY_DAMAGE && myActive.hpPercent > HEURISTIC_THRESHOLDS.PIVOT_MIN_MY_HP) {
        const moveIdx = findMoveIndex(availableMoves, pivotMove.id);
        if (moveIdx !== INVALID_MOVE_INDEX) {
          return {
            type: 'move', moveId: pivotMove.id, moveIndex: moveIdx + SHOWDOWN_CHOICE_INDEX_OFFSET,
            source: 'heuristic', confidence: HEURISTIC_CONFIDENCE_SCORES.PIVOT_MOVE,
            reasoning: `Pivot with ${pivotMove.id} — unfavorable matchup`,
          };
        }
      }
    }
  }

  // ═══════════════════════════════════════
  // 8b. Best available move (high-damage matchup)
  // ═══════════════════════════════════════
  if (matchup.myAttacking.length > HEURISTIC_EVAL_DEFAULT_MOVE_INDEX) {
    const bestMove = matchup.myAttacking[HEURISTIC_EVAL_DEFAULT_MOVE_INDEX];
    if (bestMove !== undefined && bestMove.maxPercent > HEURISTIC_THRESHOLDS.BEST_ATTACK_MIN_DAMAGE) {
      const moveIdx = findMoveIndex(availableMoves, bestMove.move);
      if (moveIdx !== INVALID_MOVE_INDEX) {
        const shouldSwitch = !isTrapped && shouldConsiderSwitching(matchup, strategic, switchOptions, snapshot.mySide.activePokemon);
        if (!shouldSwitch) {
          return {
            type: 'move', moveId: bestMove.move, moveIndex: moveIdx + SHOWDOWN_CHOICE_INDEX_OFFSET,
            source: 'heuristic', confidence: HEURISTIC_CONFIDENCE_SCORES.BEST_ATTACK,
            reasoning: `Best damage: ${bestMove.move} (${bestMove.minPercent.toFixed(0)}-${bestMove.maxPercent.toFixed(0)}%)`, // no-magic
          };
        }
      }
    }
  }

  // ═══════════════════════════════════════
  // 9. Bad matchup — switch out
  // ═══════════════════════════════════════
  if (!isTrapped && switchOptions.length > HEURISTIC_EVAL_DEFAULT_MOVE_INDEX) {
    const bestOppDmg = matchup.oppAttacking[HEURISTIC_EVAL_DEFAULT_MOVE_INDEX]?.maxPercent ?? HEURISTIC_EVAL_DEFAULT_WIN_SCORE;
    const bestMyDmg = matchup.myAttacking[HEURISTIC_EVAL_DEFAULT_MOVE_INDEX]?.maxPercent ?? HEURISTIC_EVAL_DEFAULT_WIN_SCORE;
    if (bestOppDmg > HEURISTIC_THRESHOLDS.BAD_MATCHUP_OPP_DAMAGE && bestMyDmg < HEURISTIC_THRESHOLDS.BAD_MATCHUP_MY_DAMAGE) {
      const sw = pickBestSwitch(snapshot, switchOptions, strategic, calc, inference, oppActive);
      if (sw) return sw;
    }
  }

  return null; // No confident heuristic fired
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
    reasoning: `Best switch-in: ${best.pokemon.name} (score ${best.score.toFixed(2)})`, // no-magic
  };
}

// ────────────────────────────────────────
// Helpers
// ────────────────────────────────────────

function findMoveIndex(moves: HeuristicMoveInfo[], moveId: string): number {
  return moves.findIndex(m => toID(m.id) === toID(moveId) && !m.disabled && m.pp > HEURISTIC_EVAL_DEFAULT_MOVE_INDEX);
}

function hazardsThreatenTeam(snapshot: HeuristicBattleSnapshot, strategic: StrategicState): boolean {
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

function shouldConsiderSwitching(
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
