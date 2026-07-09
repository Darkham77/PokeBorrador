import type { Pokemon, Move } from '@/types/pokemon/pokemon'
import type { BattleStages } from '@/types/battle/battle'
import type { BattleContext } from '@/types/battle/battleContext'
import type { CombatAI } from './combatAI.ts'
import { StandardAI } from './standardAI.ts'
import { ScriptedAI } from './scriptedAI.ts'

const getCombatAI = (): CombatAI => {
  if (typeof window !== 'undefined' && window.__VITE_DEBUG__?.mockEnemyChoices) {
    return new ScriptedAI()
  }
  return new StandardAI()
}

export const decideEnemyMove = (enemy: Pokemon, player: Pokemon, playerStages: BattleStages, isWild = false, store?: BattleContext): Move | null => {
  return getCombatAI().decideMove(enemy, player, playerStages, isWild, store)
}

export const shouldEnemySwitch = (enemy: Pokemon, player: Pokemon, enemyTeam: Pokemon[] | undefined, store?: BattleContext): boolean => {
  return getCombatAI().shouldSwitch(enemy, player, enemyTeam, store)
}

export const findBestSwitchIndex = (enemyTeam: Pokemon[], player: Pokemon, currentEnemyUid: string, store?: BattleContext): number => {
  return getCombatAI().findBestSwitchIndex(enemyTeam, player, currentEnemyUid, store)
}

export const evaluateAndUseNPCItem = (ctx: BattleContext, e: Pokemon): Promise<boolean> => {
  return getCombatAI().evaluateAndUseItem(ctx, e)
}

export const scoreMove = (move: Move, attacker: Pokemon, defender: Pokemon, defStages: BattleStages, store?: BattleContext): number => {
  const ai = getCombatAI()
  if (ai instanceof StandardAI) {
    return ai.scoreMove(move, attacker, defender, defStages, store)
  }
  return 0
}

export const getBattleAITools = () => {
  return {
    scoreMove,
    decideEnemyMove,
    shouldEnemySwitch,
    findBestSwitchIndex,
    evaluateAndUseNPCItem
  };
}
