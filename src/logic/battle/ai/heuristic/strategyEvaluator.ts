// ============================================================
// Strategy Evaluator — aggregates win conditions, threats,
// position score and sack order into a StrategicState
// ============================================================

import type { HeuristicDamageCalculator } from './damageCalculator.ts';
import type { InferenceEngine } from './inferenceEngine.ts';
import { evaluatePosition } from './position.ts';
import { calculateSackOrder } from './sackOrder.ts';
import { evaluateThreats } from './threats.ts';
import type { HeuristicBattleSnapshot, StrategicState } from './types.ts';
import { evaluateWinConditions } from './winConditions.ts';

export function evaluateStrategicState(
  snapshot: HeuristicBattleSnapshot,
  calc: HeuristicDamageCalculator,
  inference: InferenceEngine
): StrategicState {
  const winConditions = evaluateWinConditions(snapshot, calc, inference);
  const threats = evaluateThreats(snapshot, calc, inference);
  const position = evaluatePosition(snapshot, calc, winConditions);
  const sackOrder = calculateSackOrder(snapshot, calc, winConditions, threats);
  return { winConditions, threats, position, sackOrder };
}
