import { toID } from '@pkmn/sim';
import type {
  HeuristicBattleSnapshot,
  DamageMatchup,
  StrategicState,
  HeuristicMoveInfo,
  HeuristicPokemonState,
  HeuristicDecision,
} from './types.ts';
import type { HeuristicDamageCalculator } from './damageCalculator.ts';
import type { InferenceEngine } from './inferenceEngine.ts';
import { HAZARD_REMOVAL_MOVES } from './sackOrder.ts';
import { SETUP_MOVES } from '@/logic/constants/encounters.ts';
import {
  SHOWDOWN_CHOICE_INDEX_OFFSET,
  HEURISTIC_CONFIDENCE_SCORES,
  HEURISTIC_THRESHOLDS,
  findMoveIndex,
  hazardsThreatenTeam,
  shouldConsiderSwitching,
  pickBestSwitch,
} from './heuristicEngine.ts';

const HAZARD_MOVES_LIST = ['stealthrock', 'spikes', 'toxicspikes', 'stickyweb'] as const;
const HAZARD_MOVES: ReadonlySet<string> = new Set<string>(HAZARD_MOVES_LIST); // runtime-set

const PIVOT_MOVES_LIST = ['uturn', 'voltswitch', 'flipturn', 'partingshot', 'teleport'] as const;
const PIVOT_MOVES: ReadonlySet<string> = new Set<string>(PIVOT_MOVES_LIST); // runtime-set

const INVALID_MOVE_INDEX = -1;
const DEFAULT_ZERO = 0;

export function evaluatePriorityKOLayer(
  matchup: DamageMatchup,
  availableMoves: HeuristicMoveInfo[],
  mySpeed: number,
  oppSpeed: number,
  oppActive: HeuristicPokemonState
): HeuristicDecision | null {
  const priorityKO = matchup.myAttacking.find(d => d.isOHKO && d.priority > DEFAULT_ZERO);
  if (!priorityKO) return null;

  const oppPriorityKO = matchup.oppAttacking.find(d => d.isOHKO && d.priority > DEFAULT_ZERO);
  const oppOutprioritizes = oppPriorityKO !== undefined && (
    oppPriorityKO.priority > priorityKO.priority ||
    (oppPriorityKO.priority === priorityKO.priority && oppSpeed > mySpeed)
  );

  if (oppOutprioritizes) return null;

  const moveIdx = findMoveIndex(availableMoves, priorityKO.move);
  if (moveIdx === INVALID_MOVE_INDEX) return null;

  return {
    type: 'move',
    moveId: priorityKO.move,
    moveIndex: moveIdx + SHOWDOWN_CHOICE_INDEX_OFFSET,
    source: 'heuristic',
    confidence: HEURISTIC_CONFIDENCE_SCORES.HIGH_PRIORITY_KO,
    reasoning: `Priority KO on ${oppActive.name} at ${oppActive.hpPercent.toFixed(0)}%`, // no-magic
  };
}

export function evaluateGuaranteedKOLayer(
  matchup: DamageMatchup,
  availableMoves: HeuristicMoveInfo[],
  iOutspeed: boolean
): HeuristicDecision | null {
  const guaranteedKO = matchup.myAttacking.find(d => d.isOHKO);
  if (!guaranteedKO) return null;

  const theyCanKOFirst = !iOutspeed && matchup.oppAttacking.some(d => d.isOHKO);
  if (theyCanKOFirst) {
    const priorityKO = matchup.myAttacking.find(d => d.isOHKO && d.priority > DEFAULT_ZERO);
    if (priorityKO) {
      const moveIdx = findMoveIndex(availableMoves, priorityKO.move);
      if (moveIdx !== INVALID_MOVE_INDEX) {
        return {
          type: 'move',
          moveId: priorityKO.move,
          moveIndex: moveIdx + SHOWDOWN_CHOICE_INDEX_OFFSET,
          source: 'heuristic',
          confidence: HEURISTIC_CONFIDENCE_SCORES.RESCUE_PRIORITY_KO,
          reasoning: 'Priority KO — opponent outspeeds and threatens KO',
        };
      }
    }
    return null;
  }

  const moveIdx = findMoveIndex(availableMoves, guaranteedKO.move);
  if (moveIdx === INVALID_MOVE_INDEX) return null;

  return {
    type: 'move',
    moveId: guaranteedKO.move,
    moveIndex: moveIdx + SHOWDOWN_CHOICE_INDEX_OFFSET,
    source: 'heuristic',
    confidence: HEURISTIC_CONFIDENCE_SCORES.GUARANTEED_OHKO,
    reasoning: `Guaranteed OHKO with ${guaranteedKO.move} (${guaranteedKO.minPercent.toFixed(0)}-${guaranteedKO.maxPercent.toFixed(0)}%)`, // no-magic
  };
}

export function evaluateSurvivalLayer(
  snapshot: HeuristicBattleSnapshot,
  matchup: DamageMatchup,
  strategic: StrategicState,
  availableMoves: HeuristicMoveInfo[],
  switchOptions: HeuristicPokemonState[],
  isTrapped: boolean,
  calc: HeuristicDamageCalculator,
  inference: InferenceEngine,
  myActive: HeuristicPokemonState,
  oppActive: HeuristicPokemonState
): HeuristicDecision | null {
  const theyCanKO = matchup.oppAttacking.find(d => d.isOHKO);
  if (!theyCanKO) return null;

  const ourPriorityKO = matchup.myAttacking.find(d => d.isOHKO && d.priority > DEFAULT_ZERO);
  if (ourPriorityKO !== undefined) {
    const moveIdx = findMoveIndex(availableMoves, ourPriorityKO.move);
    if (moveIdx !== INVALID_MOVE_INDEX) {
      return {
        type: 'move',
        moveId: ourPriorityKO.move,
        moveIndex: moveIdx + SHOWDOWN_CHOICE_INDEX_OFFSET,
        source: 'heuristic',
        confidence: HEURISTIC_CONFIDENCE_SCORES.RESCUE_PRIORITY_KO,
        reasoning: 'Priority KO before we go down',
      };
    }
  }

  const isWinCondition = strategic.winConditions.length > DEFAULT_ZERO &&
    strategic.winConditions[DEFAULT_ZERO]?.pokemon === myActive.name &&
    (strategic.winConditions[DEFAULT_ZERO]?.score ?? DEFAULT_ZERO) > HEURISTIC_THRESHOLDS.WIN_CONDITION_SCORE;

  if (isWinCondition && switchOptions.length > DEFAULT_ZERO && !isTrapped) {
    return pickBestSwitch(snapshot, switchOptions, strategic, calc, inference, oppActive);
  }

  return null;
}

export function evaluateHazardLayers(
  snapshot: HeuristicBattleSnapshot,
  matchup: DamageMatchup,
  strategic: StrategicState,
  availableMoves: HeuristicMoveInfo[],
  myActive: HeuristicPokemonState,
  hasGuaranteedKO: boolean
): HeuristicDecision | null {
  if (snapshot.mySide.sideConditions.size > 0 && !hasGuaranteedKO) {
    const removalMove = availableMoves.find(m => HAZARD_REMOVAL_MOVES.has(toID(m.id)));
    if (removalMove && myActive.hpPercent > HEURISTIC_THRESHOLDS.HAZARD_REMOVAL_MIN_HP && hazardsThreatenTeam(snapshot, strategic)) {
      const moveIdx = findMoveIndex(availableMoves, removalMove.id);
      if (moveIdx !== INVALID_MOVE_INDEX) {
        return {
          type: 'move',
          moveId: removalMove.id,
          moveIndex: moveIdx + SHOWDOWN_CHOICE_INDEX_OFFSET,
          source: 'heuristic',
          confidence: HEURISTIC_CONFIDENCE_SCORES.HAZARD_REMOVAL,
          reasoning: 'Remove hazards threatening win condition',
        };
      }
    }
  }

  if (!snapshot.opponentSide.sideConditions.has('stealthrock') && myActive.hpPercent > HEURISTIC_THRESHOLDS.HAZARD_SET_MIN_HP) {
    const hazardMove = availableMoves.find(m => HAZARD_MOVES.has(toID(m.id)));
    if (hazardMove) {
      const worstOppDmg = matchup.oppAttacking[DEFAULT_ZERO]?.maxPercent ?? DEFAULT_ZERO;
      if (worstOppDmg < HEURISTIC_THRESHOLDS.HAZARD_SET_MAX_OPP_DAMAGE) {
        const moveIdx = findMoveIndex(availableMoves, hazardMove.id);
        if (moveIdx !== INVALID_MOVE_INDEX) {
          return {
            type: 'move',
            moveId: hazardMove.id,
            moveIndex: moveIdx + SHOWDOWN_CHOICE_INDEX_OFFSET,
            source: 'heuristic',
            confidence: HEURISTIC_CONFIDENCE_SCORES.HAZARD_SET,
            reasoning: 'Set up hazards',
          };
        }
      }
    }
  }

  return null;
}

export function evaluateSetupAndPivotLayers(
  matchup: DamageMatchup,
  strategic: StrategicState,
  availableMoves: HeuristicMoveInfo[],
  myActive: HeuristicPokemonState,
  oppActive: HeuristicPokemonState,
  iOutspeed: boolean,
  isTrapped: boolean,
  switchOptions: HeuristicPokemonState[]
): HeuristicDecision | null {
  const setupMove = availableMoves.find(m => SETUP_MOVES.has(toID(m.id)));
  if (setupMove && myActive.hpPercent > HEURISTIC_THRESHOLDS.SETUP_MOVE_MIN_HP) {
    const worstOppDmg = matchup.oppAttacking[DEFAULT_ZERO]?.maxPercent ?? DEFAULT_ZERO;
    const isWinCond = strategic.winConditions.length > DEFAULT_ZERO &&
      strategic.winConditions[DEFAULT_ZERO]?.pokemon === myActive.name;
    const oppLocked = oppActive.volatiles.has('choicelock') || oppActive.volatiles.has('mustrecharge');
    const oppCantThreaten = worstOppDmg < HEURISTIC_THRESHOLDS.SETUP_MOVE_MAX_OPP_DAMAGE;
    const oppLowHp = oppActive.hpPercent < HEURISTIC_THRESHOLDS.SETUP_MOVE_OPP_LOW_HP;
    const isSafe = oppCantThreaten || oppLocked || (iOutspeed && oppLowHp);

    if (isSafe && isWinCond) {
      const moveIdx = findMoveIndex(availableMoves, setupMove.id);
      if (moveIdx !== INVALID_MOVE_INDEX) {
        const reason = oppLocked ? 'opponent locked' : oppLowHp ? 'opponent likely switching' : 'opponent can\'t threaten';
        return {
          type: 'move',
          moveId: setupMove.id,
          moveIndex: moveIdx + SHOWDOWN_CHOICE_INDEX_OFFSET,
          source: 'heuristic',
          confidence: HEURISTIC_CONFIDENCE_SCORES.SETUP_MOVE,
          reasoning: `Safe setup: ${reason}`,
        };
      }
    }
  }

  if (!isTrapped && switchOptions.length > DEFAULT_ZERO) {
    const pivotMove = availableMoves.find(m => PIVOT_MOVES.has(toID(m.id)));
    if (pivotMove) {
      const bestOppDmg = matchup.oppAttacking[DEFAULT_ZERO]?.maxPercent ?? DEFAULT_ZERO;
      const bestMyDmg = matchup.myAttacking[DEFAULT_ZERO]?.maxPercent ?? DEFAULT_ZERO;
      if (bestOppDmg > HEURISTIC_THRESHOLDS.PIVOT_MIN_OPP_DAMAGE && bestMyDmg < HEURISTIC_THRESHOLDS.PIVOT_MAX_MY_DAMAGE && myActive.hpPercent > HEURISTIC_THRESHOLDS.PIVOT_MIN_MY_HP) {
        const moveIdx = findMoveIndex(availableMoves, pivotMove.id);
        if (moveIdx !== INVALID_MOVE_INDEX) {
          return {
            type: 'move',
            moveId: pivotMove.id,
            moveIndex: moveIdx + SHOWDOWN_CHOICE_INDEX_OFFSET,
            source: 'heuristic',
            confidence: HEURISTIC_CONFIDENCE_SCORES.PIVOT_MOVE,
            reasoning: `Pivot with ${pivotMove.id} — unfavorable matchup`,
          };
        }
      }
    }
  }

  return null;
}

export function evaluateAttackAndSwitchLayers(
  snapshot: HeuristicBattleSnapshot,
  matchup: DamageMatchup,
  strategic: StrategicState,
  availableMoves: HeuristicMoveInfo[],
  switchOptions: HeuristicPokemonState[],
  isTrapped: boolean,
  calc: HeuristicDamageCalculator,
  inference: InferenceEngine,
  oppActive: HeuristicPokemonState
): HeuristicDecision | null {
  if (matchup.myAttacking.length > DEFAULT_ZERO) {
    const bestMove = matchup.myAttacking[DEFAULT_ZERO];
    if (bestMove !== undefined && bestMove.maxPercent > HEURISTIC_THRESHOLDS.BEST_ATTACK_MIN_DAMAGE) {
      const moveIdx = findMoveIndex(availableMoves, bestMove.move);
      if (moveIdx !== INVALID_MOVE_INDEX) {
        const shouldSwitch = !isTrapped && shouldConsiderSwitching(matchup, strategic, switchOptions, snapshot.mySide.activePokemon);
        if (!shouldSwitch) {
          return {
            type: 'move',
            moveId: bestMove.move,
            moveIndex: moveIdx + SHOWDOWN_CHOICE_INDEX_OFFSET,
            source: 'heuristic',
            confidence: HEURISTIC_CONFIDENCE_SCORES.BEST_ATTACK,
            reasoning: `Best damage: ${bestMove.move} (${bestMove.minPercent.toFixed(0)}-${bestMove.maxPercent.toFixed(0)}%)`, // no-magic
          };
        }
      }
    }
  }

  if (!isTrapped && switchOptions.length > DEFAULT_ZERO) {
    const bestOppDmg = matchup.oppAttacking[DEFAULT_ZERO]?.maxPercent ?? DEFAULT_ZERO;
    const bestMyDmg = matchup.myAttacking[DEFAULT_ZERO]?.maxPercent ?? DEFAULT_ZERO;
    if (bestOppDmg > HEURISTIC_THRESHOLDS.BAD_MATCHUP_OPP_DAMAGE && bestMyDmg < HEURISTIC_THRESHOLDS.BAD_MATCHUP_MY_DAMAGE) {
      const sw = pickBestSwitch(snapshot, switchOptions, strategic, calc, inference, oppActive);
      if (sw) return sw;
    }
  }

  return null;
}
