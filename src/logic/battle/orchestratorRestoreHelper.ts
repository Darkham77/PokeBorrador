import type { BattleContext } from '@/types/battle/battleContext'
import type { BattleState, BattleStages, BattleLog } from '@/types/battle/battle'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { initWorkerForBattle } from './orchestratorWorkerInitHelper.ts'

/**
 * Restores a battle state from saved data.
 */
export async function restoreBattleState(ctx: BattleContext, battleData: unknown) {
  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  if (!battleData) {
    ctx.activeBattle.value = null
    await ctx.fsm.transition(BATTLE_STATES.EXIT_BATTLE)
    return
  }
  const d = battleData as Partial<BattleState & { playerStages: BattleStages; enemyStages: BattleStages; battleLogs: BattleLog[] }>
  
  if (d.over || !d.enemyTeam || !Array.isArray(d.enemyTeam) || d.enemyTeam.length === 0) {
    ctx.activeBattle.value = null
    ctx.gs.state.activeBattle = null
    await ctx.fsm.transition(BATTLE_STATES.EXIT_BATTLE)
    return
  }

  const playerPoke = ctx.gs.state.team.find((p: Pokemon) => p && p.hp > 0 && !p.onMission && !p.onDefense)
  const enemyTeamIndex = typeof d.enemyTeamIndex === 'number' && d.enemyTeamIndex >= 0 && d.enemyTeamIndex < d.enemyTeam.length
    ? d.enemyTeamIndex
    : (d.enemyTeam.findIndex((p: Pokemon) => p && p.hp > 0) !== -1 ? d.enemyTeam.findIndex((p: Pokemon) => p && p.hp > 0) : 0)
  const enemyPoke = d.enemy || d.enemyTeam[enemyTeamIndex] || d.enemyTeam[0]

  if (!playerPoke || !enemyPoke) {
    ctx.activeBattle.value = null
    ctx.gs.state.activeBattle = null
    await ctx.fsm.transition(BATTLE_STATES.EXIT_BATTLE)
    return
  }

  d.player = playerPoke
  d.enemy = enemyPoke
  d.playerTeam = ctx.gs.state.team
  d.playerTeamIndex = ctx.gs.state.team.indexOf(playerPoke)
  d.enemyTeamIndex = enemyTeamIndex
  d.participants = Array.isArray(d.participants) && d.participants.length > 0 ? d.participants : [playerPoke.uid]
  d.wasSearching = Boolean(d.wasSearching)

  ctx.activeBattle.value = d as BattleState
  if (d.playerStages) ctx.playerStages.value = d.playerStages
  if (d.enemyStages) ctx.enemyStages.value = d.enemyStages
  if (d.battleLogs && Array.isArray(d.battleLogs)) {
    ctx.battleLogs.value = [...d.battleLogs]
  }

  // Re-inicializar el worker con el estado de los equipos restaurados
  await initWorkerForBattle(ctx, playerPoke, enemyPoke)

  await ctx.fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.WAIT_INPUT)
}
