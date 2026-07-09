import type { Pokemon, Move } from '../../../types/pokemon/pokemon.ts'
import type { BattleStages } from '../../../types/battle/battle.ts'
import type { BattleContext } from '../../../types/battle/battleContext.ts'

export interface CombatAI {
  decideMove(enemy: Pokemon, player: Pokemon, playerStages: BattleStages, isWild?: boolean, store?: BattleContext): Move | null;
  shouldSwitch(enemy: Pokemon, player: Pokemon, enemyTeam: Pokemon[] | undefined, store?: BattleContext): boolean;
  findBestSwitchIndex(enemyTeam: Pokemon[], player: Pokemon, currentEnemyUid: string, store?: BattleContext): number;
  evaluateAndUseItem(store: BattleContext, enemy: Pokemon): Promise<boolean>;
}
