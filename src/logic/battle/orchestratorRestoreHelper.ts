import type { BattleContext } from '@/types/battle/battleContext'
import type { BattleState, BattleStages, BattleLog } from '@/types/battle/battle'

/**
 * Restores a battle state from saved data.
 */
export function restoreBattleState(ctx: BattleContext, battleData: unknown) {
  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  if (!battleData) {
    ctx.activeBattle.value = null
    ctx.fsm.transition(BATTLE_STATES.EXIT_BATTLE)
    return
  }
  const d = battleData as Partial<BattleState & { playerStages: BattleStages; enemyStages: BattleStages; battleLogs: BattleLog[] }>
  ctx.activeBattle.value = d as BattleState
  if (d.playerStages) ctx.playerStages.value = d.playerStages
  if (d.enemyStages) ctx.enemyStages.value = d.enemyStages
  if (d.battleLogs) ctx.battleLogs.value = d.battleLogs

  ctx.fsm.transition(!d.over ? BATTLE_STATES.ACTIVE_BATTLE : BATTLE_STATES.EXIT_BATTLE, !d.over ? BATTLE_SUBSTATES.WAIT_INPUT : undefined)
}
