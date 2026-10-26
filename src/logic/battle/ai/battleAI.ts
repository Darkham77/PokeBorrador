import type { BattleStages } from '@/types/battle/battle';
import type { BattleContext } from '@/types/battle/battleContext';
import type { Pokemon, Move } from '@/types/pokemon/pokemon';

import type { CombatAI } from './combatAI.ts';
import { HeuristicAI } from './heuristicAI.ts';
import { ScriptedAI } from './scriptedAI.ts';

const getCombatAI = (): CombatAI => {
  if (typeof globalThis.window !== 'undefined' && globalThis.__VITE_DEBUG__?.mockEnemyChoices) {
    return new ScriptedAI();
  }
  return new HeuristicAI();
};

export const decideEnemyMove = (
  enemy: Pokemon,
  player: Pokemon,
  playerStages: BattleStages,
  isWild = false,
  store?: BattleContext
): Move | null => {
  return getCombatAI().decideMove(enemy, player, playerStages, isWild, store);
};

export const shouldEnemySwitch = (
  enemy: Pokemon,
  player: Pokemon,
  enemyTeam: Pokemon[] | undefined,
  store?: BattleContext
): boolean => {
  return getCombatAI().shouldSwitch(enemy, player, enemyTeam, store);
};

import type { SwitchEvaluationMode } from './heuristic/heuristicEngine.ts';

export const findBestSwitchIndex = (
  enemyTeam: Pokemon[],
  player: Pokemon,
  currentEnemyUid: string,
  store?: BattleContext,
  mode?: SwitchEvaluationMode
): number => {
  return getCombatAI().findBestSwitchIndex(enemyTeam, player, currentEnemyUid, store, mode);
};

export const evaluateAndUseNPCItem = (ctx: BattleContext, e: Pokemon): Promise<boolean> => {
  return getCombatAI().evaluateAndUseItem(ctx, e);
};

export interface BattleAITools {
  readonly decideEnemyMove: typeof decideEnemyMove;
  readonly shouldEnemySwitch: typeof shouldEnemySwitch;
  readonly findBestSwitchIndex: typeof findBestSwitchIndex;
  readonly evaluateAndUseNPCItem: typeof evaluateAndUseNPCItem;
}

export const getBattleAITools = (): BattleAITools => {
  return {
    decideEnemyMove,
    shouldEnemySwitch,
    findBestSwitchIndex,
    evaluateAndUseNPCItem
  };
};
