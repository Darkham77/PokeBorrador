// ============================================================
// Strategy Evaluator — aggregates win conditions, threats,
// position score and sack order into a StrategicState
// ============================================================

import type { HeuristicBattleSnapshot, StrategicState } from './types';
import type { HeuristicDamageCalculator } from './damageCalculator';
import type { InferenceEngine } from './inferenceEngine';
import { evaluateWinConditions } from './winConditions';
import { evaluateThreats } from './threats';
import { evaluatePosition } from './position';
import { calculateSackOrder } from './sackOrder';

export function evaluateStrategicState(
  snapshot: HeuristicBattleSnapshot,
  calc: HeuristicDamageCalculator,
  inference: InferenceEngine,
): StrategicState {
  const winConditions = evaluateWinConditions(snapshot, calc, inference);
  const threats = evaluateThreats(snapshot, calc, inference);
  const position = evaluatePosition(snapshot, calc, winConditions);
  const sackOrder = calculateSackOrder(snapshot, calc, winConditions, threats);
  return { winConditions, threats, position, sackOrder };
}
