// ============================================================
// Heuristic Decision Engine — 9-layer rule-based AI
// Adapted from external/pokemon-showdown-ai/src/heuristics/engine.ts
// BattleState dependency removed — uses snapshot + isTrapped flag
// ============================================================

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

export {
  SHOWDOWN_CHOICE_INDEX_OFFSET,
  HEURISTIC_CONFIDENCE_SCORES,
  HEURISTIC_THRESHOLDS,
} from './heuristicHelpers.ts';

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

export {
  pickBestSwitch,
  hasViableSwitchCounter,
  type SwitchEvaluationMode,
} from './heuristicHelpers.ts';
