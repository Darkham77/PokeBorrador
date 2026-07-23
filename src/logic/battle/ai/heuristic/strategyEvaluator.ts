// ============================================================
// Strategy Evaluator — aggregates win conditions, threats,
// position score and sack order into a StrategicState
// ============================================================

import type { HeuristicBattleSnapshot, StrategicState } from './types.ts';
import type { HeuristicDamageCalculator } from './damageCalculator.ts';
import type { InferenceEngine } from './inferenceEngine.ts';
import { evaluateWinConditions } from './winConditions.ts';
import { evaluateThreats } from './threats.ts';
import { evaluatePosition } from './position.ts';
import { calculateSackOrder } from './sackOrder.ts';

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
